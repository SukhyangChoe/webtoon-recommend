"use client";

import type {
  GenrePreferenceQuestion,
  PairChoiceSide,
} from "@/data/tests/genrePreference";
import GenreImageChoiceCard from "./GenreImageChoiceCard";
import PairChoiceButtons from "./PairChoiceButtons";

export default function GenrePairQuestionView({
  question,
  totalCount,
  selectedSide,
  onSelect,
  onNext,
  onPrevious,
  canGoPrevious,
  isLastQuestion,
}: {
  question: GenrePreferenceQuestion;
  totalCount: number;
  selectedSide: PairChoiceSide | null;
  onSelect: (side: PairChoiceSide) => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoPrevious: boolean;
  isLastQuestion: boolean;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#ffffff",
        padding: 20,
      }}
    >
      <section
        style={{
          maxWidth: 980,
          margin: "0 auto",
          paddingTop: 28,
          paddingBottom: 40,
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            color: "#a5b4fc",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          질문 {question.order}/{totalCount}
        </p>

        <h1
          style={{
            margin: "0 0 8px",
            fontSize: 28,
            lineHeight: 1.3,
          }}
        >
          {question.questionText}
        </h1>

        <p
          style={{
            margin: "0 0 22px",
            color: "#94a3b8",
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          두 장면 중 지금 더 보고 싶은 쪽을 고르세요. 둘 다 비슷하면
          가운데를 선택해도 됩니다.
        </p>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
            alignItems: "stretch",
          }}
        >
          <GenreImageChoiceCard
            card={question.left}
            sideLabel="왼쪽"
            isSelected={selectedSide === "left"}
            onClick={() => onSelect("left")}
          />

          <GenreImageChoiceCard
            card={question.right}
            sideLabel="오른쪽"
            isSelected={selectedSide === "right"}
            onClick={() => onSelect("right")}
          />
        </section>

        <PairChoiceButtons selectedSide={selectedSide} onSelect={onSelect} />

        <section
          style={{
            display: "flex",
            gap: 10,
            marginTop: 22,
          }}
        >
          <button
            type="button"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid #475569",
              background: canGoPrevious ? "transparent" : "#111827",
              color: canGoPrevious ? "#e2e8f0" : "#64748b",
              fontWeight: 900,
              cursor: canGoPrevious ? "pointer" : "not-allowed",
            }}
          >
            이전
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={!selectedSide}
            style={{
              flex: 1,
              padding: "14px 16px",
              borderRadius: 14,
              border: "none",
              background: selectedSide ? "#ffffff" : "#334155",
              color: selectedSide ? "#0f172a" : "#94a3b8",
              fontWeight: 900,
              fontSize: 16,
              cursor: selectedSide ? "pointer" : "not-allowed",
            }}
          >
            {isLastQuestion ? "임시 결과 보기" : "다음"}
          </button>
        </section>
      </section>
    </main>
  );
}