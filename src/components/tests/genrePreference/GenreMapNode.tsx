"use client";

import type { GenreMapNodeState } from "@/lib/testEngine/getGenreMapState";

function getNodeStyle(node: GenreMapNodeState): React.CSSProperties {
  const base: React.CSSProperties = {
    width: 138,
    height: 138,
    borderRadius: 28,
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#ffffff",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
    transition: "all 0.2s ease",
  };

  if (node.visualState === "open") {
    return {
      ...base,
      border: node.isPathActive ? "2px solid #facc15" : "1px solid #818cf8",
      background: node.isPathActive ? "#312e81" : "#1e1b4b",
      boxShadow: node.isPathActive
        ? "0 0 28px rgba(250, 204, 21, 0.45)"
        : "0 0 18px rgba(129, 140, 248, 0.28)",
      filter: "none",
      opacity: 1,
    };
  }

  if (node.visualState === "faint") {
    return {
      ...base,
      border: "1px solid #475569",
      background: "#111827",
      boxShadow: node.isPathActive
        ? "0 0 16px rgba(129, 140, 248, 0.24)"
        : "none",
      filter: "none",
      opacity: 0.78,
    };
  }

  return {
    ...base,
    border: "1px solid #1f2937",
    background: "#020617",
    boxShadow: "none",
    filter: "grayscale(0.35)",
    opacity: 0.42,
  };
}

export default function GenreMapNode({ node }: { node: GenreMapNodeState }) {
  return (
    <article style={getNodeStyle(node)}>
      {node.isPathActive ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: -40,
            background:
              "radial-gradient(circle, rgba(250,204,21,0.22), transparent 58%)",
          }}
        />
      ) : null}

      <div style={{ position: "relative", zIndex: 1 }}>
        <p
          style={{
            margin: "0 0 6px",
            color: node.visualState === "dormant" ? "#64748b" : "#c7d2fe",
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          {node.rank}위
        </p>

        <h3
          style={{
            margin: 0,
            fontSize: 18,
            lineHeight: 1.25,
          }}
        >
          {node.genreName}
        </h3>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 28,
            lineHeight: 1,
            fontWeight: 900,
          }}
        >
          {node.roundedPercentage}%
        </p>

        <p
          style={{
            margin: 0,
            color: node.visualState === "dormant" ? "#64748b" : "#cbd5e1",
            fontSize: 12,
            lineHeight: 1.35,
          }}
        >
          {node.mapObjectLabel}
        </p>
      </div>
    </article>
  );
}