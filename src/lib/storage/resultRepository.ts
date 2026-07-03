import type {
    DetailTestKey,
    StoredDetailTestResult,
    StoredGenrePreferenceResult,
    StoredTestResult,
    TestKey,
  } from "@/types/testResults";
  
  export const TEST_RESULT_STORAGE_KEYS: Record<TestKey, string> = {
    genre_preference: "webtoon_genre_preference_result",
    fantasy_detail: "webtoon_fantasy_detail_result",
    murim_detail: "webtoon_murim_detail_result",
    romance_ropan_detail: "webtoon_romance_ropan_detail_result",
    thriller_horror_detail: "webtoon_thriller_horror_detail_result",
    drama_daily_detail: "webtoon_drama_daily_detail_result",
  };
  
  function isBrowser() {
    return typeof window !== "undefined";
  }
  
  export function getTestResultStorageKey(testKey: TestKey | string) {
    return (
      TEST_RESULT_STORAGE_KEYS[testKey as TestKey] ?? 
      `webtoon_${testKey}_result`
    );
  }
  
  function parseStoredResult(raw: string | null): StoredTestResult | null {
    if (!raw) return null;
  
    try {
      return JSON.parse(raw) as StoredTestResult;
    } catch {
      return null;
    }
  }
  
  export function saveTestResult(
    testKey: "genre_preference",
    result: StoredGenrePreferenceResult
  ): void;
  
  export function saveTestResult(
    testKey: DetailTestKey,
    result: StoredDetailTestResult
  ): void;
  
  export function saveTestResult(
    testKey: TestKey | string,
    result: StoredTestResult
  ): void {
    if (!isBrowser()) return;
  
    const storageKey = getTestResultStorageKey(testKey);
  
    localStorage.setItem(storageKey, JSON.stringify(result));
  }
  
  export function loadTestResult(
    testKey: "genre_preference"
  ): StoredGenrePreferenceResult | null;
  
  export function loadTestResult(
    testKey: DetailTestKey
  ): StoredDetailTestResult | null;
  
  export function loadTestResult<T extends StoredTestResult = StoredTestResult>(
    testKey: TestKey | string
  ): T | null {
    if (!isBrowser()) return null;
  
    const storageKey = getTestResultStorageKey(testKey);
    const raw = localStorage.getItem(storageKey);
  
    return parseStoredResult(raw) as T | null;
  }
  
  export function clearTestResult(testKey: TestKey | string) {
    if (!isBrowser()) return;
  
    const storageKey = getTestResultStorageKey(testKey);
  
    localStorage.removeItem(storageKey);
  }
  
  export function hasTestResult(testKey: TestKey | string) {
    if (!isBrowser()) return false;
  
    const storageKey = getTestResultStorageKey(testKey);
  
    return localStorage.getItem(storageKey) !== null;
  }
  
  export function loadAllKnownTestResults() {
    const results: Partial<Record<TestKey, StoredTestResult>> = {};
  
    if (!isBrowser()) return results;
  
    (Object.keys(TEST_RESULT_STORAGE_KEYS) as TestKey[]).forEach((testKey) => {
      const storageKey = getTestResultStorageKey(testKey);
      const result = parseStoredResult(localStorage.getItem(storageKey));
  
      if (result) {
        results[testKey] = result;
      }
    });
  
    return results;
  }
  
  export function clearAllKnownTestResults() {
    if (!isBrowser()) return;
  
    (Object.keys(TEST_RESULT_STORAGE_KEYS) as TestKey[]).forEach((testKey) => {
      clearTestResult(testKey);
    });
  }