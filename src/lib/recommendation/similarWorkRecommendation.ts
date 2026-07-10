import { getContentAxisSearchLabels, getDisplayAxisLabel, getPrimaryContentAxisKey } from "./contentAxis";
import { cosineSimilarity } from "./similarity";
import { buildStoredUserTasteProfile } from "./storedUserTasteProfile";
import { getSourceWeight, normalizeSourceDb } from "./sourceWeight";
import {
  averageScoreMaps,
  clamp,
  dotProduct,
  flattenTypeScores,
  roundScore,
} from "./vector";

import type { StoredUserTasteProfile } from "./storedUserTasteProfile";
import type { SourceDb } from "./sourceWeight";
import type { ScoreMap } from "./vector";

const PRIMARY_STAGE1_WEIGHT = 0.8;
const PRIMARY_LONG_TERM_WEIGHT = 0.2;
const STAGE1_CANDIDATE_POOL_SIZE = 100;

export type WebtoonSeedItem = {
  canonicalWebtoonId: string;
  title: string;
  titleAliases?: string[];
  platform: string;
  officialUrl: string;
  mainGenre: string;
  sourceDb: SourceDb;
  sourceType?: SourceDb;
  sourceWeight: number;
  primaryContentAxisKey: string | null;
  displayAxisLabel: string;
  metadata: {
    status: string;
    ageRating?: string;
    urlStatus?: string;
    qualityScore?: number;
    inputStatus?: string;
    isAdult?: boolean;
  };
  recommendation: {
    recommendationReason?: string;
    scoreVersion?: string;
    genreScores: ScoreMap;
    typeScores?: Record<string, ScoreMap>;
    tagScores?: ScoreMap;
    avoidanceTagScores?: ScoreMap;
    contentAxisScores?: ScoreMap;
  };
};

export type SimilarWorkSelectedWebtoon = {
  canonicalWebtoonId: string;
  title: string;
  platform: string;
  mainGenre: string;
  sourceDb?: SourceDb;
  sourceWeight?: number;
  primaryContentAxisKey?: string | null;
  displayAxisLabel?: string;
  genreScores: ScoreMap;
  typeScores?: Record<string, ScoreMap>;
  tagScores?: ScoreMap;
  avoidanceTagScores?: ScoreMap;
  contentAxisScores?: ScoreMap;
};

export type SimilarWorkProfile = {
  mode: "similar_work";
  sourceWebtoonIds: string[];
  userGenreScores: ScoreMap;
  userTypeScores: ScoreMap;
  userTagScores: ScoreMap;
  userAvoidanceScores: ScoreMap;
};

export type RecommendationType =
  | "stable_match"
  | "similar_texture"
  | "new_texture"
  | "taste_expansion";

export type SimilarWorkRecommendation = {
  rank: number;
  effectiveRank: number;
  recommendationType: RecommendationType;
  candidate: {
    canonicalWebtoonId: string;
    title: string;
    platform: string;
    officialUrl: string;
    mainGenre: string;
    status: string;
    recommendationReason: string;
    sourceDb?: SourceDb;
    sourceWeight?: number;
    primaryContentAxisKey?: string | null;
    displayAxisLabel?: string;
  };
  finalRecommendationScore: number;
  stage1Score: number;
  longTermScore: number | null;
  effectiveScore: number;
  matchScore: number;
  genreMatch: number;
  typeMatch: number;
  tagMatch: number;
  qualityBoost: number;
  avoidancePenalty: number;
  matchedTagKeys: string[];
  debug: {
    candidateGenreScores: ScoreMap;
    candidateTypeScores: ScoreMap;
    candidateTagScores: ScoreMap;
    candidateAvoidanceTagScores: ScoreMap;
    candidateContentAxisScores: ScoreMap;
    candidateSourceDb: SourceDb;
    candidateSourceWeight: number;
    candidateDisplayAxisLabel: string;
    stage1Breakdown: ScoreBreakdown;
    longTermBreakdown: ScoreBreakdown | null;
  };
};

