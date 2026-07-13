import {
  FIND_RECOMMENDATION_SCORE_VERSION,
  calculateRiskSafetyScore,
  calculateSuccessConfidenceScore,
  getEffectiveTagScores,
  getGenreLabel,
  getStatusLabel,
  isVisualAppealExcluded,
  normalizeUserQualityPreference,
} from "@/lib/recommendation/similarWorkRecommendation";
import {
  getSourceWeight,
  normalizeSourceDb,
} from "@/lib/recommendation/sourceWeight";
import {
  clamp,
  flattenTypeScores,
  roundScore,
} from "@/lib/recommendation/vector";

import type {
  HardFilterExcludedItem,
  HardFilterExclusionReason,
  RecommendationType,
  RecommendationVector,
  UserQualityPreference,
  VisualStyleMigrationStatus,
  FindRecommendationSelectionResult,
  DetailTestRecommendationSelectionResult,
  InstantRecommendationSelectionResult,
  SimilarWorkProfile,
  SimilarWorkRecommendation,
  SimilarWorkSelectionResult,
  TasteScoreSource,
  SimilarWorkSelectedWebtoon,
  WebtoonSeedItem,
} from "@/lib/recommendation/similarWorkRecommendation";
import type { StoredUserTasteProfile } from "@/lib/recommendation/storedUserTasteProfile";
import type { SourceDb } from "@/lib/recommendation/sourceWeight";
import type { ScoreMap, TypeScoreMap } from "@/lib/recommendation/vector";
import type { DetailTestKey } from "@/types/testResults";
import type {
  RecommendationDisplaySection,
  RecommendationDisplaySlot,
  RecommendationFeedbackAction,
  RecommendationItemActionState,
  RecommendationItemActionStateMap,
  RecommendationMode,
  RecommendationVectorSource,
} from "@/types/find";

export const FIND_RECOMMENDATION_SESSION_STORAGE_KEY =
  "webtoon_find_primary_session";

export const FIND_PRIMARY_SESSION_STORAGE_KEY =
  FIND_RECOMMENDATION_SESSION_STORAGE_KEY;

export const FIND_PRIMARY_SESSION_SCHEMA_VERSION = "2.1.1" as const;

export const FIND_PRIMARY_SESSION_SEED_VERSION =
  "webtoons_seed_v1_1_all_genres_integrated_v0_50";

export type SelectedWorkSourceSnapshot = {
  canonicalWebtoonId: string;
  sourceDbType: SourceDb;
  sourceWeight: number;
};

export type ReplacementHistoryItem = {
  section: RecommendationDisplaySection;
  slot: number;
  excludedWebtoonId: string;
  replacementWebtoonId: string | null;
  reason: RecommendationFeedbackAction;
  replacementNumber: number;
  createdAt: string;
};

export type SessionExcludedItem = HardFilterExcludedItem & {
  excludedAt?: string;
  feedbackAction?: RecommendationFeedbackAction;
};

export type RecommendationSessionV211 = {
  schemaVersion: typeof FIND_PRIMARY_SESSION_SCHEMA_VERSION;
  sessionId: string;
  scoreVersion: typeof FIND_RECOMMENDATION_SCORE_VERSION;
  recommendationMode: RecommendationMode;
  vectorSource: RecommendationVectorSource;
  sourceTestKey?: DetailTestKey;
  visualStyleMigrationStatus: VisualStyleMigrationStatus;

  selectedWebtoonIds: string[];
  selectedWorkSources: SelectedWorkSourceSnapshot[];

  activeRecommendationVector: RecommendationVector;
  profileSnapshot: RecommendationVector | null;
  inputSnapshotAtSave: RecommendationVector;
  userQualityPreferenceSnapshot: UserQualityPreference | null;

  candidatePoolIds: string[];
  displayedItems: RecommendationItemSnapshot[];
  displaySlots: RecommendationDisplaySlot[];
  mainReserveItems: RecommendationItemSnapshot[];
  expandReserveItems: RecommendationItemSnapshot[];
  excludedItems: SessionExcludedItem[];
  replacementHistory: ReplacementHistoryItem[];
  createdAt: string;

  /** localStorage 복원과 현재 UI 유지를 위한 추가 snapshot */
  updatedAt: string;
  seedVersion: string;
  candidatePoolSize: number;
  selectedWebtoons: SelectedSourceWebtoonSnapshot[];
  storedUserTasteProfileSnapshot?: StoredUserTasteProfile;
  actionStateByWebtoonId: RecommendationItemActionStateMap;

  /** D+31/D+32 세션을 v2.1.1 shape로 읽은 경우에만 존재 */
  legacySourceVersion?: string;
};

export type FindRecommendationSession = RecommendationSessionV211;
export type FindPrimarySession = RecommendationSessionV211;

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
  sourceTasteRank: number;
  /** TOP100 안에서 profile 20% 반영 후의 순위 */
  effectiveTasteRank?: number;
  /** D+33 초기 세션 호환용 alias. effectiveTasteRank와 동일 */
  candidatePoolRank: number;
  reservePoolType?: "main_reserve" | "expand_reserve";
  reserveRank?: number;
  badgeType: RecommendationType;
  tasteScoreSource: TasteScoreSource;
  status: "active" | "feedback_excluded";
  replacementCount: number;

  matchedTagKeys: string[];
  matchScore: number;

  genreMatch: number;
  typeMatch: number;
  tagMatch: number;
  contentAxisMatch: number;
  userAvoidancePenalty: number;
  selectedWorkTasteScore: number;
  profileTasteScore: number | null;
  detailTestTasteScore: number | null;
  profileAvoidancePenalty: number | null;
  effectiveTasteScore: number;
  riskSafetyScore: number;
  normalizedQualityScore: number;
  artQualityScore?: number | null;
  storyQualityScore?: number | null;
  qualityFloorPenalty?: number;
  personalizedQualityScore?: number;
  artToneMismatchPenalty?: number;
  profileArtToneMismatchPenalty?: number;
  detailArtToneMismatchPenalty?: number;
  effectiveTagScores?: ScoreMap;
  visualAppealExcluded?: boolean;
  successConfidenceScore: number;
  displayRecommendationScore: number;

  /** 개발 상세를 정확히 복원하기 위한 profile 하위값 */
  selectedPositiveRaw?: number;
  profileGenreMatch?: number;
  profileTypeMatch?: number;
  profileTagMatch?: number;
  profilePositiveRaw?: number;
  detailGenreMatch?: number;
  detailTypeMatch?: number;
  detailTagMatch?: number;
  detailPositiveRaw?: number;
  detailAvoidancePenalty?: number;

  /** D+30~D+32 명칭 호환용 alias */
  stage1Score: number;
  longTermScore: number | null;
  effectiveScore: number;
  finalRecommendationScore: number;

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
  sourceType?: SourceDb;
  sourceWeight?: number;
  recommendationEligible?: boolean;
  qualityEvidenceGateDecision?: string;
  primaryContentAxisKey?: string | null;
  displayAxisLabel?: string;
  status?: string;
  ageRating?: string;
  isAdult?: boolean;
  qualityScore?: number;
  qualityBand?: number;
  qualityScoreSource?: string;
  qualityFactors?: ScoreMap;
  genreScores: ScoreMap;
  typeScores: ScoreMap;
  tagScores: ScoreMap;
  avoidanceTagScores: ScoreMap;
  contentAxisScores: ScoreMap;
  artStyleScores?: ScoreMap;
  visualStyleMigrationStatus?: VisualStyleMigrationStatus;
  effectiveTagScores?: ScoreMap;
  visualAppealExcluded?: boolean;
  recommendationReason?: string;
};

type RawRecord = Record<string, unknown>;

