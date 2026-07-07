"use client";

import { useState } from "react";

import { getTagLabels } from "@/data/tags/tagLabels";
import {
  getGenreLabel,
  getStatusLabel,
} from "@/lib/recommendation/similarWorkRecommendation";

import type { SimilarWorkRecommendation } from "@/lib/recommendation/similarWorkRecommendation";
import type {
  RecommendationFeedbackAction,
  RecommendationItemActionState,
} from "@/types/find";

function getFeedbackMessage(feedbackAction?: RecommendationFeedbackAction) {
  if (feedbackAction === "already_read") {
    return "이미 본 작품으로 표시했어요.";
  }

  if (feedbackAction === "not_my_taste") {
    return "이번 추천에서 제외했어요.";
  }

  return null;
}

function getFeedbackDescription(feedbackAction?: RecommendationFeedbackAction) {
  if (feedbackAction === "already_read") {
    return "취향이 맞을 수 있지만, 이번 추천 세션에서는 이미 본 작품으로만 표시합니다.";
  }

  if (feedbackAction === "not_my_taste") {
    return "작품 자체가 취향과 맞지 않는다는 신호로만 기록합니다. D+26에서는 재계산하지 않습니다.";
  }

  return null;
}

export function RecommendationCard({
  recommendation,
  actionState,
  onToggleSaved,
  onSetFeedbackAction,
}: {
  recommendation: SimilarWorkRecommendation;
  actionState: RecommendationItemActionState;
  onToggleSaved: (canonicalWebtoonId: string) => void;
  onSetFeedbackAction: (
    canonicalWebtoonId: string,
    feedbackAction: RecommendationFeedbackAction
  ) => void;
}) {
  const [isFeedbackMenuOpen, setIsFeedbackMenuOpen] = useState(false);

  const canonicalWebtoonId = recommendation.candidate.canonicalWebtoonId;
  const tagLabels = getTagLabels(recommendation.matchedTagKeys, 4);
  const feedbackMessage = getFeedbackMessage(actionState.feedbackAction);
  const feedbackDescription = getFeedbackDescription(actionState.feedbackAction);
  const isExcludedInSession = Boolean(actionState.feedbackAction);

  function handleFeedbackAction(feedbackAction: RecommendationFeedbackAction) {
    onSetFeedbackAction(canonicalWebtoonId, feedbackAction);
    setIsFeedbackMenuOpen(false);
  }

  return (
    <article
      style={{
        display: "grid",
        gap: 14,
        borderRadius: 22,
        border: isExcludedInSession
          ? "1px dashed #cbd5e1"
          : "1px solid #e2e8f0",
        background: isExcludedInSession ? "#f8fafc" : "#ffffff",
        padding: 18,
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
        opacity: isExcludedInSession ? 0.68 : 1,
      }}
    >
    <div
    style={{
        display: "grid",
        gap: 10,
    }}
    >
    <div
        style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
        }}
    >
        <p
        style={{
            margin: 0,
            color: "#4f46e5",
            fontSize: 13,
            fontWeight: 900,
        }}
        >
        TOP {recommendation.rank}
        </p>

        <button
        type="button"
        onClick={() => onToggleSaved(canonicalWebtoonId)}
        aria-pressed={actionState.isSaved}
        style={{
            minWidth: 118,
            minHeight: 38,
            borderRadius: 999,
            border: actionState.isSaved
            ? "1px solid #4f46e5"
            : "1px solid #c7d2fe",
            background: actionState.isSaved ? "#eef2ff" : "#ffffff",
            color: "#4338ca",
            padding: "8px 11px",
            fontSize: 13,
            fontWeight: 900,
            cursor: "pointer",
            whiteSpace: "nowrap",
        }}
        >
        <span aria-hidden="true">🔖</span>{" "}
        {actionState.isSaved ? "저장됨" : "저장해두기"}
        </button>
    </div>

    <div>
        <h3
        style={{
            margin: 0,
            color: "#0f172a",
            fontSize: 22,
            lineHeight: 1.35,
            letterSpacing: "-0.03em",
            wordBreak: "keep-all",
            overflowWrap: "break-word",
        }}
        >
        {recommendation.candidate.title}
        </h3>

        <p
        style={{
            margin: "6px 0 0",
            color: "#64748b",
            fontSize: 14,
            lineHeight: 1.6,
        }}
        >
        {recommendation.candidate.platform} ·{" "}
        {getGenreLabel(recommendation.candidate.mainGenre)} ·{" "}
        {getStatusLabel(recommendation.candidate.status)}
        </p>
    </div>
    </div>

      {feedbackMessage ? (
        <div
          style={{
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            padding: 12,
            color: "#475569",
            fontSize: 13,
            lineHeight: 1.65,
          }}
        >
          <strong style={{ color: "#0f172a" }}>{feedbackMessage}</strong>
          {feedbackDescription ? (
            <>
              <br />
              {feedbackDescription}
            </>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          width: "fit-content",
          borderRadius: 999,
          background: "#eef2ff",
          color: "#4338ca",
          padding: "7px 11px",
          fontSize: 13,
          fontWeight: 900,
        }}
      >
        임시 매칭 점수 {recommendation.matchScore}
      </div>

      <p
        style={{
          margin: 0,
          color: "#334155",
          fontSize: 15,
          lineHeight: 1.75,
        }}
      >
        {recommendation.candidate.recommendationReason}
      </p>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
        aria-label="매칭 포인트"
      >
        {tagLabels.length > 0 ? (
          tagLabels.map((tagLabel) => (
            <span
              key={tagLabel}
              style={{
                display: "inline-flex",
                borderRadius: 999,
                background: "#f1f5f9",
                color: "#334155",
                padding: "7px 10px",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              #{tagLabel}
            </span>
          ))
        ) : (
          <span
            style={{
              display: "inline-flex",
              borderRadius: 999,
              background: "#f1f5f9",
              color: "#334155",
              padding: "7px 10px",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            #취향 접점
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gap: 10,
        }}
      >
        <a
          href={recommendation.candidate.officialUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 46,
            borderRadius: 14,
            background: "#4f46e5",
            color: "#ffffff",
            padding: "12px 16px",
            fontSize: 15,
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          보러가기
        </a>

        <div
          style={{
            position: "relative",
            display: "grid",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setIsFeedbackMenuOpen((current) => !current)}
            aria-expanded={isFeedbackMenuOpen}
            style={{
              width: "100%",
              minHeight: 40,
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#475569",
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ⋯ 추천에서 제외
          </button>

          {isFeedbackMenuOpen ? (
            <div
              style={{
                display: "grid",
                gap: 8,
                borderRadius: 16,
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                padding: 10,
              }}
            >
              <button
                type="button"
                onClick={() => handleFeedbackAction("already_read")}
                style={{
                  minHeight: 40,
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#334155",
                  padding: "10px 12px",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                이미 봤어요
              </button>

              <button
                type="button"
                onClick={() => handleFeedbackAction("not_my_taste")}
                style={{
                  minHeight: 40,
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#334155",
                  padding: "10px 12px",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                내 취향 아님
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {process.env.NODE_ENV === "development" ? (
        <details>
          <summary
            style={{
              cursor: "pointer",
              color: "#166534",
              fontSize: 13,
              fontWeight: 900,
            }}
          >
            계산 상세 / 카드 action state
          </summary>

          <pre
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 12,
              background: "#052e16",
              color: "#dcfce7",
              overflowX: "auto",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {JSON.stringify(
              {
                actionState,
                finalRecommendationScore:
                  recommendation.finalRecommendationScore,
                genreMatch: recommendation.genreMatch,
                typeMatch: recommendation.typeMatch,
                tagMatch: recommendation.tagMatch,
                qualityBoost: recommendation.qualityBoost,
                avoidancePenalty: recommendation.avoidancePenalty,
                matchedTagKeys: recommendation.matchedTagKeys,
                debug: recommendation.debug,
              },
              null,
              2
            )}
          </pre>
        </details>
      ) : null}
    </article>
  );
}