export type SimilarWorkSelectionResult = {
  mode: "similar_work";
  selectedWebtoons: SimilarWorkSelectedWebtoon[];
  similarWorkSessionVector: SimilarWorkProfile;
  userSimilarWorkProfile: SimilarWorkProfile;
  storedUserTasteProfile: StoredUserTasteProfile | null;
  hasLongTermProfile: boolean;
  scoringVersion: "two_stage_rerank_v1_8_primary";
  candidatePoolSize: number;
  blendingWeights: {
    stage1Weight: number;
    longTermWeight: number;
  };
  mainDisplayItems: SimilarWorkRecommendation[];
  mainReservePool: SimilarWorkRecommendation[];
  expansionCandidatePool: SimilarWorkRecommendation[];
  expansionDisplayItems: SimilarWorkRecommendation[];

  /**
   * 기존 컴포넌트 호환용.
   * D+30부터 화면 표시용 10개 = 핵심 추천 5개 + 확장 추천 5개다.
   */
  recommendations: SimilarWorkRecommendation[];
};

type RawRecord = Record<string, unknown>;

type UserSignalProfile = {
  userGenreScores: ScoreMap;
  userTypeScores: ScoreMap;
  userTagScores: ScoreMap;
  userAvoidanceScores: ScoreMap;
};

type ScoreBreakdown = {
  score: number;
  genreMatch: number;
  typeMatch: number;
  tagMatch: number;
  qualityBoost: number;
  avoidancePenalty: number;
  matchedTagKeys: string[];
};

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecordValue(record: RawRecord | undefined, key: string) {
  if (!record) return undefined;

  const value = record[key];

  return isRecord(value) ? value : undefined;
}

function getStringValue(record: RawRecord | undefined, key: string) {
  if (!record) return undefined;

  const value = record[key];

  return typeof value === "string" ? value : undefined;
}

function getStringArrayValue(record: RawRecord | undefined, key: string) {
  if (!record) return undefined;

  const value = record[key];

  if (!Array.isArray(value)) return undefined;

  return value.filter((item): item is string => typeof item === "string");
}

function getNumberValue(record: RawRecord | undefined, key: string) {
  if (!record) return undefined;

  const value = record[key];

  return typeof value === "number" ? value : undefined;
}

function getBooleanValue(record: RawRecord | undefined, key: string) {
  if (!record) return undefined;

  const value = record[key];

  return typeof value === "boolean" ? value : undefined;
}

function toScoreMap(value: unknown): ScoreMap {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(([, score]) => typeof score === "number")
  ) as ScoreMap;
}

function toNestedScoreMap(value: unknown) {
  if (!isRecord(value)) return undefined;

  const nestedScores = Object.fromEntries(
    Object.entries(value)
      .map(([key, nestedValue]) => [key, toScoreMap(nestedValue)] as const)
      .filter(([, scoreMap]) => Object.keys(scoreMap).length > 0)
  ) as Record<string, ScoreMap>;

  return Object.keys(nestedScores).length > 0 ? nestedScores : undefined;
}

function getRawSourceDb(rawItem: RawRecord, sourceRecord?: RawRecord) {
  return (
    getStringValue(rawItem, "sourceDb") ??
    getStringValue(rawItem, "sourceType") ??
    getStringValue(sourceRecord, "sourceDb") ??
    getStringValue(sourceRecord, "sourceType")
  );
}

export function normalizeWebtoonSeedData(rawData: unknown): WebtoonSeedItem[] {
  if (!Array.isArray(rawData)) return [];

  return rawData
    .map((rawItem) => normalizeWebtoonSeedItem(rawItem))
    .filter((item): item is WebtoonSeedItem => Boolean(item));
}

