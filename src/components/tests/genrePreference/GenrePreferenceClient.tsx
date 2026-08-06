"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatePanel } from "@/components/ui/StatePanel";
import {
  genrePreferenceQuestions,
  genrePreferenceTest,
  type PairChoiceSide,
} from "@/data/tests/genrePreference";
import {
  calculateGenrePreferenceResult,
  type GenrePreferenceResult,
  type PairChoiceAnswer,
} from "@/lib/testEngine/calculateGenrePreferenceResult";
import {
  clearGenrePreferenceResult,
  getStoredGenreMapState,
  loadGenrePreferenceResult,
  saveGenrePreferenceResult,
  toGenrePreferenceResult,
  type GenrePreferenceStoredResult,
} from "@/lib/storage/genrePreferenceStorage";
import {
  clearGenrePreferenceProgress,
  loadGenrePreferenceProgress,
  saveGenrePreferenceProgress,
} from "@/lib/storage/testProgressStorage";
import GenrePairQuestionView from "./GenrePairQuestionView";
import GenrePreferenceResultView from "./GenrePreferenceResultView";

const AUTO_ADVANCE_DELAY_MS = 260;

function upsertAnswer(
  answers: PairChoiceAnswer[],
  nextAnswer: PairChoiceAnswer
) {
  const exists = answers.some(
    (answer) => answer.questionKey === nextAnswer.questionKey
  );

  if (!exists) {
    return [...answers, nextAnswer];
  }

  return answers.map((answer) =>
    answer.questionKey === nextAnswer.questionKey ? nextAnswer : answer
  );
}

function findAnswerByQuestionKey(
  answers: PairChoiceAnswer[],
  questionKey: string
) {
  return answers.find((answer) => answer.questionKey === questionKey) ?? null;
}

