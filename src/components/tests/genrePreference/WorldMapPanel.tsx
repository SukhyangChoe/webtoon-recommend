"use client";

import type { GenreMapState } from "@/lib/testEngine/getGenreMapState";
import GenreMapNode from "./GenreMapNode";

function getCenterTitle(mapState: GenreMapState) {
  if (mapState.resultType === "balanced") {
    return "여러 장르가 고르게 열렸어요";
  }

  if (mapState.resultType === "linked") {
    return "두 장르가 함께 선명해요";
  }

  return "가장 끌린 장르가 선명해요";
}

function getCenterGenreNames(mapState: GenreMapState) {
  return mapState.centerGenreKeys
    .map((genreKey) => {
      return (
        mapState.nodes.find((node) => node.genreKey === genreKey)?.genreName ??
        ""
      );
    })
    .filter(Boolean);
}

export default function WorldMapPanel({ mapState }: { mapState: GenreMapState }) {
  const centerGenreNames = getCenterGenreNames(mapState);

  return (
    <section className="genre-world-map" aria-labelledby="genre-world-map-title">
      <div className="genre-world-map__heading">
        <p>세계관 지도</p>
        <h2 id="genre-world-map-title">{getCenterTitle(mapState)}</h2>
        <span>{centerGenreNames.join(" · ")}</span>
      </div>

      <div className="genre-world-map__canvas">
        <div className="genre-world-map__ring genre-world-map__ring--outer" />
        <div className="genre-world-map__ring genre-world-map__ring--inner" />
        <div className="genre-world-map__glow" />

        <div className="genre-world-map__center">
          <span>웹툰핏</span>
          <strong>나의 취향 지도</strong>
        </div>

        {mapState.nodes.map((node, index) => (
          <GenreMapNode key={node.genreKey} node={node} positionIndex={index} />
        ))}
      </div>
    </section>
  );
}