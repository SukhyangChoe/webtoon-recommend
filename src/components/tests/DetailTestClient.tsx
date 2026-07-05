"use client";

import { useEffect, useMemo, useState } from "react";
import { getDetailChoiceImageSrc } from "@/data/tests/detailChoiceImages";
import {
  clearTestResult,
  loadTestResult,
  saveTestResult,
} from "@/lib/storage/resultRepository";
import type {
  DetailTestAnswer,
  DetailTestCalculatedScores,
  DetailTestConfig,
  DetailTestData,
  DetailTestKey,
  DetailTestOption,
  DetailTestQuestion,
  DetailTestResult,
  RankedSelectedOption,
  ScoreMap,
} from "@/types/detailTest";
import type {
  StoredDetailAnswer,
  StoredDetailTestResult,
} from "@/types/testResults";

const RESULT_OBJECT_IMAGE_MAP: Record<string, string> = {
  fantasy_system_successor:
    "/images/detail-results/fantasy_system_window.png",
  fantasy_system_window: "/images/detail-results/fantasy_system_window.png",

  fantasy_hidden_power: "/images/detail-results/fantasy_hidden_aura.png",
  fantasy_hidden_aura: "/images/detail-results/fantasy_hidden_aura.png",

  fantasy_limit_breaker: "/images/detail-results/fantasy_limit_break.png",
  fantasy_limit_break: "/images/detail-results/fantasy_limit_break.png",

  fantasy_truth_chaser: "/images/detail-results/fantasy_truth_map.png",
  fantasy_truth_map: "/images/detail-results/fantasy_truth_map.png",

  fantasy_survival_commander:
    "/images/detail-results/fantasy_battle_fortress.png",
  fantasy_battle_fortress:
    "/images/detail-results/fantasy_battle_fortress.png",

  fantasy_kingdom_strategist:
    "/images/detail-results/fantasy_strategy_board.png",
  fantasy_strategy_board:
    "/images/detail-results/fantasy_strategy_board.png",

  murim_growth_training: "/images/detail-results/murim_growth_training.png",
  murim_absolute_power: "/images/detail-results/murim_absolute_power.png",
  murim_revenge_recovery: "/images/detail-results/murim_revenge_recovery.png",
  murim_sect_politics: "/images/detail-results/murim_sect_politics.png",
  murim_wanderer_justice: "/images/detail-results/murim_wanderer_justice.png",

  romance_contract_document:
    "/images/detail-results/romance_contract_document.png",
  romance_reversal_chess:
    "/images/detail-results/romance_reversal_chess.png",
  romance_emotional_garden:
    "/images/detail-results/romance_emotional_garden.png",
  romance_court_invitation:
    "/images/detail-results/romance_court_invitation.png",
  romance_direct_heart: "/images/detail-results/romance_direct_heart.png",
  romance_warm_teacup: "/images/detail-results/romance_warm_teacup.png",

  thriller_mystery_chaser: "/images/detail-results/thriller_mystery_clue.png",
  thriller_mystery_clue: "/images/detail-results/thriller_mystery_clue.png",
  thriller_survival_escape: "/images/detail-results/thriller_locked_exit.png",
  thriller_locked_exit: "/images/detail-results/thriller_locked_exit.png",
  thriller_occult_uncanny: "/images/detail-results/thriller_old_photo.png",
  thriller_old_photo: "/images/detail-results/thriller_old_photo.png",
  thriller_crime_revenge: "/images/detail-results/thriller_crime_trace.png",
  thriller_crime_trace: "/images/detail-results/thriller_crime_trace.png",
  thriller_psychological_tension:
    "/images/detail-results/thriller_silent_room.png",
  thriller_silent_room: "/images/detail-results/thriller_silent_room.png",
  thriller_conspiracy_twist:
    "/images/detail-results/thriller_conspiracy_file.png",
  thriller_conspiracy_file:
    "/images/detail-results/thriller_conspiracy_file.png",

  drama_life_realism: "/images/detail-results/drama_commute_window.png",
  drama_commute_window: "/images/detail-results/drama_commute_window.png",
  drama_youth_growth: "/images/detail-results/drama_worn_sneakers.png",
  drama_worn_sneakers: "/images/detail-results/drama_worn_sneakers.png",
  drama_healing_daily: "/images/detail-results/drama_warm_cafe.png",
  drama_warm_cafe: "/images/detail-results/drama_warm_cafe.png",
  drama_family_relationship: "/images/detail-results/drama_family_note.png",
  drama_family_note: "/images/detail-results/drama_family_note.png",
  drama_emotional_afterglow: "/images/detail-results/drama_old_letter.png",
  drama_old_letter: "/images/detail-results/drama_old_letter.png",
  drama_comedy_life: "/images/detail-results/drama_daily_laugh.png",
  drama_daily_laugh: "/images/detail-results/drama_daily_laugh.png",
};

