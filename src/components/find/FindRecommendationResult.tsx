"use client";

import { useMemo, useState } from "react";

import { RecommendationCard } from "./RecommendationCard";
import { RecommendationMoreSection } from "./RecommendationMoreSection";
import { RecommendationSlotComplete } from "./RecommendationSlotComplete";
import { SelectedSourceWorks } from "./SelectedSourceWorks";

import { replaceRecommendationItem } from "@/lib/recommendation/replaceRecommendationItem";
import {
  restoreRecommendationSelectionResultFromSession,
  saveFindPrimarySession,
  updateFindRecommendationSessionActionStates,
} from "@/lib/storage/findPrimarySessionStorage";

import type {
  FindRecommendationSelectionResult,
  SimilarWorkRecommendation,
} from "@/lib/recommendation/similarWorkRecommendation";
import type { FindRecommendationSession } from "@/lib/storage/findPrimarySessionStorage";
import type {
  RecommendationDisplaySection,
  RecommendationDisplaySlot,
  RecommendationFeedbackAction,
  RecommendationItemActionState,
  RecommendationItemActionStateMap,
} from "@/types/find";

function createFallbackDisplaySlots(
  selectionResult: FindRecommendationSelectionResult
): RecommendationDisplaySlot[] {
  const mainSlots = Array.from({ length: 5 }, (_, index) => ({
    section: "main_display" as const,
    slot: index + 1,
    currentWebtoonId:
      selectionResult.mainDisplayItems[index]?.candidate
        .canonicalWebtoonId ?? null,
    replacementCount: 0,
  }));
  const expansionSlots = Array.from({ length: 5 }, (_, index) => ({
    section: "expansion_display" as const,
    slot: index + 6,
    currentWebtoonId:
      selectionResult.expansionDisplayItems[index]?.candidate
        .canonicalWebtoonId ?? null,
    replacementCount: 0,
  }));

  return [...mainSlots, ...expansionSlots];
}

function getReplacementNotice(status:
  | "replaced"
  | "replacement_limit_reached"
  | "reserve_pool_empty"
) {
  if (status === "replaced") {
    return "같은 자리에 새로운 추천을 넣었어요.";
  }

  return "이 자리의 예비 추천을 모두 보여드렸어요.";
}

function getResultDescription(
  selectionResult: FindRecommendationSelectionResult
) {
  if (selectionResult.vectorSource === "detail_test_result") {
    return "방금 확인한 세부 취향을 기준으로 골랐어요.";
  }

  if (selectionResult.vectorSource === "user_taste_profile") {
    return "지금까지 저장된 취향을 기준으로 골랐어요.";
  }

  return "재밌게 본 작품의 분위기와 닮은 결을 중심으로 골랐어요.";
}

