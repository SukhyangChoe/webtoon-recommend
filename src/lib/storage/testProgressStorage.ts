import type { PairChoiceAnswer } from "@/lib/testEngine/calculateGenrePreferenceResult";
import type {
  DetailTestAnswer,
  DetailTestKey,
  RankedSelectedOption,
} from "@/types/detailTest";
import type {
  DetailTestProgress,
  GenrePreferenceProgress,
} from "@/types/testProgress";

export const GENRE_PREFERENCE_PROGRESS_STORAGE_KEY =
  "webtoon_genre_preference_progress_v1";

const DETAIL_TEST_PROGRESS_STORAGE_KEY_PREFIX =
  "webtoon_detail_test_progress_v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidQuestionIndex(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return Number.isFinite(new Date(value).getTime());
}

function isPairChoiceAnswer(value: unknown): value is PairChoiceAnswer {
  if (!isRecord(value)) return false;

  return (
    typeof value.questionKey === "string" &&
    (value.selectedSide === "left" ||
      value.selectedSide === "draw" ||
      value.selectedSide === "right")
  );
}

function isRankedSelectedOption(
  value: unknown
): value is RankedSelectedOption {
  if (!isRecord(value)) return false;

  return (
    typeof value.optionKey === "string" &&
    (value.rank === 1 || value.rank === 2) &&
    typeof value.weight === "number" &&
    Number.isFinite(value.weight)
  );
}

function isDetailTestAnswer(value: unknown): value is DetailTestAnswer {
  if (!isRecord(value)) return false;

  return (
    typeof value.questionKey === "string" &&
    Array.isArray(value.selectedOptions) &&
    value.selectedOptions.length <= 2 &&
    value.selectedOptions.every(isRankedSelectedOption)
  );
}

function isDetailTestKey(value: unknown): value is DetailTestKey {
  return (
    value === "fantasy_detail" ||
    value === "murim_detail" ||
    value === "romance_ropan_detail" ||
    value === "thriller_horror_detail" ||
    value === "drama_daily_detail"
  );
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function getDetailTestProgressStorageKey(testKey: DetailTestKey) {
  return `${DETAIL_TEST_PROGRESS_STORAGE_KEY_PREFIX}:${testKey}`;
}

function isGenrePreferenceProgress(
  value: unknown
): value is GenrePreferenceProgress {
  if (!isRecord(value)) return false;

  return (
    value.schemaVersion === "1.0" &&
    value.testKey === "genre_preference" &&
    typeof value.testVersion === "string" &&
    isValidQuestionIndex(value.currentQuestionIndex) &&
    Array.isArray(value.answers) &&
    value.answers.every(isPairChoiceAnswer) &&
    isValidDateString(value.startedAt) &&
    isValidDateString(value.updatedAt)
  );
}

function isDetailTestProgress(value: unknown): value is DetailTestProgress {
  if (!isRecord(value)) return false;
  if (!isRecord(value.answers)) return false;

  return (
    value.schemaVersion === "1.0" &&
    isDetailTestKey(value.testKey) &&
    typeof value.testVersion === "string" &&
    isValidQuestionIndex(value.currentQuestionIndex) &&
    Object.values(value.answers).every(isDetailTestAnswer) &&
    Array.isArray(value.selectedOptionKeys) &&
    value.selectedOptionKeys.length <= 2 &&
    value.selectedOptionKeys.every((item) => typeof item === "string") &&
    new Set(value.selectedOptionKeys).size === value.selectedOptionKeys.length &&
    isValidDateString(value.startedAt) &&
    isValidDateString(value.updatedAt)
  );
}

export function loadGenrePreferenceProgress(): GenrePreferenceProgress | null {
  if (!isBrowser()) return null;

  const parsed = parseJson(
    window.localStorage.getItem(GENRE_PREFERENCE_PROGRESS_STORAGE_KEY)
  );

  if (isGenrePreferenceProgress(parsed)) {
    return parsed;
  }

  return null;
}

export function saveGenrePreferenceProgress(params: {
  testVersion: string;
  currentQuestionIndex: number;
  answers: PairChoiceAnswer[];
}): GenrePreferenceProgress | null {
  if (!isBrowser()) return null;

  const existing = loadGenrePreferenceProgress();
  const now = new Date().toISOString();
  const progress: GenrePreferenceProgress = {
    schemaVersion: "1.0",
    testKey: "genre_preference",
    testVersion: params.testVersion,
    currentQuestionIndex: Math.max(0, Math.trunc(params.currentQuestionIndex)),
    answers: params.answers,
    startedAt:
      existing?.testVersion === params.testVersion ? existing.startedAt : now,
    updatedAt: now,
  };

  try {
    window.localStorage.setItem(
      GENRE_PREFERENCE_PROGRESS_STORAGE_KEY,
      JSON.stringify(progress)
    );
    return progress;
  } catch {
    return null;
  }
}

export function clearGenrePreferenceProgress() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(GENRE_PREFERENCE_PROGRESS_STORAGE_KEY);
}

export function loadDetailTestProgress(
  testKey: DetailTestKey
): DetailTestProgress | null {
  if (!isBrowser()) return null;

  const parsed = parseJson(
    window.localStorage.getItem(getDetailTestProgressStorageKey(testKey))
  );

  if (isDetailTestProgress(parsed) && parsed.testKey === testKey) {
    return parsed;
  }

  return null;
}

export function saveDetailTestProgress(params: {
  testKey: DetailTestKey;
  testVersion: string;
  currentQuestionIndex: number;
  answers: Record<string, DetailTestAnswer>;
  selectedOptionKeys: string[];
}): DetailTestProgress | null {
  if (!isBrowser()) return null;

  const existing = loadDetailTestProgress(params.testKey);
  const now = new Date().toISOString();
  const progress: DetailTestProgress = {
    schemaVersion: "1.0",
    testKey: params.testKey,
    testVersion: params.testVersion,
    currentQuestionIndex: Math.max(0, Math.trunc(params.currentQuestionIndex)),
    answers: params.answers,
    selectedOptionKeys: Array.from(new Set(params.selectedOptionKeys)).slice(0, 2),
    startedAt:
      existing?.testVersion === params.testVersion ? existing.startedAt : now,
    updatedAt: now,
  };

  try {
    window.localStorage.setItem(
      getDetailTestProgressStorageKey(params.testKey),
      JSON.stringify(progress)
    );
    return progress;
  } catch {
    return null;
  }
}

export function clearDetailTestProgress(testKey: DetailTestKey) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(getDetailTestProgressStorageKey(testKey));
}

export function clearAllTestProgress() {
  if (!isBrowser()) return;

  clearGenrePreferenceProgress();
  (
    [
      "fantasy_detail",
      "murim_detail",
      "romance_ropan_detail",
      "thriller_horror_detail",
      "drama_daily_detail",
    ] as DetailTestKey[]
  ).forEach(clearDetailTestProgress);
}