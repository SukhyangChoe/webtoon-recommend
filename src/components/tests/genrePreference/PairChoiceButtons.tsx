"use client";

import type { PairChoiceSide } from "@/data/tests/genrePreference";

const PAIR_CHOICE_OPTIONS: {
  value: PairChoiceSide;
  label: string;
  helper: string;
}[] = [
  {
    value: "left",
    label: "왼쪽이 더 끌려요",
    helper: "왼쪽 장르 +3",
  },
  {
    value: "draw",
    label: "둘 다 비슷해요",
    helper: "양쪽 장르 +1",
  },
  {
    value: "right",
    label: "오른쪽이 더 끌려요",
    helper: "오른쪽 장르 +3",
  },
];

export default function PairChoiceButtons({
  selectedSide,
  onSelect,
}: {
  selectedSide: PairChoiceSide | null;
  onSelect: (side: PairChoiceSide) => void;
}) {
  return (
    <section
      style={{
        display: "grid",
        gap: 10,
        marginTop: 18,
      }}
    >
      {PAIR_CHOICE_OPTIONS.map((option) => {
        const isSelected = selectedSide === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            style={{
              width: "100%",
              borderRadius: 16,
              border: isSelected ? "2px solid #818cf8" : "1px solid #334155",
              background: isSelected ? "#312e81" : "#0f172a",
              color: "#ffffff",
              padding: "14px 16px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <strong
              style={{
                display: "block",
                fontSize: 16,
                lineHeight: 1.4,
              }}
            >
              {option.label}
            </strong>

            <span
              style={{
                display: "block",
                marginTop: 4,
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              {option.helper}
            </span>
          </button>
        );
      })}
    </section>
  );
}