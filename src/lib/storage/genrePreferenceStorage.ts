import { GENRE_PREFERENCE_STORAGE_KEY } from "@/data/tests/genrePreference";
import type {
  GenrePreferenceResult,
  PairChoiceAnswer,
} from "@/lib/testEngine/calculateGenrePreferenceResult";
import {
  getGenreMapState,
  type GenreMapState,
} from "@/lib/testEngine/getGenreMapState";

export const GENRE_PREFERENCE_RESULT_KEY = GENRE_PREFERENCE_STORAGE_KEY;

export type GenrePreferenceStoredResult = GenrePreferenceResult & {
  schemaVersion: "0.1";
  completedAt: string;
  answers: PairChoiceAnswer[];
  mapState: GenreMapState;
};

function getKstIsoString() {
  const now = new Date();
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  return kstDate.toISOString().replace("Z", "+09:00");
}

export function createGenrePreferenceStoredResult(
  result: GenrePreferenceResult
): GenrePreferenceStoredResult {
  return {
    ...result,
    schemaVersion: "0.1",
    completedAt: getKstIsoString(),
    mapState: getGenreMapState(result),
  };
}

export function saveGenrePreferenceResult(result: GenrePreferenceResult) {
  if (typeof window === "undefined") return null;

  const storedResult = createGenrePreferenceStoredResult(result);

  window.localStorage.setItem(
    GENRE_PREFERENCE_RESULT_KEY,
    JSON.stringify(storedResult)
  );

  return storedResult;
}

export function loadGenrePreferenceResult(): GenrePreferenceStoredResult | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(GENRE_PREFERENCE_RESULT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as GenrePreferenceStoredResult;
  } catch {
    return null;
  }
}

export function clearGenrePreferenceResult() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(GENRE_PREFERENCE_RESULT_KEY);
}

export function toGenrePreferenceResult(
  storedResult: GenrePreferenceStoredResult
): GenrePreferenceResult {
  const {
    schemaVersion,
    completedAt,
    mapState,
    ...genrePreferenceResult
  } = storedResult;

  return genrePreferenceResult;
}