import { cosineSimilarity } from "./similarity";
import {
  averageScoreMaps,
  clamp,
  flattenTypeScores,
  roundScore,
} from "./vector";

import type { ScoreMap } from "./vector";

export type WebtoonSeedItem = {
  canonicalWebtoonId: string;
  title: string;
  platform: string;
  officialUrl: string;
  mainGenre: string;
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
    genreScores: ScoreMap;
    typeScores?: Record<string, ScoreMap>;
    tagScores?: ScoreMap;
    avoidanceTagScores?: ScoreMap;
  };
};

export type SimilarWorkSelectedWebtoon = {
  canonicalWebtoonId: string;
  title: string;
  platform: string;
  mainGenre: string;
  genreScores: ScoreMap;
  typeScores?: Record<string, ScoreMap>;
  tagScores?: ScoreMap;
  avoidanceTagScores?: ScoreMap;
};

export type SimilarWorkProfile = {
  mode: "similar_work";
  sourceWebtoonIds: string[];
  userGenreScores: ScoreMap;
  userTypeScores: ScoreMap;
  userTagScores: ScoreMap;
  userAvoidanceScores: ScoreMap;
};

export type SimilarWorkRecommendation = {
  rank: number;
  candidate: {
    canonicalWebtoonId: string;
    title: string;
    platform: string;
    officialUrl: string;
    mainGenre: string;
    status: string;
    recommendationReason: string;
  };
  finalRecommendationScore: number;
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
  };
};

export type SimilarWorkSelectionResult = {
  mode: "similar_work";
  selectedWebtoons: SimilarWorkSelectedWebtoon[];
  userSimilarWorkProfile: SimilarWorkProfile;
  recommendations: SimilarWorkRecommendation[];
};

type RawRecord = Record<string, unknown>;

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

  const canonicalWebtoonId = getStringValue(rawItem, "canonicalWebtoonId");
  const title = getStringValue(rawItem, "title");
  const platform = getStringValue(rawItem, "platform");
  const officialUrl = getStringValue(rawItem, "officialUrl");
  const mainGenre = getStringValue(rawItem, "mainGenre");

  if (!canonicalWebtoonId || !title || !platform || !officialUrl || !mainGenre) {
    return null;
  }

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

  const normalizedRecommendation: WebtoonSeedItem["recommendation"] = {
    genreScores: toScoreMap(recommendation?.genreScores),
  };

  const recommendationReason = getStringValue(
    recommendation,
    "recommendationReason"
  );
  const typeScores = toNestedScoreMap(recommendation?.typeScores);
  const tagScores = toScoreMap(recommendation?.tagScores);
  const avoidanceTagScores = toScoreMap(recommendation?.avoidanceTagScores);

  if (recommendationReason) {
    normalizedRecommendation.recommendationReason = recommendationReason;
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

  return {
    canonicalWebtoonId,
    title,
    platform,
    officialUrl,
    mainGenre,
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
      webtoon.platform,
      webtoon.mainGenre,
      getGenreLabel(webtoon.mainGenre),
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
        webtoon.platform,
        webtoon.mainGenre,
        getGenreLabel(webtoon.mainGenre),
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
     * D+24 기준:
     * 재밌게 본 작품의 avoidanceTagScores는 사용자가 싫어하는 요소가 아니다.
     * 세부 테스트 Q6 또는 scene_pick 회피 문항이 연결되기 전까지는 비워둔다.
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
  const profile = buildSimilarWorkProfile(selectedWebtoons);
  const selectedWebtoonIds = new Set(profile.sourceWebtoonIds);
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
    .map((candidate) => scoreSimilarWorkCandidate(profile, candidate))
    .sort((a, b) => {
      if (b.finalRecommendationScore !== a.finalRecommendationScore) {
        return b.finalRecommendationScore - a.finalRecommendationScore;
      }

      if (b.qualityBoost !== a.qualityBoost) {
        return b.qualityBoost - a.qualityBoost;
      }

      return a.candidate.title.localeCompare(b.candidate.title, "ko-KR");
    })
    .slice(0, limit)
    .map((recommendation, index) => ({
      ...recommendation,
      rank: index + 1,
    }));
}

export function createSimilarWorkSelectionResult(params: {
  selectedWebtoons: WebtoonSeedItem[];
  allWebtoons: WebtoonSeedItem[];
  limit?: number;
}): SimilarWorkSelectionResult {
  const { selectedWebtoons, allWebtoons, limit = 10 } = params;
  const userSimilarWorkProfile = buildSimilarWorkProfile(selectedWebtoons);

  return {
    mode: "similar_work",
    selectedWebtoons: selectedWebtoons.map((webtoon) => ({
      canonicalWebtoonId: webtoon.canonicalWebtoonId,
      title: webtoon.title,
      platform: webtoon.platform,
      mainGenre: webtoon.mainGenre,
      genreScores: webtoon.recommendation.genreScores,
      typeScores: webtoon.recommendation.typeScores,
      tagScores: webtoon.recommendation.tagScores,
      avoidanceTagScores: webtoon.recommendation.avoidanceTagScores,
    })),
    userSimilarWorkProfile,
    recommendations: getSimilarWorkRecommendations({
      selectedWebtoons,
      allWebtoons,
      limit,
    }),
  };
}

function isRecommendableCandidate(candidate: WebtoonSeedItem) {
  if (!candidate.officialUrl) return false;
  if (candidate.metadata.urlStatus === "invalid") return false;
  if (candidate.metadata.inputStatus === "excluded") return false;

  return true;
}

function scoreSimilarWorkCandidate(
  profile: SimilarWorkProfile,
  candidate: WebtoonSeedItem
): Omit<SimilarWorkRecommendation, "rank"> {
  const candidateTypeScores = flattenTypeScores(
    candidate.recommendation.typeScores
  );
  const candidateTagScores = candidate.recommendation.tagScores ?? {};
  const candidateAvoidanceTagScores =
    candidate.recommendation.avoidanceTagScores ?? {};

  const genreMatch = cosineSimilarity(
    profile.userGenreScores,
    candidate.recommendation.genreScores
  );
  const typeMatch = cosineSimilarity(profile.userTypeScores, candidateTypeScores);
  const tagMatch = cosineSimilarity(profile.userTagScores, candidateTagScores);
  const qualityBoost = roundScore(
    clamp(candidate.metadata.qualityScore ?? 0, 0, 5) / 5
  );

  /**
   * D+24 기준 avoidancePenalty는 0으로 고정한다.
   * userAvoidanceScores는 아직 연결하지 않는다.
   */
  const avoidancePenalty = 0;

  const finalRecommendationScore = roundScore(
    genreMatch * 0.25 +
      typeMatch * 0.25 +
      tagMatch * 0.35 +
      qualityBoost * 0.15 -
      avoidancePenalty
  );

  return {
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
    },
    finalRecommendationScore,
    matchScore: Math.round(finalRecommendationScore * 100),
    genreMatch,
    typeMatch,
    tagMatch,
    qualityBoost,
    avoidancePenalty,
    matchedTagKeys: getMatchedTagKeys(profile.userTagScores, candidateTagScores),
    debug: {
      candidateGenreScores: candidate.recommendation.genreScores,
      candidateTypeScores,
      candidateTagScores,
      candidateAvoidanceTagScores,
    },
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