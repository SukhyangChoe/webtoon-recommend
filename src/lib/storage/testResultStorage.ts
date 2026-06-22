import type { ScoreMap, TestAnswers } from "@/lib/testEngine/types";

export const FANTASY_DETAIL_RESULT_KEY = "webtoon_fantasy_detail_result";
export const MURIM_DETAIL_RESULT_KEY = "webtoon_murim_detail_result";
export const USER_TASTE_PROFILE_KEY = "webtoon_user_taste_profile";

export type FantasyDetailStoredResult = {
  schemaVersion: "0.2";
  testKey: "fantasy_detail";
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

function isBrowser() {
  return typeof window !== "undefined";
}

export function saveFantasyDetailResult(result: FantasyDetailStoredResult) {
  if (!isBrowser()) return;

  window.localStorage.setItem(
    FANTASY_DETAIL_RESULT_KEY,
    JSON.stringify(result)
  );
}

export function loadFantasyDetailResult(): FantasyDetailStoredResult | null {
  if (!isBrowser()) return null;

  const raw = window.localStorage.getItem(FANTASY_DETAIL_RESULT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as FantasyDetailStoredResult;
  } catch {
    return null;
  }
}

export function clearFantasyDetailResult() {
  if (!isBrowser()) return;

  window.localStorage.removeItem(FANTASY_DETAIL_RESULT_KEY);
}