const TIE_BREAK_ORDER = ["_q4", "_q5", "_q2", "_q3", "_q1"];

function getStringValue(
  source: Record<string, unknown>,
  key: string
): string | undefined {
  const value = source[key];
  return typeof value === "string" ? value : undefined;
}

function getNumberValue(
  source: Record<string, unknown>,
  key: string
): number | undefined {
  const value = source[key];
  return typeof value === "number" ? value : undefined;
}

function getStringArrayValue(
  source: Record<string, unknown>,
  key: string
): string[] | undefined {
  const value = source[key];

  if (!Array.isArray(value)) return undefined;

  const onlyStrings = value.filter(
    (item): item is string => typeof item === "string"
  );

  return onlyStrings.length === value.length ? onlyStrings : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }

  return {};
}

function createStoredResult(params: {
  testKey: DetailTestKey;
  testVersion: string;
  answers: Record<string, DetailTestAnswer>;
  scores: DetailTestCalculatedScores;
  result: DetailTestResult;
}): StoredDetailTestResult {
  const { testKey, testVersion, answers, scores, result } = params;

  return {
    schemaVersion: "0.2",
    testKey,
    testVersion,
    completedAt: new Date().toISOString(),
    answers: Object.values(answers) as StoredDetailAnswer[],
    branchScores: scores.branchScores,
    tagScores: scores.tagScores,
    avoidanceTagScores: scores.avoidanceTagScores,
    mainBranchKey: scores.mainBranchKey ?? "",
    subBranchKey: scores.subBranchKey ?? null,
    resultKey: getResultKey(result),
    resultName: getResultName(result),
    oneLineDescription: getResultSummary(result),
    staySceneText: getResultSceneText(result) ?? "",
    displayTags: getResultDisplayTags(result),
    imageKey: getResultImageKey(result),
    shareText: getResultShareText(result),
  };
}

function isDetailTestKey(testKey: string): testKey is DetailTestKey {
  return (
    testKey === "fantasy_detail" ||
    testKey === "murim_detail" ||
    testKey === "romance_ropan_detail" ||
    testKey === "thriller_horror_detail" ||
    testKey === "drama_daily_detail"
  );
}

function getOptionKey(option: DetailTestOption): string {
  const optionRecord = asRecord(option);

  return (
    option.optionKey ||
    option.choiceId ||
    option.id ||
    getStringValue(optionRecord, "choiceKey") ||
    getStringValue(optionRecord, "key") ||
    ""
  );
}

function getQuestionKey(
  question: DetailTestQuestion,
  fallbackIndex: number
): string {
  const questionRecord = asRecord(question);

  return (
    question.questionKey ||
    question.questionId ||
    question.id ||
    getStringValue(questionRecord, "key") ||
    `question_${fallbackIndex + 1}`
  );
}

function getQuestionTitle(question: DetailTestQuestion, index: number): string {
  return question.title || question.questionTitle || getDefaultQuestionTitle(index);
}

function getQuestionText(question: DetailTestQuestion): string {
  return question.questionText || question.text || "";
}

function getQuestionOptions(question: DetailTestQuestion): DetailTestOption[] {
  return question.options || question.choices || [];
}

function getOptionLabel(option: DetailTestOption): string {
  return option.label || option.text || option.shortDescription || "선택지";
}

function getOptionDescription(option: DetailTestOption): string {
  if (option.shortDescription) return option.shortDescription;

  if (option.label && option.text && option.label !== option.text) {
    return option.text;
  }

  return "";
}

function getDefaultQuestionTitle(index: number): string {
  const titles = [
    "시작 장면",
    "인물",
    "사건 전개",
    "연출",
    "다음 화 흐름",
    "부담 요소",
  ];

  return titles[index] ?? `질문 ${index + 1}`;
}

function getGenreLabel(testKey: string): string {
  if (testKey === "fantasy_detail") return "판타지";
  if (testKey === "murim_detail") return "무협";
  if (testKey === "romance_ropan_detail") return "로맨스·로판";
  if (testKey === "thriller_horror_detail") return "스릴러·공포";
  if (testKey === "drama_daily_detail") return "드라마·일상";

  return "장르별";
}

function getRankedSelectedOptions(
  optionKeys: string[]
): RankedSelectedOption[] {
  if (optionKeys.length === 1) {
    return [
      {
        optionKey: optionKeys[0],
        rank: 1,
        weight: 1.0,
      },
    ];
  }

  return optionKeys.slice(0, 2).map((optionKey, index) => ({
    optionKey,
    rank: index === 0 ? 1 : 2,
    weight: index === 0 ? 0.7 : 0.3,
  }));
}

