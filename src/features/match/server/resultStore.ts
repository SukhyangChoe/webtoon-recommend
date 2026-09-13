import { randomBytes, randomUUID } from "node:crypto";
import questionSeed from "../data/questionSeed.v0.4.json";
import { buildTasteSnapshot, toPublicTasteResult } from "../engine/resultEngine.mjs";
import type { MatchAnswers } from "../storage/draftTypes";
import { getMatchDatabase } from "./database";

export type AccuracyFeedback = "almost_exact" | "mostly_right" | "slightly_off" | "very_off";
export type StoredSnapshot = ReturnType<typeof buildTasteSnapshot> & { accuracyFeedback?: AccuracyFeedback };

type SnapshotRow = {
  snapshot_id: string;
  profile_id: string;
  public_profile_id: string;
  anonymous_id: string;
  test_version: string;
  question_set_version: string;
  profile_result_copy_version: string;
  completed_at: string;
  snapshot_data: Omit<StoredSnapshot, "profileId" | "snapshotId" | "publicProfileId" | "anonymousId" | "testVersion" | "questionSetVersion" | "profileResultCopyVersion" | "completedAt" | "accuracyFeedback">;
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
  return data as SnapshotRow["snapshot_data"];
}

function storedSnapshot(row: SnapshotRow): StoredSnapshot {
  return {
    ...row.snapshot_data,
    profileId: row.profile_id,
    snapshotId: row.snapshot_id,
    publicProfileId: row.public_profile_id,
    anonymousId: row.anonymous_id,
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
    snapshots.test_version,
    snapshots.question_set_version,
    snapshots.profile_result_copy_version,
    snapshots.completed_at::text,
    snapshots.snapshot_data,
    snapshots.accuracy_feedback
  from public.match_taste_snapshots snapshots
  join public.match_profiles profiles on profiles.profile_id = snapshots.profile_id
`;

export async function createTasteSnapshot(anonymousId: string, answers: MatchAnswers) {
  const database = getMatchDatabase();

  return database.begin(async (sql) => {
    const profiles = await sql<{ profile_id: string }[]>`
      insert into public.match_profiles (profile_id, anonymous_id)
      values (${randomUUID()}::uuid, ${anonymousId}::uuid)
      on conflict (anonymous_id) do update set anonymous_id = excluded.anonymous_id
      returning profile_id::text
    `;
    const profileId = profiles[0]?.profile_id;
    if (!profileId) throw new Error("MATCH_PROFILE_CREATE_FAILED");

    const snapshot = buildTasteSnapshot({
      seed: questionSeed,
      answers,
      anonymousId,
      profileId,
      snapshotId: randomUUID(),
      publicProfileId: randomBytes(12).toString("base64url"),
    }) as StoredSnapshot;

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
  return snapshot ? toPublicTasteResult(snapshot) : null;
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
