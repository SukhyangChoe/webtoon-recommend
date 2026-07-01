"use client";

import { useEffect, useMemo, useState } from "react";
import {
  genrePreferenceQuestions,
  genrePreferenceStartCopy,
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
  loadGenrePreferenceResult,
  saveGenrePreferenceResult,
  toGenrePreferenceResult,
  type GenrePreferenceStoredResult,
} from "@/lib/storage/genrePreferenceStorage";
import GenrePairQuestionView from "./GenrePairQuestionView";
import GenrePreferenceResultView from "./GenrePreferenceResultView";

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
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#ffffff",
        padding: 24,
      }}
    >
      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          paddingTop: 72,
        }}
      >
        <p
          style={{
            margin: "0 0 12px",
            color: "#a5b4fc",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          저장된 결과
        </p>

        <h1
          style={{
            margin: "0 0 16px",
            fontSize: 34,
            lineHeight: 1.25,
          }}
        >
          저장된 웹툰 세계관 지도가 있어요.
        </h1>

        <p
          style={{
            margin: "0 0 12px",
            color: "#cbd5e1",
            fontSize: 18,
            lineHeight: 1.7,
          }}
        >
          최근 결과를 다시 볼 수 있어요.
        </p>

        <p
          style={{
            margin: "0 0 24px",
            color: "#94a3b8",
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          다시 테스트하면 기존 결과는 새 결과로 바뀝니다.
        </p>

        <section
          style={{
            borderRadius: 20,
            border: "1px solid #334155",
            background: "#0f172a",
            padding: 18,
            marginBottom: 22,
          }}
        >
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: "8px 12px",
              margin: 0,
              color: "#e2e8f0",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            <dt style={{ color: "#94a3b8" }}>resultName</dt>
            <dd style={{ margin: 0 }}>{storedResult.resultName}</dd>

            <dt style={{ color: "#94a3b8" }}>resultType</dt>
            <dd style={{ margin: 0 }}>{storedResult.resultType}</dd>

            <dt style={{ color: "#94a3b8" }}>primaryGenreKey</dt>
            <dd style={{ margin: 0 }}>
              {storedResult.primaryGenreKey ?? "-"}
            </dd>

            <dt style={{ color: "#94a3b8" }}>completedAt</dt>
            <dd style={{ margin: 0 }}>{storedResult.completedAt}</dd>
          </dl>
        </section>

        <button
          type="button"
          onClick={onRestore}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 16,
            background: "#ffffff",
            color: "#0f172a",
            padding: "16px 18px",
            fontSize: 17,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          결과 다시 보기
        </button>

        <button
          type="button"
          onClick={onRetake}
          style={{
            width: "100%",
            marginTop: 10,
            border: "1px solid #475569",
            borderRadius: 16,
            background: "transparent",
            color: "#e2e8f0",
            padding: "14px 16px",
            fontSize: 15,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          다시 테스트하기
        </button>
      </section>
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
    const loadedResult = loadGenrePreferenceResult();
    setStoredResult(loadedResult);
    setStorageChecked(true);
  }, []);

  function resetTestState() {
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setCompleted(false);
    setRestoredResult(null);
  }

  function handleStart() {
    setHasStarted(true);
    resetTestState();
  }

  function handleRetake() {
    clearGenrePreferenceResult();
    setStoredResult(null);
    setHasStarted(true);
    resetTestState();
  }

  function handleRestoreStoredResult() {
    if (!storedResult) return;

    const restored = toGenrePreferenceResult(storedResult);

    setAnswers(restored.answers);
    setRestoredResult(restored);
    setHasStarted(true);
    setCompleted(true);
  }

  function handleSelect(side: PairChoiceSide) {
    if (!currentQuestion) return;

    setRestoredResult(null);

    setAnswers((prev) =>
      upsertAnswer(prev, {
        questionKey: currentQuestion.questionKey,
        selectedSide: side,
      })
    );
  }

  function handleNext() {
    if (!currentQuestion || !selectedSide) return;

    const isLastQuestion =
      currentQuestionIndex >= genrePreferenceQuestions.length - 1;

    if (isLastQuestion) {
      const nextStoredResult = saveGenrePreferenceResult(calculatedResult);
      setStoredResult(nextStoredResult);
      setRestoredResult(null);
      setCompleted(true);
      return;
    }

    setCurrentQuestionIndex((prev) => prev + 1);
  }

  function handlePrevious() {
    if (currentQuestionIndex <= 0) return;
    setCurrentQuestionIndex((prev) => prev - 1);
  }

  if (!storageChecked) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#ffffff",
          padding: 24,
        }}
      >
        <section
          style={{
            maxWidth: 760,
            margin: "0 auto",
            paddingTop: 72,
          }}
        >
          <p style={{ color: "#cbd5e1", fontSize: 18 }}>
            저장된 결과를 확인하는 중입니다.
          </p>
        </section>
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
        onNext={handleNext}
        onPrevious={handlePrevious}
        canGoPrevious={currentQuestionIndex > 0}
        isLastQuestion={
          currentQuestionIndex === genrePreferenceQuestions.length - 1
        }
      />
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#ffffff",
        padding: 24,
      }}
    >
      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          paddingTop: 72,
        }}
      >
        <p
          style={{
            margin: "0 0 12px",
            color: "#a5b4fc",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          {genrePreferenceStartCopy.helperText}
        </p>

        <h1
          style={{
            margin: "0 0 20px",
            fontSize: 34,
            lineHeight: 1.25,
          }}
        >
          {genrePreferenceStartCopy.title}
        </h1>

        <div
          style={{
            display: "grid",
            gap: 6,
            marginBottom: 28,
            color: "#cbd5e1",
            fontSize: 18,
            lineHeight: 1.7,
          }}
        >
          {genrePreferenceStartCopy.descriptionLines.map((line, index) =>
            line ? (
              <p key={`${line}-${index}`} style={{ margin: 0 }}>
                {line}
              </p>
            ) : (
              <div key={`space-${index}`} style={{ height: 8 }} />
            )
          )}
        </div>

        <section
          style={{
            borderRadius: 18,
            border: "1px solid #334155",
            background: "#0f172a",
            padding: 16,
            marginBottom: 22,
          }}
        >
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: "6px 10px",
              margin: 0,
              color: "#e2e8f0",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            <dt style={{ color: "#94a3b8" }}>testVersion</dt>
            <dd style={{ margin: 0 }}>{genrePreferenceTest.testVersion}</dd>

            <dt style={{ color: "#94a3b8" }}>selectMode</dt>
            <dd style={{ margin: 0 }}>{genrePreferenceTest.selectMode}</dd>

            <dt style={{ color: "#94a3b8" }}>questionCount</dt>
            <dd style={{ margin: 0 }}>{genrePreferenceTest.questionCount}</dd>
          </dl>
        </section>

        <button
          type="button"
          onClick={handleStart}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 16,
            background: "#ffffff",
            color: "#0f172a",
            padding: "16px 18px",
            fontSize: 17,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {genrePreferenceStartCopy.buttonText}
        </button>

        <p
          style={{
            margin: "18px 0 0",
            color: "#94a3b8",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          D+13에서는 Q10 완료 후 결과를 localStorage에 저장하고, 새로고침
          후 결과 다시 보기를 지원합니다.
        </p>
      </section>
    </main>
  );
}