function normalizeWebtoonSeedItem(rawItem: unknown): WebtoonSeedItem | null {
  if (!isRecord(rawItem)) return null;

  const metadata = getRecordValue(rawItem, "metadata");
  const recommendation = getRecordValue(rawItem, "recommendation");
  const source = getRecordValue(rawItem, "source");

  const canonicalWebtoonId = getStringValue(rawItem, "canonicalWebtoonId");
  const title = getStringValue(rawItem, "title");
  const titleAliases = getStringArrayValue(rawItem, "titleAliases");
  const platform = getStringValue(rawItem, "platform");
  const officialUrl = getStringValue(rawItem, "officialUrl") ?? "";
  const mainGenre = getStringValue(rawItem, "mainGenre");

  if (!canonicalWebtoonId || !title || !platform || !mainGenre) {
    return null;
  }

  const sourceDb = normalizeSourceDb(getRawSourceDb(rawItem, source));
  const sourceWeight = getSourceWeight(sourceDb);

  const normalizedMetadata: WebtoonSeedItem["metadata"] = {
    status: getStringValue(metadata, "status") ?? "unknown",
  };

  const ageRating = getStringValue(metadata, "ageRating");
  const urlStatus = getStringValue(metadata, "urlStatus");
  const qualityScore = getNumberValue(metadata, "qualityScore");
  const inputStatus =
    getStringValue(metadata, "inputStatus") ??
    getStringValue(rawItem, "inputStatus");
  const isAdult = getBooleanValue(metadata, "isAdult");

  if (ageRating) {
    normalizedMetadata.ageRating = ageRating;
  }

  if (urlStatus) {
    normalizedMetadata.urlStatus = urlStatus;
  }

  if (typeof qualityScore === "number") {
    normalizedMetadata.qualityScore = qualityScore;
  }

  if (inputStatus) {
    normalizedMetadata.inputStatus = inputStatus;
  }

  if (typeof isAdult === "boolean") {
    normalizedMetadata.isAdult = isAdult;
  }

  const contentAxisScores = toScoreMap(recommendation?.contentAxisScores);
  const primaryContentAxisKey =
    getStringValue(rawItem, "primaryContentAxisKey") ??
    getPrimaryContentAxisKey(contentAxisScores);
  const displayAxisLabel =
    getStringValue(rawItem, "displayAxisLabel") ??
    getStringValue(recommendation, "displayAxisLabel") ??
    getDisplayAxisLabel(contentAxisScores, mainGenre);

  const normalizedRecommendation: WebtoonSeedItem["recommendation"] = {
    genreScores: toScoreMap(recommendation?.genreScores),
  };

  const recommendationReason = getStringValue(
    recommendation,
    "recommendationReason"
  );
  const scoreVersion = getStringValue(recommendation, "scoreVersion");
  const typeScores = toNestedScoreMap(recommendation?.typeScores);
  const tagScores = toScoreMap(recommendation?.tagScores);
  const avoidanceTagScores = toScoreMap(recommendation?.avoidanceTagScores);

  if (recommendationReason) {
    normalizedRecommendation.recommendationReason = recommendationReason;
  }

  if (scoreVersion) {
    normalizedRecommendation.scoreVersion = scoreVersion;
  }

  if (typeScores) {
    normalizedRecommendation.typeScores = typeScores;
  }

  if (Object.keys(tagScores).length > 0) {
    normalizedRecommendation.tagScores = tagScores;
  }

  if (Object.keys(avoidanceTagScores).length > 0) {
    normalizedRecommendation.avoidanceTagScores = avoidanceTagScores;
  }

  normalizedRecommendation.contentAxisScores = contentAxisScores;

  return {
    canonicalWebtoonId,
    title,
    titleAliases,
    platform,
    officialUrl,
    mainGenre,
    sourceDb,
    sourceType: sourceDb,
    sourceWeight,
    primaryContentAxisKey,
    displayAxisLabel,
    metadata: normalizedMetadata,
    recommendation: normalizedRecommendation,
  };
}

export function getGenreLabel(genreKey: string) {
  const labelMap: Record<string, string> = {
    fantasy: "판타지",
    murim: "무협",
    romance_ropan: "로맨스·로판",
    thriller_horror: "스릴러·공포",
    drama_daily: "드라마·일상",
  };

  return labelMap[genreKey] ?? genreKey;
}

