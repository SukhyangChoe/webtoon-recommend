"use client";

import type { PairChoiceSide } from "@/data/tests/genrePreference";

const PAIR_CHOICE_OPTIONS: {
  value: PairChoiceSide;
  desktopLabel: string;
  mobileLabel: string;
}[] = [
  {
    value: "left",
    desktopLabel: "← 왼쪽",
    mobileLabel: "← 왼쪽",
  },
  {
    value: "draw",
    desktopLabel: "둘 다 비슷함",
    mobileLabel: "둘 다",
  },
  {
    value: "right",
    desktopLabel: "오른쪽 →",
    mobileLabel: "오른쪽 →",
  },
];

export default function PairChoiceButtons({
  selectedSide,
  onSelect,
  disabled = false,
}: {
  selectedSide: PairChoiceSide | null;
  onSelect: (side: PairChoiceSide) => void;
  disabled?: boolean;
}) {
  return (
    <section className="pair-choice-row" aria-label="장면 선택">
      {PAIR_CHOICE_OPTIONS.map((option) => {
        const isSelected = selectedSide === option.value;

        return (
          <button
            key={option.value}
            type="button"
            className={`pair-choice-button${
              isSelected ? " pair-choice-button--selected" : ""
            }`}
            onClick={() => onSelect(option.value)}
            disabled={disabled}
            aria-pressed={isSelected}
          >
            <span className="pair-choice-button__desktop-label">
              {option.desktopLabel}
            </span>
            <span className="pair-choice-button__mobile-label">
              {option.mobileLabel}
            </span>
          </button>
        );
      })}
    </section>
  );
}