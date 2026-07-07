"use client";

import { useState } from "react";

import { RecommendationCard } from "./RecommendationCard";
import { RecommendationMoreSection } from "./RecommendationMoreSection";
import { SelectedSourceWorks } from "./SelectedSourceWorks";

import type { SimilarWorkSelectionResult } from "@/lib/recommendation/similarWorkRecommendation";
import type {
  RecommendationFeedbackAction,
  RecommendationItemActionState,
  RecommendationItemActionStateMap,
} from "@/types/find";

export function FindRecommendationResult({
  selectionResult,
}: {
  selectionResult: SimilarWorkSelectionResult;
}) {
  const [actionStates, setActionStates] =
    useState<RecommendationItemActionStateMap>({});

  const topRecommendations = selectionResult.recommendations.slice(0, 5);
  const moreRecommendations = selectionResult.recommendations.slice(5, 10);

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

  function handleToggleSaved(canonicalWebtoonId: string) {
    setActionStates((currentActionStates) => {
      const currentState =
        currentActionStates[canonicalWebtoonId] ?? {
          canonicalWebtoonId,
          isSaved: false,
        };

      return {
        ...currentActionStates,
        [canonicalWebtoonId]: {
          ...currentState,
          isSaved: !currentState.isSaved,
        },
      };
    });
  }

  function handleSetFeedbackAction(
    canonicalWebtoonId: string,
    feedbackAction: RecommendationFeedbackAction
  ) {
    setActionStates((currentActionStates) => {
      const currentState =
        currentActionStates[canonicalWebtoonId] ?? {
          canonicalWebtoonId,
          isSaved: false,
        };

      return {
        ...currentActionStates,
        [canonicalWebtoonId]: {
          ...currentState,
          feedbackAction,
          feedbackCreatedAt: new Date().toISOString(),
        },
      };
    });
  }

  return (
    <section
      style={{
        borderRadius: 24,
        border: "1px solid #bbf7d0",
        background: "#f0fdf4",
        padding: 20,
        color: "#166534",
        display: "grid",
        gap: 20,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            color: "#14532d",
            fontSize: 24,
            lineHeight: 1.35,
            letterSpacing: "-0.03em",
          }}
        >
          선택한 작품과 비슷한 후보를 골라봤어요.
        </h2>

        <p
          style={{
            margin: "8px 0 0",
            color: "#166534",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          선택한 작품의 장르, 세부 취향, 태그를 기준으로 임시 추천 후보를
          정리했어요. D+26에서는 추천 카드 액션 상태를 현재 세션에서만
          반영합니다.
        </p>
      </div>

      <SelectedSourceWorks selectedWebtoons={selectionResult.selectedWebtoons} />

      <section
        style={{
          display: "grid",
          gap: 12,
        }}
        aria-label="추천 후보 TOP 1~5"
      >
        <h3
          style={{
            margin: 0,
            color: "#14532d",
            fontSize: 17,
            letterSpacing: "-0.02em",
          }}
        >
          추천 후보 TOP 1~5
        </h3>

        {topRecommendations.length > 0 ? (
          topRecommendations.map((recommendation) => {
            const canonicalWebtoonId =
              recommendation.candidate.canonicalWebtoonId;

            return (
              <RecommendationCard
                key={canonicalWebtoonId}
                recommendation={recommendation}
                actionState={getBaseActionState(canonicalWebtoonId)}
                onToggleSaved={handleToggleSaved}
                onSetFeedbackAction={handleSetFeedbackAction}
              />
            );
          })
        ) : (
          <div
            style={{
              borderRadius: 18,
              border: "1px dashed #86efac",
              background: "#ffffff",
              padding: 18,
              color: "#166534",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            추천 후보가 없어요. seed의 officialUrl, urlStatus, inputStatus를
            확인해야 합니다.
          </div>
        )}
      </section>

      <RecommendationMoreSection
        recommendations={moreRecommendations}
        actionStates={actionStates}
        onToggleSaved={handleToggleSaved}
        onSetFeedbackAction={handleSetFeedbackAction}
      />

      {process.env.NODE_ENV === "development" ? (
        <details>
          <summary
            style={{
              cursor: "pointer",
              color: "#14532d",
              fontWeight: 900,
            }}
          >
            개발 확인용 userSimilarWorkProfile / TOP10 / actionStates
          </summary>

          <pre
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 14,
              background: "#052e16",
              color: "#dcfce7",
              overflowX: "auto",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {JSON.stringify(
              {
                selectionResult,
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