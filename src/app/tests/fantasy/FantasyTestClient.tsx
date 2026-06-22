"use client";

import { useMemo, useState } from "react";
import { fantasyResults } from "@/data/tests/fantasyResults";
import { calculateScores } from "@/lib/testEngine/calculateScores";
import { getTopBranchResult } from "@/lib/testEngine/getResult";
import type {
  SelectedOptionAnswer,
  TestAnswers,
  TestData,
} from "@/lib/testEngine/types";

function buildSelectedOptions(optionKeys: string[]): SelectedOptionAnswer[] {
  if (optionKeys.length === 1) {
    return [
      {
        optionKey: optionKeys[0],
        rank: 1,
        weight: 1.0,
      },
    ];
  }

  return optionKeys.map((optionKey, index) => ({
    optionKey,
    rank: (index + 1) as 1 | 2,
    weight: index === 0 ? 0.7 : 0.3,
  }));
}

export function FantasyTestClient({ test }: { test: TestData }) {
  const [started, setStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionKeys, setSelectedOptionKeys] = useState<string[]>([]);
  const [answers, setAnswers] = useState<TestAnswers>([]);
  const [completed, setCompleted] = useState(false);

  const currentQuestion = test.questions[currentQuestionIndex];

  const calculatedScores = useMemo(() => {
    return calculateScores(test, answers);
  }, [test, answers]);

  const resolvedResult = useMemo(() => {
    return getTopBranchResult({
      test,
      answers,
      branchScores: calculatedScores.branchScores,
      results: fantasyResults,
    });
  }, [test, answers, calculatedScores.branchScores]);

  const handleToggleChoice = (choiceId: string) => {
    setSelectedOptionKeys((prev) => {
      const alreadySelected = prev.includes(choiceId);

      if (alreadySelected) {
        return prev.filter((item) => item !== choiceId);
      }

      if (prev.length >= 2) {
        return prev;
      }

      return [...prev, choiceId];
    });
  };

  const handleNext = () => {
    if (selectedOptionKeys.length === 0) return;

    const selectedOptions = buildSelectedOptions(selectedOptionKeys);

    const nextAnswers = [
      ...answers.filter(
        (answer) => answer.questionKey !== currentQuestion.questionId
      ),
      {
        questionKey: currentQuestion.questionId,
        selectedOptions,
      },
    ];

    setAnswers(nextAnswers);

    if (currentQuestionIndex === test.questions.length - 1) {
      setCompleted(true);
      return;
    }

    setCurrentQuestionIndex((prev) => prev + 1);
    setSelectedOptionKeys([]);
  };

  if (!started) {
    return (
      <main style={{ padding: 24 }}>
        <h1>{test.intro.title}</h1>
        <p style={{ whiteSpace: "pre-line" }}>{test.intro.description}</p>
        <button type="button" onClick={() => setStarted(true)}>
          {test.intro.startButtonText}
        </button>
      </main>
    );
  }

  if (completed) {
    const result = resolvedResult.result;

    return (
      <main style={{ padding: 24 }}>
        <p>판타지 웹툰 취향 테스트 결과</p>

        {result ? (
          <section
            style={{
              padding: 20,
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#111827",
            }}
          >
            <h1>{result.resultName}</h1>
            <p>{result.oneLineDescription}</p>

            <div style={{ marginTop: 16 }}>
              <strong>대표 오브젝트 이미지 키</strong>
              <p>{result.imageKey}</p>
            </div>

            <div style={{ marginTop: 16 }}>
              <strong>이런 포인트에 끌려요</strong>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {result.displayTags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "#eef2ff",
                      color: "#3730a3",
                      fontSize: 14,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <strong>공유 문구</strong>
              <p>{result.shareText}</p>
            </div>

            <div style={{ marginTop: 20 }}>
              <button type="button">결과 공유하기</button>
              <button type="button" style={{ marginLeft: 8 }}>
                이 취향으로 웹툰 추천받기
              </button>
            </div>
          </section>
        ) : (
          <section>
            <h1>결과를 찾지 못했습니다.</h1>
            <p>branchScores와 fantasyResults 연결을 확인해주세요.</p>
          </section>
        )}

        <section style={{ marginTop: 32 }}>
          <h2>개발 확인용</h2>

          <h3>mainBranchKey</h3>
          <pre style={{ padding: 16, background: "#f3f4f6", color: "#111827" }}>
            {JSON.stringify(resolvedResult.mainBranchKey, null, 2)}
          </pre>

          <h3>subBranchKey</h3>
          <pre style={{ padding: 16, background: "#f3f4f6", color: "#111827" }}>
            {JSON.stringify(resolvedResult.subBranchKey, null, 2)}
          </pre>

          <h3>answers</h3>
          <pre style={{ padding: 16, background: "#111827", color: "#f9fafb" }}>
            {JSON.stringify(answers, null, 2)}
          </pre>

          <h3>branchScores</h3>
          <pre style={{ padding: 16, background: "#f3f4f6", color: "#111827" }}>
            {JSON.stringify(calculatedScores.branchScores, null, 2)}
          </pre>

          <h3>tagScores</h3>
          <pre style={{ padding: 16, background: "#f3f4f6", color: "#111827" }}>
            {JSON.stringify(calculatedScores.tagScores, null, 2)}
          </pre>

          <h3>avoidanceTagScores</h3>
          <pre style={{ padding: 16, background: "#f3f4f6", color: "#111827" }}>
            {JSON.stringify(calculatedScores.avoidanceTagScores, null, 2)}
          </pre>
        </section>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <p>
        질문 {currentQuestionIndex + 1}/{test.questions.length}
      </p>

      <h1>{currentQuestion.questionTitle}</h1>
      <p>{currentQuestion.questionText}</p>

      <p style={{ marginTop: 16, color: "#6b7280" }}>
        최대 2개까지 선택할 수 있어요. 먼저 고른 선택지가 ①, 두 번째가 ②로
        저장됩니다.
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        {currentQuestion.choices.map((choice) => {
          const selectedIndex = selectedOptionKeys.indexOf(choice.choiceId);
          const isSelected = selectedIndex >= 0;
          const rankLabel =
            selectedIndex === 0 ? "①" : selectedIndex === 1 ? "②" : "";

          return (
            <button
              key={choice.choiceId}
              type="button"
              onClick={() => handleToggleChoice(choice.choiceId)}
              aria-pressed={isSelected}
              style={{
                width: "100%",
                padding: 16,
                borderRadius: 12,
                border: isSelected ? "2px solid #111827" : "1px solid #d1d5db",
                background: isSelected ? "#eef2ff" : "#ffffff",
                color: "#111827",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <strong style={{ marginRight: 8 }}>{rankLabel}</strong>
              {choice.text}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={selectedOptionKeys.length === 0}
        onClick={handleNext}
        style={{
          marginTop: 24,
          padding: "12px 18px",
          borderRadius: 999,
          border: "none",
          background: selectedOptionKeys.length > 0 ? "#111827" : "#d1d5db",
          color: "#ffffff",
          cursor: selectedOptionKeys.length > 0 ? "pointer" : "not-allowed",
        }}
      >
        다음
      </button>
    </main>
  );
}