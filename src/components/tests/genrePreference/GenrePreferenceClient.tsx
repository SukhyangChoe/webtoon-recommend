"use client";

import { useMemo, useState } from "react";
import {
  genrePreferenceQuestions,
  genrePreferenceStartCopy,
  genrePreferenceTest,
  type PairChoiceSide,
} from "@/data/tests/genrePreference";
import {
  calculateGenrePreferenceResult,
  type PairChoiceAnswer,
} from "@/lib/testEngine/calculateGenrePreferenceResult";
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

export default function GenrePreferenceClient() {
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<PairChoiceAnswer[]>([]);
  const [completed, setCompleted] = useState(false);

  const currentQuestion = genrePreferenceQuestions[currentQuestionIndex];

  const selectedSide = currentQuestion
    ? findAnswerByQuestionKey(answers, currentQuestion.questionKey)
        ?.selectedSide ?? null
    : null;

  const result = useMemo(() => {
    return calculateGenrePreferenceResult({
      answers,
      questions: genrePreferenceQuestions,
    });
  }, [answers]);

  function handleStart() {
    setHasStarted(true);
    setCompleted(false);
    setCurrentQuestionIndex(0);
    setAnswers([]);
  }

  function handleRetake() {
    setHasStarted(true);
    setCompleted(false);
    setCurrentQuestionIndex(0);
    setAnswers([]);
  }

  function handleSelect(side: PairChoiceSide) {
    if (!currentQuestion) return;

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
      setCompleted(true);
      return;
    }

    setCurrentQuestionIndex((prev) => prev + 1);
  }

  function handlePrevious() {
    if (currentQuestionIndex <= 0) return;
    setCurrentQuestionIndex((prev) => prev - 1);
  }

  if (completed) {
    return <GenrePreferenceResultView result={result} onRetake={handleRetake} />;
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
          D+12에서는 Q10 완료 후 내 웹툰 세계관 지도 결과 화면을 1차로
          표시합니다.
        </p>
      </section>
    </main>
  );
}