function addScores(
  target: ScoreMap,
  source: ScoreMap | undefined,
  weight: number
): void {
  if (!source) return;

  Object.entries(source).forEach(([key, value]) => {
    target[key] = Number(((target[key] ?? 0) + value * weight).toFixed(10));
  });
}

function isAvoidanceQuestion(
  questionKey: string,
  questionIndex: number
): boolean {
  return questionIndex === 5 || questionKey.endsWith("_q6");
}

function findOptionByKey(
  question: DetailTestQuestion,
  optionKey: string
): DetailTestOption | undefined {
  return getQuestionOptions(question).find(
    (option) => getOptionKey(option) === optionKey
  );
}

function calculateScores(
  answers: Record<string, DetailTestAnswer>,
  questions: DetailTestQuestion[]
): DetailTestCalculatedScores {
  const branchScores: ScoreMap = {};
  const tagScores: ScoreMap = {};
  const avoidanceTagScores: ScoreMap = {};

  questions.forEach((question, questionIndex) => {
    const questionKey = getQuestionKey(question, questionIndex);
    const answer = answers[questionKey];

    if (!answer) return;

    answer.selectedOptions.forEach((selectedOption) => {
      const option = findOptionByKey(question, selectedOption.optionKey);

      if (!option) return;

      if (isAvoidanceQuestion(questionKey, questionIndex)) {
        addScores(
          avoidanceTagScores,
          option.avoidanceTagScores,
          selectedOption.weight
        );
        return;
      }

      addScores(branchScores, option.branchScores, selectedOption.weight);
      addScores(tagScores, option.tagScores, selectedOption.weight);
    });
  });

  const sortedBranches = Object.entries(branchScores).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

  const mainBranchKey = sortedBranches[0]?.[0] ?? null;
  const subBranchKey = sortedBranches[1]?.[0] ?? null;

  return {
    branchScores,
    tagScores,
    avoidanceTagScores,
    mainBranchKey,
    subBranchKey,
  };
}

function resolveMainBranchWithTieBreak(params: {
  branchScores: ScoreMap;
  answers: Record<string, DetailTestAnswer>;
  questions: DetailTestQuestion[];
}): string | null {
  const { branchScores, answers, questions } = params;
  const entries = Object.entries(branchScores);

  if (entries.length === 0) return null;

  const maxScore = Math.max(...entries.map(([, score]) => score));
  const tiedBranchKeys = entries
    .filter(([, score]) => score === maxScore)
    .map(([branchKey]) => branchKey);

  if (tiedBranchKeys.length === 1) {
    return tiedBranchKeys[0];
  }

  for (const suffix of TIE_BREAK_ORDER) {
    const questionIndex = questions.findIndex((question, index) => {
      const questionKey = getQuestionKey(question, index);
      return questionKey.endsWith(suffix);
    });

    if (questionIndex < 0) continue;

    const question = questions[questionIndex];
    const questionKey = getQuestionKey(question, questionIndex);
    const answer = answers[questionKey];

    if (!answer) continue;

    for (const selectedOption of answer.selectedOptions) {
      const option = findOptionByKey(question, selectedOption.optionKey);
      const optionBranchKeys = Object.keys(option?.branchScores ?? {});
      const matchedBranchKey = optionBranchKeys.find((branchKey) =>
        tiedBranchKeys.includes(branchKey)
      );

      if (matchedBranchKey) {
        return matchedBranchKey;
      }
    }
  }

  return tiedBranchKeys[0];
}

function normalizeResult(
  rawResult: DetailTestResult | undefined,
  fallbackBranchKey: string
): DetailTestResult {
  const resultKey =
    rawResult?.resultKey || rawResult?.branchKey || fallbackBranchKey;

  const branchKey = rawResult?.branchKey || resultKey || fallbackBranchKey;

  return {
    ...rawResult,
    resultKey,
    branchKey,
    resultName:
      rawResult?.resultName ||
      rawResult?.name ||
      rawResult?.title ||
      branchKey ||
      "결과를 찾을 수 없습니다",
    oneLineDescription:
      rawResult?.oneLineDescription ||
      rawResult?.summary ||
      rawResult?.description ||
      "결과 설명은 이후 문구 정리 단계에서 보강됩니다.",
    staySceneText:
      rawResult?.staySceneText ||
      getStringValue(asRecord(rawResult), "sceneText") ||
      "",
    displayTags: getResultDisplayTags(rawResult),
    imageKey: rawResult?.imageKey || branchKey,
    shareText: rawResult?.shareText || "",
  };
}

