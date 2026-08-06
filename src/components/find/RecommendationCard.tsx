"use client";

import { useState } from "react";

import { getTagLabels } from "@/data/tags/tagLabels";
import {
  getStatusLabel,
  getWebtoonDisplayAxisLabel,
} from "@/lib/recommendation/similarWorkRecommendation";

import type { SimilarWorkRecommendation } from "@/lib/recommendation/similarWorkRecommendation";
import type {
  RecommendationFeedbackAction,
  RecommendationItemActionState,
} from "@/types/find";

export function RecommendationCard({
  recommendation,
  isReplacement = false,
  actionState,
  onToggleSaved,
  onSetFeedbackAction,
  onMarkOfficialOpened,
}: {
  recommendation: SimilarWorkRecommendation;
  isReplacement?: boolean;
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
  const tagLabels = getTagLabels(recommendation.matchedTagKeys, 3);
  const displayAxisLabel = getWebtoonDisplayAxisLabel(
    recommendation.candidate
  );
  const statusLabel = getStatusLabel(recommendation.candidate.status);

  function handleFeedbackAction(feedbackAction: RecommendationFeedbackAction) {
    onSetFeedbackAction(canonicalWebtoonId, feedbackAction);
    setIsFeedbackMenuOpen(false);
  }

  return (
    <article className="recommendation-card">
      <div className="recommendation-card__header">
        <div className="recommendation-card__labels">
          {isReplacement ? (
            <span className="recommendation-card__new-badge">
              새로 추천
            </span>
          ) : null}

          <span className="recommendation-card__axis-badge">
            {displayAxisLabel}
          </span>
        </div>

        <div className="recommendation-card__match">
          취향 일치도 {recommendation.matchScore}%
        </div>
      </div>

      <div className="recommendation-card__summary">
        <h3 className="recommendation-card__title">
          {recommendation.candidate.title}
        </h3>

        <p className="recommendation-card__meta">
          {recommendation.candidate.platform} · {statusLabel}
        </p>
      </div>

      <p className="recommendation-card__reason">
        {recommendation.candidate.recommendationReason}
      </p>

      {tagLabels.length > 0 ? (
        <div className="recommendation-card__tags">
          {tagLabels.map((tagLabel) => (
            <span key={tagLabel} className="recommendation-card__tag">
              #{tagLabel}
            </span>
          ))}
        </div>
      ) : null}

      <div className="recommendation-card__actions">
        <a
          href={recommendation.candidate.officialUrl}
          target="_blank"
          rel="noreferrer"
          className="recommendation-card__view-button"
          onClick={() => onMarkOfficialOpened(canonicalWebtoonId)}
        >
          보러가기
        </a>

        <button
          type="button"
          className="recommendation-card__secondary-save"
          onClick={() => onToggleSaved(canonicalWebtoonId)}
          aria-pressed={actionState.isSaved}
        >
          {actionState.isSaved ? "저장됨" : "저장해두기"}
        </button>
      </div>

      <div className="recommendation-card__feedback">
        <button
          type="button"
          className="recommendation-card__feedback-trigger"
          onClick={() => setIsFeedbackMenuOpen((current) => !current)}
          aria-expanded={isFeedbackMenuOpen}
        >
          추천에서 제외
        </button>

        {isFeedbackMenuOpen ? (
          <div className="recommendation-card__feedback-menu">
            <button
              type="button"
              onClick={() => handleFeedbackAction("already_read")}
            >
              이미 봤어요
            </button>
            <button
              type="button"
              onClick={() => handleFeedbackAction("not_my_taste")}
            >
              내 취향 아님
            </button>
          </div>
        ) : null}
      </div>

      {process.env.NODE_ENV === "development" ? (
        <details className="recommendation-debug">
          <summary>개발 확인용 계산 상세</summary>
          <pre>
            {JSON.stringify(
              {
                actionState,
                rank: recommendation.rank,
                sourceTasteRank: recommendation.sourceTasteRank,
                effectiveTasteRank: recommendation.effectiveTasteRank,
                effectiveRank: recommendation.effectiveRank,
                recommendationType: recommendation.recommendationType,
                tasteScoreSource: recommendation.tasteScoreSource,
                sourceDb: recommendation.candidate.sourceDb,
                sourceType: recommendation.candidate.sourceType,
                sourceWeight: recommendation.candidate.sourceWeight,
                recommendationEligible:
                  recommendation.candidate.recommendationEligible,
                qualityEvidenceGateDecision:
                  recommendation.candidate.qualityEvidenceGateDecision,
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
                profileTasteScore: recommendation.profileTasteScore,
                detailTestTasteScore:
                  recommendation.detailTestTasteScore,
                effectiveTasteScore: recommendation.effectiveTasteScore,
                riskSafetyScore: recommendation.riskSafetyScore,
                normalizedQualityScore:
                  recommendation.normalizedQualityScore,
                artQualityScore: recommendation.artQualityScore,
                storyQualityScore: recommendation.storyQualityScore,
                qualityFloorPenalty:
                  recommendation.qualityFloorPenalty,
                personalizedQualityScore:
                  recommendation.personalizedQualityScore,
                artToneMismatchPenalty:
                  recommendation.artToneMismatchPenalty,
                effectiveTagScores: recommendation.effectiveTagScores,
                visualAppealExcluded:
                  recommendation.visualAppealExcluded,
                visualStyleMigrationStatus:
                  recommendation.debug
                    .candidateVisualStyleMigrationStatus,
                artStyleScores:
                  recommendation.debug.candidateArtStyleScores,
                qualityScore:
                  recommendation.debug.candidateQualityScore,
                qualityBand:
                  recommendation.debug.candidateQualityBand,
                qualityScoreSource:
                  recommendation.debug.candidateQualityScoreSource,
                successConfidenceScore:
                  recommendation.successConfidenceScore,
                displayRecommendationScore:
                  recommendation.displayRecommendationScore,
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