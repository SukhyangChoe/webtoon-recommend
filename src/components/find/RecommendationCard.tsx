"use client";

import { getTagLabels } from "@/data/tags/tagLabels";
import {
  getGenreLabel,
  getStatusLabel,
} from "@/lib/recommendation/similarWorkRecommendation";

import type { SimilarWorkRecommendation } from "@/lib/recommendation/similarWorkRecommendation";

export function RecommendationCard({
  recommendation,
}: {
  recommendation: SimilarWorkRecommendation;
}) {
  const tagLabels = getTagLabels(recommendation.matchedTagKeys, 4);

  return (
    <article
      style={{
        display: "grid",
        gap: 14,
        borderRadius: 22,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        padding: 18,
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div>
        <p
          style={{
            margin: "0 0 8px",
            color: "#4f46e5",
            fontSize: 13,
            fontWeight: 900,
          }}
        >
          TOP {recommendation.rank}
        </p>

        <h3
          style={{
            margin: 0,
            color: "#0f172a",
            fontSize: 22,
            lineHeight: 1.35,
            letterSpacing: "-0.03em",
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
            계산 상세
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