function getResultByBranch(
  results: DetailTestResult[],
  branchKey: string | null
): DetailTestResult {
  const fallbackBranchKey = branchKey || "unknown_result";

  const matchedResult = results.find((result) => {
    return (
      result.branchKey === fallbackBranchKey ||
      result.resultKey === fallbackBranchKey
    );
  });

  return normalizeResult(matchedResult, fallbackBranchKey);
}

function normalizeStoredResult(
  storedResult: StoredDetailTestResult,
  results: DetailTestResult[] = []
): DetailTestResult {
  const matchedResult = results.find((result) => {
    return (
      result.resultKey === storedResult.resultKey ||
      result.branchKey === storedResult.resultKey ||
      result.branchKey === storedResult.mainBranchKey
    );
  });

  const matchedSceneText = matchedResult
    ? getResultSceneText(matchedResult)
    : undefined;

  return {
    resultKey: storedResult.resultKey,
    branchKey: storedResult.mainBranchKey || storedResult.resultKey,
    resultName: storedResult.resultName,
    oneLineDescription: storedResult.oneLineDescription,
    staySceneText: storedResult.staySceneText || matchedSceneText || "",
    displayTags: storedResult.displayTags ?? [],
    imageKey:
      storedResult.imageKey || storedResult.mainBranchKey || storedResult.resultKey,
    shareText: storedResult.shareText ?? "",
  };
}

function getResultKey(result: DetailTestResult): string {
  return result.resultKey || result.branchKey;
}

function getResultName(result: DetailTestResult): string {
  return (
    result.resultName ||
    result.name ||
    result.title ||
    result.branchKey ||
    "결과를 찾을 수 없습니다"
  );
}

function getResultSummary(result: DetailTestResult): string {
  return (
    result.oneLineDescription ||
    result.summary ||
    result.description ||
    "결과 설명은 이후 문구 정리 단계에서 보강됩니다."
  );
}

function getResultDisplayTags(result?: DetailTestResult): string[] {
  if (!result) return [];

  const resultRecord = asRecord(result);

  return (
    result.displayTags ||
    getStringArrayValue(resultRecord, "tagKeys") ||
    getStringArrayValue(resultRecord, "tagScoreKeys") ||
    []
  );
}

function getResultImageKey(result: DetailTestResult): string {
  return result.imageKey || result.branchKey || result.resultKey || "";
}

function getResultShareText(result: DetailTestResult): string {
  return result.shareText || "";
}

function getResultSceneText(result: DetailTestResult): string | undefined {
  const resultRecord = asRecord(result);

  return (
    getStringValue(resultRecord, "sceneText") ||
    getStringValue(resultRecord, "staySceneText")
  );
}

function getTestVersion(testData: DetailTestData): string {
  return testData.testVersion || testData.version || "v0.2_ranked_multi_select";
}

function getStartTitle(testData: DetailTestData, genreLabel: string): string {
  const testDataRecord = asRecord(testData);

  return (
    getStringValue(testDataRecord, "startTitle") ||
    `제목 없는 ${genreLabel} 웹툰 원고가 도착했습니다.`
  );
}

function getStartDescription(
  testData: DetailTestData,
  genreLabel: string
): string {
  const testDataRecord = asRecord(testData);

  return (
    getStringValue(testDataRecord, "startDescription") ||
    `당신이 고르는 장면들이 모여 오래 머물 ${genreLabel}의 방향을 만들어갑니다.`
  );
}

function getStartButtonText(testData: DetailTestData): string {
  const testDataRecord = asRecord(testData);

  return getStringValue(testDataRecord, "startButtonText") || "첫 장면 확인하기";
}

