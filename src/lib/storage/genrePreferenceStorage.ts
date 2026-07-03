import { GENRE_PREFERENCE_STORAGE_KEY } from "@/data/tests/genrePreference";
import {
  calculateGenrePreferenceResult,
  type GenrePreferenceResult,
} from "@/lib/testEngine/calculateGenrePreferenceResult";
import {
  getGenreMapState,
  type GenreMapState,
} from "@/lib/testEngine/getGenreMapState";
import type { StoredGenrePreferenceResult } from "@/types/testResults";
import {
  clearTestResult,
  loadTestResult,
  saveTestResult,
} from "./resultRepository";

export const GENRE_PREFERENCE_RESULT_KEY = GENRE_PREFERENCE_STORAGE_KEY;

export type GenrePreferenceStoredResult = StoredGenrePreferenceResult;

function getKstIsoString() {
  const now = new Date();
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  return kstDate.toISOString().replace("Z", "+09:00");
}

export function createGenrePreferenceStoredResult(
  result: GenrePreferenceResult
): StoredGenrePreferenceResult {
  return {
    schemaVersion: "0.1",
    testKey: "genre_preference",
    testVersion: result.testVersion,
    resultName: result.resultName,
    completedAt: getKstIsoString(),
    answers: result.answers,
    positiveGenreScores: result.positiveGenreScores,
    genreAvoidanceScores: result.genreAvoidanceScores,
    finalGenreScores: result.finalGenreScores,
    finalGenrePercentages: result.finalGenrePercentages.map(
      ({ displayOrder: _displayOrder, ...percentage }) => percentage
    ),
    resultType: result.resultType,
    primaryGenreKey: result.primaryGenreKey ?? "",
    secondaryGenreKey: result.secondaryGenreKey,
    topGenreKeys: result.topGenreKeys,
    mapState: getGenreMapState(result),
    totalFinalGenreScore: result.totalFinalGenreScore,
  };
}

export function saveGenrePreferenceResult(result: GenrePreferenceResult) {
  const storedResult = createGenrePreferenceStoredResult(result);

  saveTestResult("genre_preference", storedResult);

  return storedResult;
}

export function loadGenrePreferenceResult(): StoredGenrePreferenceResult | null {
  return loadTestResult("genre_preference");
}

export function clearGenrePreferenceResult() {
  clearTestResult("genre_preference");
}

export function toGenrePreferenceResult(
  storedResult: StoredGenrePreferenceResult
): GenrePreferenceResult {
  return calculateGenrePreferenceResult({
    answers: storedResult.answers,
  });
}

export function getStoredGenreMapState(
  storedResult: StoredGenrePreferenceResult
): GenreMapState {
  return getGenreMapState(toGenrePreferenceResult(storedResult));
}
