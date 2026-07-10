import {
    getGenreLabel,
    getStatusLabel,
  } from "@/lib/recommendation/similarWorkRecommendation";

  import { flattenTypeScores } from "@/lib/recommendation/vector";
  
  import type {
    RecommendationType,
    SimilarWorkRecommendation,
    SimilarWorkSelectionResult,
    SimilarWorkSelectedWebtoon,
    WebtoonSeedItem,
  } from "@/lib/recommendation/similarWorkRecommendation";
  import type { StoredUserTasteProfile } from "@/lib/recommendation/storedUserTasteProfile";
  import type {
    RecommendationItemActionState,
    RecommendationItemActionStateMap,
  } from "@/types/find";
  import type { ScoreMap } from "@/lib/recommendation/vector";
  
  export const FIND_PRIMARY_SESSION_STORAGE_KEY = "webtoon_find_primary_session";
  export const FIND_PRIMARY_SESSION_SCHEMA_VERSION = "0.1";
  export const FIND_PRIMARY_SESSION_SEED_VERSION =
    "webtoons_seed_v0_6_similarity_balanced_final";
  
  export type FindPrimarySession = {
    schemaVersion: "0.1";
    mode: "similar_work";
    sessionId: string;
    createdAt: string;
    updatedAt: string;
  
    seedVersion: string;
    rerankPolicy: {
      version: "v1.8_two_stage_rerank";
      stage1CandidatePoolSize: 100;
      primaryWeights: {
        stage1Score: number;
        longTermScore: number;
      };
    };
  
    selectedWebtoons: SelectedSourceWebtoonSnapshot[];
  
    similarWorkSessionVector: {
      userGenreScores: ScoreMap;
      userTypeScores: ScoreMap;
      userTagScores: ScoreMap;
      userAvoidanceScores: ScoreMap;
    };
  
    storedUserTasteProfileSnapshot?: StoredUserTasteProfile;
  
    candidatePoolSize: number;
  
    mainDisplayItems: RecommendationItemSnapshot[];
    mainReservePool: RecommendationItemSnapshot[];
    expansionDisplayItems: RecommendationItemSnapshot[];
    expansionReservePool: RecommendationItemSnapshot[];
  
    actionStateByWebtoonId: RecommendationItemActionStateMap;
  };
  
  export type SelectedSourceWebtoonSnapshot = {
    canonicalWebtoonId: string;
    title: string;
    platform: string;
    mainGenre: string;
    mainGenreLabel: string;
    statusLabel: string;
    scoreSnapshotAtSave: WebtoonScoreSnapshotAtSave;
  };
  
  export type RecommendationItemSnapshot = {
    canonicalWebtoonId: string;
    section: "main_display" | "main_reserve" | "expansion_display" | "expansion_reserve";
    slot: number;
    originalRank: number;
    currentRank: number;
    stage1Rank: number;
    candidatePoolRank: number;
    reservePoolType?: "main_reserve" | "expansion_reserve";
    reserveRank?: number;
    badgeType: RecommendationType;
    status: "active" | "feedback_excluded";
    matchedTagKeys: string[];
    matchScore: number;
    stage1Score: number;
    longTermScore: number | null;
    effectiveScore: number;
    finalRecommendationScore: number;
    genreMatch: number;
    typeMatch: number;
    tagMatch: number;
    qualityBoost: number;
    avoidancePenalty: number;
    recommendationReason: string;
    scoreSnapshotAtSave: WebtoonScoreSnapshotAtSave;
  };
  
  export type WebtoonScoreSnapshotAtSave = {
    scoreVersion?: string;
    canonicalWebtoonId: string;
    title: string;
    platform: string;
    mainGenre: string;
    officialUrl: string;
    status?: string;
    ageRating?: string;
    isAdult?: boolean;
    qualityScore?: number;
  
    genreScores: ScoreMap;
    typeScores: ScoreMap;
    tagScores: ScoreMap;
    avoidanceTagScores: ScoreMap;
  
    recommendationReason?: string;
  };
  
  function canUseLocalStorage() {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  }
  
  function createSessionId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  
    return `find_primary_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }
  
  function safeParseSession(value: string | null): FindPrimarySession | null {
    if (!value) return null;
  
    try {
      const parsed = JSON.parse(value);
  
      if (
        parsed?.schemaVersion !== FIND_PRIMARY_SESSION_SCHEMA_VERSION ||
        parsed?.mode !== "similar_work" ||
        typeof parsed?.sessionId !== "string"
      ) {
        return null;
      }
  
      return parsed as FindPrimarySession;
    } catch {
      return null;
    }
  }
  
  function getQualityScoreFromBoost(qualityBoost: number) {
    return Math.round(qualityBoost * 5 * 10000) / 10000;
  }
  
  function createSelectedScoreSnapshot(
    webtoon: WebtoonSeedItem
  ): WebtoonScoreSnapshotAtSave {
    return {
      canonicalWebtoonId: webtoon.canonicalWebtoonId,
      title: webtoon.title,
      platform: webtoon.platform,
      mainGenre: webtoon.mainGenre,
      officialUrl: webtoon.officialUrl,
      status: webtoon.metadata.status,
      ageRating: webtoon.metadata.ageRating,
      isAdult: webtoon.metadata.isAdult,
      qualityScore: webtoon.metadata.qualityScore,
      genreScores: webtoon.recommendation.genreScores,
      typeScores: flattenTypeScores(webtoon.recommendation.typeScores),
      tagScores: webtoon.recommendation.tagScores ?? {},
      avoidanceTagScores: webtoon.recommendation.avoidanceTagScores ?? {},
      recommendationReason: webtoon.recommendation.recommendationReason,
    };
  }
  
  function createRecommendationScoreSnapshot(
    recommendation: SimilarWorkRecommendation
  ): WebtoonScoreSnapshotAtSave {
    return {
      canonicalWebtoonId: recommendation.candidate.canonicalWebtoonId,
      title: recommendation.candidate.title,
      platform: recommendation.candidate.platform,
      mainGenre: recommendation.candidate.mainGenre,
      officialUrl: recommendation.candidate.officialUrl,
      status: recommendation.candidate.status,
      qualityScore: getQualityScoreFromBoost(recommendation.qualityBoost),
      genreScores: recommendation.debug.candidateGenreScores,
      typeScores: recommendation.debug.candidateTypeScores,
      tagScores: recommendation.debug.candidateTagScores,
      avoidanceTagScores: recommendation.debug.candidateAvoidanceTagScores,
      recommendationReason: recommendation.candidate.recommendationReason,
    };
  }
  
  function createSelectedSnapshot(
    webtoon: WebtoonSeedItem
  ): SelectedSourceWebtoonSnapshot {
    return {
      canonicalWebtoonId: webtoon.canonicalWebtoonId,
      title: webtoon.title,
      platform: webtoon.platform,
      mainGenre: webtoon.mainGenre,
      mainGenreLabel: getGenreLabel(webtoon.mainGenre),
      statusLabel: getStatusLabel(webtoon.metadata.status),
      scoreSnapshotAtSave: createSelectedScoreSnapshot(webtoon),
    };
  }
  
  function createRecommendationSnapshot(params: {
    recommendation: SimilarWorkRecommendation;
    section: RecommendationItemSnapshot["section"];
    slot: number;
    reservePoolType?: RecommendationItemSnapshot["reservePoolType"];
    reserveRank?: number;
    actionState?: RecommendationItemActionState;
  }): RecommendationItemSnapshot {
    const {
      recommendation,
      section,
      slot,
      reservePoolType,
      reserveRank,
      actionState,
    } = params;
  
    return {
      canonicalWebtoonId: recommendation.candidate.canonicalWebtoonId,
      section,
      slot,
      originalRank: recommendation.rank,
      currentRank: recommendation.rank,
      stage1Rank: recommendation.rank,
      candidatePoolRank: recommendation.effectiveRank,
      reservePoolType,
      reserveRank,
      badgeType: recommendation.recommendationType,
      status: actionState?.feedbackAction ? "feedback_excluded" : "active",
      matchedTagKeys: recommendation.matchedTagKeys,
      matchScore: recommendation.matchScore,
      stage1Score: recommendation.stage1Score,
      longTermScore: recommendation.longTermScore,
      effectiveScore: recommendation.effectiveScore,
      finalRecommendationScore: recommendation.finalRecommendationScore,
      genreMatch: recommendation.genreMatch,
      typeMatch: recommendation.typeMatch,
      tagMatch: recommendation.tagMatch,
      qualityBoost: recommendation.qualityBoost,
      avoidancePenalty: recommendation.avoidancePenalty,
      recommendationReason: recommendation.candidate.recommendationReason,
      scoreSnapshotAtSave: createRecommendationScoreSnapshot(recommendation),
    };
  }
  
  function snapshotRecommendationList(params: {
    recommendations: SimilarWorkRecommendation[];
    section: RecommendationItemSnapshot["section"];
    actionStateByWebtoonId: RecommendationItemActionStateMap;
    reservePoolType?: RecommendationItemSnapshot["reservePoolType"];
  }) {
    const { recommendations, section, actionStateByWebtoonId, reservePoolType } =
      params;
  
    return recommendations.map((recommendation, index) =>
      createRecommendationSnapshot({
        recommendation,
        section,
        slot: index + 1,
        reservePoolType,
        reserveRank: reservePoolType ? index + 1 : undefined,
        actionState:
          actionStateByWebtoonId[recommendation.candidate.canonicalWebtoonId],
      })
    );
  }
  
  export function createFindPrimarySession(params: {
    selectionResult: SimilarWorkSelectionResult;
    selectedSourceWebtoons: WebtoonSeedItem[];
    actionStateByWebtoonId?: RecommendationItemActionStateMap;
    previousSessionId?: string;
  }): FindPrimarySession {
    const {
      selectionResult,
      selectedSourceWebtoons,
      actionStateByWebtoonId = {},
      previousSessionId,
    } = params;
    const now = new Date().toISOString();
  
    return {
      schemaVersion: FIND_PRIMARY_SESSION_SCHEMA_VERSION,
      mode: "similar_work",
      sessionId: previousSessionId ?? createSessionId(),
      createdAt: now,
      updatedAt: now,
      seedVersion: FIND_PRIMARY_SESSION_SEED_VERSION,
      rerankPolicy: {
        version: "v1.8_two_stage_rerank",
        stage1CandidatePoolSize: 100,
        primaryWeights: {
          stage1Score: selectionResult.blendingWeights.stage1Weight,
          longTermScore: selectionResult.blendingWeights.longTermWeight,
        },
      },
      selectedWebtoons: selectedSourceWebtoons.map(createSelectedSnapshot),
      similarWorkSessionVector: {
        userGenreScores: selectionResult.similarWorkSessionVector.userGenreScores,
        userTypeScores: selectionResult.similarWorkSessionVector.userTypeScores,
        userTagScores: selectionResult.similarWorkSessionVector.userTagScores,
        userAvoidanceScores:
          selectionResult.similarWorkSessionVector.userAvoidanceScores,
      },
      storedUserTasteProfileSnapshot:
        selectionResult.storedUserTasteProfile ?? undefined,
      candidatePoolSize: selectionResult.candidatePoolSize,
      mainDisplayItems: snapshotRecommendationList({
        recommendations: selectionResult.mainDisplayItems,
        section: "main_display",
        actionStateByWebtoonId,
      }),
      mainReservePool: snapshotRecommendationList({
        recommendations: selectionResult.mainReservePool,
        section: "main_reserve",
        reservePoolType: "main_reserve",
        actionStateByWebtoonId,
      }),
      expansionDisplayItems: snapshotRecommendationList({
        recommendations: selectionResult.expansionDisplayItems,
        section: "expansion_display",
        actionStateByWebtoonId,
      }),
      expansionReservePool: snapshotRecommendationList({
        recommendations: selectionResult.expansionCandidatePool,
        section: "expansion_reserve",
        reservePoolType: "expansion_reserve",
        actionStateByWebtoonId,
      }),
      actionStateByWebtoonId,
    };
  }
  
  export function saveFindPrimarySession(session: FindPrimarySession) {
    if (!canUseLocalStorage()) return;
  
    window.localStorage.setItem(
      FIND_PRIMARY_SESSION_STORAGE_KEY,
      JSON.stringify({
        ...session,
        updatedAt: new Date().toISOString(),
      })
    );
  }
  
  export function loadFindPrimarySession(): FindPrimarySession | null {
    if (!canUseLocalStorage()) return null;
  
    return safeParseSession(
      window.localStorage.getItem(FIND_PRIMARY_SESSION_STORAGE_KEY)
    );
  }
  
  export function updateFindPrimarySessionActionStates(
    actionStateByWebtoonId: RecommendationItemActionStateMap
  ) {
    const currentSession = loadFindPrimarySession();
  
    if (!currentSession) return;
  
    saveFindPrimarySession({
      ...currentSession,
      actionStateByWebtoonId,
      mainDisplayItems: applyActionStatesToSnapshots(
        currentSession.mainDisplayItems,
        actionStateByWebtoonId
      ),
      mainReservePool: applyActionStatesToSnapshots(
        currentSession.mainReservePool,
        actionStateByWebtoonId
      ),
      expansionDisplayItems: applyActionStatesToSnapshots(
        currentSession.expansionDisplayItems,
        actionStateByWebtoonId
      ),
      expansionReservePool: applyActionStatesToSnapshots(
        currentSession.expansionReservePool,
        actionStateByWebtoonId
      ),
    });
  }
  
  function applyActionStatesToSnapshots(
    snapshots: RecommendationItemSnapshot[],
    actionStateByWebtoonId: RecommendationItemActionStateMap
    ): RecommendationItemSnapshot[] {
    return snapshots.map((snapshot) => {
        const actionState = actionStateByWebtoonId[snapshot.canonicalWebtoonId];
        const status: RecommendationItemSnapshot["status"] = actionState?.feedbackAction
        ? "feedback_excluded"
        : "active";

        return {
        ...snapshot,
        status,
        };
    });
    }
  
  function restoreSelectedWebtoon(
    snapshot: SelectedSourceWebtoonSnapshot
  ): SimilarWorkSelectedWebtoon {
    return {
      canonicalWebtoonId: snapshot.canonicalWebtoonId,
      title: snapshot.title,
      platform: snapshot.platform,
      mainGenre: snapshot.mainGenre,
      genreScores: snapshot.scoreSnapshotAtSave.genreScores,
      typeScores: {
        [snapshot.mainGenre]: snapshot.scoreSnapshotAtSave.typeScores,
      },
      tagScores: snapshot.scoreSnapshotAtSave.tagScores,
      avoidanceTagScores: snapshot.scoreSnapshotAtSave.avoidanceTagScores,
    };
  }
  
  function restoreRecommendation(
    snapshot: RecommendationItemSnapshot
  ): SimilarWorkRecommendation {
    return {
      rank: snapshot.currentRank,
      effectiveRank: snapshot.candidatePoolRank,
      recommendationType: snapshot.badgeType,
      candidate: {
        canonicalWebtoonId: snapshot.canonicalWebtoonId,
        title: snapshot.scoreSnapshotAtSave.title,
        platform: snapshot.scoreSnapshotAtSave.platform,
        officialUrl: snapshot.scoreSnapshotAtSave.officialUrl,
        mainGenre: snapshot.scoreSnapshotAtSave.mainGenre,
        status: snapshot.scoreSnapshotAtSave.status ?? "unknown",
        recommendationReason:
          snapshot.scoreSnapshotAtSave.recommendationReason ??
          snapshot.recommendationReason,
      },
      finalRecommendationScore: snapshot.finalRecommendationScore,
      stage1Score: snapshot.stage1Score,
      longTermScore: snapshot.longTermScore,
      effectiveScore: snapshot.effectiveScore,
      matchScore: snapshot.matchScore,
      genreMatch: snapshot.genreMatch,
      typeMatch: snapshot.typeMatch,
      tagMatch: snapshot.tagMatch,
      qualityBoost: snapshot.qualityBoost,
      avoidancePenalty: snapshot.avoidancePenalty,
      matchedTagKeys: snapshot.matchedTagKeys,
      debug: {
        candidateGenreScores: snapshot.scoreSnapshotAtSave.genreScores,
        candidateTypeScores: snapshot.scoreSnapshotAtSave.typeScores,
        candidateTagScores: snapshot.scoreSnapshotAtSave.tagScores,
        candidateAvoidanceTagScores:
          snapshot.scoreSnapshotAtSave.avoidanceTagScores,
        stage1Breakdown: {
          score: snapshot.stage1Score,
          genreMatch: snapshot.genreMatch,
          typeMatch: snapshot.typeMatch,
          tagMatch: snapshot.tagMatch,
          qualityBoost: snapshot.qualityBoost,
          avoidancePenalty: snapshot.avoidancePenalty,
          matchedTagKeys: snapshot.matchedTagKeys,
        },
        longTermBreakdown:
          typeof snapshot.longTermScore === "number"
            ? {
                score: snapshot.longTermScore,
                genreMatch: snapshot.genreMatch,
                typeMatch: snapshot.typeMatch,
                tagMatch: snapshot.tagMatch,
                qualityBoost: snapshot.qualityBoost,
                avoidancePenalty: snapshot.avoidancePenalty,
                matchedTagKeys: snapshot.matchedTagKeys,
              }
            : null,
      },
    };
  }
  
  export function restoreSimilarWorkSelectionResultFromSession(
    session: FindPrimarySession
  ): SimilarWorkSelectionResult {
    const selectedWebtoons = session.selectedWebtoons.map(restoreSelectedWebtoon);
  
    return {
      mode: "similar_work",
      selectedWebtoons,
      similarWorkSessionVector: {
        mode: "similar_work",
        sourceWebtoonIds: selectedWebtoons.map(
          (webtoon) => webtoon.canonicalWebtoonId
        ),
        userGenreScores: session.similarWorkSessionVector.userGenreScores,
        userTypeScores: session.similarWorkSessionVector.userTypeScores,
        userTagScores: session.similarWorkSessionVector.userTagScores,
        userAvoidanceScores:
          session.similarWorkSessionVector.userAvoidanceScores,
      },
      userSimilarWorkProfile: buildSimilarWorkProfileFromSession(selectedWebtoons),
      storedUserTasteProfile:
        session.storedUserTasteProfileSnapshot ?? null,
      hasLongTermProfile: Boolean(session.storedUserTasteProfileSnapshot),
      scoringVersion: "two_stage_rerank_v1_8_primary",
      candidatePoolSize: session.candidatePoolSize,
      blendingWeights: {
        stage1Weight: session.rerankPolicy.primaryWeights.stage1Score,
        longTermWeight: session.rerankPolicy.primaryWeights.longTermScore,
      },
      mainDisplayItems: session.mainDisplayItems.map(restoreRecommendation),
      mainReservePool: session.mainReservePool.map(restoreRecommendation),
      expansionCandidatePool: session.expansionReservePool.map(
        restoreRecommendation
      ),
      expansionDisplayItems: session.expansionDisplayItems.map(
        restoreRecommendation
      ),
      recommendations: [
        ...session.mainDisplayItems.map(restoreRecommendation),
        ...session.expansionDisplayItems.map(restoreRecommendation),
      ],
    };
  }
  
  function buildSimilarWorkProfileFromSession(
    selectedWebtoons: SimilarWorkSelectedWebtoon[]
  ) {
    return {
      mode: "similar_work" as const,
      sourceWebtoonIds: selectedWebtoons.map(
        (webtoon) => webtoon.canonicalWebtoonId
      ),
      userGenreScores: {},
      userTypeScores: {},
      userTagScores: {},
      userAvoidanceScores: {},
    };
  }