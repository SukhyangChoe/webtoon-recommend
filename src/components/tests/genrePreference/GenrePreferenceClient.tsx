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

function getResultTypeLabel(resultType: string) {
  if (resultType === "balanced") return "균형형";
  if (resultType === "linked") return "연결형";
  return "단일형";
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
            maxWidth: 900,
            margin: "0 auto",
            paddingTop: 44,
            paddingBottom: 48,
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
            D+11 계산 QA 화면
          </p>

          <h1
            style={{
              margin: "0 0 10px",
              fontSize: 32,
              lineHeight: 1.3,
            }}
          >
            {genrePreferenceTest.resultName} 계산 결과
          </h1>

          <p
            style={{
              margin: "0 0 24px",
              color: "#cbd5e1",
              fontSize: 17,
              lineHeight: 1.7,
            }}
          >
            아직 세계관 지도 UI를 완성하지 않고, answers → finalGenreScores
            → finalGenrePercentages → resultType 산출만 확인합니다.
          </p>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                borderRadius: 18,
                border: "1px solid #334155",
                background: "#0f172a",
                padding: 16,
              }}
            >
              <p
                style={{
                  margin: "0 0 8px",
                  color: "#94a3b8",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                resultType
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {getResultTypeLabel(result.resultType)} / {result.resultType}
              </p>
            </div>

            <div
              style={{
                borderRadius: 18,
                border: "1px solid #334155",
                background: "#0f172a",
                padding: 16,
              }}
            >
              <p
                style={{
                  margin: "0 0 8px",
                  color: "#94a3b8",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                primaryGenreKey
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {result.primaryGenreKey ?? "-"}
              </p>
            </div>

            <div
              style={{
                borderRadius: 18,
                border: "1px solid #334155",
                background: "#0f172a",
                padding: 16,
              }}
            >
              <p
                style={{
                  margin: "0 0 8px",
                  color: "#94a3b8",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                secondaryGenreKey
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {result.secondaryGenreKey ?? "-"}
              </p>
            </div>
          </section>

          <section
            style={{
              borderRadius: 20,
              border: "1px solid #334155",
              background: "#0f172a",
              padding: 18,
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 18,
              }}
            >
              finalGenrePercentages
            </h2>

            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {result.finalGenrePercentages.map((genre) => (
                <div
                  key={genre.genreKey}
                  style={{
                    borderRadius: 14,
                    background: "#020617",
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    <strong>
                      {genre.rank}위 {genre.genreName}
                    </strong>
                    <strong>{genre.roundedPercentage}%</strong>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 4,
                      color: "#94a3b8",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    <span>genreKey: {genre.genreKey}</span>
                    <span>score: {genre.score}</span>
                    <span>percentage: {genre.percentage}</span>
                    <span>visualState: {genre.visualState}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              borderRadius: 20,
              border: "1px solid #334155",
              background: "#0f172a",
              padding: 18,
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 18,
              }}
            >
              finalGenreScores
            </h2>

            <pre
              style={{
                margin: 0,
                padding: 16,
                borderRadius: 16,
                background: "#020617",
                color: "#e2e8f0",
                overflowX: "auto",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {JSON.stringify(result.finalGenreScores, null, 2)}
            </pre>
          </section>

          <section
            style={{
              borderRadius: 20,
              border: "1px solid #334155",
              background: "#0f172a",
              padding: 18,
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 18,
              }}
            >
              topGenreKeys
            </h2>

            <pre
              style={{
                margin: 0,
                padding: 16,
                borderRadius: 16,
                background: "#020617",
                color: "#e2e8f0",
                overflowX: "auto",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {JSON.stringify(result.topGenreKeys, null, 2)}
            </pre>
          </section>

          <section
            style={{
              borderRadius: 20,
              border: "1px solid #334155",
              background: "#0f172a",
              padding: 18,
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 18,
              }}
            >
              answers
            </h2>

            <pre
              style={{
                margin: 0,
                padding: 16,
                borderRadius: 16,
                background: "#020617",
                color: "#e2e8f0",
                overflowX: "auto",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {JSON.stringify(result.answers, null, 2)}
            </pre>
          </section>

          <section
            style={{
              borderRadius: 20,
              border: "1px solid #334155",
              background: "#0f172a",
              padding: 18,
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 18,
              }}
            >
              full result object
            </h2>

            <pre
              style={{
                margin: 0,
                padding: 16,
                borderRadius: 16,
                background: "#020617",
                color: "#e2e8f0",
                overflowX: "auto",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </section>

          <section
            style={{
              display: "flex",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setCompleted(false);
                setCurrentQuestionIndex(genrePreferenceQuestions.length - 1);
              }}
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid #475569",
                background: "transparent",
                color: "#e2e8f0",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Q10으로 돌아가기
            </button>

            <button
              type="button"
              onClick={handleRetake}
              style={{
                flex: 1,
                padding: "14px 16px",
                borderRadius: 14,
                border: "none",
                background: "#ffffff",
                color: "#0f172a",
                fontWeight: 900,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              다시 테스트하기
            </button>
          </section>

          <p
            style={{
              margin: "18px 0 0",
              color: "#94a3b8",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            작품 추천 리스트는 표시하지 않습니다. 추천은 이후 /find CTA로만
            연결합니다.
          </p>
        </section>
      </main>
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
          D+11에서는 Q1~Q10 답변 후 finalGenrePercentages와 resultType을
          확인합니다.
        </p>
      </section>
    </main>
  );
}