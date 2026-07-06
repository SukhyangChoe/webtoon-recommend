"use client";

import { RecommendationCard } from "./RecommendationCard";
import { RecommendationMoreSection } from "./RecommendationMoreSection";
import { SelectedSourceWorks } from "./SelectedSourceWorks";

import type { SimilarWorkSelectionResult } from "@/lib/recommendation/similarWorkRecommendation";

export function FindRecommendationResult({
  selectionResult,
}: {
  selectionResult: SimilarWorkSelectionResult;
}) {
  const topRecommendations = selectionResult.recommendations.slice(0, 5);
  const moreRecommendations = selectionResult.recommendations.slice(5, 10);

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
          정리했어요. D+25에서는 추천 카드 UI 1차 형태만 확인합니다.
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
          topRecommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.candidate.canonicalWebtoonId}
              recommendation={recommendation}
            />
          ))
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

      <RecommendationMoreSection recommendations={moreRecommendations} />

      {process.env.NODE_ENV === "development" ? (
        <details>
          <summary
            style={{
              cursor: "pointer",
              color: "#14532d",
              fontWeight: 900,
            }}
          >
            개발 확인용 userSimilarWorkProfile / TOP10 원본
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
            {JSON.stringify(selectionResult, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}