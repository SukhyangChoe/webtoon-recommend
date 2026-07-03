import type { DetailTestKey, StoredDetailTestResult } from "@/types/testResults";
import {
  clearTestResult,
  loadTestResult,
  saveTestResult,
} from "./resultRepository";

export const FANTASY_DETAIL_RESULT_KEY = "webtoon_fantasy_detail_result";
export const MURIM_DETAIL_RESULT_KEY = "webtoon_murim_detail_result";
export const USER_TASTE_PROFILE_KEY = "webtoon_user_taste_profile";

export type StoredDetailTestResultLegacy = StoredDetailTestResult;
export type FantasyDetailStoredResult = StoredDetailTestResult;

export function saveDetailTestResult(
  testKey: DetailTestKey,
  result: StoredDetailTestResult
) {
  saveTestResult(testKey, result);
}

export function loadDetailTestResult(
  testKey: DetailTestKey
): StoredDetailTestResult | null {
  return loadTestResult(testKey);
}

export function clearDetailTestResult(testKey: DetailTestKey) {
  clearTestResult(testKey);
}

export function saveFantasyDetailResult(result: FantasyDetailStoredResult) {
  saveTestResult("fantasy_detail", result);
}

export function loadFantasyDetailResult(): FantasyDetailStoredResult | null {
  return loadTestResult("fantasy_detail");
}

export function clearFantasyDetailResult() {
  clearTestResult("fantasy_detail");
}

export function saveMurimDetailResult(result: StoredDetailTestResult) {
  saveTestResult("murim_detail", result);
}

export function loadMurimDetailResult(): StoredDetailTestResult | null {
  return loadTestResult("murim_detail");
}

export function clearMurimDetailResult() {
  clearTestResult("murim_detail");
}
