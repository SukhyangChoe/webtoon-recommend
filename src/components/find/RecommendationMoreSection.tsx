"use client";

import { useState } from "react";

import { RecommendationCard } from "./RecommendationCard";

import type { SimilarWorkRecommendation } from "@/lib/recommendation/similarWorkRecommendation";
import type {
  RecommendationFeedbackAction,
  RecommendationItemActionState,
  RecommendationItemActionStateMap,
} from "@/types/find";

export function RecommendationMoreSection({
  recommendations,
  actionStates,
  onToggleSaved,
  onSetFeedbackAction,
}: {
  recommendations: SimilarWorkRecommendation[];
  actionStates: RecommendationItemActionStateMap;
  onToggleSaved: (canonicalWebtoonId: string) => void;
  onSetFeedbackAction: (
    canonicalWebtoonId: string,
    feedbackAction: RecommendationFeedbackAction
  ) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (recommendations.length === 0) {
    return null;
  }

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

  return (
    <section
      style={{
        display: "grid",
        gap: 12,
      }}
      aria-label="추천 후보 더보기"
    >
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            width: "100%",
            minHeight: 50,
            borderRadius: 16,
            border: "1px solid #c7d2fe",
            background: "#ffffff",
            color: "#4338ca",
            padding: "13px 16px",
            fontSize: 15,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          추천작 더보기
        </button>
      ) : null}

      {isOpen ? (
        <>
          <h3
            style={{
              margin: "4px 0 0",
              color: "#14532d",
              fontSize: 17,
              letterSpacing: "-0.02em",
            }}
          >
            다른 후보 TOP 6~10
          </h3>

          {recommendations.map((recommendation) => {
            const canonicalWebtoonId =
              recommendation.candidate.canonicalWebtoonId;

            return (
              <RecommendationCard
                key={canonicalWebtoonId}
                recommendation={recommendation}
                actionState={getBaseActionState(canonicalWebtoonId)}
                onToggleSaved={onToggleSaved}
                onSetFeedbackAction={onSetFeedbackAction}
              />
            );
          })}
        </>
      ) : null}
    </section>
  );
}