function formatCompletedAt(completedAt: string) {
  const date = new Date(completedAt);

  if (Number.isNaN(date.getTime())) {
    return completedAt;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSavedResultSummary(storedResult: GenrePreferenceStoredResult) {
  const mapState = getStoredGenreMapState(storedResult);
  const centerGenreNames = mapState.centerGenreKeys
    .map((genreKey) => {
      return (
        mapState.nodes.find((node) => node.genreKey === genreKey)?.genreName ??
        ""
      );
    })
    .filter(Boolean);

  if (mapState.resultType === "balanced") {
    return "여러 장르에 고르게 끌리는 취향으로 나왔어요.";
  }

  if (mapState.resultType === "linked") {
    return `${centerGenreNames.join(" · ")} 취향이 함께 높게 나왔어요.`;
  }

  return centerGenreNames[0]
    ? `${centerGenreNames[0]} 취향이 가장 높게 나왔어요.`
    : "저장된 장르 취향 결과를 다시 확인할 수 있어요.";
}

function SavedGenrePreferenceNotice({
  storedResult,
  onRestore,
  onRetake,
}: {
  storedResult: GenrePreferenceStoredResult;
  onRestore: () => void;
  onRetake: () => void;
}) {
  return (
    <main className="genre-test-page">
      <PageContainer size="test" className="genre-test-page__container">
        <section className="genre-saved-result">
          <p className="genre-test-eyebrow">저장된 테스트 결과</p>
          <h1 className="genre-test-title">결과를 다시 확인할까요?</h1>
          <p className="genre-test-lead">
            이전에 완료한 웹툰 장르 취향 테스트 결과가 있어요.
          </p>

          <dl className="genre-saved-result__summary">
            <div>
              <dt>결과</dt>
              <dd>{storedResult.resultName}</dd>
            </div>
            <div>
              <dt>한 줄 요약</dt>
              <dd>{getSavedResultSummary(storedResult)}</dd>
            </div>
            <div>
              <dt>완료 시각</dt>
              <dd>{formatCompletedAt(storedResult.completedAt)}</dd>
            </div>
          </dl>

          <div className="genre-test-actions">
            <AppButton onClick={onRestore}>결과 보기</AppButton>
            <AppButton variant="secondary" onClick={onRetake}>
              다시 테스트하기
            </AppButton>
          </div>
        </section>
      </PageContainer>
    </main>
  );
}

export default function GenrePreferenceClient() {
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<PairChoiceAnswer[]>([]);
  const [completed, setCompleted] = useState(false);
  const [storedResult, setStoredResult] =
    useState<GenrePreferenceStoredResult | null>(null);
  const [restoredResult, setRestoredResult] =
    useState<GenrePreferenceResult | null>(null);
  const [storageChecked, setStorageChecked] = useState(false);
  const [progressHydrated, setProgressHydrated] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const advanceTimerRef = useRef<number | null>(null);

  const currentQuestion = genrePreferenceQuestions[currentQuestionIndex];
  const selectedSide = currentQuestion
    ? findAnswerByQuestionKey(answers, currentQuestion.questionKey)
        ?.selectedSide ?? null
    : null;

  const calculatedResult = useMemo(() => {
    return calculateGenrePreferenceResult({
      answers,
      questions: genrePreferenceQuestions,
    });
  }, [answers]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const loadedResult = loadGenrePreferenceResult();
      const loadedProgress = loadGenrePreferenceProgress();

      setStoredResult(loadedResult);

      if (loadedResult) {
        clearGenrePreferenceProgress();
      }

      if (!loadedResult && loadedProgress) {
        const maxQuestionIndex = Math.max(
          0,
          genrePreferenceQuestions.length - 1
        );
        const restoredQuestionIndex = Math.min(
          loadedProgress.currentQuestionIndex,
          maxQuestionIndex
        );
        const validQuestionKeys = new Set(
          genrePreferenceQuestions.map((question) => question.questionKey)
        );
        const restoredAnswers = loadedProgress.answers.filter((answer) =>
          validQuestionKeys.has(answer.questionKey)
        );

        setHasStarted(true);
        setCurrentQuestionIndex(restoredQuestionIndex);
        setAnswers(restoredAnswers);
      }

      setProgressHydrated(true);
      setStorageChecked(true);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    if (!progressHydrated || !hasStarted || completed) return;

    saveGenrePreferenceProgress({
      testVersion: genrePreferenceTest.testVersion,
      currentQuestionIndex,
      answers,
    });
  }, [answers, completed, currentQuestionIndex, hasStarted, progressHydrated]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  function clearAdvanceTimer() {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }

  function resetTestState() {
    clearAdvanceTimer();
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setCompleted(false);
    setRestoredResult(null);
    setIsTransitioning(false);
  }

  function handleStart() {
    clearGenrePreferenceProgress();
    setHasStarted(true);
    resetTestState();
  }

  function handleRetake() {
    clearGenrePreferenceResult();
    clearGenrePreferenceProgress();
    setStoredResult(null);
    setHasStarted(true);
    resetTestState();
  }

  function handleRestoreStoredResult() {
    if (!storedResult) return;

    clearGenrePreferenceProgress();
    const restored = toGenrePreferenceResult(storedResult);
    setAnswers(restored.answers);
    setRestoredResult(restored);
    setHasStarted(true);
    setCompleted(true);
  }

  function handleSelect(side: PairChoiceSide) {
    if (!currentQuestion || isTransitioning) return;

    const questionIndexAtSelection = currentQuestionIndex;
    const nextAnswers = upsertAnswer(answers, {
      questionKey: currentQuestion.questionKey,
      selectedSide: side,
    });
    const isLastQuestion =
      questionIndexAtSelection >= genrePreferenceQuestions.length - 1;

    clearAdvanceTimer();
    setRestoredResult(null);
    setAnswers(nextAnswers);
    setIsTransitioning(true);

    advanceTimerRef.current = window.setTimeout(() => {
      if (isLastQuestion) {
        const nextResult = calculateGenrePreferenceResult({
          answers: nextAnswers,
          questions: genrePreferenceQuestions,
        });
        const nextStoredResult = saveGenrePreferenceResult(nextResult);

        clearGenrePreferenceProgress();
        setStoredResult(nextStoredResult);
        setRestoredResult(nextResult);
        setCompleted(true);
        setIsTransitioning(false);
        advanceTimerRef.current = null;
        return;
      }

      setCurrentQuestionIndex((previousIndex) => {
        return previousIndex === questionIndexAtSelection
          ? previousIndex + 1
          : previousIndex;
      });
      setIsTransitioning(false);
      advanceTimerRef.current = null;
    }, AUTO_ADVANCE_DELAY_MS);
  }

  function handlePrevious() {
    if (currentQuestionIndex <= 0) return;

    clearAdvanceTimer();
    setIsTransitioning(false);
    setCurrentQuestionIndex((previousIndex) => previousIndex - 1);
  }

  if (!storageChecked) {
    return (
      <main className="genre-test-page">
        <PageContainer size="test" className="genre-test-page__container">
          <StatePanel
            tone="loading"
            eyebrow="웹툰 장르 취향 테스트"
            title="저장된 결과를 확인하고 있어요"
            description="잠시만 기다려 주세요."
          />
        </PageContainer>
      </main>
    );
  }

  if (!hasStarted && !completed && storedResult) {
    return (
      <SavedGenrePreferenceNotice
        storedResult={storedResult}
        onRestore={handleRestoreStoredResult}
        onRetake={handleRetake}
      />
    );
  }

  if (completed) {
    return (
      <GenrePreferenceResultView
        result={restoredResult ?? calculatedResult}
        onRetake={handleRetake}
      />
    );
  }

  if (hasStarted && currentQuestion) {
    return (
      <GenrePairQuestionView
        question={currentQuestion}
        totalCount={genrePreferenceQuestions.length}
        selectedSide={selectedSide}
        onSelect={handleSelect}
        onPrevious={handlePrevious}
        canGoPrevious={currentQuestionIndex > 0}
        isTransitioning={isTransitioning}
      />
    );
  }

  return (
    <main className="genre-test-page">
      <PageContainer size="test" className="genre-test-page__container">
        <section className="genre-test-intro">
          <div className="genre-test-intro__content">
            <p className="genre-test-eyebrow">대표 취향 테스트</p>
            <h1 className="genre-test-title">웹툰 장르 취향 테스트</h1>
            <p className="genre-test-lead">
              두 장면 중 더 보고 싶은 쪽을 고르면
              <br />
              내가 어떤 웹툰 장르에 끌리는지 알 수 있어요.
            </p>

            <div className="genre-test-info">
              <strong>{genrePreferenceTest.questionCount}문항</strong>
              <span aria-hidden="true">·</span>
              <span>예상 시간 약 1분</span>
            </div>

            <div className="genre-test-note">
              <strong>정답은 없어요.</strong>
              <span>지금 더 끌리는 쪽을 가볍게 골라주세요.</span>
            </div>

            <AppButton className="genre-test-start-button" onClick={handleStart}>
              시작하기
            </AppButton>
          </div>

          <div className="genre-test-intro__preview" aria-hidden="true">
            <div className="genre-test-preview-card genre-test-preview-card--left">
              <span>장면 A</span>
            </div>
            <div className="genre-test-preview-divider">VS</div>
            <div className="genre-test-preview-card genre-test-preview-card--right">
              <span>장면 B</span>
            </div>
            <div className="genre-test-preview-options">
              <span>← 왼쪽</span>
              <span>둘 다</span>
              <span>오른쪽 →</span>
            </div>
          </div>
        </section>
      </PageContainer>
    </main>
  );
}