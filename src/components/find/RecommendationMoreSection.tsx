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
    <section
      style={{
        display: "grid",
        gap: 14,
      }}
    >
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            width: "100%",
            minHeight: 54,
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
          추천 웹툰 더보기
        </button>
      ) : null}

      {isOpen ? (
        <>
          <div
            style={{
              display: "grid",
              gap: 6,
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "#0f172a",
                fontSize: 22,
                lineHeight: 1.35,
                letterSpacing: "-0.03em",
              }}
            >
              이런 작품도 잘 맞을 수 있어요
            </h3>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: 15,
                lineHeight: 1.6,
              }}
            >
              취향은 이어가되, 조금 다른 방향까지 넓혀봤어요.
            </p>
          </div>

          {items.map((item) => {
            const recommendation = item.recommendation;
            const displayNumber = item.slot - 5;

            if (!recommendation) {
              return (
                <RecommendationSlotComplete
                  key={`expansion-slot-${item.slot}`}
                  slotLabel={`확장 추천 ${displayNumber}`}
                />
              );
            }

            const canonicalWebtoonId =
              recommendation.candidate.canonicalWebtoonId;

            return (
              <RecommendationCard
                key={`expansion-slot-${item.slot}-${canonicalWebtoonId}`}
                recommendation={recommendation}
                rankLabel={`확장 추천 ${displayNumber}`}
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
        </>
      ) : null}
    </section>
  );
}