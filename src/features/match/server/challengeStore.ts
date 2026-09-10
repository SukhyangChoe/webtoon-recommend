import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import questionSeed from "../data/questionSeed.v0.4.json";
import { MATCH_COMPATIBILITY_CONFIG } from "../config/compatibility.mjs";
import { calculateCompatibility } from "../engine/compatibilityEngine.mjs";
import { denseRankEntries, selectRankingWindow } from "../engine/rankingPolicy.mjs";
import { getTasteSnapshot } from "./resultStore";
import { sanitizeMatchNickname } from "./nickname.mjs";

type StoredSnapshot = NonNullable<ReturnType<typeof getTasteSnapshot>>;
type Challenge = {
  challengeId: string; challengeCode: string; ownerAnonymousId: string; ownerProfileId: string; ownerSnapshotId: string;
  ownerNickname: string; questionSetVersion: string; compatibilityVersion: string;
  status: "active" | "closed" | "deleted"; rankingVisibility: "public_by_link" | "private";
  ownerManageTokenHash: string; createdAt: string; closedAt: string | null;
};
type CompatibilityResult = {
  resultId: string; challengeId: string; ownerSnapshotId: string; challengerSnapshotId: string;
  compatibilityVersion: string; overallScore: number; band: { key: string; label: string; subcopy: string };
  componentScoresPrivate: Record<string, unknown>; ownerToChallengerTrustPrivate: number;
  challengerToOwnerTrustPrivate: number; sharedGenres: string[]; differentGenres: string[];
  sharedTasteLabels: string[]; trustSentence: string; createdAt: string;
};
type ChallengeEntry = {
  entryId: string; challengeId: string; challengerProfileId: string; challengerSnapshotId: string;
  resultId: string; challengerNickname: string; score: number; hiddenByOwner: boolean;
  createdAt: string; updatedAt: string; history: Array<Record<string, unknown>>;
};

const challenges = new Map<string, Challenge>();
const compatibilityResults = new Map<string, CompatibilityResult>();
const entries = new Map<string, ChallengeEntry>();

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

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function findOwnerSnapshot(challenge: Challenge) {
  return pinnedOwnerSnapshots.get(challenge.ownerSnapshotId) ?? null;
}

function isChallengeOwner(challenge: Challenge, anonymousId: string) {
  return challenge.ownerAnonymousId === anonymousId || findOwnerSnapshot(challenge)?.anonymousId === anonymousId;
}

const pinnedOwnerSnapshots = new Map<string, StoredSnapshot>();
const pinnedSnapshots = new Map<string, StoredSnapshot>();

function challengeEntries(challengeId: string) {
  return [...entries.values()].filter((entry) => entry.challengeId === challengeId && !entry.hiddenByOwner);
}

function rankedEntries(challengeId: string) {
  return denseRankEntries(challengeEntries(challengeId)) as Array<ChallengeEntry & { rank: number }>;
}

function hasOwnerAccess(challenge: Challenge, ownerManageToken?: string | null) {
  if (!ownerManageToken) return false;
  const actual = Buffer.from(challenge.ownerManageTokenHash, "hex");
  const candidate = Buffer.from(hashToken(ownerManageToken), "hex");
  return actual.length === candidate.length && timingSafeEqual(actual, candidate);
}

function publicRankingEntry(entry: ChallengeEntry & { rank?: number }, viewerProfileId?: string | null) {
  const result = compatibilityResults.get(entry.resultId);
  return {
    entryId: entry.entryId,
    nickname: entry.challengerNickname,
    score: entry.score,
    rank: entry.rank ?? null,
    sharedGenres: result?.sharedGenres.slice(0, 2) ?? [],
    isViewer: Boolean(viewerProfileId && entry.challengerProfileId === viewerProfileId),
    updatedAt: entry.updatedAt,
  };
}