type LegacyRecommendationItemSnapshot = {
  canonicalWebtoonId?: string;
  section?: string;
  slot?: number;
  originalRank?: number;
  currentRank?: number;
  stage1Rank?: number;
  effectiveTasteRank?: number;
  candidatePoolRank?: number;
  reservePoolType?: string;
  reserveRank?: number;
  badgeType?: RecommendationType;
  tasteScoreSource?: TasteScoreSource;
  status?: string;
  replacementCount?: number;
  matchedTagKeys?: string[];
  matchScore?: number;
  stage1Score?: number;
  longTermScore?: number | null;
  effectiveScore?: number;
  finalRecommendationScore?: number;
  genreMatch?: number;
  typeMatch?: number;
  tagMatch?: number;
  qualityBoost?: number;
  avoidancePenalty?: number;
  recommendationReason?: string;
  scoreSnapshotAtSave?: WebtoonScoreSnapshotAtSave;
};

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function getStringValue(record: RawRecord | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

function getNumberValue(record: RawRecord | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function toScoreMap(value: unknown): ScoreMap {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(([, score]) => {
      return typeof score === "number" && Number.isFinite(score);
    })
  ) as ScoreMap;
}

function normalizeTypeScoreMap(value: unknown): TypeScoreMap {
  if (!isRecord(value)) return {};

  const flatScores = toScoreMap(value);
  const nestedScores = Object.fromEntries(
    Object.entries(value)
      .filter(([, nestedValue]) => isRecord(nestedValue))
      .map(([genreKey, nestedValue]) => [
        genreKey,
        toScoreMap(nestedValue),
      ])
      .filter(([, scoreMap]) => Object.keys(scoreMap).length > 0)
  ) as Record<string, ScoreMap>;

  if (Object.keys(nestedScores).length > 0) return nestedScores;

  return flatScores;
}

function normalizeVisualStyleMigrationStatus(
  value: unknown
): VisualStyleMigrationStatus {
  if (value === "art_style_v1_ready") return value;
  if (value === "pending_manual_review") return value;
  return "legacy_visual_appeal";
}

function normalizeStoredUserQualityPreference(
  value: unknown
): UserQualityPreference | null {
  if (!isRecord(value)) return null;

  const artQualitySensitivity = getNumberValue(
    value,
    "artQualitySensitivity"
  );
  const storyQualitySensitivity = getNumberValue(
    value,
    "storyQualitySensitivity"
  );
  const minArtQuality = getNumberValue(value, "minArtQuality");
  const minStoryQuality = getNumberValue(value, "minStoryQuality");

  if (
    artQualitySensitivity === undefined ||
    storyQualitySensitivity === undefined ||
    minArtQuality === undefined ||
    minStoryQuality === undefined
  ) {
    return null;
  }

  return normalizeUserQualityPreference({
    artQualitySensitivity,
    storyQualitySensitivity,
    minArtQuality,
    minStoryQuality,
    ...(typeof value.artAbsoluteFloor === "boolean"
      ? { artAbsoluteFloor: value.artAbsoluteFloor }
      : {}),
    ...(typeof value.storyAbsoluteFloor === "boolean"
      ? { storyAbsoluteFloor: value.storyAbsoluteFloor }
      : {}),
  });
}

function normalizeRecommendationVector(value: unknown): RecommendationVector {
  if (!isRecord(value)) {
    return emptyRecommendationVector();
  }

  return {
    genreScores: toScoreMap(value.genreScores),
    typeScores: normalizeTypeScoreMap(value.typeScores),
    tagScores: toScoreMap(value.tagScores),
    avoidanceTagScores: toScoreMap(value.avoidanceTagScores),
    contentAxisScores: toScoreMap(value.contentAxisScores),
    ...(Object.keys(toScoreMap(value.artStyleScores)).length > 0
      ? { artStyleScores: toScoreMap(value.artStyleScores) }
      : {}),
    visualStyleMigrationStatus:
      normalizeVisualStyleMigrationStatus(
        value.visualStyleMigrationStatus
      ),
  };
}

function emptyRecommendationVector(): RecommendationVector {
  return {
    genreScores: {},
    typeScores: {},
    tagScores: {},
    avoidanceTagScores: {},
    contentAxisScores: {},
    visualStyleMigrationStatus: "legacy_visual_appeal",
  };
}

function recommendationVectorFromLegacySessionVector(
  value: unknown
): RecommendationVector {
  if (!isRecord(value)) return emptyRecommendationVector();

  return {
    genreScores: toScoreMap(value.userGenreScores),
    typeScores: toScoreMap(value.userTypeScores),
    tagScores: toScoreMap(value.userTagScores),
    avoidanceTagScores: toScoreMap(value.userAvoidanceScores),
    contentAxisScores: toScoreMap(value.userContentAxisScores),
    visualStyleMigrationStatus: "legacy_visual_appeal",
  };
}

function recommendationVectorFromStoredProfile(
  value: unknown
): RecommendationVector | undefined {
  if (!isRecord(value)) return undefined;

  const artStyleScores = toScoreMap(value.userArtStyleScores);
  const vector: RecommendationVector = {
    genreScores: toScoreMap(value.userGenreScores),
    typeScores: toScoreMap(value.userTypeScores),
    tagScores: toScoreMap(value.userTagScores),
    avoidanceTagScores: toScoreMap(value.userAvoidanceScores),
    contentAxisScores: {},
    ...(Object.keys(artStyleScores).length > 0
      ? { artStyleScores }
      : {}),
    visualStyleMigrationStatus:
      Object.keys(artStyleScores).length > 0
        ? "art_style_v1_ready"
        : "legacy_visual_appeal",
  };

  const hasPositiveScore = (valueToCheck: unknown): boolean => {
    if (typeof valueToCheck === "number") {
      return Number.isFinite(valueToCheck) && valueToCheck > 0;
    }

    if (isRecord(valueToCheck)) {
      return Object.values(valueToCheck).some(hasPositiveScore);
    }

    return false;
  };

  return hasPositiveScore(vector) ? vector : undefined;
}

function isDisplaySection(
  value: unknown
): value is RecommendationDisplaySection {
  return value === "main_display" || value === "expansion_display";
}

function normalizeDisplaySlotNumber(
  section: RecommendationDisplaySection,
  slot: number
) {
  if (section === "main_display") {
    return Math.min(Math.max(Math.trunc(slot), 1), 5);
  }

  const normalizedSlot = slot >= 1 && slot <= 5 ? slot + 5 : slot;
  return Math.min(Math.max(Math.trunc(normalizedSlot), 6), 10);
}

function getSnapshotArray(value: unknown): RecommendationItemSnapshot[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((rawSnapshot) => {
    if (!isRecord(rawSnapshot)) return [];

    const snapshot = rawSnapshot as unknown as RecommendationItemSnapshot;
    const section = snapshot.section;

    if (
      section !== "main_display" &&
      section !== "main_reserve" &&
      section !== "expansion_display" &&
      section !== "expand_reserve"
    ) {
      return [];
    }

    const rawSlot =
      typeof snapshot.slot === "number" && Number.isFinite(snapshot.slot)
        ? snapshot.slot
        : 1;
    const slot = isDisplaySection(section)
      ? normalizeDisplaySlotNumber(section, rawSlot)
      : Math.max(1, Math.trunc(rawSlot));
    const replacementCount =
      typeof snapshot.replacementCount === "number" &&
      Number.isFinite(snapshot.replacementCount)
        ? Math.max(0, Math.trunc(snapshot.replacementCount))
        : 0;

    return [
      {
        ...snapshot,
        section,
        slot,
        replacementCount,
      },
    ];
  });
}

function normalizeReplacementHistory(
  value: unknown
): ReplacementHistoryItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((rawItem) => {
    if (!isRecord(rawItem)) return [];

    const rawSection = rawItem.section;
    const section: RecommendationDisplaySection | null =
      rawSection === "main" || rawSection === "main_display"
        ? "main_display"
        : rawSection === "expansion" ||
            rawSection === "expansion_display"
          ? "expansion_display"
          : null;
    const rawReason = rawItem.reason;
    const reason: RecommendationFeedbackAction | null =
      rawReason === "already_read" || rawReason === "not_my_taste"
        ? rawReason
        : rawReason === "already_seen"
          ? "already_read"
          : rawReason === "session_excluded"
            ? "not_my_taste"
            : null;
    const excludedWebtoonId =
      typeof rawItem.excludedWebtoonId === "string"
        ? rawItem.excludedWebtoonId
        : typeof rawItem.canonicalWebtoonId === "string"
          ? rawItem.canonicalWebtoonId
          : null;
    const replacementWebtoonId =
      typeof rawItem.replacementWebtoonId === "string"
        ? rawItem.replacementWebtoonId
        : typeof rawItem.replacementCanonicalWebtoonId === "string"
          ? rawItem.replacementCanonicalWebtoonId
          : null;
    const rawSlot =
      typeof rawItem.slot === "number" && Number.isFinite(rawItem.slot)
        ? rawItem.slot
        : null;

    if (!section || !reason || !excludedWebtoonId || rawSlot === null) {
      return [];
    }

    const rawReplacementNumber = rawItem.replacementNumber;
    const replacementNumber =
      typeof rawReplacementNumber === "number" &&
      Number.isFinite(rawReplacementNumber)
        ? Math.max(0, Math.trunc(rawReplacementNumber))
        : replacementWebtoonId
          ? 1
          : 0;

    return [
      {
        section,
        slot: normalizeDisplaySlotNumber(section, rawSlot),
        excludedWebtoonId,
        replacementWebtoonId,
        reason,
        replacementNumber,
        createdAt:
          typeof rawItem.createdAt === "string"
            ? rawItem.createdAt
            : new Date().toISOString(),
      },
    ];
  });
}

