"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { ProgressBar } from "@/components/ui/ProgressBar";
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
  onPrevious,
  canGoPrevious,
  isTransitioning,
}: {
  question: GenrePreferenceQuestion;
  totalCount: number;
  selectedSide: PairChoiceSide | null;
  onSelect: (side: PairChoiceSide) => void;
  onPrevious: () => void;
  canGoPrevious: boolean;
  isTransitioning: boolean;
}) {
  return (
    <main className="genre-question-page">
      <PageContainer size="test" className="genre-question-page__container">
        <section className="genre-question-shell">
          <header className="genre-question-topbar">
            <button
              type="button"
              className="genre-question-back"
              onClick={onPrevious}
              disabled={!canGoPrevious || isTransitioning}
              aria-label="이전 문항으로 돌아가기"
            >
              <span aria-hidden="true">←</span>
              <span>이전</span>
            </button>
            <strong className="genre-question-count">
              {question.order} / {totalCount}
            </strong>
          </header>

          <ProgressBar
            value={question.order}
            max={totalCount}
            label={`장르 취향 테스트 ${question.order}번째 문항`}
          />

          <div className="genre-question-heading">
            <p className="genre-test-eyebrow">웹툰 장르 취향 테스트</p>
            <h1>둘 중 지금 더 보고 싶은 쪽은 어느 쪽인가요?</h1>
            <p>
              이미지를 누르거나 아래 선택 버튼을 눌러주세요. 둘 다 비슷하면
              가운데를 선택할 수 있어요.
            </p>
          </div>

          <section
            className="genre-question-cards"
            aria-label={`${question.left.genreName}과 ${question.right.genreName} 장면 비교`}
          >
            <GenreImageChoiceCard
              card={question.left}
              sideLabel="왼쪽"
              isSelected={selectedSide === "left"}
              onClick={() => onSelect("left")}
              disabled={isTransitioning}
            />
            <GenreImageChoiceCard
              card={question.right}
              sideLabel="오른쪽"
              isSelected={selectedSide === "right"}
              onClick={() => onSelect("right")}
              disabled={isTransitioning}
            />
          </section>

          <PairChoiceButtons
            selectedSide={selectedSide}
            onSelect={onSelect}
            disabled={isTransitioning}
          />

          <p className="genre-question-transition" aria-live="polite">
            {isTransitioning ? "선택했어요. 다음 문항으로 넘어갈게요." : " "}
          </p>
        </section>
      </PageContainer>
    </main>
  );
}