export function getStatusLabel(status?: string) {
  const labelMap: Record<string, string> = {
    ongoing: "연재중",
    completed: "완결",
    hiatus: "휴재",
    unknown: "상태 미확인",
  };

  if (!status) return "상태 미확인";

  return labelMap[status] ?? status;
}

export function getWebtoonDisplayAxisLabel(webtoon: {
  displayAxisLabel?: string;
  mainGenre: string;
}) {
  return webtoon.displayAxisLabel ?? getGenreLabel(webtoon.mainGenre);
}

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactSearchText(value: string) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function createSearchableText(webtoon: WebtoonSeedItem) {
  return normalizeSearchText(
    [
      webtoon.title,
      ...(webtoon.titleAliases ?? []),
      webtoon.platform,
      webtoon.mainGenre,
      getGenreLabel(webtoon.mainGenre),
      webtoon.displayAxisLabel,
      ...getContentAxisSearchLabels(
        webtoon.recommendation.contentAxisScores ?? {}
      ),
      getStatusLabel(webtoon.metadata.status),
    ].join(" ")
  );
}

export function matchesSearchQuery(webtoon: WebtoonSeedItem, query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return false;

  const searchableText = createSearchableText(webtoon);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);

  const tokenMatched = queryTokens.every((token) => {
    return searchableText.includes(token);
  });

  if (tokenMatched) return true;

  const compactQuery = compactSearchText(query);
  const compactSearchableText = compactSearchText(
    [
      webtoon.title,
      ...(webtoon.titleAliases ?? []),
      webtoon.platform,
      webtoon.mainGenre,
      getGenreLabel(webtoon.mainGenre),
      webtoon.displayAxisLabel,
      ...getContentAxisSearchLabels(
        webtoon.recommendation.contentAxisScores ?? {}
      ),
      getStatusLabel(webtoon.metadata.status),
    ].join(" ")
  );

  return compactSearchableText.includes(compactQuery);
}

export function buildSimilarWorkProfile(
  selectedWebtoons: WebtoonSeedItem[]
): SimilarWorkProfile {
  return {
    mode: "similar_work",
    sourceWebtoonIds: selectedWebtoons.map(
      (webtoon) => webtoon.canonicalWebtoonId
    ),
    userGenreScores: averageScoreMaps(
      selectedWebtoons.map((webtoon) => webtoon.recommendation.genreScores)
    ),
    userTypeScores: averageScoreMaps(
      selectedWebtoons.map((webtoon) =>
        flattenTypeScores(webtoon.recommendation.typeScores)
      )
    ),
    userTagScores: averageScoreMaps(
      selectedWebtoons.map((webtoon) => webtoon.recommendation.tagScores ?? {})
    ),

    /**
     * 재밌게 본 작품의 avoidanceTagScores는 사용자가 싫어하는 요소가 아니다.
     * D+32에서도 selectedWebtoons 쪽 avoidance는 비워둔다.
     */
    userAvoidanceScores: {},
  };
}

export function getSimilarWorkRecommendations(params: {
  selectedWebtoons: WebtoonSeedItem[];
  allWebtoons: WebtoonSeedItem[];
  limit?: number;
}): SimilarWorkRecommendation[] {
  const { selectedWebtoons, allWebtoons, limit = 10 } = params;

  return createSimilarWorkSelectionResult({
    selectedWebtoons,
    allWebtoons,
  }).recommendations.slice(0, limit);
}

