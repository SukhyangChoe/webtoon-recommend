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

function getReplacementNotice(params: {
  status:
    | "replaced"
    | "replacement_limit_reached"
    | "reserve_pool_empty";
  section: RecommendationDisplaySection;
  slot: number;
}) {
  const { status, section, slot } = params;
  const slotLabel =
    section === "main_display"
      ? `TOP ${slot}`
      : `확장 추천 ${slot - 5}`;

  if (status === "replaced") {
    return `${slotLabel}에 다음 예비 추천을 넣었어요.`;
  }

  return `${slotLabel}의 예비 추천을 모두 보여드렸어요.`;
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

  const isDetailTestRecommendation =
    currentSelectionResult.vectorSource === "detail_test_result";
  const isProfileRecommendation =
    currentSelectionResult.vectorSource === "user_taste_profile";
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
    setReplacementNotice(
      getReplacementNotice({
        status: replacementResult.status,
        section: params.section,
        slot: params.slot,
      })
    );
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
    recommendation: SimilarWorkRecommendation | null;
  }) {
    const { slot, recommendation } = params;

    if (!recommendation) {
      return (
        <RecommendationSlotComplete
          key={`main-slot-${slot}`}
          slotLabel={`TOP ${slot}`}
        />
      );
    }

    const canonicalWebtoonId =
      recommendation.candidate.canonicalWebtoonId;

    return (
      <RecommendationCard
        key={`main-slot-${slot}-${canonicalWebtoonId}`}
        recommendation={recommendation}
        rankLabel={`TOP ${slot}`}
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
    <section
      style={{
        marginTop: 34,
        display: "grid",
        gap: 22,
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 10,
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#4f46e5",
            fontSize: 14,
            fontWeight: 900,
          }}
        >
          {isDetailTestRecommendation
            ? "Detail · detail_test_result"
            : isProfileRecommendation
              ? "Secondary · instant_recommendation"
              : "Primary · similar_work"}
        </p>

        <h2
          style={{
            margin: 0,
            color: "#0f172a",
            fontSize: "clamp(26px, 5vw, 38px)",
            lineHeight: 1.18,
            letterSpacing: "-0.04em",
          }}
        >
          {isDetailTestRecommendation
            ? "방금 확인한 세부취향으로 지금 보기 좋은 후보를 골라봤어요."
            : isProfileRecommendation
              ? "저장된 취향으로 지금 보기 좋은 후보를 골라봤어요."
              : "선택한 작품과 비슷한 후보를 골라봤어요."}
        </h2>

        <p
          style={{
            margin: 0,
            color: "#475569",
            fontSize: 16,
            lineHeight: 1.7,
          }}
        >
          {isDetailTestRecommendation
            ? "방금 완료한 해당 장르 세부취향 결과만 사용했어요. 누적 userTasteProfile이나 다른 테스트 결과는 섞지 않았습니다."
            : isProfileRecommendation
              ? "추천 시작 당시의 userTasteProfile snapshot만 사용했어요. 추가 질문이나 7:3 혼합 없이 취향 점수를 계산했습니다."
              : "먼저 선택한 작품의 취향 결로 후보를 만들고, 저장된 테스트 결과가 있으면 상위 후보 안에서만 8:2로 다시 정렬했어요."}
        </p>
      </div>

      {replacementNotice ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            borderRadius: 14,
            background: "#eef2ff",
            color: "#4338ca",
            padding: "12px 14px",
            fontSize: 14,
            fontWeight: 800,
            lineHeight: 1.55,
          }}
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

      <div
        style={{
          display: "grid",
          gap: 14,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 22,
              lineHeight: 1.35,
              letterSpacing: "-0.03em",
            }}
          >
            {isInstantRecommendation ? "취향 맞춤" : "핵심 추천"}
          </h3>

          <p
            style={{
              margin: "6px 0 0",
              color: "#64748b",
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            {isDetailTestRecommendation
              ? "방금 확인한 세부취향과 가장 안정적으로 맞는 후보 5개예요."
              : isProfileRecommendation
                ? "현재 누적 취향과 가장 안정적으로 맞는 후보 5개예요."
                : "선택한 작품과 가장 안정적으로 맞는 후보 5개예요."}
          </p>
        </div>

        {mainDisplayItems.map((item) =>
          renderMainRecommendation({
            slot: item.slot,
            recommendation: item.recommendation,
          })
        )}
      </div>

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
        <details
          style={{
            borderRadius: 18,
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#166534",
            padding: 16,
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 900,
            }}
          >
            개발 확인용 v2.1.2 scoring pipeline / replacement / session
            snapshot
          </summary>

          <pre
            style={{
              margin: "14px 0 0",
              maxHeight: 460,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 12,
              lineHeight: 1.55,
            }}
          >
            {JSON.stringify(
              {
                scoreVersion: currentSelectionResult.scoreVersion,
                recommendationMode:
                  currentSelectionResult.recommendationMode,
                vectorSource: currentSelectionResult.vectorSource,
                sourceTestKey: currentSelectionResult.sourceTestKey,
                hasLongTermProfile:
                  currentSelectionResult.hasLongTermProfile,
                blendingWeights: currentSelectionResult.blendingWeights,
                activeRecommendationVector:
                  currentSelectionResult.activeRecommendationVector,
                profileSnapshot: currentSelectionResult.profileSnapshot,
                candidatePoolSize:
                  currentSelectionResult.candidatePoolSize,
                candidatePoolIds: currentSelectionResult.candidatePoolIds,
                hardFilterExcludedItems:
                  currentSelectionResult.hardFilterExcludedItems,
                mainDisplayItems:
                  currentSelectionResult.mainDisplayItems,
                mainReservePool:
                  currentSelectionResult.mainReservePool,
                expansionCandidatePool:
                  currentSelectionResult.expansionCandidatePool,
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