function getSuccessfulReplacementCount(
  replacementHistory: ReplacementHistoryItem[],
  section: RecommendationDisplaySection,
  slot: number
) {
  return replacementHistory.filter(
    (item) =>
      item.section === section &&
      item.slot === slot &&
      item.replacementWebtoonId !== null
  ).length;
}

function createDefaultDisplaySlots(params: {
  displayedItems: RecommendationItemSnapshot[];
  replacementHistory: ReplacementHistoryItem[];
}) {
  const { displayedItems, replacementHistory } = params;
  const slots: RecommendationDisplaySlot[] = [];

  for (let slot = 1; slot <= 5; slot += 1) {
    const item = displayedItems.find(
      (candidate) =>
        candidate.section === "main_display" && candidate.slot === slot
    );

    slots.push({
      section: "main_display",
      slot,
      currentWebtoonId: item?.canonicalWebtoonId ?? null,
      replacementCount: Math.max(
        item?.replacementCount ?? 0,
        getSuccessfulReplacementCount(
          replacementHistory,
          "main_display",
          slot
        )
      ),
    });
  }

  for (let slot = 6; slot <= 10; slot += 1) {
    const item = displayedItems.find(
      (candidate) =>
        candidate.section === "expansion_display" &&
        candidate.slot === slot
    );

    slots.push({
      section: "expansion_display",
      slot,
      currentWebtoonId: item?.canonicalWebtoonId ?? null,
      replacementCount: Math.max(
        item?.replacementCount ?? 0,
        getSuccessfulReplacementCount(
          replacementHistory,
          "expansion_display",
          slot
        )
      ),
    });
  }

  return slots;
}

function normalizeDisplaySlots(params: {
  value: unknown;
  displayedItems: RecommendationItemSnapshot[];
  replacementHistory: ReplacementHistoryItem[];
}) {
  const defaults = createDefaultDisplaySlots(params);

  if (!Array.isArray(params.value)) return defaults;

  const byKey = new Map(
    defaults.map((slot) => [`${slot.section}:${slot.slot}`, slot])
  );

  params.value.forEach((rawSlot) => {
    if (!isRecord(rawSlot) || !isDisplaySection(rawSlot.section)) return;

    const rawSlotNumber = rawSlot.slot;
    if (
      typeof rawSlotNumber !== "number" ||
      !Number.isFinite(rawSlotNumber)
    ) {
      return;
    }

    const slot = normalizeDisplaySlotNumber(
      rawSlot.section,
      rawSlotNumber
    );
    const key = `${rawSlot.section}:${slot}`;
    const fallbackSlot = byKey.get(key);
    const replacementCount =
      typeof rawSlot.replacementCount === "number" &&
      Number.isFinite(rawSlot.replacementCount)
        ? Math.max(0, Math.trunc(rawSlot.replacementCount))
        : fallbackSlot?.replacementCount ?? 0;
    const hasCurrentWebtoonId = Object.prototype.hasOwnProperty.call(
      rawSlot,
      "currentWebtoonId"
    );

    byKey.set(key, {
      section: rawSlot.section,
      slot,
      currentWebtoonId: hasCurrentWebtoonId
        ? typeof rawSlot.currentWebtoonId === "string"
          ? rawSlot.currentWebtoonId
          : null
        : fallbackSlot?.currentWebtoonId ?? null,
      replacementCount,
    });
  });

  return [...byKey.values()].sort((a, b) => a.slot - b.slot);
}

function getSelectedSnapshotArray(value: unknown) {
  return Array.isArray(value)
    ? (value.filter(isRecord) as unknown as SelectedSourceWebtoonSnapshot[])
    : [];
}

function getActionStateMap(value: unknown): RecommendationItemActionStateMap {
  return isRecord(value)
    ? (value as RecommendationItemActionStateMap)
    : {};
}

function isDetailTestKeyValue(
  value: string | undefined
): value is DetailTestKey {
  return (
    value === "fantasy_detail" ||
    value === "murim_detail" ||
    value === "romance_ropan_detail" ||
    value === "thriller_horror_detail" ||
    value === "drama_daily_detail"
  );
}

function normalizeCurrentSession(
  parsed: RawRecord
): RecommendationSessionV211 | null {
  const recommendationMode = parsed.recommendationMode;
  const vectorSource = parsed.vectorSource;
  const isPrimarySession =
    recommendationMode === "similar_work" &&
    vectorSource === "selected_webtoons";
  const isSecondarySession =
    recommendationMode === "instant_recommendation" &&
    vectorSource === "user_taste_profile";
  const sourceTestKey = getStringValue(parsed, "sourceTestKey");
  const isDetailTestSession =
    recommendationMode === "instant_recommendation" &&
    vectorSource === "detail_test_result" &&
    isDetailTestKeyValue(sourceTestKey);

  if (
    parsed.schemaVersion !== FIND_PRIMARY_SESSION_SCHEMA_VERSION ||
    (parsed.scoreVersion !== FIND_RECOMMENDATION_SCORE_VERSION &&
      parsed.scoreVersion !== "now_webtoon_finder_v2_1_1") ||
    (!isPrimarySession && !isSecondarySession && !isDetailTestSession) ||
    typeof parsed.sessionId !== "string"
  ) {
    return null;
  }

  const createdAt =
    getStringValue(parsed, "createdAt") ?? new Date().toISOString();
  const activeRecommendationVector = normalizeRecommendationVector(
    parsed.activeRecommendationVector
  );
  const parsedProfileSnapshot = isRecord(parsed.profileSnapshot)
    ? normalizeRecommendationVector(parsed.profileSnapshot)
    : null;
  const profileSnapshot = isSecondarySession
    ? parsedProfileSnapshot ?? activeRecommendationVector
    : isDetailTestSession
      ? null
      : parsedProfileSnapshot;
  const displayedItems = getSnapshotArray(parsed.displayedItems);
  const replacementHistory = normalizeReplacementHistory(
    parsed.replacementHistory
  );
  const displaySlots = normalizeDisplaySlots({
    value: parsed.displaySlots,
    displayedItems,
    replacementHistory,
  });

  return {
    schemaVersion: FIND_PRIMARY_SESSION_SCHEMA_VERSION,
    sessionId: parsed.sessionId,
    scoreVersion: FIND_RECOMMENDATION_SCORE_VERSION,
    recommendationMode: isPrimarySession
      ? "similar_work"
      : "instant_recommendation",
    vectorSource: isPrimarySession
      ? "selected_webtoons"
      : isDetailTestSession
        ? "detail_test_result"
        : "user_taste_profile",
    ...(isDetailTestSession && sourceTestKey
      ? { sourceTestKey }
      : {}),
    visualStyleMigrationStatus:
      normalizeVisualStyleMigrationStatus(
        parsed.visualStyleMigrationStatus ??
          activeRecommendationVector.visualStyleMigrationStatus
      ),
    selectedWebtoonIds: Array.isArray(parsed.selectedWebtoonIds)
      ? parsed.selectedWebtoonIds.filter(
          (value): value is string => typeof value === "string"
        )
      : [],
    selectedWorkSources: Array.isArray(parsed.selectedWorkSources)
      ? (parsed.selectedWorkSources.filter(
          isRecord
        ) as unknown as SelectedWorkSourceSnapshot[])
      : [],
    activeRecommendationVector,
    profileSnapshot,
    inputSnapshotAtSave: normalizeRecommendationVector(
      parsed.inputSnapshotAtSave
    ),
    userQualityPreferenceSnapshot:
      normalizeStoredUserQualityPreference(
        parsed.userQualityPreferenceSnapshot
      ),
    candidatePoolIds: Array.isArray(parsed.candidatePoolIds)
      ? parsed.candidatePoolIds.filter(
          (value): value is string => typeof value === "string"
        )
      : [],
    displayedItems,
    displaySlots,
    mainReserveItems: getSnapshotArray(parsed.mainReserveItems),
    expandReserveItems: getSnapshotArray(parsed.expandReserveItems),
    excludedItems: Array.isArray(parsed.excludedItems)
      ? (parsed.excludedItems.filter(isRecord) as unknown as SessionExcludedItem[])
      : [],
    replacementHistory,
    createdAt,
    updatedAt: getStringValue(parsed, "updatedAt") ?? createdAt,
    seedVersion:
      getStringValue(parsed, "seedVersion") ??
      FIND_PRIMARY_SESSION_SEED_VERSION,
    candidatePoolSize:
      getNumberValue(parsed, "candidatePoolSize") ??
      (Array.isArray(parsed.candidatePoolIds)
        ? parsed.candidatePoolIds.length
        : 0),
    selectedWebtoons: getSelectedSnapshotArray(parsed.selectedWebtoons),
    storedUserTasteProfileSnapshot: isRecord(
      parsed.storedUserTasteProfileSnapshot
    )
      ? (parsed.storedUserTasteProfileSnapshot as StoredUserTasteProfile)
      : undefined,
    actionStateByWebtoonId: getActionStateMap(
      parsed.actionStateByWebtoonId
    ),
    legacySourceVersion:
      parsed.scoreVersion === "now_webtoon_finder_v2_1_1"
        ? "now_webtoon_finder_v2_1_1"
        : getStringValue(parsed, "legacySourceVersion"),
  };
}

