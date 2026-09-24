import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import questionSeed from "../data/questionSeed.v0.4.json";
import { MATCH_COMPATIBILITY_CONFIG } from "../config/compatibility.mjs";
import { calculateCompatibility } from "../engine/compatibilityEngine.mjs";
import { denseRankEntries, selectRankingWindow } from "../engine/rankingPolicy.mjs";
import { pairTrustSentence } from "../share/pairTrustCopy.mjs";
import { getMatchDatabase, isPostgresError } from "./database";
import { getTasteSnapshot, getTasteSnapshotById, updateProfileNickname, type StoredSnapshot } from "./resultStore";
import { sanitizeMatchNickname } from "./nickname.mjs";
import { getRecommendationsForProfiles } from "./webtoonCatalogStore";

type Challenge = {
  challengeId: string;
  challengeCode: string;
  ownerProfileId: string;
  ownerSnapshotId: string;
  ownerNickname: string;
  questionSetVersion: string;
  compatibilityVersion: string;
  status: "active" | "closed" | "deleted";
  rankingVisibility: "public_by_link" | "private";
  ownerManageTokenHash: string;
  createdAt: string;
  closedAt: string | null;
};

type ChallengeRow = {
  challenge_id: string;
  challenge_code: string;
  owner_profile_id: string;
  owner_snapshot_id: string;
  owner_nickname: string;
  question_set_version: string;
  compatibility_version: string;
  status: Challenge["status"];
  ranking_visibility: Challenge["rankingVisibility"];
  owner_manage_token_hash: string;
  created_at: string;
  closed_at: string | null;
};

type CompatibilityResult = {
  resultId: string;
  challengeId: string;
  ownerSnapshotId: string;
  challengerSnapshotId: string;
  compatibilityVersion: string;
  overallScore: number;
  band: { key: string; label: string; subcopy: string };
  componentScoresPrivate: Record<string, unknown>;
  ownerToChallengerTrustPrivate: number;
  challengerToOwnerTrustPrivate: number;
  sharedGenres: string[];
  differentGenres: string[];
  sharedTasteLabels: string[];
  trustSentence: string;
  createdAt: string;
};

type CompatibilityResultRow = {
  result_id: string;
  challenge_id: string;
  owner_snapshot_id: string;
  challenger_snapshot_id: string;
  compatibility_version: string;
  overall_score: number;
  band: CompatibilityResult["band"];
  component_scores_private: Record<string, unknown>;
  owner_to_challenger_trust_private: number;
  challenger_to_owner_trust_private: number;
  shared_genres: string[];
  different_genres: string[];
  shared_taste_labels: string[];
  trust_sentence: string;
  created_at: string;
};

type ChallengeEntry = {
  entryId: string;
  challengeId: string;
  challengerProfileId: string;
  challengerSnapshotId: string;
  resultId: string;
  challengerNickname: string;
  score: number;
  hiddenByOwner: boolean;
  entryOrigin: "direct" | "reciprocal";
  sourceResultId: string | null;
  createdAt: string;
  updatedAt: string;
  sharedGenres: string[];
};

type ChallengeEntryRow = {
  entry_id: string;
  challenge_id: string;
  challenger_profile_id: string;
  challenger_snapshot_id: string;
  result_id: string;
  challenger_nickname: string;
  score: number;
  hidden_by_owner: boolean;
  entry_origin: ChallengeEntry["entryOrigin"];
  source_result_id: string | null;
  created_at: string;
  updated_at: string;
  shared_genres: string[] | null;
};

type ReciprocalSourceRow = {
  counterpart_profile_id: string;
  counterpart_snapshot_id: string;
  counterpart_nickname: string;
  source_result_id: string;
};

const genreLabels = Object.fromEntries(questionSeed.publicGenrePolicy.publicGenres.map((genre) => [genre.genreKey, genre.displayLabel]));
const featureLabels = Object.fromEntries([...questionSeed.positiveFeatureCatalog, ...questionSeed.avoidanceFeatureCatalog].map((feature) => [feature.featureKey, feature.publicShortLabel ?? feature.displayLabel]));

export class ActiveChallengeExistsError extends Error {
  challengeCode: string;

  constructor(challengeCode: string) {
    super("ACTIVE_CHALLENGE_EXISTS");
    this.name = "ActiveChallengeExistsError";
    this.challengeCode = challengeCode;
  }
}

