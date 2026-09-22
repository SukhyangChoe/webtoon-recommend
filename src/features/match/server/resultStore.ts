import { randomBytes, randomUUID } from "node:crypto";
import questionSeed from "../data/questionSeed.v0.4.json";
import { buildTasteSnapshot, toPublicTasteResult } from "../engine/resultEngine.mjs";
import type { MatchAnswers } from "../storage/draftTypes";
import { getMatchDatabase, isPostgresError } from "./database";
import { sanitizeMatchNickname } from "./nickname.mjs";

function isNicknameConflictError(error: unknown) {
  return isPostgresError(error, "23505", "match_challenge_entries_unique_nickname_idx")
    || isPostgresError(error, "23505", "match_challenge_nickname_owner_conflict");
}

export type AccuracyFeedback = "almost_exact" | "mostly_right" | "slightly_off" | "very_off";
export type StoredSnapshot = ReturnType<typeof buildTasteSnapshot> & { accuracyFeedback?: AccuracyFeedback; profileDisplayName?: string | null };

type SnapshotRow = {
  snapshot_id: string;
  profile_id: string;
  public_profile_id: string;
  anonymous_id: string;
  display_name: string | null;
  test_version: string;
  question_set_version: string;
  profile_result_copy_version: string;
  completed_at: string;
  snapshot_data: Omit<StoredSnapshot, "profileId" | "snapshotId" | "publicProfileId" | "anonymousId" | "testVersion" | "questionSetVersion" | "profileResultCopyVersion" | "completedAt" | "accuracyFeedback" | "profileDisplayName">;
  accuracy_feedback: AccuracyFeedback | null;
};

function snapshotData(snapshot: StoredSnapshot) {
  const data = { ...snapshot } as Partial<StoredSnapshot>;
  delete data.profileId;
  delete data.snapshotId;
  delete data.publicProfileId;
  delete data.anonymousId;
  delete data.testVersion;
  delete data.questionSetVersion;
  delete data.profileResultCopyVersion;
  delete data.completedAt;
  delete data.accuracyFeedback;
  delete data.profileDisplayName;
  return data as SnapshotRow["snapshot_data"];
}

function storedSnapshot(row: SnapshotRow): StoredSnapshot {
  return {
    ...row.snapshot_data,
    profileId: row.profile_id,
    snapshotId: row.snapshot_id,
    publicProfileId: row.public_profile_id,
    anonymousId: row.anonymous_id,
    profileDisplayName: row.display_name,
    testVersion: row.test_version,
    questionSetVersion: row.question_set_version,
    profileResultCopyVersion: row.profile_result_copy_version,
    completedAt: row.completed_at,
    ...(row.accuracy_feedback ? { accuracyFeedback: row.accuracy_feedback } : {}),
  } as StoredSnapshot;
}

const SNAPSHOT_SELECT = `
  select
    snapshots.snapshot_id::text,
    snapshots.profile_id::text,
    snapshots.public_profile_id,
    profiles.anonymous_id::text,
    profiles.display_name,
    snapshots.test_version,
    snapshots.question_set_version,
    snapshots.profile_result_copy_version,
    snapshots.completed_at::text,
    snapshots.snapshot_data,
    snapshots.accuracy_feedback
  from public.match_taste_snapshots snapshots
  join public.match_profiles profiles on profiles.profile_id = snapshots.profile_id
`;

export async function createTasteSnapshot(anonymousId: string, nickname: string, answers: MatchAnswers) {
  const database = getMatchDatabase();
  const displayName = sanitizeMatchNickname(nickname);

  try {
    return await database.begin(async (sql) => {
      const profiles = await sql<{ profile_id: string }[]>`
        insert into public.match_profiles (profile_id, anonymous_id, display_name)
        values (${randomUUID()}::uuid, ${anonymousId}::uuid, ${displayName})
        on conflict (anonymous_id) do update set display_name = excluded.display_name
        returning profile_id::text
      `;
      const profileId = profiles[0]?.profile_id;
      if (!profileId) throw new Error("MATCH_PROFILE_CREATE_FAILED");

      await sql`
        select challenges.challenge_id
        from public.match_challenges challenges
        where challenges.owner_profile_id = ${profileId}::uuid
           or exists (
             select 1 from public.match_challenge_entries entries
             where entries.challenge_id = challenges.challenge_id
               and entries.challenger_profile_id = ${profileId}::uuid
           )
        for update
      `;
      await sql`update public.match_challenges set owner_nickname = ${displayName} where owner_profile_id = ${profileId}::uuid`;
      await sql`update public.match_challenge_entries set challenger_nickname = ${displayName}, updated_at = now() where challenger_profile_id = ${profileId}::uuid`;

      const snapshot = {
        ...buildTasteSnapshot({
          seed: questionSeed,
          answers,
          anonymousId,
          profileId,
          snapshotId: randomUUID(),
          publicProfileId: randomBytes(12).toString("base64url"),
        }),
        profileDisplayName: displayName,
      } as StoredSnapshot;

      await sql`
        insert into public.match_taste_snapshots (
          snapshot_id,
          profile_id,
          public_profile_id,
          test_version,
          question_set_version,
          profile_result_copy_version,
          completed_at,
          snapshot_data
        ) values (
          ${snapshot.snapshotId}::uuid,
          ${snapshot.profileId}::uuid,
          ${snapshot.publicProfileId},
          ${snapshot.testVersion},
          ${snapshot.questionSetVersion},
          ${snapshot.profileResultCopyVersion},
          ${snapshot.completedAt}::timestamptz,
          ${sql.json(snapshotData(snapshot))}
        )
      `;

      return snapshot;
    });
  } catch (error) {
    if (isNicknameConflictError(error)) throw new Error("NICKNAME_ALREADY_USED");
    throw error;
  }
}

