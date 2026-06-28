"use client";

import { useEffect, useMemo, useState } from "react";

import {
  clearDetailTestResult,
  loadDetailTestResult,
  saveDetailTestResult,
  type StoredDetailTestResult,
} from "@/lib/storage/testResultStorage";
import { calculateScores } from "@/lib/testEngine/calculateScores";
import { getTopBranchResult } from "@/lib/testEngine/getResult";
import type {
  CalculatedScores,
  ResolvedTestResult,
  SelectedOptionAnswer,
  TestAnswers,
  TestData,
  TestResult,
} from "@/lib/testEngine/types";

function getKstIsoString() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  return kst.toISOString().replace("Z", "+09:00");
}

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

function buildStoredDetailResult(params: {
  test: TestData;
  answers: TestAnswers;
  calculatedScores: CalculatedScores;
  resolvedResult: ResolvedTestResult;
}): StoredDetailTestResult | null {
  const { test, answers, calculatedScores, resolvedResult } = params;
  const result = resolvedResult.result;

  if (!result) {
    return null;
  }

  return {
    schemaVersion: "0.2",
    testKey: test.testKey,
    testVersion: "v0.2_ranked_multi_select",
    completedAt: getKstIsoString(),

    answers,

    branchScores: calculatedScores.branchScores,
    tagScores: calculatedScores.tagScores,
    avoidanceTagScores: calculatedScores.avoidanceTagScores,

    mainBranchKey: resolvedResult.mainBranchKey,
    subBranchKey: resolvedResult.subBranchKey,

    resultKey: result.resultKey,
    resultName: result.resultName,
    oneLineDescription: result.oneLineDescription,
    displayTags: result.displayTags,
    imageKey: result.imageKey,
    shareText: result.shareText,
  };
}