function safeParseSession(value: string | null): FindPrimarySession | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);

    if (!isRecord(parsed)) return null;

    const currentSession = normalizeCurrentSession(parsed);

    if (currentSession) return currentSession;

    if (parsed.schemaVersion === "0.1" && parsed.mode === "similar_work") {
      return adaptLegacySession(parsed);
    }

    return null;
  } catch {
    return null;
  }
}

function createSelectedScoreSnapshot(
  webtoon: WebtoonSeedItem
): WebtoonScoreSnapshotAtSave {
  const tagScores = webtoon.recommendation.tagScores ?? {};
  const visualStyleMigrationStatus =
    webtoon.recommendation.visualStyleMigrationStatus ??
    "legacy_visual_appeal";
  const effectiveTagScores = getEffectiveTagScores(
    tagScores,
    visualStyleMigrationStatus
  );

  return {
    scoreVersion: webtoon.recommendation.scoreVersion,
    canonicalWebtoonId: webtoon.canonicalWebtoonId,
    title: webtoon.title,
    platform: webtoon.platform,
    mainGenre: webtoon.mainGenre,
    officialUrl: webtoon.officialUrl,
    sourceDb: webtoon.sourceDb,
    sourceType: webtoon.sourceType,
    sourceWeight: webtoon.sourceWeight,
    recommendationEligible: webtoon.recommendationEligible,
    qualityEvidenceGateDecision:
      webtoon.qualityEvidenceGateDecision,
    primaryContentAxisKey: webtoon.primaryContentAxisKey,
    displayAxisLabel: webtoon.displayAxisLabel,
    status: webtoon.metadata.status,
    ageRating: webtoon.metadata.ageRating,
    isAdult: webtoon.metadata.isAdult,
    qualityScore: webtoon.metadata.qualityScore,
    qualityBand: webtoon.metadata.qualityBand,
    qualityScoreSource: webtoon.metadata.qualityScoreSource,
    qualityFactors: webtoon.metadata.qualityFactors,
    genreScores: webtoon.recommendation.genreScores,
    typeScores: flattenTypeScores(webtoon.recommendation.typeScores),
    tagScores,
    avoidanceTagScores: webtoon.recommendation.avoidanceTagScores ?? {},
    contentAxisScores: webtoon.recommendation.contentAxisScores ?? {},
    artStyleScores: webtoon.recommendation.artStyleScores,
    visualStyleMigrationStatus,
    effectiveTagScores,
    visualAppealExcluded: isVisualAppealExcluded(
      tagScores,
      visualStyleMigrationStatus
    ),
    recommendationReason: webtoon.recommendation.recommendationReason,
  };
}

function createRecommendationScoreSnapshot(
  recommendation: SimilarWorkRecommendation
): WebtoonScoreSnapshotAtSave {
  return {
    scoreVersion: FIND_RECOMMENDATION_SCORE_VERSION,
    canonicalWebtoonId: recommendation.candidate.canonicalWebtoonId,
    title: recommendation.candidate.title,
    platform: recommendation.candidate.platform,
    mainGenre: recommendation.candidate.mainGenre,
    officialUrl: recommendation.candidate.officialUrl,
    sourceDb: recommendation.candidate.sourceDb,
    sourceType: recommendation.candidate.sourceType,
    sourceWeight: recommendation.candidate.sourceWeight,
    recommendationEligible:
      recommendation.candidate.recommendationEligible,
    qualityEvidenceGateDecision:
      recommendation.candidate.qualityEvidenceGateDecision,
    primaryContentAxisKey:
      recommendation.candidate.primaryContentAxisKey,
    displayAxisLabel: recommendation.candidate.displayAxisLabel,
    status: recommendation.candidate.status,
    qualityScore:
      recommendation.debug.candidateQualityScore ?? undefined,
    qualityBand:
      recommendation.debug.candidateQualityBand ?? undefined,
    qualityScoreSource:
      recommendation.debug.candidateQualityScoreSource ?? undefined,
    qualityFactors:
      recommendation.debug.candidateQualityFactors ?? undefined,
    genreScores: recommendation.debug.candidateGenreScores,
    typeScores: recommendation.debug.candidateTypeScores,
    tagScores: recommendation.debug.candidateTagScores,
    avoidanceTagScores:
      recommendation.debug.candidateAvoidanceTagScores,
    contentAxisScores:
      recommendation.debug.candidateContentAxisScores,
    artStyleScores: recommendation.debug.candidateArtStyleScores,
    visualStyleMigrationStatus:
      recommendation.debug.candidateVisualStyleMigrationStatus,
    effectiveTagScores:
      recommendation.debug.candidateEffectiveTagScores,
    visualAppealExcluded:
      recommendation.debug.candidateVisualAppealExcluded,
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
  replacementCount?: number;
  actionState?: RecommendationItemActionState;
}): RecommendationItemSnapshot {
  const {
    recommendation,
    section,
    slot,
    reservePoolType,
    reserveRank,
    replacementCount = 0,
    actionState,
  } = params;
  const profileBreakdown = recommendation.debug.profileBreakdown;
  const detailTestBreakdown =
    recommendation.debug.detailTestBreakdown;

  return {
    canonicalWebtoonId: recommendation.candidate.canonicalWebtoonId,
    section,
    slot,
    originalRank: recommendation.rank,
    currentRank: recommendation.rank,
    sourceTasteRank: recommendation.sourceTasteRank,
    effectiveTasteRank: recommendation.effectiveTasteRank,
    candidatePoolRank: recommendation.effectiveTasteRank,
    reservePoolType,
    reserveRank,
    badgeType: recommendation.recommendationType,
    tasteScoreSource: recommendation.tasteScoreSource,
    status: actionState?.feedbackAction
      ? "feedback_excluded"
      : "active",
    replacementCount,
    matchedTagKeys: recommendation.matchedTagKeys,
    matchScore: recommendation.matchScore,
    genreMatch: recommendation.genreMatch,
    typeMatch: recommendation.typeMatch,
    tagMatch: recommendation.tagMatch,
    contentAxisMatch: recommendation.contentAxisMatch,
    userAvoidancePenalty: recommendation.userAvoidancePenalty,
    selectedWorkTasteScore: recommendation.selectedWorkTasteScore,
    profileTasteScore: recommendation.profileTasteScore,
    detailTestTasteScore: recommendation.detailTestTasteScore,
    profileAvoidancePenalty: recommendation.profileAvoidancePenalty,
    effectiveTasteScore: recommendation.effectiveTasteScore,
    riskSafetyScore: recommendation.riskSafetyScore,
    normalizedQualityScore: recommendation.normalizedQualityScore,
    artQualityScore: recommendation.artQualityScore,
    storyQualityScore: recommendation.storyQualityScore,
    qualityFloorPenalty: recommendation.qualityFloorPenalty,
    personalizedQualityScore: recommendation.personalizedQualityScore,
    artToneMismatchPenalty:
      recommendation.artToneMismatchPenalty,
    profileArtToneMismatchPenalty:
      profileBreakdown?.artToneMismatchPenalty,
    detailArtToneMismatchPenalty:
      detailTestBreakdown?.artToneMismatchPenalty,
    effectiveTagScores: recommendation.effectiveTagScores,
    visualAppealExcluded:
      recommendation.visualAppealExcluded,
    successConfidenceScore: recommendation.successConfidenceScore,
    displayRecommendationScore:
      recommendation.displayRecommendationScore,
    selectedPositiveRaw:
      recommendation.debug.selectedWorkBreakdown.positiveRaw,
    profileGenreMatch: profileBreakdown?.genreMatch,
    profileTypeMatch: profileBreakdown?.typeMatch,
    profileTagMatch: profileBreakdown?.tagMatch,
    profilePositiveRaw: profileBreakdown?.positiveRaw,
    detailGenreMatch: detailTestBreakdown?.genreMatch,
    detailTypeMatch: detailTestBreakdown?.typeMatch,
    detailTagMatch: detailTestBreakdown?.tagMatch,
    detailPositiveRaw: detailTestBreakdown?.positiveRaw,
    detailAvoidancePenalty:
      detailTestBreakdown?.userAvoidancePenalty,
    stage1Score: recommendation.selectedWorkTasteScore,
    longTermScore: recommendation.profileTasteScore,
    effectiveScore: recommendation.effectiveTasteScore,
    finalRecommendationScore:
      recommendation.displayRecommendationScore,
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
  slotOffset?: number;
}) {
  const {
    recommendations,
    section,
    actionStateByWebtoonId,
    reservePoolType,
    slotOffset = 0,
  } = params;

  return recommendations.map((recommendation, index) => {
    return createRecommendationSnapshot({
      recommendation,
      section,
      slot: index + 1 + slotOffset,
      reservePoolType,
      reserveRank: reservePoolType ? index + 1 : undefined,
      actionState:
        actionStateByWebtoonId[
          recommendation.candidate.canonicalWebtoonId
        ],
    });
  });
}

