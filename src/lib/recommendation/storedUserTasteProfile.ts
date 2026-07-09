import { loadTestResult } from "@/lib/storage/resultRepository";

import type { ScoreMap } from "./vector";

export type StoredUserTasteProfile = {
  sourceKeys: string[];
  userGenreScores: ScoreMap;
  userTypeScores: ScoreMap;
  userTagScores: ScoreMap;
  userAvoidanceScores: ScoreMap;
};

type RawRecord = Record<string, unknown>;

type DetailTestConfig = {
  testKey:
    | "fantasy_detail"
    | "murim_detail"
    | "romance_ropan_detail"
    | "thriller_horror_detail"
    | "drama_daily_detail";
  storageKey: string;
};

type StoredTasteProfileTestKey = "genre_preference" | DetailTestConfig["testKey"];

const DETAIL_TEST_CONFIGS: DetailTestConfig[] = [
  {
    testKey: "fantasy_detail",
    storageKey: "webtoon_fantasy_detail_result",
  },
  {
    testKey: "murim_detail",
    storageKey: "webtoon_murim_detail_result",
  },
  {
    testKey: "romance_ropan_detail",
    storageKey: "webtoon_romance_ropan_detail_result",
  },
  {
    testKey: "thriller_horror_detail",
    storageKey: "webtoon_thriller_horror_detail_result",
  },
  {
    testKey: "drama_daily_detail",
    storageKey: "webtoon_drama_daily_detail_result",
  },
];

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(record: RawRecord | null | undefined, key: string) {
  if (!record) return undefined;

  const value = record[key];

  return typeof value === "string" ? value : undefined;
}

function toScoreMap(value: unknown): ScoreMap {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(([, score]) => typeof score === "number")
  ) as ScoreMap;
}

function hasScores(scoreMap: ScoreMap) {
  return Object.keys(scoreMap).length > 0;
}

function addScores(target: ScoreMap, source: ScoreMap): void {
  Object.entries(source).forEach(([key, value]) => {
    target[key] = roundScore((target[key] ?? 0) + value);
  });
}

function roundScore(value: number) {
  return Math.round(value * 10000) / 10000;
}

function normalizePercentageToGenreScore(value: number) {
  if (value > 5) {
    return roundScore(value / 20);
  }

  if (value > 0 && value <= 1) {
    return roundScore(value * 5);
  }

  return value;
}

function scoreMapFromPercentObject(value: unknown): ScoreMap {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, score]) => typeof score === "number")
      .map(([key, score]) => [
        key,
        normalizePercentageToGenreScore(score as number),
      ])
      .filter(([, score]) => (score as number) > 0)
  ) as ScoreMap;
}

function scoreMapFromPercentArray(value: unknown): ScoreMap {
  if (!Array.isArray(value)) return {};

  return value.reduce<ScoreMap>((scoreMap, item) => {
    if (!isRecord(item)) return scoreMap;

    const genreKey =
      getStringValue(item, "genreKey") ??
      getStringValue(item, "key") ??
      getStringValue(item, "genre");

    const rawScore =
      typeof item.percentage === "number"
        ? item.percentage
        : typeof item.finalGenrePercentage === "number"
          ? item.finalGenrePercentage
          : typeof item.value === "number"
            ? item.value
            : undefined;

    if (!genreKey || typeof rawScore !== "number") {
      return scoreMap;
    }

    scoreMap[genreKey] = normalizePercentageToGenreScore(rawScore);

    return scoreMap;
  }, {});
}

function getGenrePreferenceScores(result: RawRecord | null): ScoreMap {
  if (!result) return {};

  const finalGenreScores = toScoreMap(result.finalGenreScores);

  if (hasScores(finalGenreScores)) {
    return finalGenreScores;
  }

  const positiveGenreScores = toScoreMap(result.positiveGenreScores);

  if (hasScores(positiveGenreScores)) {
    return positiveGenreScores;
  }

  const userGenreScores = toScoreMap(result.userGenreScores);

  if (hasScores(userGenreScores)) {
    return userGenreScores;
  }

  const finalGenrePercentagesFromObject = scoreMapFromPercentObject(
    result.finalGenrePercentages
  );

  if (hasScores(finalGenrePercentagesFromObject)) {
    return finalGenrePercentagesFromObject;
  }

  const finalGenrePercentagesFromArray = scoreMapFromPercentArray(
    result.finalGenrePercentages
  );

  if (hasScores(finalGenrePercentagesFromArray)) {
    return finalGenrePercentagesFromArray;
  }

  const genrePercentagesFromObject = scoreMapFromPercentObject(
    result.genrePercentages
  );

  if (hasScores(genrePercentagesFromObject)) {
    return genrePercentagesFromObject;
  }

  return scoreMapFromPercentArray(result.genrePercentages);
}

function loadRawTestResult(
  testKey: StoredTasteProfileTestKey
): RawRecord | null {
  if (testKey === "genre_preference") {
    return loadTestResult("genre_preference") as unknown as RawRecord | null;
  }

  return loadTestResult(testKey) as unknown as RawRecord | null;
}

export function buildStoredUserTasteProfile(): StoredUserTasteProfile | null {
  const sourceKeys: string[] = [];
  const userGenreScores: ScoreMap = {};
  const userTypeScores: ScoreMap = {};
  const userTagScores: ScoreMap = {};
  const userAvoidanceScores: ScoreMap = {};

  const genrePreferenceResult = loadRawTestResult("genre_preference");
  const genrePreferenceScores = getGenrePreferenceScores(genrePreferenceResult);
  const genrePreferenceTagScores = toScoreMap(genrePreferenceResult?.tagScores);

  if (hasScores(genrePreferenceScores) || hasScores(genrePreferenceTagScores)) {
    sourceKeys.push("webtoon_genre_preference_result");
    addScores(userGenreScores, genrePreferenceScores);
    addScores(userTagScores, genrePreferenceTagScores);
  }

  DETAIL_TEST_CONFIGS.forEach(({ testKey, storageKey }) => {
    const detailResult = loadRawTestResult(testKey);

    if (!detailResult) return;

    const branchScores = toScoreMap(detailResult.branchScores);
    const tagScores = toScoreMap(detailResult.tagScores);
    const avoidanceTagScores = toScoreMap(detailResult.avoidanceTagScores);
    const mainBranchKey = getStringValue(detailResult, "mainBranchKey");

    if (
      !hasScores(branchScores) &&
      !hasScores(tagScores) &&
      !hasScores(avoidanceTagScores) &&
      !mainBranchKey
    ) {
      return;
    }

    sourceKeys.push(storageKey);

    addScores(userTypeScores, branchScores);
    addScores(userTagScores, tagScores);
    addScores(userAvoidanceScores, avoidanceTagScores);

    if (mainBranchKey && !userTypeScores[mainBranchKey]) {
      userTypeScores[mainBranchKey] = 1;
    }
  });

  if (sourceKeys.length === 0) {
    return null;
  }

  return {
    sourceKeys,
    userGenreScores,
    userTypeScores,
    userTagScores,
    userAvoidanceScores,
  };
}