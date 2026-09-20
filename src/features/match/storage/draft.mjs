import { MATCH_VERSIONS } from "../config/versions.mjs";

export const MATCH_DRAFT_STORAGE_KEY = "webtoon-match:test-draft:v1";

export function createEmptyMatchDraft(now = new Date().toISOString()) {
  return {
    schemaVersion: MATCH_VERSIONS.draft,
    testVersion: MATCH_VERSIONS.test,
    questionSetVersion: MATCH_VERSIONS.questions,
    currentPath: "/match/test/intro",
    nickname: "",
    answers: {},
    startedAt: now,
    updatedAt: now,
  };
}

export function isCompatibleMatchDraft(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      value.schemaVersion === MATCH_VERSIONS.draft &&
      value.testVersion === MATCH_VERSIONS.test &&
      value.questionSetVersion === MATCH_VERSIONS.questions &&
      typeof value.currentPath === "string" &&
      value.currentPath.startsWith("/match/") &&
      value.answers &&
      typeof value.answers === "object" &&
      !Array.isArray(value.answers)
  );
}

export function readMatchDraft(storage) {
  const raw = storage?.getItem(MATCH_DRAFT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isCompatibleMatchDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeMatchDraft(storage, draft, now = new Date().toISOString()) {
  const next = { ...draft, updatedAt: now };
  if (!isCompatibleMatchDraft(next)) throw new Error("Cannot persist an incompatible match draft");
  storage?.setItem(MATCH_DRAFT_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function getMatchHomeState(draft) {
  if (!draft) return { status: "not_started" };
  if (draft.resultPublicId) {
    return { status: "completed", resultPublicId: draft.resultPublicId };
  }
  if (draft.currentPath && draft.currentPath !== "/match/test/intro") {
    return { status: "in_progress", resumePath: draft.currentPath };
  }
  return { status: "not_started" };
}

export function resetMatchDraft(storage, now = new Date().toISOString()) {
  const draft = createEmptyMatchDraft(now);
  return writeMatchDraft(storage, draft, now);
}
