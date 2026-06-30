"use client";

import type { GenrePreferenceResult } from "@/lib/testEngine/calculateGenrePreferenceResult";
import type { GenreMapState } from "@/lib/testEngine/getGenreMapState";

function getGenreName(result: GenrePreferenceResult, genreKey: string | null) {
  if (!genreKey) return "";

  return (
    result.finalGenrePercentages.find((genre) => genre.genreKey === genreKey)
      ?.genreName ?? genreKey
  );
}

function getResultTitle(result: GenrePreferenceResult) {
  const primaryName = getGenreName(result, result.primaryGenreKey);
  const secondaryName = getGenreName(result, result.secondaryGenreKey);

  if (result.resultType === "balanced") {
    return "여러 세계가 고르게 열려 있어요.";
  }

  if (result.resultType === "linked") {
    return `${primaryName}와 ${secondaryName} 세계가 함께 열렸어요.`;
  }

  return `가장 강하게 열린 세계는 ${primaryName}예요.`;
}

function getResultDescription(result: GenrePreferenceResult) {
  if (result.resultType === "balanced") {
    return "한 장르에만 강하게 쏠리기보다, 여러 장르의 장면을 고르게 즐길 가능성이 높아요.";
  }

  if (result.resultType === "linked") {
    return "두 장르의 끌림이 함께 강하게 나타났어요. 한쪽의 설정과 다른 한쪽의 분위기가 같이 맞을 수 있어요.";
  }

  return "가장 높은 장르 취향이 비교적 선명하게 드러났어요. 이 장르를 중심으로 다음 추천 흐름을 이어갈 수 있어요.";
}

export default function GenreResultSummary({
  result,
  mapState,
}: {
  result: GenrePreferenceResult;
  mapState: GenreMapState;
}) {
  const topNodes = mapState.nodes.filter((node) =>
    mapState.topGenreKeys.includes(node.genreKey)
  );

  return (
    <section
      style={{
        marginTop: 22,
        borderRadius: 24,
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        color: "#0f172a",
        padding: 20,
      }}
    >
      <p
        style={{
          margin: "0 0 8px",
          color: "#4f46e5",
          fontSize: 14,
          fontWeight: 900,
        }}
      >
        결과 요약
      </p>

      <h2
        style={{
          margin: "0 0 10px",
          fontSize: 24,
          lineHeight: 1.35,
        }}
      >
        {getResultTitle(result)}
      </h2>

      <p
        style={{
          margin: "0 0 18px",
          color: "#475569",
          fontSize: 16,
          lineHeight: 1.7,
        }}
      >
        {getResultDescription(result)}
      </p>

      <div
        style={{
          display: "grid",
          gap: 10,
        }}
      >
        {topNodes.map((node) => (
          <article
            key={node.genreKey}
            style={{
              borderRadius: 16,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              padding: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 6,
              }}
            >
              <strong>
                {node.rank}위 {node.genreName}
              </strong>
              <strong>{node.roundedPercentage}%</strong>
            </div>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {node.shortLabel}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}