function PreviousSelectionSummary({
  currentQuestionIndex,
  questions,
  answers,
}: {
  currentQuestionIndex: number;
  questions: DetailTestQuestion[];
  answers: Record<string, DetailTestAnswer>;
}) {
  if (currentQuestionIndex === 0) return null;

  const isQ6 = currentQuestionIndex === 5;

  const targetQuestions = isQ6
    ? questions.slice(0, currentQuestionIndex)
    : questions.slice(currentQuestionIndex - 1, currentQuestionIndex);

  const summaryRows = targetQuestions
    .map((question, slicedIndex) => {
      const actualIndex = isQ6
        ? slicedIndex
        : currentQuestionIndex - 1 + slicedIndex;

      const questionKey = getQuestionKey(question, actualIndex);
      const answer = answers[questionKey];

      if (!answer || answer.selectedOptions.length === 0) return null;

      const selectedLabels = answer.selectedOptions
        .map((selectedOption) => {
          const option = findOptionByKey(question, selectedOption.optionKey);
          if (!option) return null;

          return `${selectedOption.rank === 1 ? "①" : "②"} ${getOptionLabel(
            option
          )}`;
        })
        .filter(Boolean);

      if (selectedLabels.length === 0) return null;

      return {
        role: getDefaultQuestionTitle(actualIndex),
        labels: selectedLabels.join(" / "),
      };
    })
    .filter(Boolean) as { role: string; labels: string }[];

  if (summaryRows.length === 0) return null;

  return (
    <section
      style={{
        margin: "18px 0",
        padding: 16,
        borderRadius: 16,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
      }}
    >
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 14,
          fontWeight: 800,
          color: "#475569",
        }}
      >
        {isQ6 ? "지금까지 끌린 요소" : "이전 선택"}
      </p>

      <div style={{ display: "grid", gap: 6 }}>
        {summaryRows.map((row) => (
          <p
            key={`${row.role}-${row.labels}`}
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.5,
              color: "#334155",
            }}
          >
            <strong>{row.role}</strong>: {row.labels}
          </p>
        ))}
      </div>

      {isQ6 ? (
        <p
          style={{
            margin: "12px 0 0",
            fontSize: 14,
            lineHeight: 1.5,
            color: "#64748b",
          }}
        >
          마지막으로, 덜 보고 싶은 부담 요소를 골라주세요.
        </p>
      ) : null}
    </section>
  );
}

function ResultObjectImage({
  imageKey,
  resultName,
}: {
  imageKey: string;
  resultName: string;
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const imageSrc = RESULT_OBJECT_IMAGE_MAP[imageKey];

  if (!imageSrc || hasImageError) {
    return (
      <section
        style={{
          marginTop: 16,
          padding: 24,
          borderRadius: 20,
          border: "1px solid #e5e7eb",
          background: "#f8fafc",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 18,
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          이미지 준비 중
        </p>
      </section>
    );
  }

  return (
    <section style={{ marginTop: 16 }}>
      <img
        src={imageSrc}
        alt={`${resultName} 대표 오브젝트`}
        onError={() => setHasImageError(true)}
        style={{
          width: "100%",
          maxHeight: 360,
          objectFit: "contain",
          borderRadius: 20,
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
        }}
      />
    </section>
  );
}

function ResultTagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <section style={{ marginTop: 28 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>
        이런 포인트에 끌려요
      </h3>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              padding: "8px 12px",
              background: "#eef2ff",
              color: "#4338ca",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}

function DetailResultView({
  genreLabel,
  result,
  onRetake,
  debugData,
}: {
  genreLabel: string;
  result: DetailTestResult;
  onRetake: () => void;
  debugData: unknown;
}) {
  const resultName = getResultName(result);
  const resultSummary = getResultSummary(result);
  const resultImageKey = getResultImageKey(result);
  const resultShareText = getResultShareText(result);
  const resultSceneText = getResultSceneText(result);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        padding: 24,
        color: "#0f172a",
      }}
    >
      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          borderRadius: 28,
          background: "#ffffff",
          padding: 24,
        }}
      >
        <p
          style={{
            margin: "0 0 10px",
            color: "#6366f1",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          {genreLabel} 웹툰 취향 테스트 결과
        </p>

        <h1
          style={{
            margin: "0 0 16px",
            fontSize: 30,
            lineHeight: 1.25,
          }}
        >
          {resultName}
        </h1>

        <ResultObjectImage imageKey={resultImageKey} resultName={resultName} />

        <section style={{ marginTop: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 900 }}>
            한 줄 해석
          </h2>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.7 }}>
            {resultSummary}
          </p>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 900 }}>
            당신이 오래 머무를 장면
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              lineHeight: 1.7,
              color: "#334155",
            }}
          >
            {resultSceneText ??
              "이 결과에 맞는 장면 설명은 이후 결과 문구 정리 단계에서 보강됩니다."}
          </p>
        </section>

        <ResultTagList tags={getResultDisplayTags(result)} />

        <section style={{ marginTop: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 900 }}>
            공유 문구
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: 1.7,
              color: "#475569",
            }}
          >
            {resultShareText || "공유 문구는 이후 단계에서 보강됩니다."}
          </p>
        </section>

        <section style={{ marginTop: 28 }}>
          <button
            type="button"
            onClick={() => alert("공유 기능은 이후 단계에서 연결됩니다.")}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid #c7d2fe",
              background: "#ffffff",
              color: "#4338ca",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            결과 공유하기
          </button>

          <button
            type="button"
            onClick={() =>
              alert("이 취향으로 웹툰 추천받기는 이후 /find와 연결됩니다.")
            }
            style={{
              width: "100%",
              marginTop: 10,
              padding: "14px 16px",
              borderRadius: 14,
              border: "none",
              background: "#4f46e5",
              color: "#ffffff",
              fontWeight: 900,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            이 취향으로 웹툰 추천받기
          </button>

          <button
            type="button"
            onClick={onRetake}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              background: "#f8fafc",
              color: "#334155",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            다시 테스트하기
          </button>
        </section>

        {process.env.NODE_ENV === "development" ? (
          <details style={{ marginTop: 28 }}>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 900,
                color: "#475569",
              }}
            >
              개발 확인용 점수 보기
            </summary>

            <pre
              style={{
                marginTop: 12,
                padding: 16,
                borderRadius: 16,
                background: "#0f172a",
                color: "#e2e8f0",
                overflowX: "auto",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </details>
        ) : null}
      </section>
    </main>
  );
}

