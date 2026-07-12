"use client";

import { useState } from "react";

import { getTagLabels } from "@/data/tags/tagLabels";
import {
  getStatusLabel,
  getWebtoonDisplayAxisLabel,
} from "@/lib/recommendation/similarWorkRecommendation";

import type {
  RecommendationType,
  SimilarWorkRecommendation,
} from "@/lib/recommendation/similarWorkRecommendation";
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

function getFeedbackDescription(
  feedbackAction?: RecommendationFeedbackAction
) {
  if (feedbackAction === "already_read") {
    return "취향이 맞을 수 있지만, 이번 추천 세션에서는 이미 본 작품으로만 표시합니다.";
  }

  if (feedbackAction === "not_my_taste") {
    return "작품 자체가 취향과 맞지 않는다는 신호로만 기록합니다. 현재 화면에서는 추천 목록을 다시 계산하지 않습니다.";
  }

  return null;
}

function getRecommendationTypeLabel(recommendationType: RecommendationType) {
  const labelMap: Record<RecommendationType, string> = {
    stable_match: "핵심 추천",
    similar_texture: "비슷한 결",
    new_texture: "새로운 결",
    taste_expansion: "취향 확장",
  };

  return labelMap[recommendationType];
}

export function RecommendationCard({
  recommendation,
  rankLabel,
  actionState,
  onToggleSaved,
  onSetFeedbackAction,
  onMarkOfficialOpened,
}: {
  recommendation: SimilarWorkRecommendation;
  rankLabel?: string;
  actionState: RecommendationItemActionState;
  onToggleSaved: (canonicalWebtoonId: string) => void;
  onSetFeedbackAction: (
    canonicalWebtoonId: string,
    feedbackAction: RecommendationFeedbackAction
  ) => void;
  onMarkOfficialOpened: (canonicalWebtoonId: string) => void;
}) {
  const [isFeedbackMenuOpen, setIsFeedbackMenuOpen] = useState(false);

  const canonicalWebtoonId = recommendation.candidate.canonicalWebtoonId;
  const tagLabels = getTagLabels(recommendation.matchedTagKeys, 4);
  const feedbackMessage = getFeedbackMessage(actionState.feedbackAction);
  const feedbackDescription = getFeedbackDescription(
    actionState.feedbackAction
  );
  const isExcludedInSession = Boolean(actionState.feedbackAction);

  const displayAxisLabel = getWebtoonDisplayAxisLabel(
    recommendation.candidate
  );

  function handleFeedbackAction(feedbackAction: RecommendationFeedbackAction) {
    onSetFeedbackAction(canonicalWebtoonId, feedbackAction);
    setIsFeedbackMenuOpen(false);
  }

  return (
    <article
      style={{
        borderRadius: 28,
        border: "1px solid #dbeafe",
        background: isExcludedInSession ? "#f8fafc" : "#ffffff",
        opacity: isExcludedInSession ? 0.72 : 1,
        padding: "clamp(22px, 5vw, 34px)",
        boxShadow: "0 18px 50px rgba(15, 23, 42, 0.08)",
        display: "grid",
        gap: 18,
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 12,
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
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
              {rankLabel ?? `TOP ${recommendation.rank}`}
            </p>

            <span
              style={{
                borderRadius: 999,
                background: "#eef2ff",
                color: "#4338ca",
                padding: "5px 9px",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {getRecommendationTypeLabel(
                recommendation.recommendationType
              )}
            </span>
          </div>

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
              fontSize: 24,
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
              margin: "8px 0 0",
              color: "#64748b",
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            {recommendation.candidate.platform} · {displayAxisLabel} ·{" "}
            {getStatusLabel(recommendation.candidate.status)}
          </p>
        </div>
      </div>

      {feedbackMessage ? (
        <div
          style={{
            borderRadius: 16,
            background: "#f1f5f9",
            color: "#334155",
            padding: 14,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <strong>{feedbackMessage}</strong>

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
          padding: "8px 12px",
          fontSize: 14,
          fontWeight: 900,
        }}
      >
        취향 맞음도 {recommendation.matchScore}%
      </div>

      <p
        style={{
          margin: 0,
          color: "#334155",
          fontSize: 16,
          lineHeight: 1.75,
          wordBreak: "keep-all",
          overflowWrap: "break-word",
        }}
      >
        {recommendation.candidate.recommendationReason}
      </p>

      {tagLabels.length > 0 && (
        <div
            style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            }}
        >
            {tagLabels.map((tagLabel) => (
            <span
                key={tagLabel}
                style={{
                borderRadius: 999,
                background: "#f1f5f9",
                color: "#334155",
                padding: "8px 11px",
                fontSize: 14,
                fontWeight: 900,
                }}
            >
                #{tagLabel}
            </span>
            ))}
        </div>
        )}

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
          onClick={() => onMarkOfficialOpened(canonicalWebtoonId)}
          style={{
            width: "100%",
            minHeight: 50,
            borderRadius: 16,
            background: "#4f46e5",
            color: "#ffffff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 16px",
            fontSize: 16,
            fontWeight: 900,
            textDecoration: "none",
            boxSizing: "border-box",
          }}
        >
          보러가기
        </a>

        <button
          type="button"
          onClick={() => setIsFeedbackMenuOpen((current) => !current)}
          aria-expanded={isFeedbackMenuOpen}
          style={{
            width: "100%",
            minHeight: 44,
            borderRadius: 16,
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

      {process.env.NODE_ENV === "development" ? (
        <details
          style={{
            borderRadius: 14,
            background: "#f0fdf4",
            color: "#166534",
            padding: 12,
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 900,
            }}
          >
            계산 상세 / DB 출처 / 카드 action state
          </summary>

          <pre
            style={{
              margin: "10px 0 0",
              maxHeight: 420,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 12,
              lineHeight: 1.55,
            }}
          >
            {JSON.stringify(
              {
                actionState,
                rank: recommendation.rank,
                sourceTasteRank: recommendation.sourceTasteRank,
                effectiveTasteRank:
                  recommendation.effectiveTasteRank,
                effectiveRank: recommendation.effectiveRank,
                recommendationType:
                  recommendation.recommendationType,
                tasteScoreSource:
                  recommendation.tasteScoreSource,
                sourceDb: recommendation.candidate.sourceDb,
                sourceWeight: recommendation.candidate.sourceWeight,
                primaryContentAxisKey:
                  recommendation.candidate.primaryContentAxisKey,
                displayAxisLabel:
                  recommendation.candidate.displayAxisLabel,
                contentAxisScores:
                  recommendation.debug.candidateContentAxisScores,
                genreMatch: recommendation.genreMatch,
                typeMatch: recommendation.typeMatch,
                tagMatch: recommendation.tagMatch,
                contentAxisMatch: recommendation.contentAxisMatch,
                userAvoidancePenalty:
                  recommendation.userAvoidancePenalty,
                selectedWorkTasteScore:
                  recommendation.selectedWorkTasteScore,
                profileTasteScore:
                  recommendation.profileTasteScore,
                effectiveTasteScore:
                  recommendation.effectiveTasteScore,
                riskSafetyScore:
                  recommendation.riskSafetyScore,
                normalizedQualityScore:
                  recommendation.normalizedQualityScore,
                successConfidenceScore:
                  recommendation.successConfidenceScore,
                displayRecommendationScore:
                  recommendation.displayRecommendationScore,
                matchedTagKeys: recommendation.matchedTagKeys,
                legacyAliases: {
                  stage1Score: recommendation.stage1Score,
                  longTermScore: recommendation.longTermScore,
                  effectiveScore: recommendation.effectiveScore,
                  finalRecommendationScore:
                    recommendation.finalRecommendationScore,
                },
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