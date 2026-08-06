"use client";

import type { CSSProperties } from "react";
import type { GenreMapNodeState } from "@/lib/testEngine/getGenreMapState";

export default function GenreMapNode({
  node,
  positionIndex,
}: {
  node: GenreMapNodeState;
  positionIndex: number;
}) {
  const style = {
    "--genre-node-position": positionIndex,
  } as CSSProperties;

  return (
    <article
      className={[
        "genre-map-node",
        `genre-map-node--position-${positionIndex}`,
        `genre-map-node--${node.visualState}`,
        node.isPathActive ? "genre-map-node--active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <span className="genre-map-node__rank">{node.rank}위</span>
      <strong>{node.genreName}</strong>
      <span className="genre-map-node__percentage">
        {node.roundedPercentage}%
      </span>
      <span className="genre-map-node__object">{node.mapObjectLabel}</span>
    </article>
  );
}