export function createSimilarWorkSelectionResult(params: {
  selectedWebtoons: WebtoonSeedItem[];
  allWebtoons: WebtoonSeedItem[];
  limit?: number;
}): SimilarWorkSelectionResult {
  const { selectedWebtoons, allWebtoons } = params;
  const similarWorkSessionVector = buildSimilarWorkProfile(selectedWebtoons);
  const storedUserTasteProfile = buildStoredUserTasteProfile();
  const hasLongTermProfile = Boolean(storedUserTasteProfile);

  const stage1ScoredRecommendations = scoreCandidatesForProfile({
    profile: similarWorkSessionVector,
    selectedWebtoons,
    allWebtoons,
  });

  const stage1CandidatePool = stage1ScoredRecommendations.slice(
    0,
    STAGE1_CANDIDATE_POOL_SIZE
  );

  const effectiveRecommendations = stage1CandidatePool
    .map((stage1Recommendation) => {
      return applyLongTermRerank({
        stage1Recommendation,
        storedUserTasteProfile,
      });
    })
    .sort(sortRecommendationsByEffectiveScore)
    .map((recommendation, index) => ({
      ...recommendation,
      rank: index + 1,
      effectiveRank: index + 1,
    }));

  const mainDisplayItems = effectiveRecommendations
    .slice(0, 5)
    .map((recommendation) => ({
      ...recommendation,
      recommendationType: "stable_match" as const,
    }));

  const mainReservePool = effectiveRecommendations
    .slice(5, 15)
    .map((recommendation) => ({
      ...recommendation,
      recommendationType: "similar_texture" as const,
    }));

  const expansionCandidatePool = effectiveRecommendations
    .slice(15, 50)
    .map((recommendation) => ({
      ...recommendation,
      recommendationType: "taste_expansion" as const,
    }));

  const expansionDisplayItems = pickExpansionDisplayItems({
    mainDisplayItems,
    expansionCandidatePool,
  });

  return {
    mode: "similar_work",
    selectedWebtoons: selectedWebtoons.map((webtoon) => ({
      canonicalWebtoonId: webtoon.canonicalWebtoonId,
      title: webtoon.title,
      platform: webtoon.platform,
      mainGenre: webtoon.mainGenre,
      sourceDb: webtoon.sourceDb,
      sourceWeight: webtoon.sourceWeight,
      primaryContentAxisKey: webtoon.primaryContentAxisKey,
      displayAxisLabel: webtoon.displayAxisLabel,
      genreScores: webtoon.recommendation.genreScores,
      typeScores: webtoon.recommendation.typeScores,
      tagScores: webtoon.recommendation.tagScores,
      avoidanceTagScores: webtoon.recommendation.avoidanceTagScores,
      contentAxisScores: webtoon.recommendation.contentAxisScores,
    })),
    similarWorkSessionVector,

    /**
     * 기존 D+24~D+29 debug 호환용 alias.
     * D+30부터는 stage1 세션 벡터를 가리킨다.
     */
    userSimilarWorkProfile: similarWorkSessionVector,
    storedUserTasteProfile,
    hasLongTermProfile,
    scoringVersion: "two_stage_rerank_v1_8_primary",
    candidatePoolSize: stage1CandidatePool.length,
    blendingWeights: {
      stage1Weight: hasLongTermProfile ? PRIMARY_STAGE1_WEIGHT : 1,
      longTermWeight: hasLongTermProfile ? PRIMARY_LONG_TERM_WEIGHT : 0,
    },
    mainDisplayItems,
    mainReservePool,
    expansionCandidatePool,
    expansionDisplayItems,
    recommendations: [...mainDisplayItems, ...expansionDisplayItems],
  };
}

function scoreCandidatesForProfile(params: {
  profile: UserSignalProfile;
  selectedWebtoons: WebtoonSeedItem[];
  allWebtoons: WebtoonSeedItem[];
}) {
  const { profile, selectedWebtoons, allWebtoons } = params;
  const selectedWebtoonIds = new Set(
    selectedWebtoons.map((webtoon) => webtoon.canonicalWebtoonId)
  );
  const seenCandidateIds = new Set<string>();

  return allWebtoons
    .filter((candidate) => {
      if (selectedWebtoonIds.has(candidate.canonicalWebtoonId)) {
        return false;
      }

      if (seenCandidateIds.has(candidate.canonicalWebtoonId)) {
        return false;
      }

      seenCandidateIds.add(candidate.canonicalWebtoonId);

      return isRecommendableCandidate(candidate);
    })
    .map((candidate) => {
      const stage1Breakdown = scoreCandidateForProfile(profile, candidate);

      return createRecommendationFromBreakdowns({
        candidate,
        stage1Breakdown,
        longTermBreakdown: null,
        recommendationType: "stable_match",
      });
    })
    .sort(sortRecommendationsByStage1Score)
    .map((recommendation, index) => ({
      ...recommendation,
      rank: index + 1,
      effectiveRank: index + 1,
    }));
}

