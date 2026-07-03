"use client";

import { useState } from "react";
import type { GenrePreferenceCard } from "@/data/tests/genrePreference";

export default function GenreImageChoiceCard({
  card,
  sideLabel,
  isSelected,
  onClick,
}: {
  card: GenrePreferenceCard;
  sideLabel: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [hasImageError, setHasImageError] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 22,
        border: isSelected ? "2px solid #818cf8" : "1px solid #334155",
        background: isSelected ? "#1e1b4b" : "#0f172a",
        color: "#ffffff",
        padding: 14,
        cursor: "pointer",
        boxShadow: isSelected
          ? "0 0 0 4px rgba(129, 140, 248, 0.18)"
          : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 999,
            background: "#312e81",
            color: "#c7d2fe",
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          {sideLabel}
        </span>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 999,
            background: "#020617",
            color: "#e2e8f0",
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {card.genreName}
        </span>
      </div>

      <div
        style={{
          width: "100%",
          aspectRatio: "4 / 5",
          borderRadius: 18,
          background: "#1e293b",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        {hasImageError ? (
          <div
            style={{
              textAlign: "center",
              color: "#94a3b8",
              padding: 18,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 900 }}>이미지 준비 중</div>
            <div style={{ marginTop: 6, fontSize: 13 }}>
              장면 이미지를 불러오고 있어요.
            </div>
          </div>
        ) : (
          <img
            src={card.imagePath}
            alt={`${card.genreName} - ${card.label}`}
            onError={() => setHasImageError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              background: "#1e293b",
            }}
          />
        )}
      </div>

      <h2
        style={{
          margin: "0 0 6px",
          fontSize: 17,
          lineHeight: 1.35,
        }}
      >
        {card.label}
      </h2>

      <p
        style={{
          margin: 0,
          color: "#94a3b8",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {card.genreName} 장면
      </p>
    </button>
  );
}