"use client";

import type { GenreMapState } from "@/lib/testEngine/getGenreMapState";
import GenreMapNode from "./GenreMapNode";

function getResultTypeCenterText(mapState: GenreMapState) {
  if (mapState.resultType === "balanced") {
    return "여러 세계가 고르게 열림";
  }

  if (mapState.resultType === "linked") {
    return "두 세계가 함께 열림";
  }

  return "가장 강한 세계가 열림";
}

export default function WorldMapPanel({ mapState }: { mapState: GenreMapState }) {
  return (
    <section
      style={{
        marginTop: 18,
        borderRadius: 28,
        border: "1px solid #334155",
        background:
          "radial-gradient(circle at center, rgba(129,140,248,0.22), rgba(15,23,42,0.98) 48%, #020617 100%)",
        padding: 18,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 260,
          height: 260,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(250,204,21,0.18), transparent 68%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gap: 18,
        }}
      >
        <div
          style={{
            margin: "0 auto",
            width: "100%",
            maxWidth: 360,
            borderRadius: 26,
            border: "1px solid rgba(250,204,21,0.45)",
            background: "rgba(15, 23, 42, 0.86)",
            boxShadow: "0 0 32px rgba(250,204,21,0.18)",
            padding: 18,
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: "#facc15",
              fontWeight: 900,
              fontSize: 13,
            }}
          >
            중심 세계
          </p>

          <h2
            style={{
              margin: "0 0 8px",
              color: "#ffffff",
              fontSize: 22,
              lineHeight: 1.35,
            }}
          >
            {getResultTypeCenterText(mapState)}
          </h2>

          <p
            style={{
              margin: 0,
              color: "#cbd5e1",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {mapState.centerGenreKeys.join(" · ")}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          {mapState.nodes.map((node) => (
            <GenreMapNode key={node.genreKey} node={node} />
          ))}
        </div>

        <div
          style={{
            borderRadius: 18,
            border: "1px solid #334155",
            background: "rgba(2, 6, 23, 0.64)",
            padding: 14,
            color: "#cbd5e1",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "#ffffff" }}>표현 기준</strong>
          <p style={{ margin: "6px 0 0" }}>
            장르 노드 크기는 동일하게 유지하고, 퍼센트 차이는 밝기·후광·흐림·빛의
            길로 표현합니다.
          </p>
        </div>
      </div>
    </section>
  );
}