function ChoiceImagePreview({
  imageKey,
  label,
}: {
  imageKey?: string;
  label: string;
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const imageSrc = getDetailChoiceImageSrc(imageKey);

  if (!imageSrc || hasImageError) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          aspectRatio: "4 / 5",
          borderRadius: 16,
          background: "#e2e8f0",
          margin: "0 auto 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#64748b",
          fontSize: 14,
          fontWeight: 800,
          overflow: "hidden",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div>이미지 준비 중</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        aspectRatio: "4 / 5",
        borderRadius: 16,
        background: "#e2e8f0",
        margin: "0 auto 14px",
        overflow: "hidden",
      }}
    >
      <img
        src={imageSrc}
        alt={`${label} 선택지 이미지`}
        onError={() => setHasImageError(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          background: "#e2e8f0",
        }}
      />
    </div>
  );
}

function QuestionOptionCard({
  option,
  isSelected,
  rank,
  isImageCard,
  onClick,
}: {
  option: DetailTestOption;
  isSelected: boolean;
  rank?: number;
  isImageCard: boolean;
  onClick: () => void;
}) {
  const label = getOptionLabel(option);
  const description = getOptionDescription(option);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 18,
        border: isSelected ? "2px solid #4f46e5" : "1px solid #e5e7eb",
        background: isSelected ? "#eef2ff" : "#ffffff",
        padding: 20,
        cursor: "pointer",
        color: "#0f172a",
      }}
    >
      {isImageCard ? (
        <ChoiceImagePreview imageKey={option.imageKey} label={label} />
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isSelected ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 999,
              background: "#4f46e5",
              color: "#ffffff",
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            {rank === 1 ? "①" : "②"}
          </span>
        ) : null}

        <strong style={{ fontSize: 18, lineHeight: 1.4 }}>{label}</strong>
      </div>

      {description ? (
        <p
          style={{
            margin: "12px 0 0",
            fontSize: 15,
            lineHeight: 1.7,
            color: "#334155",
          }}
        >
          {description}
        </p>
      ) : null}
    </button>
  );
}

