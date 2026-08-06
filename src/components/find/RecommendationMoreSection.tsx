"use client";

import { useState } from "react";

import { RecommendationCard } from "./RecommendationCard";
import { RecommendationSlotComplete } from "./RecommendationSlotComplete";

import type { SimilarWorkRecommendation } from "@/lib/recommendation/similarWorkRecommendation";
import type {
  RecommendationFeedbackAction,
  RecommendationItemActionState,
  RecommendationItemActionStateMap,
} from "@/types/find";

type ExpansionDisplayItem = {
  slot: number;
  replacementCount: number;
  recommendation: SimilarWorkRecommendation | null;
};

export function RecommendationMoreSection({
  items,
  actionStates,
  onToggleSaved,
  onSetFeedbackAction,
  onMarkOfficialOpened,
}: {
  items: ExpansionDisplayItem[];
  actionStates: RecommendationItemActionStateMap;
  onToggleSaved: (canonicalWebtoonId: string) => void;
  onSetFeedbackAction: (
    slot: number,
    canonicalWebtoonId: string,
    feedbackAction: RecommendationFeedbackAction
  ) => void;
  onMarkOfficialOpened: (canonicalWebtoonId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) {
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
    <section className="recommendation-expansion">
      {!isOpen ? (
        <button
          type="button"
          className="recommendation-expansion__open"
          onClick={() => setIsOpen(true)}
        >
          <span>
            <strong>조금 다른 취향도 살펴볼까요?</strong>
            <small>취향을 넓혀볼 웹툰 5개가 더 있어요.</small>
          </span>
          <span aria-hidden="true">→</span>
        </button>
      ) : (
        <>
          <div className="recommendation-section-heading">
            <div>
              <p className="recommendation-section-heading__eyebrow">
                취향 확장
              </p>
              <h2>취향을 넓혀볼 웹툰</h2>
              <p>
                좋아하는 결은 이어가면서, 조금 다른 재미까지 골라봤어요.
              </p>
            </div>
            <button
              type="button"
              className="recommendation-expansion__close"
              onClick={() => setIsOpen(false)}
            >
              접기
            </button>
          </div>

          <div className="recommendation-list">
            {items.map((item) => {
              const recommendation = item.recommendation;

              if (!recommendation) {
                return (
                  <RecommendationSlotComplete
                    key={`expansion-slot-${item.slot}`}
                  />
                );
              }

              const canonicalWebtoonId =
                recommendation.candidate.canonicalWebtoonId;

              return (
                <RecommendationCard
                  key={`expansion-slot-${item.slot}-${canonicalWebtoonId}`}
                  recommendation={recommendation}
                  isReplacement={item.replacementCount > 0}
                  actionState={getBaseActionState(canonicalWebtoonId)}
                  onToggleSaved={onToggleSaved}
                  onSetFeedbackAction={(webtoonId, feedbackAction) => {
                    onSetFeedbackAction(
                      item.slot,
                      webtoonId,
                      feedbackAction
                    );
                  }}
                  onMarkOfficialOpened={onMarkOfficialOpened}
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}