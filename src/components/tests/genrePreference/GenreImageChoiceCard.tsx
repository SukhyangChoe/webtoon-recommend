"use client";

import { useState } from "react";
import type { GenrePreferenceCard } from "@/data/tests/genrePreference";

export default function GenreImageChoiceCard({
  card,
  sideLabel,
  isSelected,
  onClick,
  disabled = false,
}: {
  card: GenrePreferenceCard;
  sideLabel: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const selectionDisabled = disabled || hasImageError;

  function handleRetry() {
    setRetryCount((current) => current + 1);
    setHasImageError(false);
  }

  return (
    <article
      className={`genre-choice-card${
        isSelected ? " genre-choice-card--selected" : ""
      }${hasImageError ? " genre-choice-card--error" : ""}`}
    >
      <button
        type="button"
        className="genre-choice-card__select"
        onClick={onClick}
        disabled={selectionDisabled}
        aria-pressed={isSelected}
        aria-label={`${sideLabel} ${card.genreName} 장면 선택`}
      >
        <div className="genre-choice-card__topline">
          <span>{sideLabel}</span>
          {isSelected ? (
            <strong className="genre-choice-card__selected-mark">
              선택됨
            </strong>
          ) : null}
        </div>

        <div className="genre-choice-card__image-wrap">
          {hasImageError ? (
            <div className="genre-choice-card__image-error" role="status">
              <strong>이미지를 불러오지 못했어요.</strong>
              <span>아래 버튼을 눌러 다시 시도해 주세요.</span>
            </div>
          ) : (
            <img
              key={`${card.imagePath}-${retryCount}`}
              className="genre-choice-card__image"
              src={card.imagePath}
              alt={`${card.genreName} - ${card.label}`}
              onError={() => setHasImageError(true)}
            />
          )}
        </div>

        <div className="genre-choice-card__copy">
          <strong className="genre-choice-card__genre">{card.genreName}</strong>
          <span className="genre-choice-card__label">{card.label}</span>
        </div>
      </button>

      {hasImageError ? (
        <button
          type="button"
          className="genre-choice-card__retry"
          onClick={handleRetry}
        >
          이미지 다시 불러오기
        </button>
      ) : null}
    </article>
  );
}