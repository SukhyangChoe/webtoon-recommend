"use client";

import Link from "next/link";
import type { GenrePreferenceResult } from "@/lib/testEngine/calculateGenrePreferenceResult";
import type { GenreMapState } from "@/lib/testEngine/getGenreMapState";

const DETAIL_TEST_ROUTES: Record<string, string> = {
  fantasy: "/tests/fantasy",
  murim: "/tests/murim",
  romance_ropan: "/tests/romance-ropan",
  thriller_horror: "/tests/thriller-horror",
  drama_daily: "/tests/drama-daily",
};

function getResultDescription(result: GenrePreferenceResult) {
  if (result.resultType === "balanced") {
    return "한 장르에만 머무르기보다 서로 다른 분위기와 이야기 결에 고르게 반응했어요. 지금 보고 싶은 기분에 따라 여러 장르를 오가며 즐길 가능성이 높아요.";
  }

  if (result.resultType === "linked") {
    return "두 장르의 끌림이 함께 강하게 나타났어요. 한쪽 장르의 분위기와 다른 장르의 이야기 방식이 함께 들어간 작품도 잘 맞을 수 있어요.";
  }

  return "가장 높은 장르 취향이 비교적 선명하게 드러났어요. 이 장르를 중심으로 시작하되, 다음 순위 장르의 요소가 섞인 작품도 함께 살펴볼 수 있어요.";
}

export default function GenreResultSummary({
  result,
  mapState,
}: {
  result: GenrePreferenceResult;
  mapState: GenreMapState;
}) {
  const deeperTestNodes = mapState.nodes.filter((node) =>
    mapState.topGenreKeys.includes(node.genreKey)
  );

  return (
    <section className="genre-result-summary">
      <div className="genre-result-summary__percentages">
        <div className="genre-result-section-heading">
          <p>장르 취향 퍼센트</p>
          <h2>어떤 장르에 더 끌렸는지 확인해보세요</h2>
        </div>

        <div className="genre-percentage-list">
          {mapState.nodes.map((node) => (
            <article
              key={node.genreKey}
              className={`genre-percentage-item genre-percentage-item--${node.visualState}`}
            >
              <div className="genre-percentage-item__topline">
                <div>
                  <span>{node.rank}위</span>
                  <strong>{node.genreName}</strong>
                </div>
                <strong>{node.roundedPercentage}%</strong>
              </div>
              <div className="genre-percentage-item__track" aria-hidden="true">
                <span style={{ width: `${node.roundedPercentage}%` }} />
              </div>
              <p>{node.shortLabel}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="genre-result-summary__interpretation">
        <div className="genre-result-section-heading">
          <p>결과 해석</p>
          <h2>이런 방식으로 웹툰을 골라보면 좋아요</h2>
        </div>
        <p className="genre-result-summary__description">
          {getResultDescription(result)}
        </p>

        <div className="genre-result-deeper-tests">
          <div>
            <strong>장르 안에서 더 깊게 알아보기</strong>
            <p>상위 장르의 이야기·인물·전개 취향을 이어서 확인할 수 있어요.</p>
          </div>
          <div className="genre-result-deeper-tests__links">
            {deeperTestNodes.map((node) => (
              <Link key={node.genreKey} href={DETAIL_TEST_ROUTES[node.genreKey]}>
                {node.genreName} 세부 취향 보기
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}