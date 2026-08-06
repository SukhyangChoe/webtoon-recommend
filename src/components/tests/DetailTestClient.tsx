"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { AppButton } from "@/components/ui/AppButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getDetailChoiceImageSrc } from "@/data/tests/detailChoiceImages";
import { getResultObjectImageSrc } from "@/data/tests/resultObjectImages";
import {
  clearTestResult,
  loadTestResult,
  saveTestResult,
} from "@/lib/storage/resultRepository";
import {
  clearDetailTestProgress,
  loadDetailTestProgress,
  saveDetailTestProgress,
} from "@/lib/storage/testProgressStorage";
import {
  saveDetailTestRecommendationEntry,
} from "@/lib/storage/findRecommendationEntryStorage";
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

const TIE_BREAK_ORDER = ["_q4", "_q5", "_q2", "_q3", "_q1"];

function getStringValue(
  source: Record<string, unknown>,
  key: string
): string | undefined {
  const value = source[key];
  return typeof value === "string" ? value : undefined;
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

const DETAIL_QUESTION_PROMPTS = [
  "첫 화에서 더 끌리는 시작 장면을 골라주세요.",
  "더 따라가고 싶은 인물을 골라주세요.",
  "더 보고 싶은 사건 전개를 골라주세요.",
  "볼 때 더 중요하게 느끼는 연출을 골라주세요.",
  "다음 화까지 보고 싶게 만드는 흐름을 골라주세요.",
  "덜 보고 싶은 부담 요소를 골라주세요.",
] as const;

function getQuestionPrompt(
  question: DetailTestQuestion,
  questionIndex: number
): string {
  return DETAIL_QUESTION_PROMPTS[questionIndex] || getQuestionText(question);
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
  void testData;
  return `${genreLabel} 웹툰 취향 테스트`;
}

function getStartDescription(
  testData: DetailTestData,
  genreLabel: string
): string {
  void testData;
  return `${genreLabel} 안에서도 어떤 이야기와 장면에 더 끌리는지 알아볼게요.`;
}

function getStartButtonText(testData: DetailTestData): string {
  void testData;
  return "시작하기";
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

          return getOptionLabel(option);
        })
        .filter((label): label is string => Boolean(label));

      if (selectedLabels.length === 0) return null;

      return {
        role: getDefaultQuestionTitle(actualIndex),
        labels: selectedLabels.join(" · "),
      };
    })
    .filter(Boolean) as { role: string; labels: string }[];

  if (summaryRows.length === 0) return null;

  return (
    <section
      className={`detail-selection-summary${
        isQ6 ? " detail-selection-summary--avoidance" : ""
      }`}
    >
      <p className="detail-selection-summary__title">
        {isQ6 ? "지금까지 끌린 요소" : "이전 선택"}
      </p>

      <div className="detail-selection-summary__rows">
        {summaryRows.map((row) => (
          <p key={`${row.role}-${row.labels}`}>
            <span>{row.role}</span>
            {row.labels}
          </p>
        ))}
      </div>
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
  const imageSrc = getResultObjectImageSrc(imageKey);
  const [retryCount, setRetryCount] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    imageSrc ? "loading" : "error"
  );

  function retryImage() {
    setStatus(imageSrc ? "loading" : "error");
    setRetryCount((current) => current + 1);
  }

  return (
    <div className="detail-result-visual">
      {imageSrc ? (
        <img
          key={`${imageSrc}-${retryCount}`}
          src={imageSrc}
          alt={`${resultName} 대표 이미지`}
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
          className={status === "ready" ? "is-ready" : ""}
        />
      ) : null}

      {status !== "ready" ? (
        <div className="detail-result-image-state" aria-live="polite">
          <strong>
            {status === "loading"
              ? "결과 이미지를 불러오고 있어요"
              : "결과 이미지를 불러오지 못했어요"}
          </strong>
          <span>이미지를 다시 불러와 결과를 확인해 주세요.</span>
          {status === "error" ? (
            <button type="button" onClick={retryImage}>
              다시 시도
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ResultTagList({ tags }: { tags: string[] }) {
  const visibleTags = tags.slice(0, 3);

  if (visibleTags.length === 0) return null;

  return (
    <section className="detail-result-tags">
      <h2>이런 포인트에 끌려요</h2>
      <div>
        {visibleTags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </section>
  );
}

function DetailResultView({
  genreLabel,
  sourceTestKey,
  result,
  onRetake,
  debugData,
}: {
  genreLabel: string;
  sourceTestKey: DetailTestKey;
  result: DetailTestResult;
  onRetake: () => void;
  debugData: unknown;
}) {
  const resultName = getResultName(result);
  const resultSummary = getResultSummary(result);
  const resultImageKey = getResultImageKey(result);
  const resultShareText = getResultShareText(result);
  const resultSceneText = getResultSceneText(result);
  const [shareStatus, setShareStatus] = useState<
    "idle" | "shared" | "copied" | "error"
  >("idle");

  function openRecommendation() {
    saveDetailTestRecommendationEntry(sourceTestKey);

    const searchParams = new URLSearchParams({
      mode: "instant_recommendation",
      vectorSource: "detail_test_result",
      sourceTestKey,
    });

    window.location.href = `/find/results?${searchParams.toString()}`;
  }

  async function shareResult() {
    const text =
      resultShareText ||
      `${genreLabel} 웹툰 취향 테스트 결과는 ${resultName}. ${resultSummary}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${genreLabel} 웹툰 취향 테스트 결과`,
          text,
          url: window.location.href,
        });
        setShareStatus("shared");
        return;
      }

      await navigator.clipboard.writeText(`${text}
${window.location.href}`);
      setShareStatus("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareStatus("idle");
        return;
      }

      setShareStatus("error");
    }
  }

  const shareMessage =
    shareStatus === "shared"
      ? "공유했어요."
      : shareStatus === "copied"
        ? "결과 문구를 복사했어요."
        : shareStatus === "error"
          ? "공유하지 못했어요. 다시 시도해 주세요."
          : "";

  return (
    <main className="detail-test-page detail-result-page">
      <PageContainer size="test" className="detail-result-container">
        <a href="/tests" className="detail-test-back-link">
          ← 다른 테스트 보기
        </a>

        <section className="detail-result-hero">
          <ResultObjectImage
            imageKey={resultImageKey}
            resultName={resultName}
          />

          <div className="detail-result-copy">
            <p className="detail-test-eyebrow">
              {genreLabel} 웹툰 취향 테스트 결과
            </p>
            <h1>{resultName}</h1>
            <p className="detail-result-summary">{resultSummary}</p>

            <ResultTagList tags={getResultDisplayTags(result)} />

            <AppButton fullWidth onClick={openRecommendation}>
              이 취향으로 웹툰 추천받기
            </AppButton>

            <p className="detail-result-cta-note">
              방금 확인한 {genreLabel} 취향만 사용해 웹툰을 골라드려요.
            </p>
          </div>
        </section>

        <section className="detail-result-story-card">
          <p className="detail-result-section-label">당신이 오래 머무를 장면</p>
          <p>{resultSceneText || resultSummary}</p>
        </section>

        <section className="detail-result-actions" aria-label="결과 보조 기능">
          <AppButton variant="secondary" onClick={shareResult}>
            결과 공유하기
          </AppButton>
          <AppButton href="/tests" variant="secondary">
            다른 장르도 알아보기
          </AppButton>
          <AppButton variant="ghost" onClick={onRetake}>
            다시 테스트하기
          </AppButton>
        </section>

        {shareMessage ? (
          <p className="detail-result-share-status" role="status">
            {shareMessage}
          </p>
        ) : null}

        {process.env.NODE_ENV === "development" ? (
          <details className="detail-test-debug detail-result-debug">
            <summary>개발 확인용 점수 보기</summary>
            <pre>{JSON.stringify(debugData, null, 2)}</pre>
          </details>
        ) : null}
      </PageContainer>
    </main>
  );
}

function ChoiceImagePreview({
  imageKey,
  label,
  onAvailabilityChange,
}: {
  imageKey?: string;
  label: string;
  onAvailabilityChange: (isAvailable: boolean) => void;
}) {
  const imageSrc = getDetailChoiceImageSrc(imageKey);
  const [retryCount, setRetryCount] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    imageSrc ? "loading" : "error"
  );

  function retryImage(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setStatus(imageSrc ? "loading" : "error");
    setRetryCount((current) => current + 1);
    onAvailabilityChange(false);
  }

  return (
    <div className="detail-choice-image">
      {imageSrc ? (
        <img
          key={`${imageSrc}-${retryCount}`}
          src={imageSrc}
          alt={`${label} 선택지 이미지`}
          onLoad={() => {
            setStatus("ready");
            onAvailabilityChange(true);
          }}
          onError={() => {
            setStatus("error");
            onAvailabilityChange(false);
          }}
          className={status === "ready" ? "is-ready" : ""}
        />
      ) : null}

      {status !== "ready" ? (
        <div className="detail-choice-image__state" aria-live="polite">
          <strong>
            {status === "loading"
              ? "이미지를 불러오고 있어요"
              : "이미지를 불러오지 못했어요"}
          </strong>
          <span>이미지를 확인한 뒤 선택할 수 있어요.</span>
          {status === "error" ? (
            <button type="button" onClick={retryImage}>
              다시 시도
            </button>
          ) : null}
        </div>
      ) : null}
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
  const [isImageAvailable, setIsImageAvailable] = useState(!isImageCard);
  const canSelect = !isImageCard || isImageAvailable;

  function selectOption() {
    if (!canSelect) return;
    onClick();
  }

  return (
    <div
      className={`detail-choice-card${isSelected ? " is-selected" : ""}${
        isImageCard ? " detail-choice-card--image" : ""
      }${!canSelect ? " is-unavailable" : ""}`}
      role="button"
      tabIndex={canSelect ? 0 : -1}
      aria-pressed={isSelected}
      aria-disabled={!canSelect}
      onClick={selectOption}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectOption();
        }
      }}
    >
      {isImageCard ? (
        <ChoiceImagePreview
          imageKey={option.imageKey}
          label={label}
          onAvailabilityChange={setIsImageAvailable}
        />
      ) : null}

      <div className="detail-choice-card__body">
        <div className="detail-choice-card__title-row">
          <strong>{label}</strong>
          {isSelected ? (
            <span className="detail-choice-card__rank">
              {rank === 1 ? "① 가장 끌림" : "② 이것도 좋음"}
            </span>
          ) : null}
        </div>

        {description ? <p>{description}</p> : null}
      </div>
    </div>
  );
}

