import type { RecommendationVector } from "./similarWorkRecommendation";
import type { ScoreMap } from "./vector";
import type {
  DetailTestKey,
  StoredDetailTestResult,
} from "@/types/testResults";

const DETAIL_TEST_GENRE_SCORE = 5;

export const DETAIL_TEST_GENRE_BY_TEST_KEY: Record<
  DetailTestKey,
  string
> = {
  fantasy_detail: "fantasy",
  murim_detail: "murim",
  romance_ropan_detail: "romance_ropan",
  thriller_horror_detail: "thriller_horror",
  drama_daily_detail: "drama_daily",
};

export const DETAIL_TEST_ROUTE_BY_TEST_KEY: Record<
  DetailTestKey,
  string
> = {
  fantasy_detail: "/tests/fantasy",
  murim_detail: "/tests/murim",
  romance_ropan_detail: "/tests/romance-ropan",
  thriller_horror_detail: "/tests/thriller-horror",
  drama_daily_detail: "/tests/drama-daily",
};

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPositiveScoreMap(value: unknown): ScoreMap {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(([, score]) => {
      return (
        typeof score === "number" &&
        Number.isFinite(score) &&
        score > 0
      );
    })
  ) as ScoreMap;
}

export function isDetailTestKey(
  value: string | null | undefined
): value is DetailTestKey {
  return Boolean(value && value in DETAIL_TEST_GENRE_BY_TEST_KEY);
}

export function isStoredDetailTestResultForKey(
  value: unknown,
  sourceTestKey: DetailTestKey
): value is StoredDetailTestResult {
  if (!isRecord(value)) return false;
  if (value.testKey !== sourceTestKey) return false;

  return (
    isRecord(value.branchScores) &&
    isRecord(value.tagScores) &&
    isRecord(value.avoidanceTagScores)
  );
}

export function buildDetailTestRecommendationVector(
  testKey: DetailTestKey,
  storedDetailResult: StoredDetailTestResult
): RecommendationVector {
  if (!isStoredDetailTestResultForKey(storedDetailResult, testKey)) {
    throw new Error("DETAIL_TEST_RESULT_NOT_READY");
  }

  const genreKey = DETAIL_TEST_GENRE_BY_TEST_KEY[testKey];
  const branchScores = toPositiveScoreMap(
    storedDetailResult.branchScores
  );
  const tagScores = toPositiveScoreMap(storedDetailResult.tagScores);
  const avoidanceTagScores = toPositiveScoreMap(
    storedDetailResult.avoidanceTagScores
  );
  const artStyleScores = toPositiveScoreMap(
    storedDetailResult.artStyleScores
  );

  return {
    genreScores: {
      [genreKey]: DETAIL_TEST_GENRE_SCORE,
    },
    typeScores: {
      [genreKey]: branchScores,
    },
    tagScores,
    avoidanceTagScores,
    contentAxisScores: {},
    ...(Object.keys(artStyleScores).length > 0
      ? { artStyleScores }
      : {}),
    visualStyleMigrationStatus:
      Object.keys(artStyleScores).length > 0
        ? "art_style_v1_ready"
        : "legacy_visual_appeal",
  };
}