import {
    getContentAxisSearchLabels,
    getDisplayAxisLabel,
    getPrimaryContentAxisKey,
  } from "./contentAxis";
  import { cosineSimilarity } from "./similarity";
  import {
    buildStoredUserTasteProfile,
    hasAnyTasteScore,
  } from "./storedUserTasteProfile";
  import { getSourceWeight, normalizeSourceDb } from "./sourceWeight";
  import {
    clamp,
    dotProduct,
    flattenTypeScores,
    getPositiveWeightSum,
    roundScore,
    weightedAverageScoreMaps,
  } from "./vector";

  import type { StoredUserTasteProfile } from "./storedUserTasteProfile";
  import type { SourceDb } from "./sourceWeight";
  import type { ScoreMap } from "./vector";
  import type {
    RecommendationMode,
    RecommendationVectorSource,
  } from "@/types/find";

  export const FIND_RECOMMENDATION_SCORE_VERSION =
    "now_webtoon_finder_v2_1_1" as const;

  const PRIMARY_SELECTED_WORK_WEIGHT = 0.8;
  const PRIMARY_PROFILE_WEIGHT = 0.2;
  const PRIMARY_CANDIDATE_POOL_SIZE = 100;
  const MAIN_POOL_SIZE = 15;
  const EXPANSION_POOL_END = 50;

  const PRIMARY_POSITIVE_WEIGHT_SUM = 0.9;
  const PROFILE_POSITIVE_WEIGHT_SUM = 0.85;

  const RISK_SAFETY_WEIGHTS = {
    ending_risk: 0.24,
    availability_risk: 0.24,
    entry_barrier: 0.14,
    progression_fatigue: 0.14,
    relationship_stress: 0.08,
    heavy_tone: 0.08,
    graphic_intensity: 0.08,
  } as const;

  export type RecommendationVector = {
    genreScores: ScoreMap;
    typeScores: ScoreMap;
    tagScores: ScoreMap;
    avoidanceTagScores: ScoreMap;
    contentAxisScores: ScoreMap;
  };

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
      completionType?: string;
      availabilityStatus?: string;
      saleStatus?: string;
      contentKind?: string;
      publicationType?: string;
      adultPolicyCheck?: string;
      recommendationEligible?: boolean;
      officialViewAvailable?: boolean;
      sexualCore?: boolean;
      isWebNovelOnly?: boolean;
      isChallengeOnly?: boolean;
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
    sourceWeightSum: number;
    userGenreScores: ScoreMap;
    userTypeScores: ScoreMap;
    userTagScores: ScoreMap;
    userAvoidanceScores: ScoreMap;
    userContentAxisScores: ScoreMap;
  };

  export type RecommendationType =
    | "stable_match"
    | "similar_texture"
    | "new_texture"
    | "taste_expansion";

  export type HardFilterExclusionReason =
    | "missing_official_url"
    | "invalid_url"
    | "non_recommendable_input_status"
    | "recommendation_ineligible"
    | "official_view_unavailable"
    | "sale_or_availability_unavailable"
    | "webnovel_only"
    | "challenge_only"
    | "sexual_core_concept"
    | "selected_source_work"
    | "already_seen"
    | "session_excluded"
    | "duplicate_canonical_webtoon_id";

  export type HardFilterExcludedItem = {
    canonicalWebtoonId: string;
    reason: HardFilterExclusionReason;
  };

  export type SimilarWorkRecommendation = {
    /** successConfidence까지 반영한 최종 표시 순위 */
    rank: number;
    /** 선택 작품 취향 점수만으로 정렬한 TOP100 진입 전 순위 */
    sourceTasteRank: number;
    /** TOP100 안에서 장기 프로필 20%를 반영한 뒤의 순위 */
    effectiveTasteRank: number;
    /** D+33 초기 명칭 호환용 alias. effectiveTasteRank와 동일 */
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

    genreMatch: number;
    typeMatch: number;
    tagMatch: number;
    contentAxisMatch: number;
    userAvoidancePenalty: number;
    selectedWorkTasteScore: number;
    profileTasteScore: number | null;
    profileAvoidancePenalty: number | null;
    effectiveTasteScore: number;
    riskSafetyScore: number;
    normalizedQualityScore: number;
    successConfidenceScore: number;
    displayRecommendationScore: number;
    matchedTagKeys: string[];

    /** 사용자 카드 표시용 0~100 정수 */
    matchScore: number;

    /** D+30~D+32 호환용 legacy aliases */
    sourceTasteScore: number;
    stage1Score: number;
    longTermScore: number | null;
    effectiveScore: number;
    finalRecommendationScore: number;
    qualityBoost: number;
    avoidancePenalty: number;

    debug: {
      candidateGenreScores: ScoreMap;
      candidateTypeScores: ScoreMap;
      candidateTagScores: ScoreMap;
      candidateAvoidanceTagScores: ScoreMap;
      candidateContentAxisScores: ScoreMap;
      candidateSourceDb: SourceDb;
      candidateSourceWeight: number;
      candidateDisplayAxisLabel: string;
      selectedWorkBreakdown: SelectedWorkTasteBreakdown;
      profileBreakdown: ProfileTasteBreakdown | null;
    };
  };

  export type SimilarWorkSelectionResult = {
    mode: "similar_work";
    recommendationMode: "similar_work";
    vectorSource: "selected_webtoons";
    scoreVersion: typeof FIND_RECOMMENDATION_SCORE_VERSION;

    selectedWebtoons: SimilarWorkSelectedWebtoon[];
    activeRecommendationVector: RecommendationVector;
    inputSnapshotAtSave: RecommendationVector;
    profileSnapshot: RecommendationVector | null;

    similarWorkSessionVector: SimilarWorkProfile;
    userSimilarWorkProfile: SimilarWorkProfile;
    storedUserTasteProfile: StoredUserTasteProfile | null;
    hasLongTermProfile: boolean;

    scoringVersion: typeof FIND_RECOMMENDATION_SCORE_VERSION;
    candidatePoolSize: number;
    candidatePoolIds: string[];
    hardFilterExcludedItems: HardFilterExcludedItem[];

    blendingWeights: {
      selectedWorkTasteScore: number;
      profileTasteScore: number;
      stage1Weight: number;
      longTermWeight: number;
    };

    mainDisplayItems: SimilarWorkRecommendation[];
    mainReservePool: SimilarWorkRecommendation[];
    expansionCandidatePool: SimilarWorkRecommendation[];
    expansionDisplayItems: SimilarWorkRecommendation[];
    expandReservePool: SimilarWorkRecommendation[];

    /** 기존 컴포넌트 호환용 10개 표시 결과 */
    recommendations: SimilarWorkRecommendation[];
  };

  export type SimilarWorkFilterContext = {
    alreadySeenWebtoonIds?: Iterable<string>;
    excludedWebtoonIds?: Iterable<string>;
  };

  type RawRecord = Record<string, unknown>;

  type SelectedWorkTasteBreakdown = {
    genreMatch: number;
    typeMatch: number;
    tagMatch: number;
    contentAxisMatch: number;
    positiveRaw: number;
    userAvoidancePenalty: number;
    selectedWorkTasteScore: number;
    matchedTagKeys: string[];
  };

  type ProfileTasteBreakdown = {
    genreMatch: number;
    typeMatch: number;
    tagMatch: number;
    positiveRaw: number;
    profileAvoidancePenalty: number;
    profileTasteScore: number;
    matchedTagKeys: string[];
  };

  type PrimaryCandidateDraft = {
    candidate: WebtoonSeedItem;
    selectedWorkBreakdown: SelectedWorkTasteBreakdown;
    sourceTasteRank: number;
    effectiveTasteRank: number;
    profileBreakdown: ProfileTasteBreakdown | null;
    effectiveTasteScore: number;
    riskSafetyScore: number;
    normalizedQualityScore: number;
    successConfidenceScore: number;
    displayRecommendationScore: number;
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

    return typeof value === "number" && Number.isFinite(value)
      ? value
      : undefined;
  }

  function getBooleanValue(record: RawRecord | undefined, key: string) {
    if (!record) return undefined;

    const value = record[key];

    return typeof value === "boolean" ? value : undefined;
  }

  function getFirstStringValue(
    records: Array<RawRecord | undefined>,
    keys: string[]
  ) {
    for (const record of records) {
      for (const key of keys) {
        const value = getStringValue(record, key);

        if (value) return value;
      }
    }

    return undefined;
  }

  function getFirstBooleanValue(
    records: Array<RawRecord | undefined>,
    keys: string[]
  ) {
    for (const record of records) {
      for (const key of keys) {
        const value = getBooleanValue(record, key);

        if (typeof value === "boolean") return value;
      }
    }

    return undefined;
  }

  function toScoreMap(value: unknown): ScoreMap {
    if (!isRecord(value)) return {};

    return Object.fromEntries(
      Object.entries(value).filter(([, score]) => {
        return typeof score === "number" && Number.isFinite(score);
      })
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

    const optionalStringFields: Array<
      [keyof WebtoonSeedItem["metadata"], string[]]
    > = [
      ["ageRating", ["ageRating"]],
      ["urlStatus", ["urlStatus"]],
      ["inputStatus", ["inputStatus"]],
      ["completionType", ["completionType"]],
      ["availabilityStatus", ["availabilityStatus", "officialAvailability"]],
      ["saleStatus", ["saleStatus", "salesStatus"]],
      ["contentKind", ["contentKind", "contentType", "workType"]],
      ["publicationType", ["publicationType", "platformPublicationType"]],
      ["adultPolicyCheck", ["adultPolicyCheck"]],
    ];

    optionalStringFields.forEach(([targetKey, sourceKeys]) => {
      const value = getFirstStringValue([metadata, rawItem], sourceKeys);

      if (value) {
        (normalizedMetadata as Record<string, unknown>)[targetKey] = value;
      }
    });

    const qualityScore = getNumberValue(metadata, "qualityScore");

    if (typeof qualityScore === "number") {
      normalizedMetadata.qualityScore = qualityScore;
    }

    const optionalBooleanFields: Array<
      [keyof WebtoonSeedItem["metadata"], string[]]
    > = [
      ["isAdult", ["isAdult"]],
      ["recommendationEligible", ["recommendationEligible"]],
      ["officialViewAvailable", ["officialViewAvailable", "isOfficiallyViewable"]],
      ["sexualCore", ["sexualCore", "isSexualCore"]],
      ["isWebNovelOnly", ["isWebNovelOnly", "webNovelOnly"]],
      ["isChallengeOnly", ["isChallengeOnly", "challengeOnly"]],
    ];

    optionalBooleanFields.forEach(([targetKey, sourceKeys]) => {
      const value = getFirstBooleanValue([metadata, rawItem], sourceKeys);

      if (typeof value === "boolean") {
        (normalizedMetadata as Record<string, unknown>)[targetKey] = value;
      }
    });

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
      contentAxisScores,
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
      season_completed: "시즌 완결",
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

  function createWeightedScoreMaps(
    selectedWebtoons: WebtoonSeedItem[],
    getScoreMap: (webtoon: WebtoonSeedItem) => ScoreMap
  ) {
    return selectedWebtoons.map((webtoon) => ({
      scoreMap: getScoreMap(webtoon),
      weight: webtoon.sourceWeight,
    }));
  }

  export function buildSimilarWorkProfile(
    selectedWebtoons: WebtoonSeedItem[]
  ): SimilarWorkProfile {
    const sourceWeightSum = getPositiveWeightSum(
      selectedWebtoons.map((webtoon) => webtoon.sourceWeight)
    );

    return {
      mode: "similar_work",
      sourceWebtoonIds: selectedWebtoons.map(
        (webtoon) => webtoon.canonicalWebtoonId
      ),
      sourceWeightSum,
      userGenreScores: weightedAverageScoreMaps(
        createWeightedScoreMaps(
          selectedWebtoons,
          (webtoon) => webtoon.recommendation.genreScores
        )
      ),
      userTypeScores: weightedAverageScoreMaps(
        createWeightedScoreMaps(selectedWebtoons, (webtoon) => {
          return flattenTypeScores(webtoon.recommendation.typeScores);
        })
      ),
      userTagScores: weightedAverageScoreMaps(
        createWeightedScoreMaps(selectedWebtoons, (webtoon) => {
          return webtoon.recommendation.tagScores ?? {};
        })
      ),
      userAvoidanceScores: weightedAverageScoreMaps(
        createWeightedScoreMaps(selectedWebtoons, (webtoon) => {
          return webtoon.recommendation.avoidanceTagScores ?? {};
        })
      ),
      userContentAxisScores: weightedAverageScoreMaps(
        createWeightedScoreMaps(selectedWebtoons, (webtoon) => {
          return webtoon.recommendation.contentAxisScores ?? {};
        })
      ),
    };
  }

  export function recommendationVectorFromSimilarWorkProfile(
    profile: SimilarWorkProfile
  ): RecommendationVector {
    return {
      genreScores: profile.userGenreScores,
      typeScores: profile.userTypeScores,
      tagScores: profile.userTagScores,
      avoidanceTagScores: profile.userAvoidanceScores,
      contentAxisScores: profile.userContentAxisScores,
    };
  }

  export function recommendationVectorFromStoredProfile(
    profile: StoredUserTasteProfile
  ): RecommendationVector {
    return {
      genreScores: profile.userGenreScores,
      typeScores: profile.userTypeScores,
      tagScores: profile.userTagScores,
      avoidanceTagScores: profile.userAvoidanceScores,
      contentAxisScores: {},
    };
  }

  export function calculateAvoidancePenalty(
    userAvoidanceScores: ScoreMap,
    candidateAvoidanceScores: ScoreMap
  ) {
    return roundScore(
      clamp(
        dotProduct(userAvoidanceScores, candidateAvoidanceScores) / 100,
        0,
        1
      )
    );
  }

  export function calculateRiskSafetyScore(
    candidateAvoidanceTagScores: ScoreMap
  ) {
    const generalRiskPenalty = Object.entries(RISK_SAFETY_WEIGHTS).reduce(
      (penalty, [tagKey, weight]) => {
        const rawTagScore = candidateAvoidanceTagScores[tagKey] ?? 0;
        const normalizedRisk = clamp(rawTagScore / 3, 0, 1);

        return penalty + normalizedRisk * weight;
      },
      0
    );

    return roundScore(clamp(1 - generalRiskPenalty, 0, 1));
  }

  export function calculateSuccessConfidenceScore(params: {
    qualityScore?: number;
    riskSafetyScore: number;
  }) {
    const normalizedQualityScore = roundScore(
      clamp((params.qualityScore ?? 0) / 5, 0, 1)
    );
    const successConfidenceScore = roundScore(
      normalizedQualityScore * 0.7 +
        clamp(params.riskSafetyScore, 0, 1) * 0.3
    );

    return {
      normalizedQualityScore,
      successConfidenceScore,
    };
  }

  export function calculateDisplayRecommendationScore(params: {
    effectiveTasteScore: number;
    successConfidenceScore: number;
  }) {
    return roundScore(
      clamp(
        params.effectiveTasteScore * 0.75 +
          params.successConfidenceScore * 0.25,
        0,
        1
      )
    );
  }

  export function calculateSelectedWorkTasteScore(params: {
    activeRecommendationVector: RecommendationVector;
    candidateGenreScores: ScoreMap;
    candidateTypeScores: ScoreMap;
    candidateTagScores: ScoreMap;
    candidateAvoidanceTagScores: ScoreMap;
    candidateContentAxisScores: ScoreMap;
  }): SelectedWorkTasteBreakdown {
    const {
      activeRecommendationVector,
      candidateGenreScores,
      candidateTypeScores,
      candidateTagScores,
      candidateAvoidanceTagScores,
      candidateContentAxisScores,
    } = params;

    const genreMatch = cosineSimilarity(
      activeRecommendationVector.genreScores,
      candidateGenreScores
    );
    const typeMatch = cosineSimilarity(
      activeRecommendationVector.typeScores,
      candidateTypeScores
    );
    const tagMatch = cosineSimilarity(
      activeRecommendationVector.tagScores,
      candidateTagScores
    );
    const contentAxisMatch = cosineSimilarity(
      activeRecommendationVector.contentAxisScores,
      candidateContentAxisScores
    );
    const userAvoidancePenalty = calculateAvoidancePenalty(
      activeRecommendationVector.avoidanceTagScores,
      candidateAvoidanceTagScores
    );
    const positiveRaw = roundScore(
      genreMatch * 0.15 +
        typeMatch * 0.2 +
        tagMatch * 0.25 +
        contentAxisMatch * 0.3
    );
    const selectedWorkTasteScore = roundScore(
      clamp(
        positiveRaw / PRIMARY_POSITIVE_WEIGHT_SUM - userAvoidancePenalty,
        0,
        1
      )
    );

    return {
      genreMatch,
      typeMatch,
      tagMatch,
      contentAxisMatch,
      positiveRaw,
      userAvoidancePenalty,
      selectedWorkTasteScore,
      matchedTagKeys: getMatchedTagKeys(
        activeRecommendationVector.tagScores,
        candidateTagScores
      ),
    };
  }

  export function calculateProfileTasteScore(params: {
    profileSnapshot: RecommendationVector;
    candidateGenreScores: ScoreMap;
    candidateTypeScores: ScoreMap;
    candidateTagScores: ScoreMap;
    candidateAvoidanceTagScores: ScoreMap;
  }): ProfileTasteBreakdown {
    const {
      profileSnapshot,
      candidateGenreScores,
      candidateTypeScores,
      candidateTagScores,
      candidateAvoidanceTagScores,
    } = params;

    const genreMatch = cosineSimilarity(
      profileSnapshot.genreScores,
      candidateGenreScores
    );
    const typeMatch = cosineSimilarity(
      profileSnapshot.typeScores,
      candidateTypeScores
    );
    const tagMatch = cosineSimilarity(
      profileSnapshot.tagScores,
      candidateTagScores
    );
    const profileAvoidancePenalty = calculateAvoidancePenalty(
      profileSnapshot.avoidanceTagScores,
      candidateAvoidanceTagScores
    );
    const positiveRaw = roundScore(
      genreMatch * 0.25 + typeMatch * 0.25 + tagMatch * 0.35
    );
    const profileTasteScore = roundScore(
      clamp(
        positiveRaw / PROFILE_POSITIVE_WEIGHT_SUM - profileAvoidancePenalty,
        0,
        1
      )
    );

    return {
      genreMatch,
      typeMatch,
      tagMatch,
      positiveRaw,
      profileAvoidancePenalty,
      profileTasteScore,
      matchedTagKeys: getMatchedTagKeys(
        profileSnapshot.tagScores,
        candidateTagScores
      ),
    };
  }

  export function getSimilarWorkRecommendations(params: {
    selectedWebtoons: WebtoonSeedItem[];
    allWebtoons: WebtoonSeedItem[];
    limit?: number;
    filterContext?: SimilarWorkFilterContext;
  }): SimilarWorkRecommendation[] {
    const {
      selectedWebtoons,
      allWebtoons,
      limit = 10,
      filterContext,
    } = params;

    return createSimilarWorkSelectionResult({
      selectedWebtoons,
      allWebtoons,
      filterContext,
    }).recommendations.slice(0, limit);
  }

  export function createSimilarWorkSelectionResult(params: {
    selectedWebtoons: WebtoonSeedItem[];
    allWebtoons: WebtoonSeedItem[];
    limit?: number;
    filterContext?: SimilarWorkFilterContext;
  }): SimilarWorkSelectionResult {
    const { selectedWebtoons, allWebtoons, filterContext } = params;
    const similarWorkSessionVector = buildSimilarWorkProfile(selectedWebtoons);

    if (similarWorkSessionVector.sourceWeightSum <= 0) {
      throw new Error("PRIMARY_SOURCE_WEIGHT_NOT_READY");
    }

    const activeRecommendationVector =
      recommendationVectorFromSimilarWorkProfile(similarWorkSessionVector);
    const storedUserTasteProfile = buildStoredUserTasteProfile();
    const hasLongTermProfile = hasAnyTasteScore(storedUserTasteProfile);
    const profileSnapshot =
      hasLongTermProfile && storedUserTasteProfile
        ? recommendationVectorFromStoredProfile(storedUserTasteProfile)
        : null;

    const hardFilterResult = applyPrimaryHardFilters({
      selectedWebtoons,
      allWebtoons,
      filterContext,
    });

    const sourceTasteRanked = hardFilterResult.candidates
      .map((candidate) => {
        const candidateTypeScores = flattenTypeScores(
          candidate.recommendation.typeScores
        );
        const candidateTagScores = candidate.recommendation.tagScores ?? {};
        const candidateAvoidanceTagScores =
          candidate.recommendation.avoidanceTagScores ?? {};
        const candidateContentAxisScores =
          candidate.recommendation.contentAxisScores ?? {};

        const selectedWorkBreakdown = calculateSelectedWorkTasteScore({
          activeRecommendationVector,
          candidateGenreScores: candidate.recommendation.genreScores,
          candidateTypeScores,
          candidateTagScores,
          candidateAvoidanceTagScores,
          candidateContentAxisScores,
        });

        return {
          candidate,
          selectedWorkBreakdown,
        };
      })
      .sort(sortBySelectedWorkTasteScore)
      .map((item, index) => ({
        ...item,
        sourceTasteRank: index + 1,
      }));

    const candidatePool = sourceTasteRanked.slice(
      0,
      PRIMARY_CANDIDATE_POOL_SIZE
    );

    const effectiveTasteRankedDrafts = candidatePool
      .map<PrimaryCandidateDraft>((item) => {
        const candidate = item.candidate;
        const candidateTypeScores = flattenTypeScores(
          candidate.recommendation.typeScores
        );
        const candidateTagScores = candidate.recommendation.tagScores ?? {};
        const candidateAvoidanceTagScores =
          candidate.recommendation.avoidanceTagScores ?? {};

        const profileBreakdown = profileSnapshot
          ? calculateProfileTasteScore({
              profileSnapshot,
              candidateGenreScores: candidate.recommendation.genreScores,
              candidateTypeScores,
              candidateTagScores,
              candidateAvoidanceTagScores,
            })
          : null;

        const effectiveTasteScore = roundScore(
          profileBreakdown
            ? item.selectedWorkBreakdown.selectedWorkTasteScore *
                PRIMARY_SELECTED_WORK_WEIGHT +
                profileBreakdown.profileTasteScore * PRIMARY_PROFILE_WEIGHT
            : item.selectedWorkBreakdown.selectedWorkTasteScore
        );

        const riskSafetyScore = calculateRiskSafetyScore(
          candidateAvoidanceTagScores
        );
        const {
          normalizedQualityScore,
          successConfidenceScore,
        } = calculateSuccessConfidenceScore({
          qualityScore: candidate.metadata.qualityScore,
          riskSafetyScore,
        });
        const displayRecommendationScore =
          calculateDisplayRecommendationScore({
            effectiveTasteScore,
            successConfidenceScore,
          });

        return {
          candidate,
          selectedWorkBreakdown: item.selectedWorkBreakdown,
          sourceTasteRank: item.sourceTasteRank,
          effectiveTasteRank: 0,
          profileBreakdown,
          effectiveTasteScore,
          riskSafetyScore,
          normalizedQualityScore,
          successConfidenceScore,
          displayRecommendationScore,
          matchedTagKeys: mergeMatchedTagKeys(
            item.selectedWorkBreakdown.matchedTagKeys,
            profileBreakdown?.matchedTagKeys ?? []
          ),
        };
      })
      .sort(sortByEffectiveTasteScore)
      .map((draft, index) => ({
        ...draft,
        effectiveTasteRank: index + 1,
      }));

    const displayRankedDrafts = [...effectiveTasteRankedDrafts].sort(
      sortByDisplayRecommendationScore
    );

    const effectiveRecommendations = displayRankedDrafts.map(
      (draft, index) => {
        return createRecommendationFromDraft({
          draft,
          rank: index + 1,
          recommendationType: "stable_match",
        });
      }
    );

    const mainPool = effectiveRecommendations.slice(0, MAIN_POOL_SIZE);
    const mainDisplayItems = mainPool.slice(0, 5).map((recommendation) => ({
      ...recommendation,
      recommendationType: "stable_match" as const,
    }));
    const mainReservePool = mainPool.slice(5).map((recommendation) => ({
      ...recommendation,
      recommendationType: "similar_texture" as const,
    }));

    const expansionCandidatePool = effectiveRecommendations
      .slice(MAIN_POOL_SIZE, EXPANSION_POOL_END)
      .map((recommendation) => ({
        ...recommendation,
        recommendationType: "taste_expansion" as const,
      }));
    const expansionDisplayItems = pickExpansionDisplayItems({
      mainDisplayItems,
      expansionCandidatePool,
    });
    const expansionDisplayIdSet = new Set(
      expansionDisplayItems.map(
        (recommendation) => recommendation.candidate.canonicalWebtoonId
      )
    );
    const expandReservePool = expansionCandidatePool.filter((recommendation) => {
      return !expansionDisplayIdSet.has(
        recommendation.candidate.canonicalWebtoonId
      );
    });

    return {
      mode: "similar_work",
      recommendationMode: "similar_work",
      vectorSource: "selected_webtoons",
      scoreVersion: FIND_RECOMMENDATION_SCORE_VERSION,
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
      activeRecommendationVector,
      inputSnapshotAtSave: activeRecommendationVector,
      profileSnapshot,
      similarWorkSessionVector,
      userSimilarWorkProfile: similarWorkSessionVector,
      storedUserTasteProfile: hasLongTermProfile
        ? storedUserTasteProfile
        : null,
      hasLongTermProfile,
      scoringVersion: FIND_RECOMMENDATION_SCORE_VERSION,
      candidatePoolSize: candidatePool.length,
      candidatePoolIds: effectiveRecommendations.map(
        (recommendation) => recommendation.candidate.canonicalWebtoonId
      ),
      hardFilterExcludedItems: hardFilterResult.excludedItems,
      blendingWeights: {
        selectedWorkTasteScore: hasLongTermProfile
          ? PRIMARY_SELECTED_WORK_WEIGHT
          : 1,
        profileTasteScore: hasLongTermProfile ? PRIMARY_PROFILE_WEIGHT : 0,
        stage1Weight: hasLongTermProfile ? PRIMARY_SELECTED_WORK_WEIGHT : 1,
        longTermWeight: hasLongTermProfile ? PRIMARY_PROFILE_WEIGHT : 0,
      },
      mainDisplayItems,
      mainReservePool,
      expansionCandidatePool,
      expansionDisplayItems,
      expandReservePool,
      recommendations: [...mainDisplayItems, ...expansionDisplayItems],
    };
  }

  function applyPrimaryHardFilters(params: {
    selectedWebtoons: WebtoonSeedItem[];
    allWebtoons: WebtoonSeedItem[];
    filterContext?: SimilarWorkFilterContext;
  }) {
    const { selectedWebtoons, allWebtoons, filterContext } = params;
    const selectedWebtoonIds = new Set(
      selectedWebtoons.map((webtoon) => webtoon.canonicalWebtoonId)
    );
    const alreadySeenWebtoonIds = new Set(
      filterContext?.alreadySeenWebtoonIds ?? []
    );
    const excludedWebtoonIds = new Set(
      filterContext?.excludedWebtoonIds ?? []
    );
    const seenCandidateIds = new Set<string>();
    const candidates: WebtoonSeedItem[] = [];
    const excludedItems: HardFilterExcludedItem[] = [];

    allWebtoons.forEach((candidate) => {
      const reason = getHardFilterExclusionReason({
        candidate,
        selectedWebtoonIds,
        alreadySeenWebtoonIds,
        excludedWebtoonIds,
        seenCandidateIds,
      });

      if (reason) {
        excludedItems.push({
          canonicalWebtoonId: candidate.canonicalWebtoonId,
          reason,
        });
        return;
      }

      seenCandidateIds.add(candidate.canonicalWebtoonId);
      candidates.push(candidate);
    });

    return {
      candidates,
      excludedItems,
    };
  }

  function getHardFilterExclusionReason(params: {
    candidate: WebtoonSeedItem;
    selectedWebtoonIds: Set<string>;
    alreadySeenWebtoonIds: Set<string>;
    excludedWebtoonIds: Set<string>;
    seenCandidateIds: Set<string>;
  }): HardFilterExclusionReason | null {
    const {
      candidate,
      selectedWebtoonIds,
      alreadySeenWebtoonIds,
      excludedWebtoonIds,
      seenCandidateIds,
    } = params;
    const metadata = candidate.metadata;

    if (selectedWebtoonIds.has(candidate.canonicalWebtoonId)) {
      return "selected_source_work";
    }

    if (alreadySeenWebtoonIds.has(candidate.canonicalWebtoonId)) {
      return "already_seen";
    }

    if (excludedWebtoonIds.has(candidate.canonicalWebtoonId)) {
      return "session_excluded";
    }

    if (seenCandidateIds.has(candidate.canonicalWebtoonId)) {
      return "duplicate_canonical_webtoon_id";
    }

    if (!candidate.officialUrl.trim()) {
      return "missing_official_url";
    }

    const urlStatus = normalizePolicyValue(metadata.urlStatus);

    if (urlStatus === "invalid" || urlStatus.startsWith("invalid_")) {
      return "invalid_url";
    }

    if (metadata.recommendationEligible === false) {
      return "recommendation_ineligible";
    }

    if (isNonRecommendableInputStatus(metadata.inputStatus)) {
      return "non_recommendable_input_status";
    }

    if (metadata.officialViewAvailable === false) {
      return "official_view_unavailable";
    }

    if (
      containsBlockedPolicyValue(metadata.availabilityStatus, [
        "unavailable",
        "not_available",
        "official_view_unavailable",
        "viewing_unavailable",
        "removed",
        "discontinued",
      ]) ||
      containsBlockedPolicyValue(metadata.saleStatus, [
        "sale_stopped",
        "sales_stopped",
        "not_for_sale",
        "discontinued",
        "removed",
      ])
    ) {
      return "sale_or_availability_unavailable";
    }

    if (
      metadata.isWebNovelOnly === true ||
      containsBlockedPolicyValue(metadata.contentKind, [
        "webnovel_only",
        "web_novel_only",
        "novel_only",
      ])
    ) {
      return "webnovel_only";
    }

    if (
      metadata.isChallengeOnly === true ||
      containsBlockedPolicyValue(metadata.publicationType, [
        "challenge_only",
        "best_challenge_only",
        "challenge",
        "best_challenge",
      ])
    ) {
      return "challenge_only";
    }

    if (
      metadata.sexualCore === true ||
      containsBlockedPolicyValue(metadata.adultPolicyCheck, [
        "sexual_core_excluded",
        "adult_core_excluded",
        "core_excluded",
      ])
    ) {
      return "sexual_core_concept";
    }

    return null;
  }

  function normalizePolicyValue(value?: string) {
    return value?.trim().toLocaleLowerCase("en-US") ?? "";
  }

  function containsBlockedPolicyValue(value: string | undefined, blocked: string[]) {
    const normalizedValue = normalizePolicyValue(value);

    if (!normalizedValue) return false;

    return blocked.some((blockedValue) => {
      return normalizedValue === blockedValue || normalizedValue.includes(blockedValue);
    });
  }

  function isNonRecommendableInputStatus(inputStatus?: string) {
    const normalizedStatus = normalizePolicyValue(inputStatus);

    if (!normalizedStatus) return false;

    const blockedTokens = [
      "excluded",
      "not_recommendable",
      "recommendation_ineligible",
      "hold_for_quality_evidence",
      "official_view_unavailable",
      "sale_stopped",
      "webnovel_only",
      "novel_only",
      "challenge_only",
      "best_challenge_only",
      "sexual_core",
    ];

    return blockedTokens.some((token) => normalizedStatus.includes(token));
  }

  function createRecommendationFromDraft(params: {
    draft: PrimaryCandidateDraft;
    rank: number;
    recommendationType: RecommendationType;
  }): SimilarWorkRecommendation {
    const { draft, rank, recommendationType } = params;
    const candidate = draft.candidate;
    const selectedWorkBreakdown = draft.selectedWorkBreakdown;
    const profileBreakdown = draft.profileBreakdown;
    const candidateTypeScores = flattenTypeScores(
      candidate.recommendation.typeScores
    );
    const candidateTagScores = candidate.recommendation.tagScores ?? {};
    const candidateAvoidanceTagScores =
      candidate.recommendation.avoidanceTagScores ?? {};
    const candidateContentAxisScores =
      candidate.recommendation.contentAxisScores ?? {};

    return {
      rank,
      sourceTasteRank: draft.sourceTasteRank,
      effectiveTasteRank: draft.effectiveTasteRank,
      effectiveRank: draft.effectiveTasteRank,
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
      genreMatch: selectedWorkBreakdown.genreMatch,
      typeMatch: selectedWorkBreakdown.typeMatch,
      tagMatch: selectedWorkBreakdown.tagMatch,
      contentAxisMatch: selectedWorkBreakdown.contentAxisMatch,
      userAvoidancePenalty: selectedWorkBreakdown.userAvoidancePenalty,
      selectedWorkTasteScore: selectedWorkBreakdown.selectedWorkTasteScore,
      profileTasteScore: profileBreakdown?.profileTasteScore ?? null,
      profileAvoidancePenalty:
        profileBreakdown?.profileAvoidancePenalty ?? null,
      effectiveTasteScore: draft.effectiveTasteScore,
      riskSafetyScore: draft.riskSafetyScore,
      normalizedQualityScore: draft.normalizedQualityScore,
      successConfidenceScore: draft.successConfidenceScore,
      displayRecommendationScore: draft.displayRecommendationScore,
      matchedTagKeys: draft.matchedTagKeys,
      matchScore: Math.round(draft.displayRecommendationScore * 100),

      sourceTasteScore: selectedWorkBreakdown.selectedWorkTasteScore,
      stage1Score: selectedWorkBreakdown.selectedWorkTasteScore,
      longTermScore: profileBreakdown?.profileTasteScore ?? null,
      effectiveScore: draft.effectiveTasteScore,
      finalRecommendationScore: draft.displayRecommendationScore,
      qualityBoost: draft.normalizedQualityScore,
      avoidancePenalty: selectedWorkBreakdown.userAvoidancePenalty,

      debug: {
        candidateGenreScores: candidate.recommendation.genreScores,
        candidateTypeScores,
        candidateTagScores,
        candidateAvoidanceTagScores,
        candidateContentAxisScores,
        candidateSourceDb: candidate.sourceDb,
        candidateSourceWeight: candidate.sourceWeight,
        candidateDisplayAxisLabel: candidate.displayAxisLabel,
        selectedWorkBreakdown,
        profileBreakdown,
      },
    };
  }

  function sortBySelectedWorkTasteScore(
    a: {
      candidate: WebtoonSeedItem;
      selectedWorkBreakdown: SelectedWorkTasteBreakdown;
    },
    b: {
      candidate: WebtoonSeedItem;
      selectedWorkBreakdown: SelectedWorkTasteBreakdown;
    }
  ) {
    if (
      b.selectedWorkBreakdown.selectedWorkTasteScore !==
      a.selectedWorkBreakdown.selectedWorkTasteScore
    ) {
      return (
        b.selectedWorkBreakdown.selectedWorkTasteScore -
        a.selectedWorkBreakdown.selectedWorkTasteScore
      );
    }

    return a.candidate.canonicalWebtoonId.localeCompare(
      b.candidate.canonicalWebtoonId,
      "ko-KR"
    );
  }

  function sortByEffectiveTasteScore(
    a: PrimaryCandidateDraft,
    b: PrimaryCandidateDraft
  ) {
    if (b.effectiveTasteScore !== a.effectiveTasteScore) {
      return b.effectiveTasteScore - a.effectiveTasteScore;
    }

    if (
      b.selectedWorkBreakdown.selectedWorkTasteScore !==
      a.selectedWorkBreakdown.selectedWorkTasteScore
    ) {
      return (
        b.selectedWorkBreakdown.selectedWorkTasteScore -
        a.selectedWorkBreakdown.selectedWorkTasteScore
      );
    }

    if (a.sourceTasteRank !== b.sourceTasteRank) {
      return a.sourceTasteRank - b.sourceTasteRank;
    }

    return a.candidate.canonicalWebtoonId.localeCompare(
      b.candidate.canonicalWebtoonId,
      "ko-KR"
    );
  }

  function sortByDisplayRecommendationScore(
    a: PrimaryCandidateDraft,
    b: PrimaryCandidateDraft
  ) {
    if (b.displayRecommendationScore !== a.displayRecommendationScore) {
      return b.displayRecommendationScore - a.displayRecommendationScore;
    }

    if (b.effectiveTasteScore !== a.effectiveTasteScore) {
      return b.effectiveTasteScore - a.effectiveTasteScore;
    }

    if (
      b.selectedWorkBreakdown.selectedWorkTasteScore !==
      a.selectedWorkBreakdown.selectedWorkTasteScore
    ) {
      return (
        b.selectedWorkBreakdown.selectedWorkTasteScore -
        a.selectedWorkBreakdown.selectedWorkTasteScore
      );
    }

    return a.candidate.canonicalWebtoonId.localeCompare(
      b.candidate.canonicalWebtoonId,
      "ko-KR"
    );
  }

  function getMatchedTagKeys(
    userTagScores: ScoreMap,
    candidateTagScores: ScoreMap
  ) {
    return Object.keys(userTagScores)
      .filter((tagKey) => {
        return (
          (userTagScores[tagKey] ?? 0) > 0 &&
          (candidateTagScores[tagKey] ?? 0) > 0
        );
      })
      .sort((a, b) => {
        const aScore =
          (userTagScores[a] ?? 0) + (candidateTagScores[a] ?? 0);
        const bScore =
          (userTagScores[b] ?? 0) + (candidateTagScores[b] ?? 0);

        return bScore - aScore;
      })
      .slice(0, 8);
  }

  function mergeMatchedTagKeys(
    primaryTagKeys: string[],
    secondaryTagKeys: string[]
  ) {
    return [...new Set([...primaryTagKeys, ...secondaryTagKeys])].slice(0, 8);
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
        selectedItems.some((item) => {
          return (
            item.candidate.canonicalWebtoonId ===
            candidate.candidate.canonicalWebtoonId
          );
        })
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
        selectedItems.some((item) => {
          return (
            item.candidate.canonicalWebtoonId ===
            candidate.candidate.canonicalWebtoonId
          );
        })
      ) {
        continue;
      }

      selectCandidate(candidate, "taste_expansion");
    }

    return selectedItems.slice(0, 5);
  }

  export type {
    RecommendationMode,
    RecommendationVectorSource,
  };