function createFeedbackExcludedItems(
  actionStateByWebtoonId: RecommendationItemActionStateMap
): SessionExcludedItem[] {
  return Object.values(actionStateByWebtoonId).flatMap((actionState) => {
    if (!actionState.feedbackAction) return [];

    return [
      {
        canonicalWebtoonId: actionState.canonicalWebtoonId,
        reason:
          actionState.feedbackAction === "already_read"
            ? ("already_seen" as const)
            : ("session_excluded" as const),
        excludedAt: actionState.feedbackCreatedAt,
        feedbackAction: actionState.feedbackAction,
      },
    ];
  });
}

function mergeExcludedItems(
  hardFilterItems: HardFilterExcludedItem[],
  feedbackItems: SessionExcludedItem[]
) {
  const merged = new Map<string, SessionExcludedItem>();

  [...hardFilterItems, ...feedbackItems].forEach((item) => {
    const key = `${item.canonicalWebtoonId}:${item.reason}`;
    merged.set(key, item);
  });

  return [...merged.values()];
}

export function createFindRecommendationSession(params: {
  selectionResult: FindRecommendationSelectionResult;
  selectedSourceWebtoons?: WebtoonSeedItem[];
  actionStateByWebtoonId?: RecommendationItemActionStateMap;
  previousSessionId?: string;
}): RecommendationSessionV211 {
  const {
    selectionResult,
    selectedSourceWebtoons = [],
    actionStateByWebtoonId = {},
    previousSessionId,
  } = params;
  const now = new Date().toISOString();
  const displayedItems = [
    ...snapshotRecommendationList({
      recommendations: selectionResult.mainDisplayItems,
      section: "main_display",
      actionStateByWebtoonId,
    }),
    ...snapshotRecommendationList({
      recommendations: selectionResult.expansionDisplayItems,
      section: "expansion_display",
      actionStateByWebtoonId,
      slotOffset: 5,
    }),
  ];

  return {
    schemaVersion: FIND_PRIMARY_SESSION_SCHEMA_VERSION,
    sessionId: previousSessionId ?? createSessionId(),
    scoreVersion: FIND_RECOMMENDATION_SCORE_VERSION,
    recommendationMode: selectionResult.recommendationMode,
    vectorSource: selectionResult.vectorSource,
    ...(selectionResult.sourceTestKey
      ? { sourceTestKey: selectionResult.sourceTestKey }
      : {}),
    visualStyleMigrationStatus:
      selectionResult.activeRecommendationVector
        .visualStyleMigrationStatus ?? "legacy_visual_appeal",
    selectedWebtoonIds: selectedSourceWebtoons.map(
      (webtoon) => webtoon.canonicalWebtoonId
    ),
    selectedWorkSources: selectedSourceWebtoons.map((webtoon) => ({
      canonicalWebtoonId: webtoon.canonicalWebtoonId,
      sourceDbType: webtoon.sourceDb,
      sourceWeight: webtoon.sourceWeight,
    })),
    activeRecommendationVector:
      selectionResult.activeRecommendationVector,
    profileSnapshot: selectionResult.profileSnapshot,
    inputSnapshotAtSave: selectionResult.inputSnapshotAtSave,
    userQualityPreferenceSnapshot:
      selectionResult.userQualityPreferenceSnapshot,
    candidatePoolIds: selectionResult.candidatePoolIds,
    displayedItems,
    displaySlots: createDefaultDisplaySlots({
      displayedItems,
      replacementHistory: [],
    }),
    mainReserveItems: snapshotRecommendationList({
      recommendations: selectionResult.mainReservePool,
      section: "main_reserve",
      reservePoolType: "main_reserve",
      actionStateByWebtoonId,
    }),
    expandReserveItems: snapshotRecommendationList({
      recommendations: selectionResult.expandReservePool,
      section: "expand_reserve",
      reservePoolType: "expand_reserve",
      actionStateByWebtoonId,
    }),
    excludedItems: mergeExcludedItems(
      selectionResult.hardFilterExcludedItems,
      createFeedbackExcludedItems(actionStateByWebtoonId)
    ),
    replacementHistory: [],
    createdAt: now,
    updatedAt: now,
    seedVersion: FIND_PRIMARY_SESSION_SEED_VERSION,
    candidatePoolSize: selectionResult.candidatePoolSize,
    selectedWebtoons: selectedSourceWebtoons.map(createSelectedSnapshot),
    storedUserTasteProfileSnapshot:
      selectionResult.storedUserTasteProfile ?? undefined,
    actionStateByWebtoonId,
  };
}

export function createFindPrimarySession(params: {
  selectionResult: SimilarWorkSelectionResult;
  selectedSourceWebtoons: WebtoonSeedItem[];
  actionStateByWebtoonId?: RecommendationItemActionStateMap;
  previousSessionId?: string;
}): RecommendationSessionV211 {
  return createFindRecommendationSession(params);
}

export function createFindSecondarySession(params: {
  selectionResult: InstantRecommendationSelectionResult;
  actionStateByWebtoonId?: RecommendationItemActionStateMap;
  previousSessionId?: string;
}): RecommendationSessionV211 {
  return createFindRecommendationSession({
    ...params,
    selectedSourceWebtoons: [],
  });
}

export function createFindDetailTestSession(params: {
  selectionResult: DetailTestRecommendationSelectionResult;
  actionStateByWebtoonId?: RecommendationItemActionStateMap;
  previousSessionId?: string;
}): RecommendationSessionV211 {
  return createFindRecommendationSession({
    ...params,
    selectedSourceWebtoons: [],
  });
}

export function saveFindPrimarySession(session: FindPrimarySession) {
  if (!canUseLocalStorage()) return;

  const normalizedSession: FindPrimarySession = {
    ...session,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    FIND_PRIMARY_SESSION_STORAGE_KEY,
    JSON.stringify(normalizedSession)
  );
}

export function loadFindPrimarySession(): FindPrimarySession | null {
  if (!canUseLocalStorage()) return null;

  return safeParseSession(
    window.localStorage.getItem(FIND_PRIMARY_SESSION_STORAGE_KEY)
  );
}

export function updateFindRecommendationSessionActionStates(
  actionStateByWebtoonId: RecommendationItemActionStateMap
): FindRecommendationSession | null {
  const currentSession = loadFindPrimarySession();

  if (!currentSession) return null;

  const updatedSession: FindRecommendationSession = {
    ...currentSession,
    actionStateByWebtoonId,
    displayedItems: applyActionStatesToSnapshots(
      currentSession.displayedItems,
      actionStateByWebtoonId
    ),
    mainReserveItems: applyActionStatesToSnapshots(
      currentSession.mainReserveItems,
      actionStateByWebtoonId
    ),
    expandReserveItems: applyActionStatesToSnapshots(
      currentSession.expandReserveItems,
      actionStateByWebtoonId
    ),
    excludedItems: mergeExcludedItems(
      currentSession.excludedItems,
      createFeedbackExcludedItems(actionStateByWebtoonId)
    ),
  };

  saveFindPrimarySession(updatedSession);
  return updatedSession;
}

export function updateFindPrimarySessionActionStates(
  actionStateByWebtoonId: RecommendationItemActionStateMap
) {
  return updateFindRecommendationSessionActionStates(
    actionStateByWebtoonId
  );
}

function applyActionStatesToSnapshots(
  snapshots: RecommendationItemSnapshot[],
  actionStateByWebtoonId: RecommendationItemActionStateMap
): RecommendationItemSnapshot[] {
  return snapshots.map((snapshot) => {
    const actionState = actionStateByWebtoonId[snapshot.canonicalWebtoonId];

    return {
      ...snapshot,
      status: actionState?.feedbackAction
        ? "feedback_excluded"
        : "active",
    };
  });
}

function getSnapshotSourceDb(snapshot: WebtoonScoreSnapshotAtSave) {
  return normalizeSourceDb(snapshot.sourceDb);
}

