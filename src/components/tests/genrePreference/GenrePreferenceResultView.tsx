"use client";

import type { GenrePreferenceResult } from "@/lib/testEngine/calculateGenrePreferenceResult";
import { getGenreMapState } from "@/lib/testEngine/getGenreMapState";
import WorldMapPanel from "./WorldMapPanel";
import GenreResultSummary from "./GenreResultSummary";
import GenrePreferenceActions from "./GenrePreferenceActions";

export default function GenrePreferenceResultView({
  result,
  onRetake,
}: {
  result: GenrePreferenceResult;
  onRetake: () => void;
}) {
  const mapState = getGenreMapState(result);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#ffffff",
        padding: 20,
      }}
    >
      <section
        style={{
          maxWidth: 920,
          margin: "0 auto",
          paddingTop: 28,
          paddingBottom: 48,
        }}
      >
        <p
          style={{
            margin: "0 0 10px",
            color: "#a5b4fc",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          웹툰 장르 취향 테스트 결과
        </p>

        <h1
          style={{
            margin: "0 0 10px",
            fontSize: 34,
            lineHeight: 1.25,
          }}
        >
          내 웹툰 세계관 지도
        </h1>

        <p
          style={{
            margin: 0,
            color: "#cbd5e1",
            fontSize: 16,
            lineHeight: 1.7,
          }}
        >
          Q1~Q10에서 고른 장면을 바탕으로, 지금 더 오래 머물 장르의 세계를
          열어봤어요.
        </p>

        <WorldMapPanel mapState={mapState} />

        <GenreResultSummary result={result} mapState={mapState} />

        <GenrePreferenceActions onRetake={onRetake} />

        {process.env.NODE_ENV === "development" ? (
          <details
            style={{
              marginTop: 24,
              borderRadius: 18,
              border: "1px solid #334155",
              background: "#0f172a",
              padding: 16,
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                color: "#cbd5e1",
                fontWeight: 900,
              }}
            >
              개발 확인용 결과 데이터 보기
            </summary>

            <pre
              style={{
                margin: "14px 0 0",
                padding: 16,
                borderRadius: 16,
                background: "#020617",
                color: "#e2e8f0",
                overflowX: "auto",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {JSON.stringify(
                {
                  answers: result.answers,
                  finalGenreScores: result.finalGenreScores,
                  finalGenrePercentages: result.finalGenrePercentages,
                  resultType: result.resultType,
                  mapState,
                },
                null,
                2
              )}
            </pre>
          </details>
        ) : null}

        <p
          style={{
            margin: "18px 0 0",
            color: "#94a3b8",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          작품 추천 리스트는 이 결과 화면에 직접 노출하지 않습니다. 작품 추천은
          이후 /find CTA로 연결합니다.
        </p>
      </section>
    </main>
  );
}