function challengeFromRow(row: ChallengeRow): Challenge {
  return {
    challengeId: row.challenge_id,
    challengeCode: row.challenge_code,
    ownerProfileId: row.owner_profile_id,
    ownerSnapshotId: row.owner_snapshot_id,
    ownerNickname: row.owner_nickname,
    questionSetVersion: row.question_set_version,
    compatibilityVersion: row.compatibility_version,
    status: row.status,
    rankingVisibility: row.ranking_visibility,
    ownerManageTokenHash: row.owner_manage_token_hash,
    createdAt: row.created_at,
    closedAt: row.closed_at,
  };
}

function resultFromRow(row: CompatibilityResultRow): CompatibilityResult {
  return {
    resultId: row.result_id,
    challengeId: row.challenge_id,
    ownerSnapshotId: row.owner_snapshot_id,
    challengerSnapshotId: row.challenger_snapshot_id,
    compatibilityVersion: row.compatibility_version,
    overallScore: row.overall_score,
    band: row.band,
    componentScoresPrivate: row.component_scores_private,
    ownerToChallengerTrustPrivate: Number(row.owner_to_challenger_trust_private),
    challengerToOwnerTrustPrivate: Number(row.challenger_to_owner_trust_private),
    sharedGenres: row.shared_genres,
    differentGenres: row.different_genres,
    sharedTasteLabels: row.shared_taste_labels,
    trustSentence: row.trust_sentence,
    createdAt: row.created_at,
  };
}

function entryFromRow(row: ChallengeEntryRow): ChallengeEntry {
  return {
    entryId: row.entry_id,
    challengeId: row.challenge_id,
    challengerProfileId: row.challenger_profile_id,
    challengerSnapshotId: row.challenger_snapshot_id,
    resultId: row.result_id,
    challengerNickname: row.challenger_nickname,
    score: row.score,
    hiddenByOwner: row.hidden_by_owner,
    entryOrigin: row.entry_origin,
    sourceResultId: row.source_result_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sharedGenres: row.shared_genres ?? [],
  };
}

async function findChallenge(challengeCode: string) {
  const database = getMatchDatabase();
  const rows = await database<ChallengeRow[]>`
    select
      challenge_id::text,
      challenge_code,
      owner_profile_id::text,
      owner_snapshot_id::text,
      owner_nickname,
      question_set_version,
      compatibility_version,
      status,
      ranking_visibility,
      owner_manage_token_hash,
      created_at::text,
      closed_at::text
    from public.match_challenges
    where challenge_code = ${challengeCode}
    limit 1
  `;
  return rows[0] ? challengeFromRow(rows[0]) : null;
}

async function challengeEntries(challengeId: string) {
  const database = getMatchDatabase();
  const rows = await database<ChallengeEntryRow[]>`
    select
      entries.entry_id::text,
      entries.challenge_id::text,
      entries.challenger_profile_id::text,
      entries.challenger_snapshot_id::text,
      entries.result_id,
      entries.challenger_nickname,
      entries.score,
      entries.hidden_by_owner,
      entries.entry_origin,
      entries.source_result_id,
      entries.created_at::text,
      entries.updated_at::text,
      results.shared_genres
    from public.match_challenge_entries entries
    left join public.match_compatibility_results results on results.result_id = entries.result_id
    where entries.challenge_id = ${challengeId}::uuid
  `;
  return rows.map(entryFromRow);
}