function isRecommendableCandidate(candidate: WebtoonSeedItem) {
  if (!candidate.officialUrl) return false;
  if (candidate.metadata.urlStatus === "invalid") return false;
  if (candidate.metadata.inputStatus === "excluded") return false;

  return true;
}

function applyLongTermRerank(params: {
  stage1Recommendation: SimilarWorkRecommendation;
  storedUserTasteProfile: StoredUserTasteProfile | null;
}): SimilarWorkRecommendation {
  const { stage1Recommendation, storedUserTasteProfile } = params;

  if (!storedUserTasteProfile) {
    return {
      ...stage1Recommendation,
      longTermScore: null,
      effectiveScore: stage1Recommendation.stage1Score,
      finalRecommendationScore: stage1Recommendation.stage1Score,
      matchScore: Math.round(stage1Recommendation.stage1Score * 100),
      debug: {
        ...stage1Recommendation.debug,
        longTermBreakdown: null,
      },
    };
  }

  const candidateDebug = stage1Recommendation.debug;
  const longTermBreakdown = scoreCandidateMapsForProfile({
    profile: storedUserTasteProfile,
    candidateGenreScores: candidateDebug.candidateGenreScores,
    candidateTypeScores: candidateDebug.candidateTypeScores,
    candidateTagScores: candidateDebug.candidateTagScores,
    candidateAvoidanceTagScores: candidateDebug.candidateAvoidanceTagScores,
    qualityBoost: stage1Recommendation.qualityBoost,
  });

  const effectiveScore = roundScore(
    stage1Recommendation.stage1Score * PRIMARY_STAGE1_WEIGHT +
      longTermBreakdown.score * PRIMARY_LONG_TERM_WEIGHT
  );

  const matchedTagKeys = mergeMatchedTagKeys(
    stage1Recommendation.matchedTagKeys,
    longTermBreakdown.matchedTagKeys
  );

  const effectiveAvoidancePenalty = roundScore(
    stage1Recommendation.debug.stage1Breakdown.avoidancePenalty *
      PRIMARY_STAGE1_WEIGHT +
      longTermBreakdown.avoidancePenalty * PRIMARY_LONG_TERM_WEIGHT
  );

  return {
    ...stage1Recommendation,
    longTermScore: longTermBreakdown.score,
    effectiveScore,
    finalRecommendationScore: effectiveScore,
    matchScore: Math.round(effectiveScore * 100),
    avoidancePenalty: effectiveAvoidancePenalty,
    matchedTagKeys,
    debug: {
      ...stage1Recommendation.debug,
      longTermBreakdown,
    },
  };
}

