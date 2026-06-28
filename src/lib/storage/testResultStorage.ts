import type { ScoreMap, TestAnswers } from "@/lib/testEngine/types";

export const FANTASY_DETAIL_RESULT_KEY = "webtoon_fantasy_detail_result";
export const MURIM_DETAIL_RESULT_KEY = "webtoon_murim_detail_result";
export const USER_TASTE_PROFILE_KEY = "webtoon_user_taste_profile";

export type StoredDetailTestResult = {
  schemaVersion: "0.2";
  testKey: string;
  testVersion: "v0.2_ranked_multi_select";
  completedAt: string;

  answers: TestAnswers;

  branchScores: ScoreMap;
  tagScores: ScoreMap;
  avoidanceTagScores: ScoreMap;

  mainBranchKey: string | null;
  subBranchKey: string | null;

  resultKey: string;
  resultName: string;
  oneLineDescription: string;
  displayTags: string[];
  imageKey: string;
  shareText: string;
};

export type FantasyDetailStoredResult = StoredDetailTestResult;

function isBrowser() {
  return typeof window !== "undefined";
}

export function saveDetailTestResult(
  storageKey: string,
  result: StoredDetailTestResult
) {
  if (!isBrowser()) return;

  window.localStorage.setItem(storageKey, JSON.stringify(result));
}

export function loadDetailTestResult(
  storageKey: string
): StoredDetailTestResult | null {
  if (!isBrowser()) return null;

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredDetailTestResult;
  } catch {
    return null;
  }
}

export function clearDetailTestResult(storageKey: string) {
  if (!isBrowser()) return;

  window.localStorage.removeItem(storageKey);
}

/**
 * D+5 FantasyTestClient 호환용.
 * D+6 이후 route에서는 DetailTestClient가 generic 함수를 사용한다.
 */
export function saveFantasyDetailResult(result: FantasyDetailStoredResult) {
  saveDetailTestResult(FANTASY_DETAIL_RESULT_KEY, result);
}

export function loadFantasyDetailResult(): FantasyDetailStoredResult | null {
  return loadDetailTestResult(FANTASY_DETAIL_RESULT_KEY);
}

export function clearFantasyDetailResult() {
  clearDetailTestResult(FANTASY_DETAIL_RESULT_KEY);
}