import { isDetailTestKey } from "@/lib/recommendation/detailTestRecommendation";

import type { DetailTestKey } from "@/types/testResults";

export const FIND_RECOMMENDATION_ENTRY_STORAGE_KEY =
  "webtoon_find_recommendation_entry";

export type DetailTestRecommendationEntry = {
  recommendationMode: "instant_recommendation";
  vectorSource: "detail_test_result";
  sourceTestKey: DetailTestKey;
  createdAt: string;
};

type RawRecord = Record<string, unknown>;

function canUseSessionStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDetailTestRecommendationEntry(
  raw: string | null
): DetailTestRecommendationEntry | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) return null;
    if (parsed.recommendationMode !== "instant_recommendation") {
      return null;
    }
    if (parsed.vectorSource !== "detail_test_result") {
      return null;
    }
    if (
      typeof parsed.sourceTestKey !== "string" ||
      !isDetailTestKey(parsed.sourceTestKey)
    ) {
      return null;
    }

    return {
      recommendationMode: "instant_recommendation",
      vectorSource: "detail_test_result",
      sourceTestKey: parsed.sourceTestKey,
      createdAt:
        typeof parsed.createdAt === "string"
          ? parsed.createdAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveDetailTestRecommendationEntry(
  sourceTestKey: DetailTestKey
) {
  if (!canUseSessionStorage()) return;

  const entry: DetailTestRecommendationEntry = {
    recommendationMode: "instant_recommendation",
    vectorSource: "detail_test_result",
    sourceTestKey,
    createdAt: new Date().toISOString(),
  };

  window.sessionStorage.setItem(
    FIND_RECOMMENDATION_ENTRY_STORAGE_KEY,
    JSON.stringify(entry)
  );
}

export function consumeDetailTestRecommendationEntry() {
  if (!canUseSessionStorage()) return null;

  const raw = window.sessionStorage.getItem(
    FIND_RECOMMENDATION_ENTRY_STORAGE_KEY
  );

  window.sessionStorage.removeItem(
    FIND_RECOMMENDATION_ENTRY_STORAGE_KEY
  );

  return parseDetailTestRecommendationEntry(raw);
}