function getSnapshotDisplayAxisLabel(
  snapshot: WebtoonScoreSnapshotAtSave
) {
  return snapshot.displayAxisLabel ?? getGenreLabel(snapshot.mainGenre);
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
      scoreSnapshot.sourceWeight ?? getSourceWeight(sourceDb),
    primaryContentAxisKey:
      scoreSnapshot.primaryContentAxisKey ?? null,
    displayAxisLabel:
      scoreSnapshot.displayAxisLabel ??
      snapshot.displayAxisLabel ??
      snapshot.mainGenreLabel,
    genreScores: scoreSnapshot.genreScores,
    typeScores: {
      [snapshot.mainGenre]: scoreSnapshot.typeScores,
    },
    tagScores: scoreSnapshot.tagScores,
    avoidanceTagScores: scoreSnapshot.avoidanceTagScores,
    contentAxisScores: scoreSnapshot.contentAxisScores ?? {},
    artStyleScores: scoreSnapshot.artStyleScores,
    visualStyleMigrationStatus:
      scoreSnapshot.visualStyleMigrationStatus,
  };
}

function restoreRecommendation(
  snapshot: RecommendationItemSnapshot
): SimilarWorkRecommendation {
  const scoreSnapshot = snapshot.scoreSnapshotAtSave;
  const sourceDb = getSnapshotSourceDb(scoreSnapshot);
  const sourceWeight =
    scoreSnapshot.sourceWeight ?? getSourceWeight(sourceDb);
  const displayAxisLabel = getSnapshotDisplayAxisLabel(scoreSnapshot);
  const contentAxisScores = scoreSnapshot.contentAxisScores ?? {};
  const visualStyleMigrationStatus =
    scoreSnapshot.visualStyleMigrationStatus ??
    "legacy_visual_appeal";
  const effectiveTagScores =
    snapshot.effectiveTagScores ??
    scoreSnapshot.effectiveTagScores ??
    getEffectiveTagScores(
      scoreSnapshot.tagScores ?? {},
      visualStyleMigrationStatus
    );
  const visualAppealExcluded =
    snapshot.visualAppealExcluded ??
    scoreSnapshot.visualAppealExcluded ??
    isVisualAppealExcluded(
      scoreSnapshot.tagScores ?? {},
      visualStyleMigrationStatus
    );
  const legacyQualityBreakdown = calculateSuccessConfidenceScore({
    qualityScore: scoreSnapshot.qualityScore,
    qualityFactors: scoreSnapshot.qualityFactors,
    riskSafetyScore: snapshot.riskSafetyScore,
  });
  const artQualityScore =
    snapshot.artQualityScore === undefined
      ? legacyQualityBreakdown.artQualityScore
      : snapshot.artQualityScore;
  const storyQualityScore =
    snapshot.storyQualityScore === undefined
      ? legacyQualityBreakdown.storyQualityScore
      : snapshot.storyQualityScore;
  const qualityFloorPenalty = snapshot.qualityFloorPenalty ?? 0;
  const personalizedQualityScore =
    snapshot.personalizedQualityScore ??
    snapshot.normalizedQualityScore;
  const artToneMismatchPenalty =
    snapshot.artToneMismatchPenalty ?? 0;
  const effectiveTasteRank =
    snapshot.effectiveTasteRank ??
    snapshot.candidatePoolRank ??
    snapshot.currentRank;

  return {
    rank: snapshot.currentRank,
    sourceTasteRank: snapshot.sourceTasteRank,
    effectiveTasteRank,
    effectiveRank: effectiveTasteRank,
    recommendationType: snapshot.badgeType,
    tasteScoreSource:
      snapshot.tasteScoreSource ?? "selected_webtoons",
    candidate: {
      canonicalWebtoonId: snapshot.canonicalWebtoonId,
      title: scoreSnapshot.title,
      platform: scoreSnapshot.platform,
      officialUrl: scoreSnapshot.officialUrl,
      mainGenre: scoreSnapshot.mainGenre,
      status: scoreSnapshot.status ?? "unknown",
      recommendationReason:
        scoreSnapshot.recommendationReason ?? snapshot.recommendationReason,
      sourceDb,
      sourceType: scoreSnapshot.sourceType ?? sourceDb,
      sourceWeight,
      recommendationEligible:
        scoreSnapshot.recommendationEligible,
      qualityEvidenceGateDecision:
        scoreSnapshot.qualityEvidenceGateDecision,
      primaryContentAxisKey:
        scoreSnapshot.primaryContentAxisKey ?? null,
      displayAxisLabel,
    },
    genreMatch: snapshot.genreMatch,
    typeMatch: snapshot.typeMatch,
    tagMatch: snapshot.tagMatch,
    contentAxisMatch: snapshot.contentAxisMatch,
    userAvoidancePenalty: snapshot.userAvoidancePenalty,
    selectedWorkTasteScore: snapshot.selectedWorkTasteScore,
    profileTasteScore: snapshot.profileTasteScore,
    detailTestTasteScore: snapshot.detailTestTasteScore ?? null,
    profileAvoidancePenalty: snapshot.profileAvoidancePenalty,
    effectiveTasteScore: snapshot.effectiveTasteScore,
    riskSafetyScore: snapshot.riskSafetyScore,
    normalizedQualityScore: snapshot.normalizedQualityScore,
    artQualityScore,
    storyQualityScore,
    qualityFloorPenalty,
    personalizedQualityScore,
    artToneMismatchPenalty,
    effectiveTagScores,
    visualAppealExcluded,
    successConfidenceScore: snapshot.successConfidenceScore,
    displayRecommendationScore: snapshot.displayRecommendationScore,
    matchedTagKeys: snapshot.matchedTagKeys,
    matchScore: snapshot.matchScore,
    sourceTasteScore: snapshot.selectedWorkTasteScore,
    stage1Score: snapshot.selectedWorkTasteScore,
    longTermScore: snapshot.profileTasteScore,
    effectiveScore: snapshot.effectiveTasteScore,
    finalRecommendationScore: snapshot.displayRecommendationScore,
    qualityBoost: snapshot.normalizedQualityScore,
    avoidancePenalty: snapshot.userAvoidancePenalty,
    debug: {
      candidateGenreScores: scoreSnapshot.genreScores,
      candidateTypeScores: scoreSnapshot.typeScores,
      candidateTagScores: scoreSnapshot.tagScores,
      candidateEffectiveTagScores: effectiveTagScores,
      candidateVisualAppealExcluded: visualAppealExcluded,
      candidateAvoidanceTagScores: scoreSnapshot.avoidanceTagScores,
      candidateContentAxisScores: contentAxisScores,
      candidateArtStyleScores: scoreSnapshot.artStyleScores,
      candidateVisualStyleMigrationStatus:
        visualStyleMigrationStatus,
      candidateSourceDb: sourceDb,
      candidateSourceType: scoreSnapshot.sourceType ?? sourceDb,
      candidateSourceWeight: sourceWeight,
      candidateRecommendationEligible:
        typeof scoreSnapshot.recommendationEligible === "boolean"
          ? scoreSnapshot.recommendationEligible
          : null,
      candidateQualityEvidenceGateDecision:
        scoreSnapshot.qualityEvidenceGateDecision ?? null,
      candidateQualityScore: scoreSnapshot.qualityScore ?? null,
      candidateQualityBand: scoreSnapshot.qualityBand ?? null,
      candidateQualityScoreSource:
        scoreSnapshot.qualityScoreSource ?? null,
      candidateQualityFactors: scoreSnapshot.qualityFactors ?? null,
      candidateDisplayAxisLabel: displayAxisLabel,
      selectedWorkBreakdown: {
        genreMatch: snapshot.genreMatch,
        typeMatch: snapshot.typeMatch,
        tagMatch: snapshot.tagMatch,
        contentAxisMatch: snapshot.contentAxisMatch,
        positiveRaw: snapshot.selectedPositiveRaw ?? 0,
        userAvoidancePenalty: snapshot.userAvoidancePenalty,
        artToneMismatchPenalty,
        selectedWorkTasteScore: snapshot.selectedWorkTasteScore,
        matchedTagKeys: snapshot.matchedTagKeys,
      },
      profileBreakdown:
        typeof snapshot.profileTasteScore === "number"
          ? {
              genreMatch: snapshot.profileGenreMatch ?? 0,
              typeMatch: snapshot.profileTypeMatch ?? 0,
              tagMatch: snapshot.profileTagMatch ?? 0,
              positiveRaw: snapshot.profilePositiveRaw ?? 0,
              profileAvoidancePenalty:
                snapshot.profileAvoidancePenalty ?? 0,
              artToneMismatchPenalty:
                snapshot.profileArtToneMismatchPenalty ?? 0,
              profileTasteScore: snapshot.profileTasteScore,
              matchedTagKeys: snapshot.matchedTagKeys,
            }
          : null,
      detailTestBreakdown:
        typeof snapshot.detailTestTasteScore === "number"
          ? {
              genreMatch: snapshot.detailGenreMatch ?? snapshot.genreMatch,
              typeMatch: snapshot.detailTypeMatch ?? snapshot.typeMatch,
              tagMatch: snapshot.detailTagMatch ?? snapshot.tagMatch,
              positiveRaw:
                snapshot.detailPositiveRaw ??
                snapshot.selectedPositiveRaw ??
                0,
              userAvoidancePenalty:
                snapshot.detailAvoidancePenalty ??
                snapshot.userAvoidancePenalty,
              artToneMismatchPenalty:
                snapshot.detailArtToneMismatchPenalty ??
                artToneMismatchPenalty,
              detailTestTasteScore: snapshot.detailTestTasteScore,
              matchedTagKeys: snapshot.matchedTagKeys,
            }
          : null,
    },
  };
}