export function DetailTestClient({
  test,
  results,
  storageKey,
}: {
  test: TestData;
  results: TestResult[];
  storageKey: string;
}) {
  const [started, setStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionKeys, setSelectedOptionKeys] = useState<string[]>([]);
  const [answers, setAnswers] = useState<TestAnswers>([]);
  const [completed, setCompleted] = useState(false);

  const [savedResult, setSavedResult] =
    useState<StoredDetailTestResult | null>(null);

  const [resultToView, setResultToView] =
    useState<StoredDetailTestResult | null>(null);

  const currentQuestion = test.questions[currentQuestionIndex];

  useEffect(() => {
    const loadedResult = loadDetailTestResult(storageKey);
    setSavedResult(loadedResult);
  }, [storageKey]);

  const calculatedScores = useMemo(() => {
    return calculateScores(test, answers);
  }, [test, answers]);

  const resolvedResult = useMemo(() => {
    return getTopBranchResult({
      test,
      answers,
      branchScores: calculatedScores.branchScores,
      results,
    });
  }, [test, answers, calculatedScores.branchScores, results]);

  const resetTestState = () => {
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setSelectedOptionKeys([]);
    setCompleted(false);
    setResultToView(null);
  };

  const handleRestartTest = () => {
    clearDetailTestResult(storageKey);
    setSavedResult(null);
    resetTestState();
    setStarted(true);
  };

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

    const nextAnswers: TestAnswers = [
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
      const nextCalculatedScores = calculateScores(test, nextAnswers);

      const nextResolvedResult = getTopBranchResult({
        test,
        answers: nextAnswers,
        branchScores: nextCalculatedScores.branchScores,
        results,
      });

      const storedResult = buildStoredDetailResult({
        test,
        answers: nextAnswers,
        calculatedScores: nextCalculatedScores,
        resolvedResult: nextResolvedResult,
      });

      if (storedResult) {
        saveDetailTestResult(storageKey, storedResult);
        setSavedResult(storedResult);
        setResultToView(storedResult);
      }

      setCompleted(true);
      return;
    }

    setCurrentQuestionIndex((prev) => prev + 1);
    setSelectedOptionKeys([]);
  };

  if (!started && !completed && savedResult) {
    return (
      <main style={{ padding: 24 }}>
        <h1>저장된 {test.testName} 결과가 있습니다.</h1>
        <p>이전에 완료한 테스트 결과를 다시 볼 수 있어요.</p>

        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          <button
            type="button"
            onClick={() => {
              setResultToView(savedResult);
              setStarted(true);
              setCompleted(true);
            }}
          >
            결과 다시 보기
          </button>

          <button type="button" onClick={handleRestartTest}>
            다시 테스트하기
          </button>
        </div>

        <section style={{ marginTop: 32 }}>
          <h2>개발 확인용 savedResult</h2>
          <pre
            style={{
              padding: 16,
              background: "#111827",
              color: "#f9fafb",
              overflowX: "auto",
              borderRadius: 8,
            }}
          >
            {JSON.stringify(savedResult, null, 2)}
          </pre>
        </section>
      </main>
    );
  }

  if (completed) {
    const storedResult = resultToView;

    if (!storedResult) {
      return (
        <main style={{ padding: 24 }}>
          <h1>결과를 불러오지 못했습니다.</h1>
          <p>저장된 결과 또는 결과 산출 로직을 확인해주세요.</p>

          <button
            type="button"
            onClick={() => {
              clearDetailTestResult(storageKey);
              setSavedResult(null);
              resetTestState();
              setStarted(false);
            }}
          >
            처음으로 돌아가기
          </button>
        </main>
      );
    }

    return (
      <main style={{ padding: 24 }}>
        <p>{test.testName} 결과</p>

        <section
          style={{
            padding: 20,
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            color: "#111827",
          }}
        >
          <h1>{storedResult.resultName}</h1>
          <p>{storedResult.oneLineDescription}</p>

          <div style={{ marginTop: 16 }}>
            <strong>대표 오브젝트 이미지 키</strong>
            <p>{storedResult.imageKey}</p>
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
              {storedResult.displayTags.map((tag) => (
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
            <p>{storedResult.shareText}</p>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button type="button">결과 공유하기</button>
            <button type="button">이 취향으로 웹툰 추천받기</button>
          </div>

          <div style={{ marginTop: 20 }}>
            <button type="button" onClick={handleRestartTest}>
              다시 테스트하기
            </button>
          </div>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2>개발 확인용</h2>

          <h3>storageKey</h3>
          <pre
            style={{
              padding: 16,
              background: "#f3f4f6",
              color: "#111827",
              overflowX: "auto",
              borderRadius: 8,
            }}
          >
            {storageKey}
          </pre>

          <h3>savedResult</h3>
          <pre
            style={{
              padding: 16,
              background: "#111827",
              color: "#f9fafb",
              overflowX: "auto",
              borderRadius: 8,
            }}
          >
            {JSON.stringify(storedResult, null, 2)}
          </pre>

          <h3>answers</h3>
          <pre
            style={{
              padding: 16,
              background: "#f3f4f6",
              color: "#111827",
              overflowX: "auto",
              borderRadius: 8,
            }}
          >
            {JSON.stringify(storedResult.answers, null, 2)}
          </pre>

          <h3>mainBranchKey</h3>
          <pre
            style={{
              padding: 16,
              background: "#f3f4f6",
              color: "#111827",
              overflowX: "auto",
              borderRadius: 8,
            }}
          >
            {JSON.stringify(storedResult.mainBranchKey, null, 2)}
          </pre>

          <h3>subBranchKey</h3>
          <pre
            style={{
              padding: 16,
              background: "#f3f4f6",
              color: "#111827",
              overflowX: "auto",
              borderRadius: 8,
            }}
          >
            {JSON.stringify(storedResult.subBranchKey, null, 2)}
          </pre>

          <h3>branchScores</h3>
          <pre
            style={{
              padding: 16,
              background: "#f3f4f6",
              color: "#111827",
              overflowX: "auto",
              borderRadius: 8,
            }}
          >
            {JSON.stringify(storedResult.branchScores, null, 2)}
          </pre>

          <h3>tagScores</h3>
          <pre
            style={{
              padding: 16,
              background: "#f3f4f6",
              color: "#111827",
              overflowX: "auto",
              borderRadius: 8,
            }}
          >
            {JSON.stringify(storedResult.tagScores, null, 2)}
          </pre>

          <h3>avoidanceTagScores</h3>
          <pre
            style={{
              padding: 16,
              background: "#f3f4f6",
              color: "#111827",
              overflowX: "auto",
              borderRadius: 8,
            }}
          >
            {JSON.stringify(storedResult.avoidanceTagScores, null, 2)}
          </pre>
        </section>
      </main>
    );
  }

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

  return (
    <main style={{ padding: 24 }}>
      <p>
        질문 {currentQuestionIndex + 1}/{test.questions.length}
      </p>

      <h1>{currentQuestion.questionTitle}</h1>
      <p>{currentQuestion.questionText}</p>

      <p style={{ marginTop: 16, color: "#6b7280" }}>
        최대 2개까지 선택할 수 있어요. 먼저 고른 선택지가 ①, 두 번째가
        ②로 저장됩니다.
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        {currentQuestion.choices.map((choice) => {
          const selectedIndex = selectedOptionKeys.indexOf(choice.choiceId);
          const isSelected = selectedIndex >= 0;
          const rankLabel =
            selectedIndex === 0 ? "①" : selectedIndex === 1 ? "②" : "";
          const isImageCardQuestion = currentQuestion.order === 1;

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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong>{rankLabel}</strong>
                {choice.label ? <strong>{choice.label}</strong> : null}
              </div>

              {isImageCardQuestion && choice.imageKey ? (
                <p
                  style={{
                    marginTop: 8,
                    marginBottom: 8,
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  imageKey: {choice.imageKey}
                </p>
              ) : null}

              <p style={{ margin: 0, marginTop: 8 }}>
                {choice.shortDescription ?? choice.text}
              </p>
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