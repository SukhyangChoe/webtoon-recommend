import {
    getGenreLabel,
    getStatusLabel,
  } from "@/lib/recommendation/similarWorkRecommendation";
  import {
    getSourceWeight,
    normalizeSourceDb,
  } from "@/lib/recommendation/sourceWeight";
  import { flattenTypeScores } from "@/lib/recommendation/vector";
  
  import type {
    RecommendationType,
    SimilarWorkProfile,
    SimilarWorkRecommendation,
    SimilarWorkSelectionResult,
    SimilarWorkSelectedWebtoon,
    WebtoonSeedItem,
  } from "@/lib/recommendation/similarWorkRecommendation";
  import type {
    StoredUserTasteProfile,
  } from "@/lib/recommendation/storedUserTasteProfile";
  import type {
    SourceDb,
  } from "@/lib/recommendation/sourceWeight";
  import type {
    ScoreMap,
  } from "@/lib/recommendation/vector";
  import type {
    RecommendationItemActionState,
    RecommendationItemActionStateMap,
  } from "@/types/find";
  
  export const FIND_PRIMARY_SESSION_STORAGE_KEY =
    "webtoon_find_primary_session";
  
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
  
    /**
     * v2.0.1 이후 새 명칭.
     */
    expandReservePool: RecommendationItemSnapshot[];
  
    /**
     * D+31 기존 세션 호환용 legacy field.
     * 새 세션 저장 시에는 사용하지 않는다.
     */
    expansionReservePool?: RecommendationItemSnapshot[];
  
    actionStateByWebtoonId: RecommendationItemActionStateMap;
  };
  
  export type SelectedSourceWebtoonSnapshot = {
    canonicalWebtoonId: string;
    title: string;
    platform: string;
    mainGenre: string;
    mainGenreLabel: string;
    displayAxisLabel: string;
    statusLabel: string;
    scoreSnapshotAtSave: WebtoonScoreSnapshotAtSave;
  };
  
  export type RecommendationItemSnapshot = {
    canonicalWebtoonId: string;
  
    section:
      | "main_display"
      | "main_reserve"
      | "expansion_display"
      | "expand_reserve";
  
    slot: number;
    originalRank: number;
    currentRank: number;
    stage1Rank: number;
    candidatePoolRank: number;
  
    reservePoolType?: "main_reserve" | "expand_reserve";
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
  
    sourceDb?: SourceDb;
    sourceWeight?: number;
    primaryContentAxisKey?: string | null;
    displayAxisLabel?: string;
  
    status?: string;
    ageRating?: string;
    isAdult?: boolean;
    qualityScore?: number;
  
    genreScores: ScoreMap;
    typeScores: ScoreMap;
    tagScores: ScoreMap;
    avoidanceTagScores: ScoreMap;
    contentAxisScores: ScoreMap;
  
    recommendationReason?: string;
  };
  
  type RawRecord = Record<string, unknown>;
  
  function isRecord(value: unknown): value is RawRecord {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    );
  }
  
  function canUseLocalStorage() {
    return (
      typeof window !== "undefined" &&
      Boolean(window.localStorage)
    );
  }
  
  function createSessionId() {
    if (
      typeof crypto !== "undefined" &&
      "randomUUID" in crypto
    ) {
      return crypto.randomUUID();
    }
  
    return `find_primary_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }
  
  function getSnapshotArray(
    value: unknown
  ): RecommendationItemSnapshot[] {
    return Array.isArray(value)
      ? (value as RecommendationItemSnapshot[])
      : [];
  }
  
  function safeParseSession(
    value: string | null
  ): FindPrimarySession | null {
    if (!value) return null;
  
    try {
      const parsed: unknown = JSON.parse(value);
  
      if (!isRecord(parsed)) {
        return null;
      }
  
      if (
        parsed.schemaVersion !==
          FIND_PRIMARY_SESSION_SCHEMA_VERSION ||
        parsed.mode !== "similar_work" ||
        typeof parsed.sessionId !== "string"
      ) {
        return null;
      }
  
      const expandReservePool =
        getSnapshotArray(parsed.expandReservePool).length > 0
          ? getSnapshotArray(parsed.expandReservePool)
          : getSnapshotArray(parsed.expansionReservePool);
  
      return {
        ...(parsed as unknown as FindPrimarySession),
        selectedWebtoons: Array.isArray(parsed.selectedWebtoons)
          ? (parsed.selectedWebtoons as SelectedSourceWebtoonSnapshot[])
          : [],
        mainDisplayItems: getSnapshotArray(
          parsed.mainDisplayItems
        ),
        mainReservePool: getSnapshotArray(
          parsed.mainReservePool
        ),
        expansionDisplayItems: getSnapshotArray(
          parsed.expansionDisplayItems
        ),
        expandReservePool,
        actionStateByWebtoonId: isRecord(
          parsed.actionStateByWebtoonId
        )
          ? (parsed.actionStateByWebtoonId as RecommendationItemActionStateMap)
          : {},
      };
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
      scoreVersion: webtoon.recommendation.scoreVersion,
      canonicalWebtoonId: webtoon.canonicalWebtoonId,
      title: webtoon.title,
      platform: webtoon.platform,
      mainGenre: webtoon.mainGenre,
      officialUrl: webtoon.officialUrl,
  
      sourceDb: webtoon.sourceDb,
      sourceWeight: webtoon.sourceWeight,
      primaryContentAxisKey:
        webtoon.primaryContentAxisKey,
      displayAxisLabel: webtoon.displayAxisLabel,
  
      status: webtoon.metadata.status,
      ageRating: webtoon.metadata.ageRating,
      isAdult: webtoon.metadata.isAdult,
      qualityScore: webtoon.metadata.qualityScore,
  
      genreScores: webtoon.recommendation.genreScores,
      typeScores: flattenTypeScores(
        webtoon.recommendation.typeScores
      ),
      tagScores: webtoon.recommendation.tagScores ?? {},
      avoidanceTagScores:
        webtoon.recommendation.avoidanceTagScores ?? {},
      contentAxisScores:
        webtoon.recommendation.contentAxisScores ?? {},
  
      recommendationReason:
        webtoon.recommendation.recommendationReason,
    };
  }
  
  function createRecommendationScoreSnapshot(
    recommendation: SimilarWorkRecommendation
  ): WebtoonScoreSnapshotAtSave {
    return {
      canonicalWebtoonId:
        recommendation.candidate.canonicalWebtoonId,
      title: recommendation.candidate.title,
      platform: recommendation.candidate.platform,
      mainGenre: recommendation.candidate.mainGenre,
      officialUrl: recommendation.candidate.officialUrl,
  
      sourceDb: recommendation.candidate.sourceDb,
      sourceWeight: recommendation.candidate.sourceWeight,
      primaryContentAxisKey:
        recommendation.candidate.primaryContentAxisKey,
      displayAxisLabel:
        recommendation.candidate.displayAxisLabel,
  
      status: recommendation.candidate.status,
  
      qualityScore: getQualityScoreFromBoost(
        recommendation.qualityBoost
      ),
  
      genreScores:
        recommendation.debug.candidateGenreScores,
      typeScores:
        recommendation.debug.candidateTypeScores,
      tagScores:
        recommendation.debug.candidateTagScores,
      avoidanceTagScores:
        recommendation.debug.candidateAvoidanceTagScores,
      contentAxisScores:
        recommendation.debug.candidateContentAxisScores,
  
      recommendationReason:
        recommendation.candidate.recommendationReason,
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
      displayAxisLabel: webtoon.displayAxisLabel,
      statusLabel: getStatusLabel(
        webtoon.metadata.status
      ),
      scoreSnapshotAtSave:
        createSelectedScoreSnapshot(webtoon),
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
      canonicalWebtoonId:
        recommendation.candidate.canonicalWebtoonId,
  
      section,
      slot,
  
      originalRank: recommendation.rank,
      currentRank: recommendation.rank,
      stage1Rank: recommendation.rank,
      candidatePoolRank: recommendation.effectiveRank,
  
      reservePoolType,
      reserveRank,
  
      badgeType: recommendation.recommendationType,
  
      status: actionState?.feedbackAction
        ? "feedback_excluded"
        : "active",
  
      matchedTagKeys: recommendation.matchedTagKeys,
      matchScore: recommendation.matchScore,
  
      stage1Score: recommendation.stage1Score,
      longTermScore: recommendation.longTermScore,
      effectiveScore: recommendation.effectiveScore,
      finalRecommendationScore:
        recommendation.finalRecommendationScore,
  
      genreMatch: recommendation.genreMatch,
      typeMatch: recommendation.typeMatch,
      tagMatch: recommendation.tagMatch,
      qualityBoost: recommendation.qualityBoost,
      avoidancePenalty:
        recommendation.avoidancePenalty,
  
      recommendationReason:
        recommendation.candidate.recommendationReason,
  
      scoreSnapshotAtSave:
        createRecommendationScoreSnapshot(recommendation),
    };
  }
  
  function snapshotRecommendationList(params: {
    recommendations: SimilarWorkRecommendation[];
    section: RecommendationItemSnapshot["section"];
    actionStateByWebtoonId: RecommendationItemActionStateMap;
    reservePoolType?: RecommendationItemSnapshot["reservePoolType"];
  }) {
    const {
      recommendations,
      section,
      actionStateByWebtoonId,
      reservePoolType,
    } = params;
  
    return recommendations.map((recommendation, index) =>
      createRecommendationSnapshot({
        recommendation,
        section,
        slot: index + 1,
        reservePoolType,
        reserveRank: reservePoolType
          ? index + 1
          : undefined,
        actionState:
          actionStateByWebtoonId[
            recommendation.candidate.canonicalWebtoonId
          ],
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
      schemaVersion:
        FIND_PRIMARY_SESSION_SCHEMA_VERSION,
      mode: "similar_work",
      sessionId: previousSessionId ?? createSessionId(),
      createdAt: now,
      updatedAt: now,
  
      seedVersion: FIND_PRIMARY_SESSION_SEED_VERSION,
  
      rerankPolicy: {
        version: "v1.8_two_stage_rerank",
        stage1CandidatePoolSize: 100,
        primaryWeights: {
          stage1Score:
            selectionResult.blendingWeights.stage1Weight,
          longTermScore:
            selectionResult.blendingWeights.longTermWeight,
        },
      },
  
      selectedWebtoons:
        selectedSourceWebtoons.map(createSelectedSnapshot),
  
      similarWorkSessionVector: {
        userGenreScores:
          selectionResult.similarWorkSessionVector
            .userGenreScores,
        userTypeScores:
          selectionResult.similarWorkSessionVector
            .userTypeScores,
        userTagScores:
          selectionResult.similarWorkSessionVector
            .userTagScores,
        userAvoidanceScores:
          selectionResult.similarWorkSessionVector
            .userAvoidanceScores,
      },
  
      storedUserTasteProfileSnapshot:
        selectionResult.storedUserTasteProfile ??
        undefined,
  
      candidatePoolSize:
        selectionResult.candidatePoolSize,
  
      mainDisplayItems: snapshotRecommendationList({
        recommendations:
          selectionResult.mainDisplayItems,
        section: "main_display",
        actionStateByWebtoonId,
      }),
  
      mainReservePool: snapshotRecommendationList({
        recommendations:
          selectionResult.mainReservePool,
        section: "main_reserve",
        reservePoolType: "main_reserve",
        actionStateByWebtoonId,
      }),
  
      expansionDisplayItems:
        snapshotRecommendationList({
          recommendations:
            selectionResult.expansionDisplayItems,
          section: "expansion_display",
          actionStateByWebtoonId,
        }),
  
      expandReservePool: snapshotRecommendationList({
        recommendations:
          selectionResult.expansionCandidatePool,
        section: "expand_reserve",
        reservePoolType: "expand_reserve",
        actionStateByWebtoonId,
      }),
  
      actionStateByWebtoonId,
    };
  }
  
  export function saveFindPrimarySession(
    session: FindPrimarySession
  ) {
    if (!canUseLocalStorage()) return;
  
    const normalizedSession: FindPrimarySession = {
      ...session,
      updatedAt: new Date().toISOString(),
    };
  
    delete normalizedSession.expansionReservePool;
  
    window.localStorage.setItem(
      FIND_PRIMARY_SESSION_STORAGE_KEY,
      JSON.stringify(normalizedSession)
    );
  }
  
  export function loadFindPrimarySession():
    | FindPrimarySession
    | null {
    if (!canUseLocalStorage()) return null;
  
    return safeParseSession(
      window.localStorage.getItem(
        FIND_PRIMARY_SESSION_STORAGE_KEY
      )
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
  
      expansionDisplayItems:
        applyActionStatesToSnapshots(
          currentSession.expansionDisplayItems,
          actionStateByWebtoonId
        ),
  
      expandReservePool:
        applyActionStatesToSnapshots(
          currentSession.expandReservePool,
          actionStateByWebtoonId
        ),
    });
  }
  
  function applyActionStatesToSnapshots(
    snapshots: RecommendationItemSnapshot[],
    actionStateByWebtoonId: RecommendationItemActionStateMap
  ): RecommendationItemSnapshot[] {
    return snapshots.map((snapshot) => {
      const actionState =
        actionStateByWebtoonId[
          snapshot.canonicalWebtoonId
        ];
  
      const status: RecommendationItemSnapshot["status"] =
        actionState?.feedbackAction
          ? "feedback_excluded"
          : "active";
  
      return {
        ...snapshot,
        status,
      };
    });
  }
  
  function getSnapshotSourceDb(
    snapshot: WebtoonScoreSnapshotAtSave
  ) {
    return normalizeSourceDb(snapshot.sourceDb);
  }
  
  function getSnapshotDisplayAxisLabel(
    snapshot: WebtoonScoreSnapshotAtSave
  ) {
    return (
      snapshot.displayAxisLabel ??
      getGenreLabel(snapshot.mainGenre)
    );
  }
  
  function restoreSelectedWebtoon(
    snapshot: SelectedSourceWebtoonSnapshot
  ): SimilarWorkSelectedWebtoon {
    const scoreSnapshot = snapshot.scoreSnapshotAtSave;
    const sourceDb = getSnapshotSourceDb(scoreSnapshot);
  
    return {
      canonicalWebtoonId: snapshot.canonicalWebtoonId,
      title: snapshot.title,
      platform: snapshot.platform,
      mainGenre: snapshot.mainGenre,
  
      sourceDb,
      sourceWeight:
        scoreSnapshot.sourceWeight ??
        getSourceWeight(sourceDb),
  
      primaryContentAxisKey:
        scoreSnapshot.primaryContentAxisKey ?? null,
  
      displayAxisLabel:
        scoreSnapshot.displayAxisLabel ??
        snapshot.displayAxisLabel ??
        snapshot.mainGenreLabel,
  
      genreScores: scoreSnapshot.genreScores,
  
      typeScores: {
        [snapshot.mainGenre]:
          scoreSnapshot.typeScores,
      },
  
      tagScores: scoreSnapshot.tagScores,
  
      avoidanceTagScores:
        scoreSnapshot.avoidanceTagScores,
  
      contentAxisScores:
        scoreSnapshot.contentAxisScores ?? {},
    };
  }
  
  function restoreRecommendation(
    snapshot: RecommendationItemSnapshot
  ): SimilarWorkRecommendation {
    const scoreSnapshot = snapshot.scoreSnapshotAtSave;
  
    const sourceDb = getSnapshotSourceDb(scoreSnapshot);
  
    const sourceWeight =
      scoreSnapshot.sourceWeight ??
      getSourceWeight(sourceDb);
  
    const displayAxisLabel =
      getSnapshotDisplayAxisLabel(scoreSnapshot);
  
    const contentAxisScores =
      scoreSnapshot.contentAxisScores ?? {};
  
    return {
      rank: snapshot.currentRank,
      effectiveRank: snapshot.candidatePoolRank,
      recommendationType: snapshot.badgeType,
  
      candidate: {
        canonicalWebtoonId:
          snapshot.canonicalWebtoonId,
        title: scoreSnapshot.title,
        platform: scoreSnapshot.platform,
        officialUrl: scoreSnapshot.officialUrl,
        mainGenre: scoreSnapshot.mainGenre,
        status: scoreSnapshot.status ?? "unknown",
  
        recommendationReason:
          scoreSnapshot.recommendationReason ??
          snapshot.recommendationReason,
  
        sourceDb,
        sourceWeight,
  
        primaryContentAxisKey:
          scoreSnapshot.primaryContentAxisKey ??
          null,
  
        displayAxisLabel,
      },
  
      finalRecommendationScore:
        snapshot.finalRecommendationScore,
  
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
        candidateGenreScores:
          scoreSnapshot.genreScores,
        candidateTypeScores:
          scoreSnapshot.typeScores,
        candidateTagScores:
          scoreSnapshot.tagScores,
        candidateAvoidanceTagScores:
          scoreSnapshot.avoidanceTagScores,
        candidateContentAxisScores:
          contentAxisScores,
  
        candidateSourceDb: sourceDb,
        candidateSourceWeight: sourceWeight,
        candidateDisplayAxisLabel:
          displayAxisLabel,
  
        stage1Breakdown: {
          score: snapshot.stage1Score,
          genreMatch: snapshot.genreMatch,
          typeMatch: snapshot.typeMatch,
          tagMatch: snapshot.tagMatch,
          qualityBoost: snapshot.qualityBoost,
          avoidancePenalty:
            snapshot.avoidancePenalty,
          matchedTagKeys: snapshot.matchedTagKeys,
        },
  
        longTermBreakdown:
          typeof snapshot.longTermScore === "number"
            ? {
                score: snapshot.longTermScore,
                genreMatch: snapshot.genreMatch,
                typeMatch: snapshot.typeMatch,
                tagMatch: snapshot.tagMatch,
                qualityBoost:
                  snapshot.qualityBoost,
                avoidancePenalty:
                  snapshot.avoidancePenalty,
                matchedTagKeys:
                  snapshot.matchedTagKeys,
              }
            : null,
      },
    };
  }
  
  function createRestoredSessionProfile(
    session: FindPrimarySession,
    selectedWebtoons: SimilarWorkSelectedWebtoon[]
  ): SimilarWorkProfile {
    return {
      mode: "similar_work",
  
      sourceWebtoonIds:
        selectedWebtoons.map(
          (webtoon) =>
            webtoon.canonicalWebtoonId
        ),
  
      userGenreScores:
        session.similarWorkSessionVector
          .userGenreScores,
  
      userTypeScores:
        session.similarWorkSessionVector
          .userTypeScores,
  
      userTagScores:
        session.similarWorkSessionVector
          .userTagScores,
  
      userAvoidanceScores:
        session.similarWorkSessionVector
          .userAvoidanceScores,
    };
  }
  
  export function restoreSimilarWorkSelectionResultFromSession(
    session: FindPrimarySession
  ): SimilarWorkSelectionResult {
    const selectedWebtoons =
      session.selectedWebtoons.map(
        restoreSelectedWebtoon
      );
  
    const restoredSessionProfile =
      createRestoredSessionProfile(
        session,
        selectedWebtoons
      );
  
    const mainDisplayItems =
      session.mainDisplayItems.map(
        restoreRecommendation
      );
  
    const mainReservePool =
      session.mainReservePool.map(
        restoreRecommendation
      );
  
    const expansionCandidatePool =
      session.expandReservePool.map(
        restoreRecommendation
      );
  
    const expansionDisplayItems =
      session.expansionDisplayItems.map(
        restoreRecommendation
      );
  
    return {
      mode: "similar_work",
  
      selectedWebtoons,
  
      similarWorkSessionVector:
        restoredSessionProfile,
  
      userSimilarWorkProfile:
        restoredSessionProfile,
  
      storedUserTasteProfile:
        session.storedUserTasteProfileSnapshot ??
        null,
  
      hasLongTermProfile: Boolean(
        session.storedUserTasteProfileSnapshot
      ),
  
      scoringVersion:
        "two_stage_rerank_v1_8_primary",
  
      candidatePoolSize:
        session.candidatePoolSize,
  
      blendingWeights: {
        stage1Weight:
          session.rerankPolicy.primaryWeights
            .stage1Score,
  
        longTermWeight:
          session.rerankPolicy.primaryWeights
            .longTermScore,
      },
  
      mainDisplayItems,
      mainReservePool,
      expansionCandidatePool,
      expansionDisplayItems,
  
      recommendations: [
        ...mainDisplayItems,
        ...expansionDisplayItems,
      ],
    };
  }