async function rankedEntries(challengeId: string) {
  return denseRankEntries(await challengeEntries(challengeId)) as Array<ChallengeEntry & { rank: number }>;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function hasOwnerAccess(challenge: Challenge, ownerManageToken?: string | null, ownerAnonymousId?: string | null) {
  if (ownerManageToken) {
    const actual = Buffer.from(challenge.ownerManageTokenHash, "hex");
    const candidate = Buffer.from(hashToken(ownerManageToken), "hex");
    if (actual.length === candidate.length && timingSafeEqual(actual, candidate)) return true;
  }
  if (!ownerAnonymousId) return false;
  const database = getMatchDatabase();
  const rows = await database<{ profile_id: string }[]>`
    select profile_id::text
    from public.match_profiles
    where profile_id = ${challenge.ownerProfileId}::uuid
      and anonymous_id = ${ownerAnonymousId}::uuid
    limit 1
  `;
  return rows.length > 0;
}

function publicRankingEntry(entry: ChallengeEntry & { rank?: number }, viewerProfileId?: string | null) {
  return {
    entryId: entry.entryId,
    resultId: entry.resultId,
    nickname: entry.challengerNickname,
    score: entry.score,
    rank: entry.rank ?? null,
    sharedGenres: entry.sharedGenres.slice(0, 2),
    isViewer: Boolean(viewerProfileId && entry.challengerProfileId === viewerProfileId),
    isReciprocal: entry.entryOrigin === "reciprocal",
    updatedAt: entry.updatedAt,
  };
}

async function publicChallenge(challenge: Challenge) {
  const ranking = await rankedEntries(challenge.challengeId);
  return {
    challengeCode: challenge.challengeCode,
    ownerNickname: challenge.ownerNickname,
    entryCount: ranking.length,
    topScore: challenge.rankingVisibility === "public_by_link" ? ranking[0]?.score ?? null : null,
    questionSetVersion: challenge.questionSetVersion,
    compatibilityVersion: challenge.compatibilityVersion,
    status: challenge.status,
    rankingVisibility: challenge.rankingVisibility,
  };
}

async function activeChallengeForProfile(ownerProfileId: string, excludeChallengeCode?: string) {
  const database = getMatchDatabase();
  const rows = await database<ChallengeRow[]>`
    select
      challenge_id::text,
      challenge_code,
      owner_profile_id::text,
      owner_snapshot_id::text,
      owner_nickname,
      question_set_version,
      compatibility_version,
      status,
      ranking_visibility,
      owner_manage_token_hash,
      created_at::text,
      closed_at::text
    from public.match_challenges
    where owner_profile_id = ${ownerProfileId}::uuid
      and status = 'active'
      and (${excludeChallengeCode ?? null}::text is null or challenge_code <> ${excludeChallengeCode ?? null})
    limit 1
  `;
  return rows[0] ? challengeFromRow(rows[0]) : null;
}

async function reciprocalEntriesForSnapshot(ownerSnapshot: StoredSnapshot) {
  const database = getMatchDatabase();
  const rows = await database<ReciprocalSourceRow[]>`
    select distinct on (previous_challenges.owner_profile_id)
      previous_challenges.owner_profile_id::text as counterpart_profile_id,
      previous_challenges.owner_snapshot_id::text as counterpart_snapshot_id,
      coalesce(counterpart_profiles.display_name, previous_challenges.owner_nickname) as counterpart_nickname,
      previous_entries.result_id as source_result_id
    from public.match_challenge_entries previous_entries
    join public.match_challenges previous_challenges
      on previous_challenges.challenge_id = previous_entries.challenge_id
    join public.match_profiles counterpart_profiles
      on counterpart_profiles.profile_id = previous_challenges.owner_profile_id
    where previous_entries.challenger_profile_id = ${ownerSnapshot.profileId}::uuid
      and previous_entries.challenger_snapshot_id = ${ownerSnapshot.snapshotId}::uuid
      and previous_entries.entry_origin = 'direct'
      and previous_challenges.owner_profile_id <> ${ownerSnapshot.profileId}::uuid
      and previous_challenges.status <> 'deleted'
      and previous_challenges.question_set_version = ${ownerSnapshot.questionSetVersion}
      and previous_challenges.compatibility_version = ${MATCH_COMPATIBILITY_CONFIG.version}
    order by previous_challenges.owner_profile_id, previous_entries.updated_at desc
  `;

  const candidates = await Promise.all(rows.map(async (row) => ({
    row,
    snapshot: await getTasteSnapshotById(row.counterpart_snapshot_id),
  })));
  return candidates.flatMap(({ row, snapshot }) => {
    if (!snapshot || snapshot.profileId !== row.counterpart_profile_id || snapshot.questionSetVersion !== ownerSnapshot.questionSetVersion) return [];
    return [{
      snapshot,
      nickname: sanitizeMatchNickname(row.counterpart_nickname),
      sourceResultId: row.source_result_id,
    }];
  });
}

export async function createChallenge(input: { anonymousId: string; ownerPublicProfileId: string; ownerNickname: string; rankingVisibility?: boolean }) {
  const ownerSnapshot = await getTasteSnapshot(input.ownerPublicProfileId);
  if (!ownerSnapshot || ownerSnapshot.anonymousId !== input.anonymousId) throw new Error("OWNER_SNAPSHOT_NOT_FOUND");
  const ownerNickname = sanitizeMatchNickname(input.ownerNickname);
  await updateProfileNickname(input.ownerPublicProfileId, input.anonymousId, ownerNickname);
  const existingActiveChallenge = await activeChallengeForProfile(ownerSnapshot.profileId);
  if (existingActiveChallenge) throw new ActiveChallengeExistsError(existingActiveChallenge.challengeCode);

  const ownerManageToken = randomBytes(32).toString("base64url");
  const challenge: Challenge = {
    challengeId: randomUUID(),
    challengeCode: randomBytes(9).toString("base64url"),
    ownerProfileId: ownerSnapshot.profileId,
    ownerSnapshotId: ownerSnapshot.snapshotId,
    ownerNickname,
    questionSetVersion: ownerSnapshot.questionSetVersion,
    compatibilityVersion: MATCH_COMPATIBILITY_CONFIG.version,
    status: "active",
    rankingVisibility: input.rankingVisibility === false ? "private" : "public_by_link",
    ownerManageTokenHash: hashToken(ownerManageToken),
    createdAt: new Date().toISOString(),
    closedAt: null,
  };
  const reciprocalEntries = await reciprocalEntriesForSnapshot(ownerSnapshot);

  try {
    const database = getMatchDatabase();
    await database.begin(async (sql) => {
      await sql`
        insert into public.match_challenges (
          challenge_id,
          challenge_code,
          owner_profile_id,
          owner_snapshot_id,
          owner_nickname,
          question_set_version,
          compatibility_version,
          status,
          ranking_visibility,
          owner_manage_token_hash,
          created_at
        ) values (
          ${challenge.challengeId}::uuid,
          ${challenge.challengeCode},
          ${challenge.ownerProfileId}::uuid,
          ${challenge.ownerSnapshotId}::uuid,
          ${challenge.ownerNickname},
          ${challenge.questionSetVersion},
          ${challenge.compatibilityVersion},
          ${challenge.status},
          ${challenge.rankingVisibility},
          ${challenge.ownerManageTokenHash},
          ${challenge.createdAt}::timestamptz
        )
      `;

      for (const reciprocalEntry of reciprocalEntries) {
        const result = compatibilityResult(challenge, ownerSnapshot, reciprocalEntry.snapshot);
        const entryId = randomUUID();
        await sql`
          insert into public.match_compatibility_results (
            result_id, challenge_id, owner_snapshot_id, challenger_snapshot_id,
            compatibility_version, overall_score, band, component_scores_private,
            owner_to_challenger_trust_private, challenger_to_owner_trust_private,
            shared_genres, different_genres, shared_taste_labels, trust_sentence, created_at
          ) values (
            ${result.resultId}, ${result.challengeId}::uuid, ${result.ownerSnapshotId}::uuid,
            ${result.challengerSnapshotId}::uuid, ${result.compatibilityVersion}, ${result.overallScore},
            ${sql.json(result.band)}, ${sql.json(result.componentScoresPrivate)},
            ${result.ownerToChallengerTrustPrivate}, ${result.challengerToOwnerTrustPrivate},
            ${sql.json(result.sharedGenres)}, ${sql.json(result.differentGenres)},
            ${sql.json(result.sharedTasteLabels)}, ${result.trustSentence}, ${result.createdAt}::timestamptz
          )
        `;
        await sql`
          insert into public.match_challenge_entries (
            entry_id, challenge_id, challenger_profile_id, challenger_snapshot_id,
            result_id, challenger_nickname, score, hidden_by_owner,
            entry_origin, source_result_id, created_at, updated_at
          ) values (
            ${entryId}::uuid, ${challenge.challengeId}::uuid, ${reciprocalEntry.snapshot.profileId}::uuid,
            ${reciprocalEntry.snapshot.snapshotId}::uuid, ${result.resultId}, ${reciprocalEntry.nickname},
            ${result.overallScore}, false, 'reciprocal', ${reciprocalEntry.sourceResultId},
            ${result.createdAt}::timestamptz, ${result.createdAt}::timestamptz
          )
        `;
      }
    });
  } catch (error) {
    if (isPostgresError(error, "23505", "match_challenges_one_active_per_owner_idx")) {
      const existing = await activeChallengeForProfile(ownerSnapshot.profileId);
      if (existing) throw new ActiveChallengeExistsError(existing.challengeCode);
    }
    throw error;
  }

  return { challenge: await publicChallenge(challenge), ownerManageToken };
}

export async function getPublicChallenge(challengeCode: string) {
  const challenge = await findChallenge(challengeCode);
  return challenge ? publicChallenge(challenge) : null;
}

export async function getChallengeInviteMetadata(challengeCode: string) {
  const challenge = await findChallenge(challengeCode);
  return challenge ? { ownerNickname: challenge.ownerNickname, status: challenge.status } : null;
}

export async function getActiveChallengeForOwner(anonymousId: string) {
  const database = getMatchDatabase();
  const rows = await database<ChallengeRow[]>`
    select
      challenges.challenge_id::text,
      challenges.challenge_code,
      challenges.owner_profile_id::text,
      challenges.owner_snapshot_id::text,
      challenges.owner_nickname,
      challenges.question_set_version,
      challenges.compatibility_version,
      challenges.status,
      challenges.ranking_visibility,
      challenges.owner_manage_token_hash,
      challenges.created_at::text,
      challenges.closed_at::text
    from public.match_challenges challenges
    join public.match_profiles profiles on profiles.profile_id = challenges.owner_profile_id
    where profiles.anonymous_id = ${anonymousId}::uuid
      and challenges.status = 'active'
    limit 1
  `;
  if (!rows[0]) return null;
  const challenge = challengeFromRow(rows[0]);
  const ownerSnapshot = await getTasteSnapshotById(challenge.ownerSnapshotId);
  return {
    ...await publicChallenge(challenge),
    ownerPublicProfileId: ownerSnapshot?.publicProfileId ?? null,
  };
}

function compatibilityResult(challenge: Challenge, ownerSnapshot: StoredSnapshot, challengerSnapshot: StoredSnapshot) {
  const calculated = calculateCompatibility(ownerSnapshot, challengerSnapshot);
  const sharedGenres = calculated.explanations.sharedGenreKeys.map((key: string) => genreLabels[key]);
  const differentGenres = calculated.explanations.differentGenreKeys.map((key: string) => genreLabels[key]);
  const sharedTasteLabels = calculated.explanations.sharedTasteKeys.map((key: string) => featureLabels[key]).filter(Boolean);
  const trustGenre = sharedGenres[0] ?? genreLabels[Object.entries(ownerSnapshot.rawGenreAffinity).sort((a, b) => b[1] - a[1])[0]?.[0]] ?? "주력 장르";
  return {
    resultId: randomBytes(12).toString("base64url"),
    challengeId: challenge.challengeId,
    ownerSnapshotId: ownerSnapshot.snapshotId,
    challengerSnapshotId: challengerSnapshot.snapshotId,
    compatibilityVersion: challenge.compatibilityVersion,
    overallScore: calculated.score,
    band: calculated.band,
    componentScoresPrivate: calculated.private,
    ownerToChallengerTrustPrivate: calculated.private.ownerToChallengerTrust,
    challengerToOwnerTrustPrivate: calculated.private.challengerToOwnerTrust,
    sharedGenres,
    differentGenres,
    sharedTasteLabels,
    trustSentence: pairTrustSentence({ score: calculated.score, recommenderNickname: challenge.ownerNickname, genre: trustGenre }),
    createdAt: new Date().toISOString(),
  } satisfies CompatibilityResult;
}

export async function getExistingChallengeEntry(input: { challengeCode: string; anonymousId: string; challengerPublicProfileId: string }) {
  const [challenge, challengerSnapshot] = await Promise.all([
    findChallenge(input.challengeCode),
    getTasteSnapshot(input.challengerPublicProfileId),
  ]);
  if (!challenge || !challengerSnapshot || challengerSnapshot.anonymousId !== input.anonymousId) return null;

  const database = getMatchDatabase();
  const rows = await database<ChallengeEntryRow[]>`
    select
      entries.entry_id::text,
      entries.challenge_id::text,
      entries.challenger_profile_id::text,
      entries.challenger_snapshot_id::text,
      entries.result_id,
      entries.challenger_nickname,
      entries.score,
      entries.hidden_by_owner,
      entries.entry_origin,
      entries.source_result_id,
      entries.created_at::text,
      entries.updated_at::text,
      results.shared_genres
    from public.match_challenge_entries entries
    left join public.match_compatibility_results results on results.result_id = entries.result_id
    where entries.challenge_id = ${challenge.challengeId}::uuid
      and entries.challenger_profile_id = ${challengerSnapshot.profileId}::uuid
    limit 1
  `;
  const entry = rows[0] ? entryFromRow(rows[0]) : null;
  return entry ? { resultId: entry.resultId, nickname: entry.challengerNickname, score: entry.score } : null;
}

export async function createChallengeEntry(input: { challengeCode: string; anonymousId: string; challengerPublicProfileId: string; challengerNickname: string }) {
  const challenge = await findChallenge(input.challengeCode);
  if (!challenge) throw new Error("CHALLENGE_NOT_FOUND");
  if (challenge.status !== "active") throw new Error("CHALLENGE_CLOSED");

  const [ownerSnapshot, challengerSnapshot] = await Promise.all([
    getTasteSnapshotById(challenge.ownerSnapshotId),
    getTasteSnapshot(input.challengerPublicProfileId),
  ]);
  if (!ownerSnapshot || !challengerSnapshot || challengerSnapshot.anonymousId !== input.anonymousId) throw new Error("CHALLENGER_SNAPSHOT_NOT_FOUND");
  if (challenge.ownerProfileId === challengerSnapshot.profileId) throw new Error("SELF_CHALLENGE_NOT_ALLOWED");
  if (challengerSnapshot.questionSetVersion !== challenge.questionSetVersion) throw new Error("QUESTION_VERSION_MISMATCH");
  if (challenge.compatibilityVersion !== MATCH_COMPATIBILITY_CONFIG.version) throw new Error("COMPATIBILITY_VERSION_MISMATCH");

  const challengerNickname = sanitizeMatchNickname(input.challengerNickname);
  await updateProfileNickname(input.challengerPublicProfileId, input.anonymousId, challengerNickname);
  const result = compatibilityResult(challenge, ownerSnapshot, challengerSnapshot);
  const database = getMatchDatabase();
  const persisted = await database.begin(async (sql) => {
    await sql`select challenge_id from public.match_challenges where challenge_id = ${challenge.challengeId}::uuid for update`;

    const previousRows = await sql<ChallengeEntryRow[]>`
      select
        entry_id::text,
        challenge_id::text,
        challenger_profile_id::text,
        challenger_snapshot_id::text,
        result_id,
        challenger_nickname,
        score,
        hidden_by_owner,
        entry_origin,
        source_result_id,
        created_at::text,
        updated_at::text,
        null::jsonb as shared_genres
      from public.match_challenge_entries
      where challenge_id = ${challenge.challengeId}::uuid
        and challenger_profile_id = ${challengerSnapshot.profileId}::uuid
      limit 1
    `;
    const previous = previousRows[0] ? entryFromRow(previousRows[0]) : null;
    const now = new Date().toISOString();

    if (previous) {
      return { entry: previous, updated: false, existing: true };
    }

    await sql`
      insert into public.match_compatibility_results (
        result_id,
        challenge_id,
        owner_snapshot_id,
        challenger_snapshot_id,
        compatibility_version,
        overall_score,
        band,
        component_scores_private,
        owner_to_challenger_trust_private,
        challenger_to_owner_trust_private,
        shared_genres,
        different_genres,
        shared_taste_labels,
        trust_sentence,
        created_at
      ) values (
        ${result.resultId},
        ${result.challengeId}::uuid,
        ${result.ownerSnapshotId}::uuid,
        ${result.challengerSnapshotId}::uuid,
        ${result.compatibilityVersion},
        ${result.overallScore},
        ${sql.json(result.band)},
        ${sql.json(result.componentScoresPrivate)},
        ${result.ownerToChallengerTrustPrivate},
        ${result.challengerToOwnerTrustPrivate},
        ${sql.json(result.sharedGenres)},
        ${sql.json(result.differentGenres)},
        ${sql.json(result.sharedTasteLabels)},
        ${result.trustSentence},
        ${result.createdAt}::timestamptz
      )
    `;

    const entry: ChallengeEntry = {
      entryId: randomUUID(),
      challengeId: challenge.challengeId,
      challengerProfileId: challengerSnapshot.profileId,
      challengerSnapshotId: challengerSnapshot.snapshotId,
      resultId: result.resultId,
      challengerNickname,
      score: result.overallScore,
      hiddenByOwner: false,
      entryOrigin: "direct",
      sourceResultId: null,
      createdAt: now,
      updatedAt: now,
      sharedGenres: result.sharedGenres,
    };
    await sql`
        insert into public.match_challenge_entries (
        entry_id,
        challenge_id,
        challenger_profile_id,
        challenger_snapshot_id,
        result_id,
        challenger_nickname,
        score,
        hidden_by_owner,
        entry_origin,
        source_result_id,
        created_at,
        updated_at
        ) values (
        ${entry.entryId}::uuid,
        ${entry.challengeId}::uuid,
        ${entry.challengerProfileId}::uuid,
        ${entry.challengerSnapshotId}::uuid,
        ${entry.resultId},
        ${entry.challengerNickname},
        ${entry.score},
        false,
        'direct',
        null,
        ${entry.createdAt}::timestamptz,
        ${entry.updatedAt}::timestamptz
        )
      `;
    return { entry, updated: false, existing: false };
  });

  const rank = (await rankedEntries(challenge.challengeId)).find((item) => item.entryId === persisted.entry.entryId)?.rank ?? null;
  return { resultId: persisted.entry.resultId, score: persisted.entry.score, rank, updated: persisted.updated, existing: persisted.existing };
}

export async function getPublicPairResult(challengeCode: string, resultId: string) {
  const challenge = await findChallenge(challengeCode);
  if (!challenge) return null;
  const database = getMatchDatabase();
  const rows = await database<CompatibilityResultRow[]>`
    select
      result_id,
      challenge_id::text,
      owner_snapshot_id::text,
      challenger_snapshot_id::text,
      compatibility_version,
      overall_score,
      band,
      component_scores_private,
      owner_to_challenger_trust_private,
      challenger_to_owner_trust_private,
      shared_genres,
      different_genres,
      shared_taste_labels,
      trust_sentence,
      created_at::text
    from public.match_compatibility_results
    where result_id = ${resultId}
      and challenge_id = ${challenge.challengeId}::uuid
    limit 1
  `;
  if (!rows[0]) return null;
  const result = resultFromRow(rows[0]);
  const ranking = await rankedEntries(challenge.challengeId);
  const entry = ranking.find((item) => item.resultId === resultId);
  if (!entry) return null;
  const [ownerSnapshot, challengerSnapshot, recommendations] = await Promise.all([
    getTasteSnapshotById(result.ownerSnapshotId),
    getTasteSnapshotById(result.challengerSnapshotId),
    getRecommendationsForProfiles([challenge.ownerProfileId, entry.challengerProfileId]),
  ]);
  const explanations = ownerSnapshot && challengerSnapshot ? calculateCompatibility(ownerSnapshot, challengerSnapshot).explanations : null;
  return {
    resultId,
    challengeCode,
    ownerNickname: challenge.ownerNickname,
    challengerNickname: entry.challengerNickname,
    score: result.overallScore,
    band: result.band,
    sharedGenres: result.sharedGenres,
    differentGenres: result.differentGenres,
    ownerRecommendedGenres: explanations?.ownerRecommendationGenreKeys.map((key: string) => genreLabels[key]).filter(Boolean) ?? [],
    challengerRecommendedGenres: explanations?.challengerRecommendationGenreKeys.map((key: string) => genreLabels[key]).filter(Boolean) ?? [],
    ownerRecommendations: recommendations[challenge.ownerProfileId] ?? [],
    challengerRecommendations: recommendations[entry.challengerProfileId] ?? [],
    sharedTasteLabels: result.sharedTasteLabels,
    trustSentence: pairTrustSentence({ score: result.overallScore, recommenderNickname: challenge.ownerNickname, genre: result.sharedGenres[0] }),
    rank: entry.rank,
    entryCount: ranking.length,
  };
}

export async function getChallengeRanking(input: { challengeCode: string; limit?: number; viewerPublicProfileId?: string | null; ownerManageToken?: string | null; ownerAnonymousId?: string | null }) {
  const challenge = await findChallenge(input.challengeCode);
  if (!challenge) return null;

  const canManage = await hasOwnerAccess(challenge, input.ownerManageToken, input.ownerAnonymousId);
  const allEntries = await challengeEntries(challenge.challengeId);
  const ranked = denseRankEntries(allEntries) as Array<ChallengeEntry & { rank: number }>;
  const viewerSnapshot = input.viewerPublicProfileId ? await getTasteSnapshot(input.viewerPublicProfileId) : null;
  const viewerProfileId = viewerSnapshot?.profileId ?? null;
  const base = {
    challengeCode: challenge.challengeCode,
    ownerNickname: challenge.ownerNickname,
    entryCount: ranked.length,
    status: challenge.status,
    rankingVisibility: challenge.rankingVisibility,
    canManage,
    version: {
      questionSetVersion: challenge.questionSetVersion,
      compatibilityVersion: challenge.compatibilityVersion,
    },
  };

  if (challenge.rankingVisibility === "private" && !canManage) {
    return { ...base, top20: [], viewerEntry: null, hiddenEntries: [] };
  }

  const window = selectRankingWindow(ranked, viewerProfileId, input.limit ?? 20) as {
    top20: Array<ChallengeEntry & { rank: number }>;
    viewerEntry: (ChallengeEntry & { rank: number }) | null;
  };
  const hiddenEntries = canManage
    ? allEntries
      .filter((entry) => entry.hiddenByOwner)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((entry) => publicRankingEntry(entry, viewerProfileId))
    : [];

  return {
    ...base,
    top20: window.top20.map((entry) => publicRankingEntry(entry, viewerProfileId)),
    viewerEntry: window.viewerEntry ? publicRankingEntry(window.viewerEntry, viewerProfileId) : null,
    hiddenEntries,
  };
}

export async function updateChallengeEntryVisibility(input: { challengeCode: string; entryId: string; hiddenByOwner: boolean; ownerManageToken?: string | null; ownerAnonymousId?: string | null }) {
  const challenge = await findChallenge(input.challengeCode);
  if (!challenge) throw new Error("CHALLENGE_NOT_FOUND");
  if (!await hasOwnerAccess(challenge, input.ownerManageToken, input.ownerAnonymousId)) throw new Error("OWNER_AUTH_REQUIRED");

  const database = getMatchDatabase();
  const rows = await database<{ entry_id: string; hidden_by_owner: boolean }[]>`
    update public.match_challenge_entries
    set hidden_by_owner = ${input.hiddenByOwner}, updated_at = now()
    where challenge_id = ${challenge.challengeId}::uuid
      and entry_id = ${input.entryId}::uuid
    returning entry_id::text, hidden_by_owner
  `;
  if (!rows[0]) throw new Error("CHALLENGE_ENTRY_NOT_FOUND");
  return { entryId: rows[0].entry_id, hiddenByOwner: rows[0].hidden_by_owner };
}

export async function updateChallenge(input: { challengeCode: string; status?: "active" | "closed"; rankingVisibility?: boolean; ownerManageToken?: string | null; ownerAnonymousId?: string | null }) {
  const challenge = await findChallenge(input.challengeCode);
  if (!challenge) throw new Error("CHALLENGE_NOT_FOUND");
  if (!await hasOwnerAccess(challenge, input.ownerManageToken, input.ownerAnonymousId)) throw new Error("OWNER_AUTH_REQUIRED");

  const status = input.status ?? challenge.status;
  const rankingVisibility = typeof input.rankingVisibility === "boolean"
    ? input.rankingVisibility ? "public_by_link" : "private"
    : challenge.rankingVisibility;
  const closedAt = input.status === "closed"
    ? new Date().toISOString()
    : input.status === "active" ? null : challenge.closedAt;

  if (status === "active") {
    const otherActiveChallenge = await activeChallengeForProfile(challenge.ownerProfileId, challenge.challengeCode);
    if (otherActiveChallenge) throw new ActiveChallengeExistsError(otherActiveChallenge.challengeCode);
  }

  try {
    const database = getMatchDatabase();
    await database`
      update public.match_challenges
      set status = ${status},
          ranking_visibility = ${rankingVisibility},
          closed_at = ${closedAt}::timestamptz
      where challenge_id = ${challenge.challengeId}::uuid
    `;
  } catch (error) {
    if (isPostgresError(error, "23505", "match_challenges_one_active_per_owner_idx")) {
      const existing = await activeChallengeForProfile(challenge.ownerProfileId, challenge.challengeCode);
      if (existing) throw new ActiveChallengeExistsError(existing.challengeCode);
    }
    throw error;
  }

  const updated = await findChallenge(challenge.challengeCode);
  if (!updated) throw new Error("CHALLENGE_NOT_FOUND");
  return publicChallenge(updated);
}
