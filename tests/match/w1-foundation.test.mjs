import test from "node:test";
import assert from "node:assert/strict";
import { MATCH_VERSIONS } from "../../src/features/match/config/versions.mjs";
import { ensureAnonymousId, MATCH_ANONYMOUS_STORAGE_KEY } from "../../src/features/match/storage/anonymousIdentity.mjs";
import { clearChallengeResult, clearPairResultPrompt, readChallengeResult, readLatestChallengeResult, readPairResultPrompt, readPendingChallenge, writeChallengeResult, writePairResultPrompt, writePendingChallenge } from "../../src/features/match/storage/challengeStorage.mjs";
import { createEmptyMatchDraft, getMatchHomeState, isCompatibleMatchDraft, readMatchDraft, resetMatchDraft, writeMatchDraft } from "../../src/features/match/storage/draft.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("version constants match the v0.4 source of truth", () => {
  assert.equal(MATCH_VERSIONS.questions, "webtoon_match_question_set_v0_4_candidate");
  assert.equal(MATCH_VERSIONS.scoring, "webtoon_match_compatibility_v0_2_candidate");
});

test("anonymous id is stable and prefers the first-party cookie", () => {
  const storage = memoryStorage();
  const localId = "11111111-1111-4111-8111-111111111111";
  const cookieId = "22222222-2222-4222-8222-222222222222";
  storage.setItem(MATCH_ANONYMOUS_STORAGE_KEY, localId);
  const result = ensureAnonymousId({ cookieText: `wm_aid=${cookieId}`, storage });
  assert.equal(result.anonymousId, cookieId);
  assert.equal(storage.getItem(MATCH_ANONYMOUS_STORAGE_KEY), cookieId);
});

test("generated anonymous id remains stable on later visits", () => {
  const storage = memoryStorage();
  const generatedId = "33333333-3333-4333-8333-333333333333";
  assert.equal(ensureAnonymousId({ storage, createId: () => generatedId }).anonymousId, generatedId);
  assert.equal(ensureAnonymousId({ storage }).anonymousId, generatedId);
});

test("compatible draft restores current path and answers after refresh", () => {
  const storage = memoryStorage();
  const draft = createEmptyMatchDraft("2026-09-06T00:00:00.000Z");
  writeMatchDraft(storage, { ...draft, currentPath: "/match/test/genre-shelf/1", answers: { wm_genre_shelf_01: "high" } }, "2026-09-06T00:01:00.000Z");
  const restored = readMatchDraft(storage);
  assert.equal(restored.currentPath, "/match/test/genre-shelf/1");
  assert.equal(restored.answers.wm_genre_shelf_01, "high");
});

test("stale version drafts are rejected", () => {
  const draft = { ...createEmptyMatchDraft(), questionSetVersion: "v0.3" };
  assert.equal(isCompatibleMatchDraft(draft), false);
});

test("home distinguishes new, in-progress, and completed tests", () => {
  assert.deepEqual(getMatchHomeState(null), { status: "not_started" });
  assert.deepEqual(getMatchHomeState(createEmptyMatchDraft()), { status: "not_started" });
  assert.deepEqual(
    getMatchHomeState({ ...createEmptyMatchDraft(), currentPath: "/match/test/duel/3" }),
    { status: "in_progress", resumePath: "/match/test/duel/3" },
  );
  assert.deepEqual(
    getMatchHomeState({ ...createEmptyMatchDraft(), currentPath: "/match/result/result-123", resultPublicId: "result-123" }),
    { status: "completed", resultPublicId: "result-123" },
  );
});

test("starting again clears previous answers and result linkage", () => {
  const storage = memoryStorage();
  writeMatchDraft(storage, { ...createEmptyMatchDraft(), nickname: "향향", answers: { genre: { fantasy: "high" } }, resultPublicId: "old-result" });
  const reset = resetMatchDraft(storage, "2026-09-09T00:00:00.000Z");
  assert.deepEqual(reset.answers, {});
  assert.equal(reset.nickname, "");
  assert.equal(reset.resultPublicId, undefined);
  assert.equal(readMatchDraft(storage).currentPath, "/match/test/intro");
});

test("test nickname stays with the draft from intro through result creation", () => {
  const storage = memoryStorage();
  writeMatchDraft(storage, { ...createEmptyMatchDraft(), nickname: "향향", currentPath: "/match/test/genre-shelf/1" });
  assert.equal(readMatchDraft(storage).nickname, "향향");
});

test("completed challenge results are remembered per invite link", () => {
  const storage = memoryStorage();
  writeChallengeResult(storage, "invite-a", "result-a", "profile-a");
  writeChallengeResult(storage, "invite-b", "result-b", "profile-b");
  assert.equal(readChallengeResult(storage, "invite-a").resultId, "result-a");
  assert.equal(readChallengeResult(storage, "invite-b").resultId, "result-b");
  assert.equal(readChallengeResult(storage, "invite-c"), null);
  assert.equal(readLatestChallengeResult(storage, "profile-a").challengeCode, "invite-a");
  assert.equal(readLatestChallengeResult(storage, "profile-b").resultId, "result-b");
});

test("challenge nickname and consent are remembered before the test starts", () => {
  const storage = memoryStorage();
  writePendingChallenge(storage, "invite-a", "향향");
  const pending = readPendingChallenge(storage);
  assert.equal(pending.challengeCode, "invite-a");
  assert.equal(pending.challengerNickname, "향향");
  assert.ok(pending.agreedAt);
});

test("a completed invite comparison remains available from the personal result", () => {
  const storage = memoryStorage();
  writePairResultPrompt(storage, "invite-a", "pair-a", "profile-a");
  assert.deepEqual(
    Object.fromEntries(Object.entries(readPairResultPrompt(storage)).filter(([key]) => key !== "savedAt")),
    { challengeCode: "invite-a", resultId: "pair-a", publicProfileId: "profile-a" },
  );
  clearPairResultPrompt(storage);
  clearChallengeResult(storage, "invite-a");
  assert.equal(readPairResultPrompt(storage), null);
  assert.equal(readChallengeResult(storage, "invite-a"), null);
});