function createRecommendationFromBreakdowns(params: {
  candidate: WebtoonSeedItem;
  stage1Breakdown: ScoreBreakdown;
  longTermBreakdown: ScoreBreakdown | null;
  recommendationType: RecommendationType;
}): SimilarWorkRecommendation {
  const { candidate, stage1Breakdown, longTermBreakdown, recommendationType } =
    params;
  const candidateTypeScores = flattenTypeScores(
    candidate.recommendation.typeScores
  );
  const candidateTagScores = candidate.recommendation.tagScores ?? {};
  const candidateAvoidanceTagScores =
    candidate.recommendation.avoidanceTagScores ?? {};
  const candidateContentAxisScores =
    candidate.recommendation.contentAxisScores ?? {};

  return {
    rank: 0,
    effectiveRank: 0,
    recommendationType,
    candidate: {
      canonicalWebtoonId: candidate.canonicalWebtoonId,
      title: candidate.title,
      platform: candidate.platform,
      officialUrl: candidate.officialUrl,
      mainGenre: candidate.mainGenre,
      status: candidate.metadata.status,
      recommendationReason:
        candidate.recommendation.recommendationReason ??
        "선택한 작품의 취향 신호와 비슷한 점이 있는 후보입니다.",
      sourceDb: candidate.sourceDb,
      sourceWeight: candidate.sourceWeight,
      primaryContentAxisKey: candidate.primaryContentAxisKey,
      displayAxisLabel: candidate.displayAxisLabel,
    },
    stage1Score: stage1Breakdown.score,
    longTermScore: longTermBreakdown?.score ?? null,
    effectiveScore: stage1Breakdown.score,
    finalRecommendationScore: stage1Breakdown.score,
    matchScore: Math.round(stage1Breakdown.score * 100),
    genreMatch: stage1Breakdown.genreMatch,
    typeMatch: stage1Breakdown.typeMatch,
    tagMatch: stage1Breakdown.tagMatch,
    qualityBoost: stage1Breakdown.qualityBoost,
    avoidancePenalty: stage1Breakdown.avoidancePenalty,
    matchedTagKeys: stage1Breakdown.matchedTagKeys,
    debug: {
      candidateGenreScores: candidate.recommendation.genreScores,
      candidateTypeScores,
      candidateTagScores,
      candidateAvoidanceTagScores,
      candidateContentAxisScores,
      candidateSourceDb: candidate.sourceDb,
      candidateSourceWeight: candidate.sourceWeight,
      candidateDisplayAxisLabel: candidate.displayAxisLabel,
      stage1Breakdown,
      longTermBreakdown,
    },
  };
}

function scoreCandidateForProfile(
  profile: UserSignalProfile,
  candidate: WebtoonSeedItem
): ScoreBreakdown {
  const candidateTypeScores = flattenTypeScores(
    candidate.recommendation.typeScores
  );
  const candidateTagScores = candidate.recommendation.tagScores ?? {};
  const candidateAvoidanceTagScores =
    candidate.recommendation.avoidanceTagScores ?? {};
  const qualityBoost = roundScore(
    clamp(candidate.metadata.qualityScore ?? 0, 0, 5) / 5
  );

  return scoreCandidateMapsForProfile({
    profile,
    candidateGenreScores: candidate.recommendation.genreScores,
    candidateTypeScores,
    candidateTagScores,
    candidateAvoidanceTagScores,
    qualityBoost,
  });
}

function scoreCandidateMapsForProfile(params: {
  profile: UserSignalProfile;
  candidateGenreScores: ScoreMap;
  candidateTypeScores: ScoreMap;
  candidateTagScores: ScoreMap;
  candidateAvoidanceTagScores: ScoreMap;
  qualityBoost: number;
}): ScoreBreakdown {
  const {
    profile,
    candidateGenreScores,
    candidateTypeScores,
    candidateTagScores,
    candidateAvoidanceTagScores,
    qualityBoost,
  } = params;

  const genreMatch = cosineSimilarity(
    profile.userGenreScores,
    candidateGenreScores
  );
  const typeMatch = cosineSimilarity(
    profile.userTypeScores,
    candidateTypeScores
  );
  const tagMatch = cosineSimilarity(profile.userTagScores, candidateTagScores);

  const avoidancePenalty = roundScore(
    dotProduct(profile.userAvoidanceScores, candidateAvoidanceTagScores) / 100
  );

  const score = roundScore(
    genreMatch * 0.25 +
      typeMatch * 0.25 +
      tagMatch * 0.35 +
      qualityBoost * 0.15 -
      avoidancePenalty
  );

  return {
    score,
    genreMatch,
    typeMatch,
    tagMatch,
    qualityBoost,
    avoidancePenalty,
    matchedTagKeys: getMatchedTagKeys(
      profile.userTagScores,
      candidateTagScores
    ),
  };
}