export function DetailTestClient({ config }: { config: DetailTestConfig }) {
  const testData = config.testData;
  const results = config.results ?? [];

  const testKey = testData.testKey;
  const detailTestKey = isDetailTestKey(testKey) ? testKey : null;
  const testVersion = getTestVersion(testData);
  const genreLabel = getGenreLabel(testKey);
  const questions = testData.questions ?? [];

  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionKeys, setSelectedOptionKeys] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, DetailTestAnswer>>({});
  const [storedResult, setStoredResult] = useState<StoredDetailTestResult | null>(
    null
  );
  const [currentResult, setCurrentResult] = useState<DetailTestResult | null>(
    null
  );
  const [completed, setCompleted] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  const currentQuestionKey = useMemo(() => {
    if (!currentQuestion) return "";
    return getQuestionKey(currentQuestion, currentQuestionIndex);
  }, [currentQuestion, currentQuestionIndex]);

  const currentSelectedRanks = useMemo(() => {
    const map: Record<string, number> = {};
    selectedOptionKeys.forEach((optionKey, index) => {
      map[optionKey] = index + 1;
    });
    return map;
  }, [selectedOptionKeys]);

  const calculatedScores = useMemo(() => {
    return calculateScores(answers, questions);
  }, [answers, questions]);

  useEffect(() => {
    if (!detailTestKey) return;

    const loadedResult = loadTestResult(detailTestKey);
    // 저장된 테스트 결과를 최초 진입 시 1회 복원하기 위한 의도적 hydration 처리입니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStoredResult(loadedResult);
  }, [detailTestKey]);

  function handleStart() {
    setHasStarted(true);
    setCompleted(false);
    setCurrentResult(null);
    setCurrentQuestionIndex(0);
    setSelectedOptionKeys([]);
  }

  function handleShowStoredResult() {
    if (!storedResult) return;

    const restoredAnswers: Record<string, DetailTestAnswer> = {};
    storedResult.answers.forEach((answer) => {
      restoredAnswers[answer.questionKey] = answer;
    });

    setAnswers(restoredAnswers);
    setCurrentResult(normalizeStoredResult(storedResult, results));
    setCompleted(true);
    setHasStarted(true);
  }

  function handleRetake() {
    if (!detailTestKey) return;

    clearTestResult(detailTestKey);
    setStoredResult(null);
    setAnswers({});
    setCurrentResult(null);
    setCompleted(false);
    setHasStarted(true);
    setCurrentQuestionIndex(0);
    setSelectedOptionKeys([]);
  }

  function handleOptionToggle(optionKey: string) {
    setSelectedOptionKeys((prev) => {
      if (prev.includes(optionKey)) {
        return prev.filter((key) => key !== optionKey);
      }

      if (prev.length >= 2) {
        return prev;
      }

      return [...prev, optionKey];
    });
  }

  function goToPreviousQuestion() {
    if (currentQuestionIndex === 0) return;

    const previousIndex = currentQuestionIndex - 1;
    const previousQuestion = questions[previousIndex];
    const previousQuestionKey = getQuestionKey(previousQuestion, previousIndex);
    const previousAnswer = answers[previousQuestionKey];

    setCurrentQuestionIndex(previousIndex);
    setSelectedOptionKeys(
      previousAnswer?.selectedOptions.map((option) => option.optionKey) ?? []
    );
  }

  function completeTest(nextAnswers: Record<string, DetailTestAnswer>) {
    if (!detailTestKey) return;

    const rawScores = calculateScores(nextAnswers, questions);

    const resolvedMainBranchKey = resolveMainBranchWithTieBreak({
      branchScores: rawScores.branchScores,
      answers: nextAnswers,
      questions,
    });

    const sortedBranches = Object.entries(rawScores.branchScores)
      .filter(([branchKey]) => branchKey !== resolvedMainBranchKey)
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      });

    const scores: DetailTestCalculatedScores = {
      ...rawScores,
      mainBranchKey: resolvedMainBranchKey,
      subBranchKey: sortedBranches[0]?.[0] ?? null,
    };

    const result = getResultByBranch(results, scores.mainBranchKey);

    const nextStoredResult = createStoredResult({
      testKey: detailTestKey,
      testVersion,
      answers: nextAnswers,
      scores,
      result,
    });

    saveTestResult(detailTestKey, nextStoredResult);

    setStoredResult(nextStoredResult);
    setCurrentResult(result);
    setCompleted(true);
  }

  function handleNextQuestion() {
    if (!currentQuestion) return;
    if (selectedOptionKeys.length === 0) return;

    const nextAnswer: DetailTestAnswer = {
      questionKey: currentQuestionKey,
      selectedOptions: getRankedSelectedOptions(selectedOptionKeys),
    };

    const nextAnswers: Record<string, DetailTestAnswer> = {
      ...answers,
      [currentQuestionKey]: nextAnswer,
    };

    setAnswers(nextAnswers);

    const isLastQuestion = currentQuestionIndex >= questions.length - 1;

    if (isLastQuestion) {
      completeTest(nextAnswers);
      return;
    }

    const nextQuestionIndex = currentQuestionIndex + 1;
    const nextQuestion = questions[nextQuestionIndex];
    const nextQuestionKey = getQuestionKey(nextQuestion, nextQuestionIndex);
    const savedNextAnswer = nextAnswers[nextQuestionKey];

    setCurrentQuestionIndex(nextQuestionIndex);
    setSelectedOptionKeys(
      savedNextAnswer?.selectedOptions.map((option) => option.optionKey) ?? []
    );
  }

  if (!detailTestKey) {
    return (
      <main style={{ padding: 24 }}>
        <h1>지원하지 않는 테스트입니다.</h1>
      </main>
    );
  }

  if (completed && currentResult) {
    const debugData = {
      testKey: detailTestKey,
      storedResult,
      answers,
      calculatedScores,
      result: currentResult,
    };

    return (
      <DetailResultView
        genreLabel={genreLabel}
        result={currentResult}
        onRetake={handleRetake}
        debugData={debugData}
      />
    );
  }

  if (!hasStarted) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#ffffff",
          padding: 24,
        }}
      >
        <section style={{ maxWidth: 760, margin: "0 auto", paddingTop: 64 }}>
          <h1 style={{ fontSize: 32, lineHeight: 1.3, marginBottom: 16 }}>
            {getStartTitle(testData, genreLabel)}
          </h1>

          <p
            style={{
              fontSize: 20,
              lineHeight: 1.7,
              color: "#cbd5e1",
              marginBottom: 28,
            }}
          >
            {getStartDescription(testData, genreLabel)}
          </p>

          {storedResult ? (
            <section
              style={{
                marginBottom: 24,
                padding: 18,
                borderRadius: 18,
                background: "#111827",
                border: "1px solid #334155",
              }}
            >
              <p style={{ margin: "0 0 12px", color: "#e2e8f0" }}>
                저장된 {genreLabel} 결과가 있습니다.
              </p>

              <button
                type="button"
                onClick={handleShowStoredResult}
                style={{
                  marginRight: 8,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "none",
                  background: "#4f46e5",
                  color: "#ffffff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                결과 다시 보기
              </button>

              <button
                type="button"
                onClick={handleRetake}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #475569",
                  background: "transparent",
                  color: "#e2e8f0",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                다시 테스트하기
              </button>
            </section>
          ) : null}

          <button
            type="button"
            onClick={handleStart}
            style={{
              padding: "14px 18px",
              borderRadius: 14,
              border: "none",
              background: "#ffffff",
              color: "#0f172a",
              fontWeight: 900,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            {getStartButtonText(testData)}
          </button>
        </section>
      </main>
    );
  }

  if (!currentQuestion) {
    return (
      <main style={{ padding: 24 }}>
        <h1>질문 데이터를 찾을 수 없습니다.</h1>
        <button type="button" onClick={handleRetake}>
          다시 시작하기
        </button>
      </main>
    );
  }

  const currentOptions = getQuestionOptions(currentQuestion);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#ffffff",
        padding: 24,
      }}
    >
      <section style={{ maxWidth: 840, margin: "0 auto" }}>
        <p style={{ color: "#94a3b8", fontWeight: 800, marginBottom: 8 }}>
          질문 {currentQuestionIndex + 1}/{questions.length}
        </p>

        <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>
          {getQuestionTitle(currentQuestion, currentQuestionIndex)}
        </h1>

        <p
          style={{
            fontSize: 20,
            lineHeight: 1.6,
            color: "#e2e8f0",
            margin: "0 0 12px",
          }}
        >
          {getQuestionText(currentQuestion)}
        </p>

        <p
          style={{
            color: "#94a3b8",
            fontSize: 15,
            lineHeight: 1.6,
            margin: "0 0 18px",
          }}
        >
          최대 2개까지 선택할 수 있어요. 먼저 고른 선택지가 ①, 두 번째가
          ②로 저장됩니다.
        </p>

        <PreviousSelectionSummary
          currentQuestionIndex={currentQuestionIndex}
          questions={questions}
          answers={answers}
        />

        <div style={{ display: "grid", gap: 14 }}>
          {currentOptions.map((option) => {
            const optionKey = getOptionKey(option);
            const rank = currentSelectedRanks[optionKey];
            const isSelected = Boolean(rank);
            const isImageCard = currentQuestion.cardType === "image" && Boolean(option.imageKey);

            return (
              <QuestionOptionCard
                key={optionKey}
                option={option}
                rank={rank}
                isSelected={isSelected}
                isImageCard={isImageCard}
                onClick={() => handleOptionToggle(optionKey)}
              />
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 24,
          }}
        >
          <button
            type="button"
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid #475569",
              background:
                currentQuestionIndex === 0 ? "#1e293b" : "transparent",
              color: currentQuestionIndex === 0 ? "#64748b" : "#e2e8f0",
              fontWeight: 800,
              cursor: currentQuestionIndex === 0 ? "not-allowed" : "pointer",
            }}
          >
            이전
          </button>

          <button
            type="button"
            onClick={handleNextQuestion}
            disabled={selectedOptionKeys.length === 0}
            style={{
              flex: 1,
              padding: "14px 16px",
              borderRadius: 14,
              border: "none",
              background:
                selectedOptionKeys.length === 0 ? "#334155" : "#4f46e5",
              color: "#ffffff",
              fontWeight: 900,
              fontSize: 16,
              cursor:
                selectedOptionKeys.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {currentQuestionIndex === questions.length - 1
              ? "결과 보기"
              : "다음"}
          </button>
        </div>

        {process.env.NODE_ENV === "development" ? (
          <details style={{ marginTop: 24 }}>
            <summary
              style={{
                cursor: "pointer",
                color: "#94a3b8",
                fontWeight: 800,
              }}
            >
              개발 확인용 현재 상태 보기
            </summary>

            <pre
              style={{
                marginTop: 12,
                padding: 16,
                borderRadius: 16,
                background: "#0f172a",
                color: "#e2e8f0",
                overflowX: "auto",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {JSON.stringify(
                {
                  testKey: detailTestKey,
                  currentQuestionKey,
                  selectedOptionKeys,
                  answers,
                  calculatedScores,
                },
                null,
                2
              )}
            </pre>
          </details>
        ) : null}
      </section>
    </main>
  );
}

export default DetailTestClient;