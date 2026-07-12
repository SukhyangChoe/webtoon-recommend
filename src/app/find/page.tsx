"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import { FindRecommendationResult } from "@/components/find/FindRecommendationResult";
import webtoonSeedData from "@/data/webtoons/webtoons_seed_current.json";
import {
  createInstantRecommendationSelectionResult,
  createSimilarWorkSelectionResult,
  getStatusLabel,
  getWebtoonDisplayAxisLabel,
  matchesSearchQuery,
  normalizeSearchText,
  normalizeWebtoonSeedData,
} from "@/lib/recommendation/similarWorkRecommendation";
import {
  buildStoredUserTasteProfile,
  hasAnyTasteScore,
} from "@/lib/recommendation/storedUserTasteProfile";
import {
  createFindPrimarySession,
  createFindSecondarySession,
  getExcludedIdsFromActionStates,
  loadFindPrimarySession,
  restoreRecommendationSelectionResultFromSession,
  saveFindPrimarySession,
} from "@/lib/storage/findPrimarySessionStorage";

import type {
  InstantRecommendationSelectionResult,
  SimilarWorkSelectionResult,
  WebtoonSeedItem,
} from "@/lib/recommendation/similarWorkRecommendation";
import type { StoredUserTasteProfile } from "@/lib/recommendation/storedUserTasteProfile";
import type { FindPrimarySession } from "@/lib/storage/findPrimarySessionStorage";

type FindMode =
  | "entry"
  | "similar_work"
  | "instant_recommendation"
  | "recent_session";

const WEBTOONS = normalizeWebtoonSeedData(webtoonSeedData);

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#020617",
  color: "#0f172a",
  padding: "48px 20px",
};

const shellStyle: CSSProperties = {
  width: "100%",
  maxWidth: 980,
  margin: "0 auto",
  borderRadius: 32,
  background: "#ffffff",
  padding: "clamp(28px, 6vw, 56px)",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.28)",
};

const eyebrowStyle: CSSProperties = {
  margin: "0 0 12px",
  color: "#4f46e5",
  fontSize: 15,
  fontWeight: 900,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(36px, 7vw, 64px)",
  lineHeight: 1.05,
  letterSpacing: "-0.05em",
};

const descriptionStyle: CSSProperties = {
  margin: "22px 0 0",
  color: "#334155",
  fontSize: 18,
  lineHeight: 1.75,
};

const cardGridStyle: CSSProperties = {
  marginTop: 34,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
};

const cardButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 230,
  textAlign: "left",
  borderRadius: 24,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#0f172a",
  padding: 24,
  cursor: "pointer",
  boxSizing: "border-box",
};

const primaryCardButtonStyle: CSSProperties = {
  ...cardButtonStyle,
  background: "#eef2ff",
  border: "1px solid #c7d2fe",
};

const secondaryCardLinkStyle: CSSProperties = {
  ...cardButtonStyle,
  display: "block",
  textDecoration: "none",
};

const cardBadgeStyle: CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  background: "#ffffff",
  color: "#4f46e5",
  padding: "6px 10px",
  fontSize: 13,
  fontWeight: 900,
  marginBottom: 14,
};

const modePanelStyle: CSSProperties = {
  marginTop: 32,
  borderRadius: 24,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  padding: "clamp(22px, 5vw, 34px)",
};

const backButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  borderRadius: 999,
  border: "1px solid #c7d2fe",
  background: "#ffffff",
  color: "#4338ca",
  padding: "10px 14px",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
};

const disabledButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 48,
  borderRadius: 14,
  border: "none",
  background: "#cbd5e1",
  color: "#ffffff",
  padding: "12px 16px",
  fontSize: 15,
  fontWeight: 900,
  cursor: "not-allowed",
};

const enabledButtonStyle: CSSProperties = {
  ...disabledButtonStyle,
  background: "#4f46e5",
  cursor: "pointer",
};

const linkButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  borderRadius: 14,
  border: "1px solid #c7d2fe",
  background: "#ffffff",
  color: "#4338ca",
  padding: "12px 16px",
  fontSize: 15,
  fontWeight: 900,
  textDecoration: "none",
};

const selectedChipStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  borderRadius: 18,
  border: "1px solid #c7d2fe",
  background: "#eef2ff",
  padding: 14,
};

function formatSessionDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "최근";
  }
}

export default function FindPage() {
  const [mode, setMode] = useState<FindMode>("entry");
  const [recentSession, setRecentSession] =
    useState<FindPrimarySession | null>(null);
  const [currentTasteProfile, setCurrentTasteProfile] =
    useState<StoredUserTasteProfile | null>(null);
  const [instantSelectionResult, setInstantSelectionResult] =
    useState<InstantRecommendationSelectionResult | null>(null);
  const [instantSession, setInstantSession] =
    useState<FindPrimarySession | null>(null);

  useEffect(() => {
    function refreshStoredState() {
      setRecentSession(loadFindPrimarySession());
      setCurrentTasteProfile(buildStoredUserTasteProfile());
    }

    const timerId = window.setTimeout(refreshStoredState, 0);

    window.addEventListener("focus", refreshStoredState);
    window.addEventListener("storage", refreshStoredState);

    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener("focus", refreshStoredState);
      window.removeEventListener("storage", refreshStoredState);
    };
  }, []);

  const canUseSecondary = hasAnyTasteScore(currentTasteProfile);

  function handleSessionSaved(session: FindPrimarySession) {
    setRecentSession(session);
  }

  function handleStartInstantRecommendation() {
    const latestProfile = buildStoredUserTasteProfile();

    setCurrentTasteProfile(latestProfile);

    if (!hasAnyTasteScore(latestProfile) || !latestProfile) {
      return;
    }

    const {
      alreadySeenWebtoonIds,
      excludedWebtoonIds,
    } = getExcludedIdsFromActionStates(
      recentSession?.actionStateByWebtoonId ?? {}
    );
    const nextSelectionResult =
      createInstantRecommendationSelectionResult({
        allWebtoons: WEBTOONS,
        storedUserTasteProfile: latestProfile,
        filterContext: {
          alreadySeenWebtoonIds,
          excludedWebtoonIds,
        },
      });
    const nextSession = createFindSecondarySession({
      selectionResult: nextSelectionResult,
      actionStateByWebtoonId:
        recentSession?.actionStateByWebtoonId ?? {},
    });

    saveFindPrimarySession(nextSession);

    setInstantSelectionResult(nextSelectionResult);
    setInstantSession(nextSession);
    setRecentSession(nextSession);
    setMode("instant_recommendation");
  }

  return (
    <main style={pageStyle}>
      <section style={shellStyle}>
        <p style={eyebrowStyle}>지금 볼 웹툰 찾기</p>

        {mode === "entry" ? (
          <FindEntryScreen
            recentSession={recentSession}
            canUseSecondary={canUseSecondary}
            onSelectSimilarWork={() => setMode("similar_work")}
            onSelectInstantRecommendation={
              handleStartInstantRecommendation
            }
            onRestoreRecentSession={() => setMode("recent_session")}
          />
        ) : null}

        {mode === "similar_work" ? (
          <SimilarWorkSearchScreen
            onBack={() => setMode("entry")}
            onSessionSaved={handleSessionSaved}
            previousActionStates={
              recentSession?.actionStateByWebtoonId ?? {}
            }
          />
        ) : null}

        {mode === "instant_recommendation" &&
        instantSelectionResult &&
        instantSession ? (
          <InstantRecommendationScreen
            selectionResult={instantSelectionResult}
            session={instantSession}
            onBack={() => setMode("entry")}
          />
        ) : null}

        {mode === "recent_session" && recentSession ? (
          <RestoredRecommendationSessionScreen
            session={recentSession}
            onBack={() => setMode("entry")}
            onStartFresh={() => {
              if (recentSession.recommendationMode === "similar_work") {
                setMode("similar_work");
                return;
              }

              handleStartInstantRecommendation();
            }}
          />
        ) : null}
      </section>
    </main>
  );
}