function getMatchedTagKeys(userTagScores: ScoreMap, candidateTagScores: ScoreMap) {
  return Object.keys(userTagScores)
    .filter((tagKey) => {
      return (userTagScores[tagKey] ?? 0) > 0 && (candidateTagScores[tagKey] ?? 0) > 0;
    })
    .sort((a, b) => {
      const aScore = (userTagScores[a] ?? 0) + (candidateTagScores[a] ?? 0);
      const bScore = (userTagScores[b] ?? 0) + (candidateTagScores[b] ?? 0);

      return bScore - aScore;
    })
    .slice(0, 8);
}

function mergeMatchedTagKeys(primaryTagKeys: string[], secondaryTagKeys: string[]) {
  return [...new Set([...primaryTagKeys, ...secondaryTagKeys])].slice(0, 8);
}

function sortRecommendationsByStage1Score(
  a: SimilarWorkRecommendation,
  b: SimilarWorkRecommendation
) {
  if (b.stage1Score !== a.stage1Score) {
    return b.stage1Score - a.stage1Score;
  }

  if (b.qualityBoost !== a.qualityBoost) {
    return b.qualityBoost - a.qualityBoost;
  }

  return a.candidate.title.localeCompare(b.candidate.title, "ko-KR");
}

function sortRecommendationsByEffectiveScore(
  a: SimilarWorkRecommendation,
  b: SimilarWorkRecommendation
) {
  if (b.effectiveScore !== a.effectiveScore) {
    return b.effectiveScore - a.effectiveScore;
  }

  if (b.stage1Score !== a.stage1Score) {
    return b.stage1Score - a.stage1Score;
  }

  if (b.qualityBoost !== a.qualityBoost) {
    return b.qualityBoost - a.qualityBoost;
  }

  return a.candidate.title.localeCompare(b.candidate.title, "ko-KR");
}

function pickExpansionDisplayItems(params: {
  mainDisplayItems: SimilarWorkRecommendation[];
  expansionCandidatePool: SimilarWorkRecommendation[];
}) {
  const { mainDisplayItems, expansionCandidatePool } = params;
  const mainGenreSet = new Set(
    mainDisplayItems.map((item) => item.candidate.mainGenre)
  );
  const selectedItems: SimilarWorkRecommendation[] = [];
  const selectedGenreCounts = new Map<string, number>();

  function canSelect(candidate: SimilarWorkRecommendation) {
    if (
      selectedItems.some(
        (item) =>
          item.candidate.canonicalWebtoonId ===
          candidate.candidate.canonicalWebtoonId
      )
    ) {
      return false;
    }

    const currentGenreCount =
      selectedGenreCounts.get(candidate.candidate.mainGenre) ?? 0;

    return currentGenreCount < 2;
  }

  function selectCandidate(
    candidate: SimilarWorkRecommendation,
    recommendationType: RecommendationType
  ) {
    selectedItems.push({
      ...candidate,
      recommendationType,
    });
    selectedGenreCounts.set(
      candidate.candidate.mainGenre,
      (selectedGenreCounts.get(candidate.candidate.mainGenre) ?? 0) + 1
    );
  }

  for (const candidate of expansionCandidatePool) {
    if (selectedItems.length >= 3) break;
    if (!canSelect(candidate)) continue;
    if (mainGenreSet.has(candidate.candidate.mainGenre)) continue;

    selectCandidate(candidate, "new_texture");
  }

  for (const candidate of expansionCandidatePool) {
    if (selectedItems.length >= 5) break;
    if (!canSelect(candidate)) continue;

    const recommendationType: RecommendationType = mainGenreSet.has(
      candidate.candidate.mainGenre
    )
      ? "similar_texture"
      : "taste_expansion";

    selectCandidate(candidate, recommendationType);
  }

  for (const candidate of expansionCandidatePool) {
    if (selectedItems.length >= 5) break;

    if (
      selectedItems.some(
        (item) =>
          item.candidate.canonicalWebtoonId ===
          candidate.candidate.canonicalWebtoonId
      )
    ) {
      continue;
    }

    selectCandidate(candidate, "taste_expansion");
  }

  return selectedItems.slice(0, 5);
}