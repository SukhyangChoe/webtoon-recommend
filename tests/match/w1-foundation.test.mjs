import test from "node:test";
import assert from "node:assert/strict";
import { MATCH_VERSIONS } from "../../src/features/match/config/versions.mjs";
import { ensureAnonymousId, MATCH_ANONYMOUS_STORAGE_KEY } from "../../src/features/match/storage/anonymousIdentity.mjs";
import { createEmptyMatchDraft, getMatchHomeState, isCompatibleMatchDraft, readMatchDraft, resetMatchDraft, writeMatchDraft } from "../../src/features/match/storage/draft.mjs";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
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
  writeMatchDraft(storage, { ...createEmptyMatchDraft(), answers: { genre: { fantasy: "high" } }, resultPublicId: "old-result" });
  const reset = resetMatchDraft(storage, "2026-09-09T00:00:00.000Z");
  assert.deepEqual(reset.answers, {});
  assert.equal(reset.resultPublicId, undefined);
  assert.equal(readMatchDraft(storage).currentPath, "/match/test/intro");
});