export function FindRecommendationResult({
  selectionResult,
  initialActionStates = {},
  restoredSession,
}: {
  selectionResult: FindRecommendationSelectionResult;
  initialActionStates?: RecommendationItemActionStateMap;
  restoredSession?: FindRecommendationSession | null;
}) {
  const [currentSession, setCurrentSession] =
    useState<FindRecommendationSession | null>(restoredSession ?? null);
  const [currentSelectionResult, setCurrentSelectionResult] =
    useState<FindRecommendationSelectionResult>(selectionResult);
  const [actionStates, setActionStates] =
    useState<RecommendationItemActionStateMap>(initialActionStates);
  const [replacementNotice, setReplacementNotice] = useState<string | null>(
    null
  );

  const recommendationById = useMemo(() => {
    const recommendations = [
      ...currentSelectionResult.mainDisplayItems,
      ...currentSelectionResult.expansionDisplayItems,
    ];

    return new Map(
      recommendations.map((recommendation) => [
        recommendation.candidate.canonicalWebtoonId,
        recommendation,
      ])
    );
  }, [currentSelectionResult]);

  const displaySlots = useMemo(() => {
    return (
      currentSession?.displaySlots ??
      createFallbackDisplaySlots(currentSelectionResult)
    );
  }, [currentSelectionResult, currentSession]);

  const mainDisplayItems = useMemo(() => {
    return displaySlots
      .filter((slot) => slot.section === "main_display")
      .sort((a, b) => a.slot - b.slot)
      .map((slot) => ({
        ...slot,
        recommendation: slot.currentWebtoonId
          ? recommendationById.get(slot.currentWebtoonId) ?? null
          : null,
      }));
  }, [displaySlots, recommendationById]);

  const expansionDisplayItems = useMemo(() => {
    return displaySlots
      .filter((slot) => slot.section === "expansion_display")
      .sort((a, b) => a.slot - b.slot)
      .map((slot) => ({
        ...slot,
        recommendation: slot.currentWebtoonId
          ? recommendationById.get(slot.currentWebtoonId) ?? null
          : null,
      }));
  }, [displaySlots, recommendationById]);

  const isInstantRecommendation =
    currentSelectionResult.recommendationMode ===
    "instant_recommendation";

  function getBaseActionState(
    canonicalWebtoonId: string
  ): RecommendationItemActionState {
    return (
      actionStates[canonicalWebtoonId] ?? {
        canonicalWebtoonId,
        isSaved: false,
      }
    );
  }

  function persistActionStates(
    nextActionStates: RecommendationItemActionStateMap
  ) {
    const updatedSession =
      updateFindRecommendationSessionActionStates(nextActionStates);

    if (updatedSession) {
      setCurrentSession(updatedSession);
    }
  }

  function handleToggleSaved(canonicalWebtoonId: string) {
    setActionStates((currentActionStates) => {
      const currentState = currentActionStates[canonicalWebtoonId] ?? {
        canonicalWebtoonId,
        isSaved: false,
      };
      const nextActionStates = {
        ...currentActionStates,
        [canonicalWebtoonId]: {
          ...currentState,
          isSaved: !currentState.isSaved,
        },
      };

      persistActionStates(nextActionStates);

      return nextActionStates;
    });
  }

  function handleSetFeedbackAction(params: {
    section: RecommendationDisplaySection;
    slot: number;
    canonicalWebtoonId: string;
    feedbackAction: RecommendationFeedbackAction;
  }) {
    if (!currentSession) return;

    const replacementResult = replaceRecommendationItem({
      session: currentSession,
      section: params.section,
      slot: params.slot,
      excludedWebtoonId: params.canonicalWebtoonId,
      reason: params.feedbackAction,
    });

    saveFindPrimarySession(replacementResult.updatedSession);
    setCurrentSession(replacementResult.updatedSession);
    setActionStates(
      replacementResult.updatedSession.actionStateByWebtoonId
    );
    setCurrentSelectionResult(
      restoreRecommendationSelectionResultFromSession(
        replacementResult.updatedSession
      )
    );
    setReplacementNotice(getReplacementNotice(replacementResult.status));
  }

  function handleMarkOfficialOpened(canonicalWebtoonId: string) {
    setActionStates((currentActionStates) => {
      const currentState = currentActionStates[canonicalWebtoonId] ?? {
        canonicalWebtoonId,
        isSaved: false,
      };
      const nextActionStates = {
        ...currentActionStates,
        [canonicalWebtoonId]: {
          ...currentState,
          openedOfficialAt: new Date().toISOString(),
        },
      };

      persistActionStates(nextActionStates);

      return nextActionStates;
    });
  }

  function renderMainRecommendation(params: {
    slot: number;
    replacementCount: number;
    recommendation: SimilarWorkRecommendation | null;
  }) {
    const { slot, replacementCount, recommendation } = params;

    if (!recommendation) {
      return <RecommendationSlotComplete key={`main-slot-${slot}`} />;
    }

    const canonicalWebtoonId =
      recommendation.candidate.canonicalWebtoonId;

    return (
      <RecommendationCard
        key={`main-slot-${slot}-${canonicalWebtoonId}`}
        recommendation={recommendation}
        isReplacement={replacementCount > 0}
        actionState={getBaseActionState(canonicalWebtoonId)}
        onToggleSaved={handleToggleSaved}
        onSetFeedbackAction={(webtoonId, feedbackAction) => {
          handleSetFeedbackAction({
            section: "main_display",
            slot,
            canonicalWebtoonId: webtoonId,
            feedbackAction,
          });
        }}
        onMarkOfficialOpened={handleMarkOfficialOpened}
      />
    );
  }

  return (
    <section className="find-recommendation-result">
      <header className="find-recommendation-result__hero">
        <p className="find-recommendation-result__eyebrow">
          지금 보기 좋은 추천
        </p>
        <h1>오늘은 이런 웹툰이 잘 맞을 것 같아요.</h1>
        <p>{getResultDescription(currentSelectionResult)}</p>
      </header>

      {replacementNotice ? (
        <div
          className="find-recommendation-result__notice"
          role="status"
          aria-live="polite"
        >
          {replacementNotice}
        </div>
      ) : null}

      {!isInstantRecommendation &&
      currentSelectionResult.selectedWebtoons.length > 0 ? (
        <SelectedSourceWorks
          selectedWebtoons={currentSelectionResult.selectedWebtoons}
        />
      ) : null}

      <section className="recommendation-main-section">
        <div className="recommendation-section-heading">
          <div>
            <p className="recommendation-section-heading__eyebrow">
              오늘의 추천
            </p>
            <h2>취향에 잘 맞는 웹툰</h2>
            <p>지금 시작하기 좋은 작품부터 차례로 골라봤어요.</p>
          </div>
        </div>

        <div className="recommendation-list">
          {mainDisplayItems.map((item) =>
            renderMainRecommendation({
              slot: item.slot,
              replacementCount: item.replacementCount,
              recommendation: item.recommendation,
            })
          )}
        </div>
      </section>

      <RecommendationMoreSection
        items={expansionDisplayItems}
        actionStates={actionStates}
        onToggleSaved={handleToggleSaved}
        onSetFeedbackAction={(slot, webtoonId, feedbackAction) => {
          handleSetFeedbackAction({
            section: "expansion_display",
            slot,
            canonicalWebtoonId: webtoonId,
            feedbackAction,
          });
        }}
        onMarkOfficialOpened={handleMarkOfficialOpened}
      />

      {process.env.NODE_ENV === "development" ? (
        <details className="recommendation-session-debug">
          <summary>개발 확인용 추천 세션</summary>
          <pre>
            {JSON.stringify(
              {
                scoreVersion: currentSelectionResult.scoreVersion,
                recommendationMode:
                  currentSelectionResult.recommendationMode,
                vectorSource: currentSelectionResult.vectorSource,
                sourceTestKey: currentSelectionResult.sourceTestKey,
                activeRecommendationVector:
                  currentSelectionResult.activeRecommendationVector,
                profileSnapshot: currentSelectionResult.profileSnapshot,
                candidatePoolSize:
                  currentSelectionResult.candidatePoolSize,
                mainDisplayItems:
                  currentSelectionResult.mainDisplayItems,
                mainReservePool:
                  currentSelectionResult.mainReservePool,
                expansionDisplayItems:
                  currentSelectionResult.expansionDisplayItems,
                expandReservePool:
                  currentSelectionResult.expandReservePool,
                currentSession,
                actionStates,
              },
              null,
              2
            )}
          </pre>
        </details>
      ) : null}
    </section>
  );
}