function FindEntryScreen({
  recentSession,
  canUseSecondary,
  onSelectSimilarWork,
  onSelectInstantRecommendation,
  onRestoreRecentSession,
}: {
  recentSession: FindPrimarySession | null;
  canUseSecondary: boolean;
  onSelectSimilarWork: () => void;
  onSelectInstantRecommendation: () => void;
  onRestoreRecentSession: () => void;
}) {
  const recentModeLabel =
    recentSession?.recommendationMode === "instant_recommendation"
      ? "내 취향 기반 추천"
      : "선택 작품 기반 추천";

  return (
    <>
      <h1 style={titleStyle}>
        지금 보기 좋은 웹툰을
        <br />
        찾아볼게요.
      </h1>

      <p style={descriptionStyle}>
        재밌게 본 작품을 직접 고르거나,
        <br />
        저장된 취향으로 바로 추천받을 수 있어요.
      </p>

      {recentSession ? (
        <section
          style={{
            marginTop: 28,
            borderRadius: 24,
            border: "1px solid #c7d2fe",
            background: "#eef2ff",
            padding: "clamp(20px, 4vw, 28px)",
            display: "grid",
            gap: 14,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#4338ca",
                fontSize: 14,
                fontWeight: 900,
              }}
            >
              최근 추천 결과 · {recentModeLabel} ·{" "}
              {formatSessionDate(recentSession.createdAt)}
            </p>

            <h2
              style={{
                margin: "8px 0 0",
                color: "#0f172a",
                fontSize: 24,
                lineHeight: 1.35,
                letterSpacing: "-0.03em",
              }}
            >
              최근 추천 결과가 있어요.
            </h2>

            <p
              style={{
                margin: "8px 0 0",
                color: "#475569",
                fontSize: 15,
                lineHeight: 1.7,
              }}
            >
              저장 당시의 추천 결과와 점수 snapshot을 그대로 다시 볼 수
              있어요.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={onRestoreRecentSession}
              style={{
                minHeight: 48,
                borderRadius: 14,
                border: "none",
                background: "#4f46e5",
                color: "#ffffff",
                padding: "12px 16px",
                fontSize: 15,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              최근 추천 결과 다시 보기
            </button>

            <button
              type="button"
              onClick={onSelectSimilarWork}
              style={{
                minHeight: 48,
                borderRadius: 14,
                border: "1px solid #c7d2fe",
                background: "#ffffff",
                color: "#4338ca",
                padding: "12px 16px",
                fontSize: 15,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              다른 작품으로 다시 찾아보기
            </button>
          </div>
        </section>
      ) : null}

      <div style={cardGridStyle}>
        <button
          type="button"
          onClick={onSelectSimilarWork}
          style={primaryCardButtonStyle}
        >
          <span style={cardBadgeStyle}>Primary</span>

          <h2
            style={{
              margin: 0,
              fontSize: 26,
              lineHeight: 1.25,
              letterSpacing: "-0.03em",
            }}
          >
            재밌게 본 작품으로 찾기
          </h2>

          <p
            style={{
              margin: "14px 0 0",
              color: "#475569",
              fontSize: 15,
              lineHeight: 1.7,
            }}
          >
            최근 재밌게 본 웹툰을 기준으로 비슷하거나 잘 맞는 작품을
            찾아요.
          </p>

          <p
            style={{
              margin: "16px 0 0",
              color: "#4338ca",
              fontSize: 14,
              fontWeight: 900,
            }}
          >
            작품 1~3개 선택
          </p>
        </button>

        <button
          type="button"
          onClick={onSelectInstantRecommendation}
          disabled={!canUseSecondary}
          aria-disabled={!canUseSecondary}
          style={{
            ...secondaryCardLinkStyle,
            cursor: canUseSecondary ? "pointer" : "not-allowed",
            opacity: canUseSecondary ? 1 : 0.66,
            border: canUseSecondary
              ? "1px solid #c7d2fe"
              : "1px solid #e5e7eb",
            background: canUseSecondary ? "#f5f3ff" : "#f8fafc",
          }}
        >
          <span style={cardBadgeStyle}>Secondary</span>

          <h2
            style={{
              margin: 0,
              fontSize: 26,
              lineHeight: 1.25,
              letterSpacing: "-0.03em",
            }}
          >
            내 취향으로 바로 추천받기
          </h2>

          <p
            style={{
              margin: "14px 0 0",
              color: "#475569",
              fontSize: 15,
              lineHeight: 1.7,
            }}
          >
            저장된 userTasteProfile을 기준으로 추가 질문 없이 바로
            추천받아요.
          </p>

          <p
            style={{
              margin: "16px 0 0",
              color: canUseSecondary ? "#4338ca" : "#64748b",
              fontSize: 14,
              fontWeight: 900,
              whiteSpace: "pre-line",
            }}
          >
            {canUseSecondary
              ? "바로 추천받기"
              : "취향 테스트를 하나 이상 완료하면\n내 취향으로 바로 추천받을 수 있어요."}
          </p>
        </button>
      </div>

      <div
        style={{
          marginTop: 22,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <Link href="/tests" style={linkButtonStyle}>
          테스트 목록 보기
        </Link>

        <Link href="/" style={linkButtonStyle}>
          홈으로 돌아가기
        </Link>
      </div>
    </>
  );
}

function RestoredRecommendationSessionScreen({
  session,
  onBack,
  onStartFresh,
}: {
  session: FindPrimarySession;
  onBack: () => void;
  onStartFresh: () => void;
}) {
  const selectionResult = useMemo(() => {
    return restoreRecommendationSelectionResultFromSession(session);
  }, [session]);
  const isSecondary =
    selectionResult.recommendationMode === "instant_recommendation";

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button type="button" onClick={onBack} style={backButtonStyle}>
          ← 찾기 방식 다시 고르기
        </button>

        <button type="button" onClick={onStartFresh} style={backButtonStyle}>
          {isSecondary
            ? "현재 취향으로 새 추천받기"
            : "다른 작품으로 다시 찾아보기"}
        </button>
      </div>

      <section
        style={{
          ...modePanelStyle,
          background: "#eef2ff",
          border: "1px solid #c7d2fe",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#4338ca",
            fontSize: 14,
            fontWeight: 900,
          }}
        >
          최근 추천 결과 복원 · {formatSessionDate(session.createdAt)}
        </p>

        <h1
          style={{
            ...titleStyle,
            marginTop: 10,
          }}
        >
          지난 추천 결과를
          <br />
          다시 불러왔어요.
        </h1>

        <p style={descriptionStyle}>
          저장 당시의 추천 결과와 점수 snapshot을 기준으로 복원했어요.
          <br />새 추천을 받으면 최근 추천 세션이 새 결과로 덮어써집니다.
        </p>
      </section>

      <FindRecommendationResult
        selectionResult={selectionResult}
        initialActionStates={session.actionStateByWebtoonId}
        restoredSession={session}
      />
    </>
  );
}

function InstantRecommendationScreen({
  selectionResult,
  session,
  onBack,
}: {
  selectionResult: InstantRecommendationSelectionResult;
  session: FindPrimarySession;
  onBack: () => void;
}) {
  return (
    <>
      <button type="button" onClick={onBack} style={backButtonStyle}>
        ← 찾기 방식 다시 고르기
      </button>

      <section
        style={{
          ...modePanelStyle,
          background: "#f5f3ff",
          border: "1px solid #c4b5fd",
        }}
      >
        <p style={eyebrowStyle}>Secondary · instant_recommendation</p>

        <h1 style={titleStyle}>
          내 취향으로
          <br />
          바로 골라봤어요.
        </h1>

        <p style={descriptionStyle}>
          추천을 시작한 순간의 userTasteProfile을 snapshot으로 고정했어요.
          <br />추가 질문 없이 현재 누적 취향만으로 계산했습니다.
        </p>
      </section>

      <FindRecommendationResult
        selectionResult={selectionResult}
        initialActionStates={session.actionStateByWebtoonId}
        restoredSession={session}
      />
    </>
  );
}

function SimilarWorkSearchScreen({
  onBack,
  onSessionSaved,
  previousActionStates,
}: {
  onBack: () => void;
  onSessionSaved: (
    session: FindPrimarySession
  ) => void;
  previousActionStates: FindPrimarySession["actionStateByWebtoonId"];
}) {
  const [query, setQuery] = useState("");

  const [selectedWebtoons, setSelectedWebtoons] =
    useState<WebtoonSeedItem[]>([]);

  const [selectionResult, setSelectionResult] =
    useState<SimilarWorkSelectionResult | null>(null);

  const [savedSession, setSavedSession] =
    useState<FindPrimarySession | null>(null);

  const searchResults = useMemo(() => {
    if (!normalizeSearchText(query)) return [];

    return WEBTOONS.filter((webtoon) =>
      matchesSearchQuery(webtoon, query)
    ).slice(0, 10);
  }, [query]);

  const selectedIdSet = useMemo(() => {
    return new Set(
      selectedWebtoons.map(
        (webtoon) =>
          webtoon.canonicalWebtoonId
      )
    );
  }, [selectedWebtoons]);

  const canSubmit =
    selectedWebtoons.length >= 1 &&
    selectedWebtoons.length <= 3;

  function handleSelectWebtoon(
    webtoon: WebtoonSeedItem
  ) {
    setSelectionResult(null);
    setSavedSession(null);

    if (
      selectedIdSet.has(
        webtoon.canonicalWebtoonId
      )
    ) {
      return;
    }

    if (selectedWebtoons.length >= 3) {
      return;
    }

    setSelectedWebtoons((current) => [
      ...current,
      webtoon,
    ]);
  }

  function handleRemoveWebtoon(
    canonicalWebtoonId: string
  ) {
    setSelectionResult(null);
    setSavedSession(null);

    setSelectedWebtoons((current) =>
      current.filter((webtoon) => {
        return (
          webtoon.canonicalWebtoonId !==
          canonicalWebtoonId
        );
      })
    );
  }

  function handleSubmitSelection() {
    if (!canSubmit) return;

    const {
      alreadySeenWebtoonIds,
      excludedWebtoonIds,
    } = getExcludedIdsFromActionStates(
      previousActionStates
    );

    const nextSelectionResult =
      createSimilarWorkSelectionResult({
        selectedWebtoons,
        allWebtoons: WEBTOONS,
        limit: 10,
        filterContext: {
          alreadySeenWebtoonIds,
          excludedWebtoonIds,
        },
      });

    const nextSession =
      createFindPrimarySession({
        selectionResult: nextSelectionResult,
        selectedSourceWebtoons:
          selectedWebtoons,
        actionStateByWebtoonId:
          previousActionStates,
      });

    saveFindPrimarySession(nextSession);

    setSelectionResult(nextSelectionResult);
    setSavedSession(nextSession);

    onSessionSaved(nextSession);
  }

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        style={backButtonStyle}
      >
        ← 찾기 방식 다시 고르기
      </button>

      <section style={modePanelStyle}>
        <p style={eyebrowStyle}>
          Primary · similar_work
        </p>

        <h1 style={titleStyle}>
          재밌게 본 작품으로
          <br />
          찾아볼게요.
        </h1>

        <p style={descriptionStyle}>
          최근 재밌게 본 웹툰을 1~3개
          골라주세요.
          <br />
          선택한 작품의 추천 신호를 기준으로
          비슷한 후보를 찾아볼게요.
        </p>

        <div
          style={{
            marginTop: 28,
            display: "grid",
            gap: 16,
          }}
        >
          <label
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            <span
              style={{
                color: "#334155",
                fontSize: 14,
                fontWeight: 900,
              }}
            >
              작품명 검색
            </span>

            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectionResult(null);
                setSavedSession(null);
              }}
              placeholder="예: 전지적 독자 시점, 나 혼자만 레벨업, 화산귀환"
              style={{
                width: "100%",
                minHeight: 52,
                borderRadius: 14,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                padding: "0 16px",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />
          </label>

          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            작품명, 별칭, 플랫폼, 대표 소재
            라벨로 검색할 수 있어요. 쉼표나
            띄어쓰기가 달라도 단어 기준으로
            찾아요.
          </p>

          <SearchResultList
            query={query}
            searchResults={searchResults}
            selectedIdSet={selectedIdSet}
            selectedCount={
              selectedWebtoons.length
            }
            onSelectWebtoon={
              handleSelectWebtoon
            }
          />

          <SelectedWebtoonList
            selectedWebtoons={
              selectedWebtoons
            }
            onRemoveWebtoon={
              handleRemoveWebtoon
            }
          />

          <button
            type="button"
            onClick={handleSubmitSelection}
            disabled={!canSubmit}
            style={
              canSubmit
                ? enabledButtonStyle
                : disabledButtonStyle
            }
          >
            이 작품들로 추천받기
          </button>
        </div>
      </section>

      {selectionResult ? (
        <FindRecommendationResult
          selectionResult={selectionResult}
          initialActionStates={
            savedSession?.actionStateByWebtoonId ?? {}
          }
          restoredSession={savedSession}
        />
      ) : null}
    </>
  );
}

function SearchResultList({
  query,
  searchResults,
  selectedIdSet,
  selectedCount,
  onSelectWebtoon,
}: {
  query: string;
  searchResults: WebtoonSeedItem[];
  selectedIdSet: Set<string>;
  selectedCount: number;
  onSelectWebtoon: (
    webtoon: WebtoonSeedItem
  ) => void;
}) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return (
      <p
        style={{
          margin: 0,
          color: "#64748b",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        작품명을 1글자 이상 입력하면 DB
        seed에 있는 작품을 검색합니다.
      </p>
    );
  }

  if (searchResults.length === 0) {
    return (
      <p
        style={{
          margin: 0,
          color: "#64748b",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        검색 결과가 없어요. 현재 DB seed에
        있는 작품과 별칭 기준으로 검색합니다.
      </p>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
      }}
    >
      <h2
        style={{
          margin: 0,
          color: "#0f172a",
          fontSize: 18,
          letterSpacing: "-0.02em",
        }}
      >
        검색 결과
      </h2>

      {searchResults.map((webtoon) => {
        const isSelected = selectedIdSet.has(
          webtoon.canonicalWebtoonId
        );

        const isMaxSelected =
          selectedCount >= 3;

        const isDisabled =
          isSelected || isMaxSelected;

        return (
          <div
            key={webtoon.canonicalWebtoonId}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              alignItems: "center",
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              padding: 14,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: 16,
                  lineHeight: 1.35,
                }}
              >
                {webtoon.title}
              </h3>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {webtoon.platform} ·{" "}
                {getWebtoonDisplayAxisLabel(
                  webtoon
                )}{" "}
                ·{" "}
                {getStatusLabel(
                  webtoon.metadata.status
                )}
              </p>

              {process.env.NODE_ENV ===
              "development" ? (
                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#166534",
                    fontSize: 11,
                    lineHeight: 1.5,
                  }}
                >
                  sourceDb: {webtoon.sourceDb} /
                  sourceWeight:{" "}
                  {webtoon.sourceWeight}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              disabled={isDisabled}
              onClick={() =>
                onSelectWebtoon(webtoon)
              }
              style={{
                minHeight: 42,
                borderRadius: 12,
                border: isSelected
                  ? "1px solid #bbf7d0"
                  : "none",
                background: isSelected
                  ? "#dcfce7"
                  : isMaxSelected
                    ? "#cbd5e1"
                    : "#4f46e5",
                color: isSelected
                  ? "#15803d"
                  : "#ffffff",
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 900,
                cursor: isDisabled
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {isSelected
                ? "선택됨"
                : isMaxSelected
                  ? "최대 3개 선택"
                  : "선택"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function SelectedWebtoonList({
  selectedWebtoons,
  onRemoveWebtoon,
}: {
  selectedWebtoons: WebtoonSeedItem[];
  onRemoveWebtoon: (
    canonicalWebtoonId: string
  ) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 10,
      }}
    >
      <h2
        style={{
          margin: 0,
          color: "#0f172a",
          fontSize: 18,
          letterSpacing: "-0.02em",
        }}
      >
        선택한 작품 {selectedWebtoons.length} / 3
      </h2>

      {selectedWebtoons.length === 0 ? (
        <p
          style={{
            margin: 0,
            color: "#64748b",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          아직 선택한 작품이 없어요. 최소
          1개를 선택하면 추천 준비를 할 수
          있어요.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {selectedWebtoons.map((webtoon) => (
            <div
              key={webtoon.canonicalWebtoonId}
              style={selectedChipStyle}
            >
              <div>
                <strong
                  style={{
                    color: "#0f172a",
                    fontSize: 15,
                  }}
                >
                  {webtoon.title}
                </strong>

                <p
                  style={{
                    margin: "4px 0 0",
                    color: "#64748b",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {webtoon.platform} ·{" "}
                  {getWebtoonDisplayAxisLabel(
                    webtoon
                  )}{" "}
                  ·{" "}
                  {getStatusLabel(
                    webtoon.metadata.status
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onRemoveWebtoon(
                    webtoon.canonicalWebtoonId
                  )
                }
                style={{
                  width: "fit-content",
                  minHeight: 36,
                  borderRadius: 999,
                  border:
                    "1px solid #c7d2fe",
                  background: "#ffffff",
                  color: "#4338ca",
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}