export async function getTasteSnapshot(publicProfileId: string) {
  const database = getMatchDatabase();
  const rows = await database.unsafe<SnapshotRow[]>(`${SNAPSHOT_SELECT} where snapshots.public_profile_id = $1 limit 1`, [publicProfileId]);
  return rows[0] ? storedSnapshot(rows[0]) : null;
}

export async function getTasteSnapshotById(snapshotId: string) {
  const database = getMatchDatabase();
  const rows = await database.unsafe<SnapshotRow[]>(`${SNAPSHOT_SELECT} where snapshots.snapshot_id = $1::uuid limit 1`, [snapshotId]);
  return rows[0] ? storedSnapshot(rows[0]) : null;
}

export async function getPublicTasteResult(publicProfileId: string) {
  const snapshot = await getTasteSnapshot(publicProfileId);
  return snapshot ? { ...toPublicTasteResult(snapshot), nickname: snapshot.profileDisplayName ?? null } : null;
}

export async function isTasteResultOwner(publicProfileId: string, anonymousId: string) {
  const database = getMatchDatabase();
  const rows = await database<{ is_owner: boolean }[]>`
    select exists (
      select 1
      from public.match_taste_snapshots snapshots
      join public.match_profiles profiles on profiles.profile_id = snapshots.profile_id
      where snapshots.public_profile_id = ${publicProfileId}
        and profiles.anonymous_id = ${anonymousId}::uuid
    ) as is_owner
  `;
  return Boolean(rows[0]?.is_owner);
}

export async function updateProfileNickname(publicProfileId: string, anonymousId: string, nickname: string) {
  const displayName = sanitizeMatchNickname(nickname);
  const database = getMatchDatabase();
  try {
    return await database.begin(async (sql) => {
      const profiles = await sql<{ profile_id: string }[]>`
        select profiles.profile_id::text
        from public.match_profiles profiles
        join public.match_taste_snapshots snapshots on snapshots.profile_id = profiles.profile_id
        where snapshots.public_profile_id = ${publicProfileId}
          and profiles.anonymous_id = ${anonymousId}::uuid
        limit 1
        for update of profiles
      `;
      const profileId = profiles[0]?.profile_id;
      if (!profileId) throw new Error("RESULT_OWNER_MISMATCH");

      await sql`
        select challenges.challenge_id
        from public.match_challenges challenges
        where challenges.owner_profile_id = ${profileId}::uuid
           or exists (
             select 1 from public.match_challenge_entries entries
             where entries.challenge_id = challenges.challenge_id
               and entries.challenger_profile_id = ${profileId}::uuid
           )
        for update
      `;

      await sql`update public.match_profiles set display_name = ${displayName} where profile_id = ${profileId}::uuid`;
      await sql`update public.match_challenges set owner_nickname = ${displayName} where owner_profile_id = ${profileId}::uuid`;
      await sql`update public.match_challenge_entries set challenger_nickname = ${displayName}, updated_at = now() where challenger_profile_id = ${profileId}::uuid`;
      return { nickname: displayName };
    });
  } catch (error) {
    if (isNicknameConflictError(error)) throw new Error("NICKNAME_ALREADY_USED");
    throw error;
  }
}

export async function saveAccuracyFeedback(publicProfileId: string, anonymousId: string, feedback: AccuracyFeedback) {
  const database = getMatchDatabase();
  const rows = await database<{ public_profile_id: string }[]>`
    update public.match_taste_snapshots snapshots
    set accuracy_feedback = ${feedback}
    from public.match_profiles profiles
    where snapshots.profile_id = profiles.profile_id
      and snapshots.public_profile_id = ${publicProfileId}
      and profiles.anonymous_id = ${anonymousId}::uuid
    returning snapshots.public_profile_id
  `;
  return rows.length > 0;
}