function publicChallenge(challenge: Challenge) {
  const ranking = rankedEntries(challenge.challengeId);
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

export function createChallenge(input: { anonymousId: string; ownerPublicProfileId: string; ownerNickname: string; rankingVisibility?: boolean }) {
  const ownerSnapshot = getTasteSnapshot(input.ownerPublicProfileId);
  if (!ownerSnapshot || ownerSnapshot.anonymousId !== input.anonymousId) throw new Error("OWNER_SNAPSHOT_NOT_FOUND");
  const existingActiveChallenge = [...challenges.values()].find((challenge) => isChallengeOwner(challenge, input.anonymousId) && challenge.status === "active");
  if (existingActiveChallenge) throw new ActiveChallengeExistsError(existingActiveChallenge.challengeCode);
  const ownerNickname = sanitizeMatchNickname(input.ownerNickname);
  const ownerManageToken = randomBytes(32).toString("base64url");
  const challenge: Challenge = {
    challengeId: randomUUID(), challengeCode: randomBytes(9).toString("base64url"),
    ownerAnonymousId: input.anonymousId, ownerProfileId: ownerSnapshot.profileId, ownerSnapshotId: ownerSnapshot.snapshotId,
    ownerNickname, questionSetVersion: ownerSnapshot.questionSetVersion,
    compatibilityVersion: MATCH_COMPATIBILITY_CONFIG.version, status: "active",
    rankingVisibility: input.rankingVisibility === false ? "private" : "public_by_link",
    ownerManageTokenHash: hashToken(ownerManageToken), createdAt: new Date().toISOString(), closedAt: null,
  };
  challenges.set(challenge.challengeCode, challenge);
  pinnedOwnerSnapshots.set(ownerSnapshot.snapshotId, ownerSnapshot);
  return { challenge: publicChallenge(challenge), ownerManageToken };
}

export function getPublicChallenge(challengeCode: string) {
  const challenge = challenges.get(challengeCode);
  return challenge ? publicChallenge(challenge) : null;
}

export function getActiveChallengeForOwner(anonymousId: string) {
  const challenge = [...challenges.values()].find((candidate) => isChallengeOwner(candidate, anonymousId) && candidate.status === "active");
  return challenge ? publicChallenge(challenge) : null;
}

function trustLabel(value: number) {
  if (value >= 0.85) return "추천을 꽤 믿고 봐도 됨";
  if (value >= 0.7) return "주력 장르는 꽤 믿을 만함";
  if (value >= 0.55) return "장르를 확인하고 들으면 됨";
  return "추천은 참고하면 좋음";
}

export function createChallengeEntry(input: { challengeCode: string; anonymousId: string; challengerPublicProfileId: string; challengerNickname: string }) {
  const challenge = challenges.get(input.challengeCode);
  if (!challenge) throw new Error("CHALLENGE_NOT_FOUND");
  if (challenge.status !== "active") throw new Error("CHALLENGE_CLOSED");
  const ownerSnapshot = findOwnerSnapshot(challenge);
  const challengerSnapshot = getTasteSnapshot(input.challengerPublicProfileId);
  if (!ownerSnapshot || !challengerSnapshot || challengerSnapshot.anonymousId !== input.anonymousId) throw new Error("CHALLENGER_SNAPSHOT_NOT_FOUND");
  if (challengerSnapshot.questionSetVersion !== challenge.questionSetVersion) throw new Error("QUESTION_VERSION_MISMATCH");
  if (challenge.compatibilityVersion !== MATCH_COMPATIBILITY_CONFIG.version) throw new Error("COMPATIBILITY_VERSION_MISMATCH");
  const challengerNickname = sanitizeMatchNickname(input.challengerNickname);
  const calculated = calculateCompatibility(ownerSnapshot, challengerSnapshot);
  const resultId = randomBytes(12).toString("base64url");
  const sharedGenres = calculated.explanations.sharedGenreKeys.map((key: string) => genreLabels[key]);
  const differentGenres = calculated.explanations.differentGenreKeys.map((key: string) => genreLabels[key]);
  const sharedTasteLabels = calculated.explanations.sharedTasteKeys.map((key: string) => featureLabels[key]).filter(Boolean);
  const trustGenre = sharedGenres[0] ?? genreLabels[Object.entries(ownerSnapshot.rawGenreAffinity).sort((a, b) => b[1] - a[1])[0]?.[0]] ?? "주력 장르";
  const result: CompatibilityResult = {
    resultId, challengeId: challenge.challengeId, ownerSnapshotId: ownerSnapshot.snapshotId,
    challengerSnapshotId: challengerSnapshot.snapshotId, compatibilityVersion: challenge.compatibilityVersion,
    overallScore: calculated.score, band: calculated.band, componentScoresPrivate: calculated.private,
    ownerToChallengerTrustPrivate: calculated.private.ownerToChallengerTrust,
    challengerToOwnerTrustPrivate: calculated.private.challengerToOwnerTrust,
    sharedGenres, differentGenres, sharedTasteLabels,
    trustSentence: `${challenge.ownerNickname}님의 ${trustGenre} 추천은 ${trustLabel(calculated.private.ownerToChallengerTrust)}.`,
    createdAt: new Date().toISOString(),
  };
  compatibilityResults.set(resultId, result);
  pinnedSnapshots.set(challengerSnapshot.snapshotId, challengerSnapshot);
  const entryKey = `${challenge.challengeId}:${challengerSnapshot.profileId}`;
  const previous = entries.get(entryKey);
  const now = new Date().toISOString();
  const entry: ChallengeEntry = previous ? {
    ...previous,
    challengerSnapshotId: challengerSnapshot.snapshotId, resultId, challengerNickname,
    score: calculated.score, updatedAt: now,
    history: [...previous.history, { challengerSnapshotId: previous.challengerSnapshotId, resultId: previous.resultId, score: previous.score, updatedAt: previous.updatedAt }],
  } : {
    entryId: randomUUID(), challengeId: challenge.challengeId, challengerProfileId: challengerSnapshot.profileId,
    challengerSnapshotId: challengerSnapshot.snapshotId, resultId, challengerNickname,
    score: calculated.score, hiddenByOwner: false, createdAt: now, updatedAt: now, history: [],
  };
  entries.set(entryKey, entry);
  const rank = rankedEntries(challenge.challengeId).find((item) => item.entryId === entry.entryId)?.rank ?? null;
  return { resultId, score: result.overallScore, rank, updated: Boolean(previous) };
}

export function getPublicPairResult(challengeCode: string, resultId: string) {
  const challenge = challenges.get(challengeCode);
  const result = compatibilityResults.get(resultId);
  if (!challenge || !result || result.challengeId !== challenge.challengeId) return null;
  const entry = rankedEntries(challenge.challengeId).find((item) => item.resultId === resultId);
  if (!entry) return null;
  return {
    resultId, challengeCode, ownerNickname: challenge.ownerNickname,
    challengerNickname: entry.challengerNickname, score: result.overallScore,
    band: result.band, sharedGenres: result.sharedGenres,
    differentGenres: result.differentGenres, sharedTasteLabels: result.sharedTasteLabels,
    trustSentence: result.trustSentence, rank: entry.rank,
    entryCount: rankedEntries(challenge.challengeId).length,
  };
}

export function getChallengeRanking(input: { challengeCode: string; limit?: number; viewerPublicProfileId?: string | null; ownerManageToken?: string | null }) {
  const challenge = challenges.get(input.challengeCode);
  if (!challenge) return null;

  const canManage = hasOwnerAccess(challenge, input.ownerManageToken);
  const ranked = rankedEntries(challenge.challengeId);
  const viewerSnapshot = input.viewerPublicProfileId ? getTasteSnapshot(input.viewerPublicProfileId) : null;
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
    ? [...entries.values()]
      .filter((entry) => entry.challengeId === challenge.challengeId && entry.hiddenByOwner)
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

export function updateChallengeEntryVisibility(input: { challengeCode: string; entryId: string; hiddenByOwner: boolean; ownerManageToken?: string | null }) {
  const challenge = challenges.get(input.challengeCode);
  if (!challenge) throw new Error("CHALLENGE_NOT_FOUND");
  if (!hasOwnerAccess(challenge, input.ownerManageToken)) throw new Error("OWNER_AUTH_REQUIRED");

  const found = [...entries.entries()].find(([, entry]) => entry.challengeId === challenge.challengeId && entry.entryId === input.entryId);
  if (!found) throw new Error("CHALLENGE_ENTRY_NOT_FOUND");
  const [entryKey, entry] = found;
  const updated = { ...entry, hiddenByOwner: input.hiddenByOwner, updatedAt: new Date().toISOString() };
  entries.set(entryKey, updated);
  return { entryId: updated.entryId, hiddenByOwner: updated.hiddenByOwner };
}

export function updateChallenge(input: { challengeCode: string; status?: "active" | "closed"; rankingVisibility?: boolean; ownerManageToken?: string | null }) {
  const challenge = challenges.get(input.challengeCode);
  if (!challenge) throw new Error("CHALLENGE_NOT_FOUND");
  if (!hasOwnerAccess(challenge, input.ownerManageToken)) throw new Error("OWNER_AUTH_REQUIRED");

  if (input.status) {
    const ownerAnonymousId = challenge.ownerAnonymousId || findOwnerSnapshot(challenge)?.anonymousId;
    const otherActiveChallenge = input.status === "active" && ownerAnonymousId
      ? [...challenges.values()].find((candidate) => candidate.challengeCode !== challenge.challengeCode && isChallengeOwner(candidate, ownerAnonymousId) && candidate.status === "active")
      : null;
    if (otherActiveChallenge) throw new ActiveChallengeExistsError(otherActiveChallenge.challengeCode);
    challenge.status = input.status;
    challenge.closedAt = input.status === "closed" ? new Date().toISOString() : null;
  }
  if (typeof input.rankingVisibility === "boolean") {
    challenge.rankingVisibility = input.rankingVisibility ? "public_by_link" : "private";
  }
  challenges.set(challenge.challengeCode, challenge);
  return publicChallenge(challenge);
}