function createRestoredSessionProfile(
  session: FindPrimarySession
): SimilarWorkProfile {
  const vector = session.activeRecommendationVector;

  return {
    mode: "similar_work",
    sourceWebtoonIds: session.selectedWebtoonIds,
    sourceWeightSum: roundScore(
      session.selectedWorkSources.reduce((sum, source) => {
        return sum + Math.max(source.sourceWeight, 0);
      }, 0)
    ),
    userGenreScores: vector.genreScores,
    userTypeScores: flattenTypeScores(vector.typeScores),
    userTagScores: vector.tagScores,
    userAvoidanceScores: vector.avoidanceTagScores,
    userContentAxisScores: vector.contentAxisScores,
    userArtStyleScores: vector.artStyleScores ?? {},
    visualStyleMigrationStatus:
      vector.visualStyleMigrationStatus ??
      session.visualStyleMigrationStatus,
  };
}

export function restoreRecommendationSelectionResultFromSession(
  session: FindRecommendationSession
): FindRecommendationSelectionResult {
  const activeDisplayIds = new Set(
    session.displaySlots.flatMap((slot) =>
      slot.currentWebtoonId ? [slot.currentWebtoonId] : []
    )
  );
  const mainDisplayItems = session.displayedItems
    .filter(
      (item) =>
        item.section === "main_display" &&
        activeDisplayIds.has(item.canonicalWebtoonId)
    )
    .sort((a, b) => a.slot - b.slot)
    .map(restoreRecommendation);
  const expansionDisplayItems = session.displayedItems
    .filter(
      (item) =>
        item.section === "expansion_display" &&
        activeDisplayIds.has(item.canonicalWebtoonId)
    )
    .sort((a, b) => a.slot - b.slot)
    .map(restoreRecommendation);
  const mainReservePool = session.mainReserveItems.map(
    restoreRecommendation
  );
  const expandReservePool = session.expandReserveItems.map(
    restoreRecommendation
  );
  const expansionCandidatePool = [
    ...expansionDisplayItems,
    ...expandReservePool,
  ].sort((a, b) => a.rank - b.rank);
  const commonResult = {
    scoreVersion: FIND_RECOMMENDATION_SCORE_VERSION,
    activeRecommendationVector: session.activeRecommendationVector,
    inputSnapshotAtSave: session.inputSnapshotAtSave,
    userQualityPreferenceSnapshot:
      session.userQualityPreferenceSnapshot ?? null,
    scoringVersion: FIND_RECOMMENDATION_SCORE_VERSION,
    candidatePoolSize: session.candidatePoolSize,
    candidatePoolIds: session.candidatePoolIds,
    hardFilterExcludedItems: session.excludedItems.map((item) => ({
      canonicalWebtoonId: item.canonicalWebtoonId,
      reason: item.reason,
    })),
    mainDisplayItems,
    mainReservePool,
    expansionCandidatePool,
    expansionDisplayItems,
    expandReservePool,
    recommendations: [...mainDisplayItems, ...expansionDisplayItems],
    ...(session.sourceTestKey
      ? { sourceTestKey: session.sourceTestKey }
      : {}),
  };

  if (
    session.recommendationMode === "instant_recommendation" &&
    session.vectorSource === "detail_test_result" &&
    session.sourceTestKey
  ) {
    return {
      ...commonResult,
      mode: "instant_recommendation",
      recommendationMode: "instant_recommendation",
      vectorSource: "detail_test_result",
      sourceTestKey: session.sourceTestKey,
      selectedWebtoons: [],
      profileSnapshot: null,
      storedUserTasteProfile: null,
      hasLongTermProfile: false,
      blendingWeights: {
        selectedWorkTasteScore: 0,
        profileTasteScore: 0,
        detailTestTasteScore: 1,
        stage1Weight: 1,
        longTermWeight: 0,
      },
    };
  }

  if (
    session.recommendationMode === "instant_recommendation" &&
    session.vectorSource === "user_taste_profile"
  ) {
    const profileSnapshot =
      session.profileSnapshot ?? session.activeRecommendationVector;
    const storedUserTasteProfile =
      session.storedUserTasteProfileSnapshot ??
      storedTasteProfileFromVector(profileSnapshot);

    return {
      ...commonResult,
      mode: "instant_recommendation",
      recommendationMode: "instant_recommendation",
      vectorSource: "user_taste_profile",
      selectedWebtoons: [],
      profileSnapshot,
      storedUserTasteProfile,
      hasLongTermProfile: true,
      blendingWeights: {
        selectedWorkTasteScore: 0,
        profileTasteScore: 1,
        detailTestTasteScore: 0,
        stage1Weight: 0,
        longTermWeight: 1,
      },
    };
  }

  const selectedWebtoons = session.selectedWebtoons.map(
    restoreSelectedWebtoon
  );
  const restoredSessionProfile = createRestoredSessionProfile(session);

  return {
    ...commonResult,
    mode: "similar_work",
    recommendationMode: "similar_work",
    vectorSource: "selected_webtoons",
    selectedWebtoons,
    profileSnapshot: session.profileSnapshot,
    similarWorkSessionVector: restoredSessionProfile,
    userSimilarWorkProfile: restoredSessionProfile,
    storedUserTasteProfile:
      session.storedUserTasteProfileSnapshot ?? null,
    hasLongTermProfile: Boolean(session.profileSnapshot),
    blendingWeights: {
      selectedWorkTasteScore: session.profileSnapshot ? 0.8 : 1,
      profileTasteScore: session.profileSnapshot ? 0.2 : 0,
      detailTestTasteScore: 0,
      stage1Weight: session.profileSnapshot ? 0.8 : 1,
      longTermWeight: session.profileSnapshot ? 0.2 : 0,
    },
  };
}

export function restoreSimilarWorkSelectionResultFromSession(
  session: FindPrimarySession
): SimilarWorkSelectionResult {
  const result = restoreRecommendationSelectionResultFromSession(session);

  if (result.recommendationMode !== "similar_work") {
    throw new Error("FIND_SESSION_IS_NOT_PRIMARY");
  }

  return result;
}

function storedTasteProfileFromVector(
  vector: RecommendationVector
): StoredUserTasteProfile {
  return {
    sourceKeys: ["session_profile_snapshot"],
    userGenreScores: vector.genreScores,
    userTypeScores: flattenTypeScores(vector.typeScores),
    userTagScores: vector.tagScores,
    userAvoidanceScores: vector.avoidanceTagScores,
    ...(vector.artStyleScores
      ? { userArtStyleScores: vector.artStyleScores }
      : {}),
  };
}

