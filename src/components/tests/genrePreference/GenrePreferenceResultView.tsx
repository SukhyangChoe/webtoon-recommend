"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import type { GenrePreferenceResult } from "@/lib/testEngine/calculateGenrePreferenceResult";
import { getGenreMapState } from "@/lib/testEngine/getGenreMapState";
import GenrePreferenceActions from "./GenrePreferenceActions";
import GenreResultSummary from "./GenreResultSummary";
import WorldMapPanel from "./WorldMapPanel";

function getGenreName(result: GenrePreferenceResult, genreKey: string | null) {
  if (!genreKey) return "";

  return (
    result.finalGenrePercentages.find((genre) => genre.genreKey === genreKey)
      ?.genreName ?? genreKey
  );
}

function getOneLineResult(result: GenrePreferenceResult) {
  const primaryGenreName = getGenreName(result, result.primaryGenreKey);
  const secondaryGenreName = getGenreName(result, result.secondaryGenreKey);

  if (result.resultType === "balanced") {
    return "여러 장르에 고르게 끌리는 취향이에요.";
  }

  if (result.resultType === "linked") {
    return `${primaryGenreName}와 ${secondaryGenreName}가 함께 강하게 나타났어요.`;
  }

  return `가장 크게 끌린 장르는 ${primaryGenreName}예요.`;
}

export default function GenrePreferenceResultView({
  result,
  onRetake,
}: {
  result: GenrePreferenceResult;
  onRetake: () => void;
}) {
  const mapState = getGenreMapState(result);
  const oneLineResult = getOneLineResult(result);

  return (
    <main className="genre-result-page">
      <PageContainer size="test" className="genre-result-page__container">
        <header className="genre-result-header">
          <p className="genre-result-eyebrow">웹툰 장르 취향 테스트 결과</p>
          <h1>내 웹툰 세계관 지도</h1>
          <p>{oneLineResult}</p>
        </header>

        <WorldMapPanel mapState={mapState} />
        <GenreResultSummary result={result} mapState={mapState} />
        <GenrePreferenceActions
          onRetake={onRetake}
          shareText={`${oneLineResult} 웹툰핏에서 내 웹툰 세계관 지도를 확인했어요.`}
        />

        {process.env.NODE_ENV === "development" ? (
          <details className="genre-result-debug">
            <summary>개발 확인용 결과 데이터 보기</summary>
            <pre>
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
      </PageContainer>
    </main>
  );
}