export function DetailTestClient({ config }: { config: DetailTestConfig }) {
  const testData = config.testData;
  const results = config.results ?? [];

  const testKey = testData.testKey;
  const detailTestKey = isDetailTestKey(testKey) ? testKey : null;
  const testVersion = getTestVersion(testData);
  const genreLabel = getGenreLabel(testKey);
  const questions = useMemo(() => testData.questions ?? [], [testData.questions]);

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
  const [progressHydrated, setProgressHydrated] = useState(false);

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

    const timerId = window.setTimeout(() => {
      const loadedResult = loadTestResult(detailTestKey);
      const loadedProgress = loadDetailTestProgress(detailTestKey);

      setStoredResult(loadedResult);

      if (loadedResult) {
        clearDetailTestProgress(detailTestKey);
      }

      if (
        !loadedResult &&
        loadedProgress &&
        loadedProgress.testVersion === testVersion
      ) {
        const maxQuestionIndex = Math.max(0, questions.length - 1);
        const restoredQuestionIndex = Math.min(
          loadedProgress.currentQuestionIndex,
          maxQuestionIndex
        );
        const restoredQuestion = questions[restoredQuestionIndex];
        const restoredQuestionKey = restoredQuestion
          ? getQuestionKey(restoredQuestion, restoredQuestionIndex)
          : "";
        const restoredAnswer = loadedProgress.answers[restoredQuestionKey];
        const restoredSelectedOptionKeys =
          loadedProgress.selectedOptionKeys.length > 0
            ? loadedProgress.selectedOptionKeys
            : restoredAnswer?.selectedOptions.map(
                (option) => option.optionKey
              ) ?? [];

        setHasStarted(true);
        setCurrentQuestionIndex(restoredQuestionIndex);
        setAnswers(loadedProgress.answers);
        setSelectedOptionKeys(restoredSelectedOptionKeys.slice(0, 2));
      } else if (
        loadedProgress &&
        loadedProgress.testVersion !== testVersion
      ) {
        clearDetailTestProgress(detailTestKey);
      }

      setProgressHydrated(true);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [detailTestKey, questions, testVersion]);

  useEffect(() => {
    if (
      !progressHydrated ||
      !detailTestKey ||
      !hasStarted ||
      completed
    ) {
      return;
    }

    saveDetailTestProgress({
      testKey: detailTestKey,
      testVersion,
      currentQuestionIndex,
      answers,
      selectedOptionKeys,
    });
  }, [
    answers,
    completed,
    currentQuestionIndex,
    detailTestKey,
    hasStarted,
    progressHydrated,
    selectedOptionKeys,
    testVersion,
  ]);

  function handleStart() {
    if (!detailTestKey) return;

    clearDetailTestProgress(detailTestKey);
    setHasStarted(true);
    setCompleted(false);
    setCurrentResult(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setSelectedOptionKeys([]);
  }

  function handleShowStoredResult() {
    if (!storedResult || !detailTestKey) return;

    clearDetailTestProgress(detailTestKey);
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
    clearDetailTestProgress(detailTestKey);
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

    clearDetailTestProgress(detailTestKey);
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
        sourceTestKey={detailTestKey}
        result={currentResult}
        onRetake={handleRetake}
        debugData={debugData}
      />
    );
  }

  if (!hasStarted) {
    return (
      <main className="detail-test-page detail-test-intro-page">
        <PageContainer size="test" className="detail-test-intro-container">
          <a href="/tests" className="detail-test-back-link">
            ← 다른 테스트 보기
          </a>

          <section className="detail-test-intro-card">
            <p className="detail-test-eyebrow">장르별 세부 취향 테스트</p>
            <h1>{getStartTitle(testData, genreLabel)}</h1>
            <p className="detail-test-intro-card__description">
              {getStartDescription(testData, genreLabel)}
            </p>

            <p className="detail-test-intro-card__meta">
              6문항 <span aria-hidden="true">·</span> 예상 시간 약 1분
            </p>

            <div className="detail-test-intro-card__guide">
              <strong>선택 방법</strong>
              <p>
                가장 끌리는 것을 먼저 고르고,
                <br />
                비슷하게 끌리는 것이 있다면 하나 더 골라도 돼요.
              </p>
            </div>

            {storedResult ? (
              <section className="detail-test-saved-result">
                <div>
                  <strong>완료한 {genreLabel} 결과가 있어요.</strong>
                  <p>바로 결과를 보거나 새로 다시 진행할 수 있어요.</p>
                </div>
                <div className="detail-test-saved-result__actions">
                  <AppButton onClick={handleShowStoredResult}>
                    결과 보기
                  </AppButton>
                  <AppButton variant="secondary" onClick={handleRetake}>
                    다시 테스트하기
                  </AppButton>
                </div>
              </section>
            ) : (
              <div className="detail-test-intro-card__actions">
                <AppButton onClick={handleStart}>
                  {getStartButtonText(testData)}
                </AppButton>
                <a href="/tests">다른 테스트 보기</a>
              </div>
            )}
          </section>
        </PageContainer>
      </main>
    );
  }

  if (!currentQuestion) {
    return (
      <main className="detail-test-page">
        <PageContainer size="test" className="detail-test-error-state">
          <p className="detail-test-eyebrow">잠시 문제가 생겼어요</p>
          <h1>질문 데이터를 찾을 수 없어요.</h1>
          <p>입력한 내용은 그대로 두었으니 다시 시도해 주세요.</p>
          <div>
            <AppButton onClick={handleRetake}>다시 시도</AppButton>
            <AppButton href="/tests" variant="secondary">
              처음으로
            </AppButton>
          </div>
        </PageContainer>
      </main>
    );
  }

  const currentOptions = getQuestionOptions(currentQuestion);
  const isImageQuestion =
    currentQuestionIndex === 0 || currentQuestionIndex === 3;
  const isAvoidanceQuestionStep = currentQuestionIndex === 5;
  const selectionGuide =
    selectedOptionKeys.length === 0
      ? "가장 끌리는 것을 먼저 골라주세요."
      : selectedOptionKeys.length === 1
        ? "하나 더 선택할 수 있어요."
        : "선택 완료";

  return (
    <main className="detail-test-page detail-test-question-page">
      <PageContainer size="test" className="detail-test-question-container">
        <header className="detail-test-question-header">
          <a href="/tests">← 장르 취향 테스트</a>
          <span>
            {currentQuestionIndex + 1} / {questions.length}
          </span>
        </header>

        <ProgressBar
          value={currentQuestionIndex + 1}
          max={questions.length}
          label={`${genreLabel} 세부 취향 테스트 ${currentQuestionIndex + 1}번 질문`}
        />

        <section className="detail-test-question-card">
          <PreviousSelectionSummary
            currentQuestionIndex={currentQuestionIndex}
            questions={questions}
            answers={answers}
          />

          <div
            className={`detail-test-question-copy${
              isAvoidanceQuestionStep
                ? " detail-test-question-copy--avoidance"
                : ""
            }`}
          >
            <p className="detail-test-question-copy__label">
              {getQuestionTitle(currentQuestion, currentQuestionIndex)}
            </p>
            <h1>{getQuestionPrompt(currentQuestion, currentQuestionIndex)}</h1>
            <p
              className={`detail-test-selection-guide detail-test-selection-guide--${selectedOptionKeys.length}`}
              aria-live="polite"
            >
              {selectionGuide}
            </p>
          </div>

          <div
            className={`detail-choice-grid ${
              isImageQuestion
                ? "detail-choice-grid--image"
                : "detail-choice-grid--text"
            }`}
          >
            {currentOptions.map((option) => {
              const optionKey = getOptionKey(option);
              const rank = currentSelectedRanks[optionKey];
              const isSelected = Boolean(rank);

              return (
                <QuestionOptionCard
                  key={optionKey}
                  option={option}
                  rank={rank}
                  isSelected={isSelected}
                  isImageCard={isImageQuestion}
                  onClick={() => handleOptionToggle(optionKey)}
                />
              );
            })}
          </div>

          <footer className="detail-test-question-actions">
            <AppButton
              variant="secondary"
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              이전
            </AppButton>
            <AppButton
              fullWidth
              onClick={handleNextQuestion}
              disabled={selectedOptionKeys.length === 0}
            >
              {currentQuestionIndex === questions.length - 1
                ? "결과 보기"
                : "다음"}
            </AppButton>
          </footer>

          {process.env.NODE_ENV === "development" ? (
            <details className="detail-test-debug">
              <summary>개발 확인용 현재 상태 보기</summary>
              <pre>
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
      </PageContainer>
    </main>
  );
}

export default DetailTestClient;