function adaptLegacySession(parsed: RawRecord): RecommendationSessionV211 | null {
  const sessionId = getStringValue(parsed, "sessionId");

  if (!sessionId) return null;

  const createdAt = getStringValue(parsed, "createdAt") ?? new Date().toISOString();
  const selectedWebtoons = getSelectedSnapshotArray(parsed.selectedWebtoons);
  const legacyActionStates = getActionStateMap(parsed.actionStateByWebtoonId);
  const activeRecommendationVector =
    recommendationVectorFromLegacySessionVector(
      parsed.similarWorkSessionVector
    );
  const storedProfile = isRecord(parsed.storedUserTasteProfileSnapshot)
    ? (parsed.storedUserTasteProfileSnapshot as StoredUserTasteProfile)
    : undefined;
  const profileSnapshot = recommendationVectorFromStoredProfile(
    parsed.storedUserTasteProfileSnapshot
  );
  const legacyMainDisplay = adaptLegacySnapshotList(
    parsed.mainDisplayItems,
    "main_display"
  );
  const legacyMainReserve = adaptLegacySnapshotList(
    parsed.mainReservePool,
    "main_reserve"
  );
  const legacyExpansionDisplay = adaptLegacySnapshotList(
    parsed.expansionDisplayItems,
    "expansion_display"
  );
  const legacyExpandReserveSource = Array.isArray(parsed.expandReservePool)
    ? parsed.expandReservePool
    : parsed.expansionReservePool;
  const displayedIdSet = new Set(
    legacyExpansionDisplay.map((item) => item.canonicalWebtoonId)
  );
  const legacyExpandReserve = adaptLegacySnapshotList(
    legacyExpandReserveSource,
    "expand_reserve"
  ).filter((item) => !displayedIdSet.has(item.canonicalWebtoonId));
  const allCandidateSnapshots = [
    ...legacyMainDisplay,
    ...legacyMainReserve,
    ...legacyExpansionDisplay,
    ...legacyExpandReserve,
  ];
  const selectedWorkSources = selectedWebtoons.map((snapshot) => {
    const scoreSnapshot = snapshot.scoreSnapshotAtSave;
    const sourceDbType = normalizeSourceDb(scoreSnapshot.sourceDb);

    return {
      canonicalWebtoonId: snapshot.canonicalWebtoonId,
      sourceDbType,
      sourceWeight:
        scoreSnapshot.sourceWeight ?? getSourceWeight(sourceDbType),
    };
  });

  return {
    schemaVersion: FIND_PRIMARY_SESSION_SCHEMA_VERSION,
    sessionId,
    scoreVersion: FIND_RECOMMENDATION_SCORE_VERSION,
    recommendationMode: "similar_work",
    vectorSource: "selected_webtoons",
    visualStyleMigrationStatus: "legacy_visual_appeal",
    selectedWebtoonIds: selectedWebtoons.map(
      (snapshot) => snapshot.canonicalWebtoonId
    ),
    selectedWorkSources,
    activeRecommendationVector,
    profileSnapshot: profileSnapshot ?? null,
    inputSnapshotAtSave: activeRecommendationVector,
    userQualityPreferenceSnapshot: null,
    candidatePoolIds: [...new Set(
      allCandidateSnapshots
        .sort((a, b) => a.currentRank - b.currentRank)
        .map((item) => item.canonicalWebtoonId)
    )],
    displayedItems: [
      ...legacyMainDisplay,
      ...legacyExpansionDisplay,
    ],
    displaySlots: createDefaultDisplaySlots({
      displayedItems: [
        ...legacyMainDisplay,
        ...legacyExpansionDisplay,
      ],
      replacementHistory: [],
    }),
    mainReserveItems: legacyMainReserve,
    expandReserveItems: legacyExpandReserve,
    excludedItems: createFeedbackExcludedItems(legacyActionStates),
    replacementHistory: [],
    createdAt,
    updatedAt: getStringValue(parsed, "updatedAt") ?? createdAt,
    seedVersion:
      getStringValue(parsed, "seedVersion") ?? FIND_PRIMARY_SESSION_SEED_VERSION,
    candidatePoolSize:
      getNumberValue(parsed, "candidatePoolSize") ??
      allCandidateSnapshots.length,
    selectedWebtoons,
    storedUserTasteProfileSnapshot: storedProfile,
    actionStateByWebtoonId: legacyActionStates,
    legacySourceVersion: "schema_0.1_two_stage_rerank_v1_8_primary",
  };
}

function adaptLegacySnapshotList(
  value: unknown,
  section: RecommendationItemSnapshot["section"]
): RecommendationItemSnapshot[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((rawItem, index) => {
    if (!isRecord(rawItem)) return [];

    const item = rawItem as LegacyRecommendationItemSnapshot;
    const canonicalWebtoonId = item.canonicalWebtoonId;
    const scoreSnapshot = item.scoreSnapshotAtSave;

    if (!canonicalWebtoonId || !scoreSnapshot) return [];

    const selectedWorkTasteScore = roundScore(item.stage1Score ?? 0);
    const profileTasteScore =
      typeof item.longTermScore === "number"
        ? roundScore(item.longTermScore)
        : null;
    const effectiveTasteScore = roundScore(
      item.effectiveScore ?? selectedWorkTasteScore
    );
    const displayRecommendationScore = roundScore(
      clamp(
        item.finalRecommendationScore ?? effectiveTasteScore,
        0,
        1
      )
    );
    const normalizedQualityScore = roundScore(
      clamp(
        item.qualityBoost ??
          (scoreSnapshot.qualityScore ?? 0) / 5,
        0,
        1
      )
    );
    const riskSafetyScore = calculateRiskSafetyScore(
      scoreSnapshot.avoidanceTagScores ?? {}
    );
    const successConfidenceScore =
      calculateSuccessConfidenceScore({
        qualityScore: scoreSnapshot.qualityScore,
        riskSafetyScore,
      }).successConfidenceScore;

    return [
      {
        canonicalWebtoonId,
        section,
        slot: isDisplaySection(section)
          ? normalizeDisplaySlotNumber(
              section,
              item.slot ?? index + 1
            )
          : Math.max(1, Math.trunc(item.slot ?? index + 1)),
        originalRank: item.originalRank ?? index + 1,
        currentRank: item.currentRank ?? item.originalRank ?? index + 1,
        sourceTasteRank: item.stage1Rank ?? item.originalRank ?? index + 1,
        effectiveTasteRank:
          item.effectiveTasteRank ??
          item.candidatePoolRank ??
          item.currentRank ??
          index + 1,
        candidatePoolRank:
          item.effectiveTasteRank ??
          item.candidatePoolRank ??
          item.currentRank ??
          index + 1,
        reservePoolType:
          section === "main_reserve"
            ? "main_reserve"
            : section === "expand_reserve"
              ? "expand_reserve"
              : undefined,
        reserveRank: item.reserveRank,
        badgeType: item.badgeType ?? "stable_match",
        tasteScoreSource: item.tasteScoreSource ?? "selected_webtoons",
        status:
          item.status === "feedback_excluded"
            ? "feedback_excluded"
            : "active",
        replacementCount:
          typeof item.replacementCount === "number" &&
          Number.isFinite(item.replacementCount)
            ? Math.max(0, Math.trunc(item.replacementCount))
            : 0,
        matchedTagKeys: Array.isArray(item.matchedTagKeys)
          ? item.matchedTagKeys
          : [],
        matchScore:
          item.matchScore ?? Math.round(displayRecommendationScore * 100),
        genreMatch: roundScore(item.genreMatch ?? 0),
        typeMatch: roundScore(item.typeMatch ?? 0),
        tagMatch: roundScore(item.tagMatch ?? 0),
        contentAxisMatch: 0,
        userAvoidancePenalty: roundScore(item.avoidancePenalty ?? 0),
        selectedWorkTasteScore,
        profileTasteScore,
        detailTestTasteScore: null,
        profileAvoidancePenalty: profileTasteScore === null ? null : 0,
        effectiveTasteScore,
        riskSafetyScore,
        normalizedQualityScore,
        successConfidenceScore,
        displayRecommendationScore,
        stage1Score: selectedWorkTasteScore,
        longTermScore: profileTasteScore,
        effectiveScore: effectiveTasteScore,
        finalRecommendationScore: displayRecommendationScore,
        recommendationReason:
          item.recommendationReason ??
          scoreSnapshot.recommendationReason ??
          "이전 추천 세션에서 복원한 후보입니다.",
        scoreSnapshotAtSave: {
          ...scoreSnapshot,
          genreScores: scoreSnapshot.genreScores ?? {},
          typeScores: scoreSnapshot.typeScores ?? {},
          tagScores: scoreSnapshot.tagScores ?? {},
          avoidanceTagScores:
            scoreSnapshot.avoidanceTagScores ?? {},
          contentAxisScores: scoreSnapshot.contentAxisScores ?? {},
          artStyleScores: scoreSnapshot.artStyleScores,
          visualStyleMigrationStatus:
            scoreSnapshot.visualStyleMigrationStatus ??
            "legacy_visual_appeal",
        },
      },
    ];
  });
}

export function getExcludedIdsFromActionStates(
  actionStateByWebtoonId: RecommendationItemActionStateMap
) {
  const alreadySeenWebtoonIds: string[] = [];
  const excludedWebtoonIds: string[] = [];

  Object.values(actionStateByWebtoonId).forEach((actionState) => {
    if (actionState.feedbackAction === "already_read") {
      alreadySeenWebtoonIds.push(actionState.canonicalWebtoonId);
    }

    if (actionState.feedbackAction === "not_my_taste") {
      excludedWebtoonIds.push(actionState.canonicalWebtoonId);
    }
  });

  return {
    alreadySeenWebtoonIds,
    excludedWebtoonIds,
  };
}

export type { HardFilterExclusionReason };