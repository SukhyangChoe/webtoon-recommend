import type {
    FindRecommendationSession,
    RecommendationItemSnapshot,
    ReplacementHistoryItem,
    SessionExcludedItem,
  } from "@/lib/storage/findPrimarySessionStorage";
  import type {
    RecommendationDisplaySection,
    RecommendationFeedbackAction,
  } from "@/types/find";
  
  const MAIN_REPLACEMENT_LIMIT = 2;
  const EXPANSION_REPLACEMENT_LIMIT = 1;
  
  export type ReplaceRecommendationItemParams = {
    session: FindRecommendationSession;
    section: RecommendationDisplaySection;
    slot: number;
    excludedWebtoonId: string;
    reason: RecommendationFeedbackAction;
  };
  
  export type ReplaceRecommendationItemStatus =
    | "replaced"
    | "replacement_limit_reached"
    | "reserve_pool_empty";
  
  export type ReplaceRecommendationItemResult = {
    updatedSession: FindRecommendationSession;
    replacementItem: RecommendationItemSnapshot | null;
    status: ReplaceRecommendationItemStatus;
  };
  
  function getReplacementLimit(section: RecommendationDisplaySection) {
    return section === "main_display"
      ? MAIN_REPLACEMENT_LIMIT
      : EXPANSION_REPLACEMENT_LIMIT;
  }
  
  function getSessionExclusionReason(reason: RecommendationFeedbackAction) {
    return reason === "already_read" ? "already_seen" : "session_excluded";
  }
  
  function mergeSessionExcludedItem(params: {
    excludedItems: SessionExcludedItem[];
    excludedWebtoonId: string;
    reason: RecommendationFeedbackAction;
    createdAt: string;
  }) {
    const {
      excludedItems,
      excludedWebtoonId,
      reason,
      createdAt,
    } = params;
    const nextItem: SessionExcludedItem = {
      canonicalWebtoonId: excludedWebtoonId,
      reason: getSessionExclusionReason(reason),
      feedbackAction: reason,
      excludedAt: createdAt,
    };
    const retainedItems = excludedItems.filter(
      (item) =>
        !(
          item.canonicalWebtoonId === excludedWebtoonId &&
          item.reason === nextItem.reason
        )
    );
  
    return [...retainedItems, nextItem];
  }
  
  function getBlockedWebtoonIds(params: {
    session: FindRecommendationSession;
    excludedItems: SessionExcludedItem[];
    excludedWebtoonId: string;
  }) {
    const { session, excludedItems, excludedWebtoonId } = params;
    const blockedIds = new Set<string>();
  
    session.displayedItems.forEach((item) => {
      if (item.canonicalWebtoonId !== excludedWebtoonId) {
        blockedIds.add(item.canonicalWebtoonId);
      }
    });
    excludedItems.forEach((item) => {
      blockedIds.add(item.canonicalWebtoonId);
    });
    session.replacementHistory.forEach((item) => {
      if (item.replacementWebtoonId) {
        blockedIds.add(item.replacementWebtoonId);
      }
    });
    session.selectedWebtoonIds.forEach((canonicalWebtoonId) => {
      blockedIds.add(canonicalWebtoonId);
    });
    Object.values(session.actionStateByWebtoonId).forEach((actionState) => {
      if (actionState.feedbackAction) {
        blockedIds.add(actionState.canonicalWebtoonId);
      }
    });
  
    blockedIds.add(excludedWebtoonId);
    return blockedIds;
  }
  
  function takeNextReserveItem(params: {
    reserveItems: RecommendationItemSnapshot[];
    blockedIds: Set<string>;
  }) {
    const { reserveItems, blockedIds } = params;
    const seenIds = new Set<string>();
    let replacementItem: RecommendationItemSnapshot | null = null;
  
    for (const item of reserveItems) {
      const canonicalWebtoonId = item.canonicalWebtoonId;
  
      if (seenIds.has(canonicalWebtoonId)) continue;
      seenIds.add(canonicalWebtoonId);
  
      if (blockedIds.has(canonicalWebtoonId)) continue;
  
      replacementItem = item;
      break;
    }
  
    if (!replacementItem) {
      return {
        replacementItem: null,
        remainingReserveItems: [],
      };
    }
  
    const replacementWebtoonId = replacementItem.canonicalWebtoonId;
    const remainingSeenIds = new Set<string>();
    const remainingReserveItems = reserveItems.filter((item) => {
      const canonicalWebtoonId = item.canonicalWebtoonId;
  
      if (
        canonicalWebtoonId === replacementWebtoonId ||
        blockedIds.has(canonicalWebtoonId) ||
        remainingSeenIds.has(canonicalWebtoonId)
      ) {
        return false;
      }
  
      remainingSeenIds.add(canonicalWebtoonId);
      return true;
    });
  
    return {
      replacementItem,
      remainingReserveItems,
    };
  }
  
  function createReplacementHistoryItem(params: {
    section: RecommendationDisplaySection;
    slot: number;
    excludedWebtoonId: string;
    replacementWebtoonId: string | null;
    reason: RecommendationFeedbackAction;
    replacementNumber: number;
    createdAt: string;
  }): ReplacementHistoryItem {
    return params;
  }
  
  export function replaceRecommendationItem(
    params: ReplaceRecommendationItemParams
  ): ReplaceRecommendationItemResult {
    const {
      session,
      section,
      slot,
      excludedWebtoonId,
      reason,
    } = params;
    const createdAt = new Date().toISOString();
    const displaySlot = session.displaySlots.find(
      (item) => item.section === section && item.slot === slot
    );
    const currentItem = session.displayedItems.find(
      (item) =>
        item.section === section &&
        item.slot === slot &&
        item.canonicalWebtoonId === excludedWebtoonId
    );
    const replacementCount = Math.max(
      displaySlot?.replacementCount ?? currentItem?.replacementCount ?? 0,
      0
    );
    const nextActionStateByWebtoonId = {
      ...session.actionStateByWebtoonId,
      [excludedWebtoonId]: {
        ...(session.actionStateByWebtoonId[excludedWebtoonId] ?? {
          canonicalWebtoonId: excludedWebtoonId,
          isSaved: false,
        }),
        feedbackAction: reason,
        feedbackCreatedAt: createdAt,
      },
    };
    const nextExcludedItems = mergeSessionExcludedItem({
      excludedItems: session.excludedItems,
      excludedWebtoonId,
      reason,
      createdAt,
    });
    const displayedItemsWithoutExcluded = session.displayedItems.filter(
      (item) =>
        !(
          item.section === section &&
          item.slot === slot &&
          item.canonicalWebtoonId === excludedWebtoonId
        )
    );
    const replacementLimit = getReplacementLimit(section);
    const hasReachedLimit = replacementCount >= replacementLimit;
    const reserveItems =
      section === "main_display"
        ? session.mainReserveItems
        : session.expandReserveItems;
    const blockedIds = getBlockedWebtoonIds({
      session,
      excludedItems: nextExcludedItems,
      excludedWebtoonId,
    });
    const reserveResult = hasReachedLimit
      ? {
          replacementItem: null,
          remainingReserveItems: reserveItems,
        }
      : takeNextReserveItem({
          reserveItems,
          blockedIds,
        });
    const nextReplacementCount = reserveResult.replacementItem
      ? replacementCount + 1
      : replacementCount;
    const replacementItem = reserveResult.replacementItem
      ? {
          ...reserveResult.replacementItem,
          section,
          slot,
          reservePoolType: undefined,
          status: "active" as const,
          replacementCount: nextReplacementCount,
        }
      : null;
    const nextDisplayedItems = replacementItem
      ? [...displayedItemsWithoutExcluded, replacementItem].sort(
          (a, b) => a.slot - b.slot
        )
      : displayedItemsWithoutExcluded;
    const nextDisplaySlots = session.displaySlots.map((item) => {
      if (item.section !== section || item.slot !== slot) return item;
  
      return {
        ...item,
        currentWebtoonId: replacementItem?.canonicalWebtoonId ?? null,
        replacementCount: nextReplacementCount,
      };
    });
    const replacementHistoryItem = createReplacementHistoryItem({
      section,
      slot,
      excludedWebtoonId,
      replacementWebtoonId: replacementItem?.canonicalWebtoonId ?? null,
      reason,
      replacementNumber: replacementCount + 1,
      createdAt,
    });
    const updatedSession: FindRecommendationSession = {
      ...session,
      displayedItems: nextDisplayedItems,
      displaySlots: nextDisplaySlots,
      mainReserveItems:
        section === "main_display"
          ? reserveResult.remainingReserveItems
          : session.mainReserveItems,
      expandReserveItems:
        section === "expansion_display"
          ? reserveResult.remainingReserveItems
          : session.expandReserveItems,
      excludedItems: nextExcludedItems,
      replacementHistory: [
        ...session.replacementHistory,
        replacementHistoryItem,
      ],
      actionStateByWebtoonId: nextActionStateByWebtoonId,
      updatedAt: createdAt,
    };
  
    return {
      updatedSession,
      replacementItem,
      status: replacementItem
        ? "replaced"
        : hasReachedLimit
          ? "replacement_limit_reached"
          : "reserve_pool_empty",
    };
  }