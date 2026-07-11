"use client";

import { useState } from "react";

import { RecommendationCard } from "./RecommendationCard";
import { RecommendationMoreSection } from "./RecommendationMoreSection";
import { SelectedSourceWorks } from "./SelectedSourceWorks";

import { updateFindPrimarySessionActionStates } from "@/lib/storage/findPrimarySessionStorage";

import type { FindPrimarySession } from "@/lib/storage/findPrimarySessionStorage";
import type { SimilarWorkSelectionResult } from "@/lib/recommendation/similarWorkRecommendation";
import type {
  RecommendationFeedbackAction,
  RecommendationItemActionState,
  RecommendationItemActionStateMap,
} from "@/types/find";

export function FindRecommendationResult({
  selectionResult,
  initialActionStates = {},
  restoredSession,
}: {
  selectionResult: SimilarWorkSelectionResult;
  initialActionStates?: RecommendationItemActionStateMap;
  restoredSession?: FindPrimarySession | null;
}) {
  const [actionStates, setActionStates] =
    useState<RecommendationItemActionStateMap>(initialActionStates);

  const mainDisplayItems =
    selectionResult.mainDisplayItems ?? selectionResult.recommendations.slice(0, 5);
  const expansionDisplayItems =
    selectionResult.expansionDisplayItems ??
    selectionResult.recommendations.slice(5, 10);

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

  function persistActionStates(nextActionStates: RecommendationItemActionStateMap) {
    updateFindPrimarySessionActionStates(nextActionStates);
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

  function handleSetFeedbackAction(
    canonicalWebtoonId: string,
    feedbackAction: RecommendationFeedbackAction
  ) {
    setActionStates((currentActionStates) => {
      const currentState = currentActionStates[canonicalWebtoonId] ?? {
        canonicalWebtoonId,
        isSaved: false,
      };
      const nextActionStates = {
        ...currentActionStates,
        [canonicalWebtoonId]: {
          ...currentState,
          feedbackAction,
          feedbackCreatedAt: new Date().toISOString(),
        },
      };

      persistActionStates(nextActionStates);

      return nextActionStates;
    });
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
          Primary · similar_work
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
          선택한 작품과 비슷한 후보를 골라봤어요.
        </h2>

        <p
          style={{
            margin: 0,
            color: "#475569",
            fontSize: 16,
            lineHeight: 1.7,
          }}
        >
          먼저 선택한 작품의 취향 결로 후보를 만들고, 저장된 테스트 결과가 있으면
          상위 후보 안에서만 8:2로 다시 정렬했어요.
        </p>
      </div>

      <SelectedSourceWorks selectedWebtoons={selectionResult.selectedWebtoons} />

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
            핵심 추천
          </h3>

          <p
            style={{
              margin: "6px 0 0",
              color: "#64748b",
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            선택한 작품과 가장 안정적으로 맞는 후보 5개예요.
          </p>
        </div>

        {mainDisplayItems.length > 0 ? (
          mainDisplayItems.map((recommendation) => {
            const canonicalWebtoonId =
              recommendation.candidate.canonicalWebtoonId;

            return (
              <RecommendationCard
                key={canonicalWebtoonId}
                recommendation={recommendation}
                actionState={getBaseActionState(canonicalWebtoonId)}
                onToggleSaved={handleToggleSaved}
                onSetFeedbackAction={handleSetFeedbackAction}
                onMarkOfficialOpened={handleMarkOfficialOpened}
              />
            );
          })
        ) : (
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: 15,
              lineHeight: 1.7,
            }}
          >
            추천 후보가 없어요. seed의 officialUrl, urlStatus, inputStatus를
            확인해야 합니다.
          </p>
        )}
      </div>

      <RecommendationMoreSection
        recommendations={expansionDisplayItems}
        actionStates={actionStates}
        onToggleSaved={handleToggleSaved}
        onSetFeedbackAction={handleSetFeedbackAction}
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
            개발 확인용 v2.1.1 scoring pipeline / session snapshot / actionStates
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
                scoreVersion: selectionResult.scoreVersion,
                recommendationMode:
                  selectionResult.recommendationMode,
                vectorSource: selectionResult.vectorSource,
                hasLongTermProfile:
                  selectionResult.hasLongTermProfile,
                blendingWeights: selectionResult.blendingWeights,
                activeRecommendationVector:
                  selectionResult.activeRecommendationVector,
                profileSnapshot: selectionResult.profileSnapshot,
                candidatePoolSize: selectionResult.candidatePoolSize,
                candidatePoolIds: selectionResult.candidatePoolIds,
                hardFilterExcludedItems:
                  selectionResult.hardFilterExcludedItems,
                mainDisplayItems: selectionResult.mainDisplayItems,
                mainReservePool: selectionResult.mainReservePool,
                expansionCandidatePool:
                  selectionResult.expansionCandidatePool,
                expansionDisplayItems:
                  selectionResult.expansionDisplayItems,
                expandReservePool:
                  selectionResult.expandReservePool,
                restoredSession,
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