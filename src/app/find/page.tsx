"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppTag } from "@/components/ui/AppTag";
import { StatePanel } from "@/components/ui/StatePanel";
import { StickyActionBar } from "@/components/ui/StickyActionBar";
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
  saveFindPrimarySession,
} from "@/lib/storage/findPrimarySessionStorage";

import type { WebtoonSeedItem } from "@/lib/recommendation/similarWorkRecommendation";
import type { StoredUserTasteProfile } from "@/lib/recommendation/storedUserTasteProfile";
import type { FindPrimarySession } from "@/lib/storage/findPrimarySessionStorage";

const WEBTOONS = normalizeWebtoonSeedData(webtoonSeedData);
const FIND_DRAFT_STORAGE_KEY = "webtoon_find_selection_draft_v1";

type FindDraft = {
  query: string;
  selectedWebtoonIds: string[];
};

function isFindDraft(value: unknown): value is FindDraft {
  if (!value || typeof value !== "object") return false;

  const draft = value as Record<string, unknown>;
  return (
    typeof draft.query === "string" &&
    Array.isArray(draft.selectedWebtoonIds) &&
    draft.selectedWebtoonIds.every((item) => typeof item === "string")
  );
}

function loadFindDraft(): FindDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(FIND_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return isFindDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveFindDraft(draft: FindDraft) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(FIND_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // 저장 공간이 부족하거나 브라우저 정책상 저장할 수 없어도 검색은 계속 동작한다.
  }
}

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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedWebtoons, setSelectedWebtoons] = useState<WebtoonSeedItem[]>([]);
  const [recentSession, setRecentSession] = useState<FindPrimarySession | null>(null);
  const [currentTasteProfile, setCurrentTasteProfile] =
    useState<StoredUserTasteProfile | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [isCreatingRecommendation, setIsCreatingRecommendation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const draft = loadFindDraft();
      const selectedIdSet = new Set(draft?.selectedWebtoonIds ?? []);

      setQuery(draft?.query ?? "");
      setSelectedWebtoons(
        WEBTOONS.filter((webtoon) =>
          selectedIdSet.has(webtoon.canonicalWebtoonId)
        ).slice(0, 3)
      );
      setRecentSession(loadFindPrimarySession());
      setCurrentTasteProfile(buildStoredUserTasteProfile());
      setHasRestoredDraft(true);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    if (!hasRestoredDraft) return;

    saveFindDraft({
      query,
      selectedWebtoonIds: selectedWebtoons.map(
        (webtoon) => webtoon.canonicalWebtoonId
      ),
    });
  }, [hasRestoredDraft, query, selectedWebtoons]);

  useEffect(() => {
    function refreshStoredState() {
      setRecentSession(loadFindPrimarySession());
      setCurrentTasteProfile(buildStoredUserTasteProfile());
    }

    window.addEventListener("focus", refreshStoredState);
    window.addEventListener("storage", refreshStoredState);

    return () => {
      window.removeEventListener("focus", refreshStoredState);
      window.removeEventListener("storage", refreshStoredState);
    };
  }, []);

  const normalizedQuery = normalizeSearchText(query);
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];

    return WEBTOONS.filter((webtoon) =>
      matchesSearchQuery(webtoon, query)
    ).slice(0, 12);
  }, [normalizedQuery, query]);

  const selectedIdSet = useMemo(() => {
    return new Set(
      selectedWebtoons.map((webtoon) => webtoon.canonicalWebtoonId)
    );
  }, [selectedWebtoons]);

  const canSubmitPrimary = selectedWebtoons.length >= 1;
  const canUseSecondary = hasAnyTasteScore(currentTasteProfile);

  function handleSelectWebtoon(webtoon: WebtoonSeedItem) {
    setErrorMessage(null);

    if (selectedIdSet.has(webtoon.canonicalWebtoonId)) return;
    if (selectedWebtoons.length >= 3) return;

    setSelectedWebtoons((current) => [...current, webtoon]);
  }

  function handleRemoveWebtoon(canonicalWebtoonId: string) {
    setErrorMessage(null);
    setSelectedWebtoons((current) =>
      current.filter(
        (webtoon) => webtoon.canonicalWebtoonId !== canonicalWebtoonId
      )
    );
  }

  function handleRestoreRecentSession() {
    router.push("/find/results");
  }

  function handleStartPrimaryRecommendation() {
    if (!canSubmitPrimary || isCreatingRecommendation) return;

    setErrorMessage(null);
    setIsCreatingRecommendation(true);

    try {
      const { alreadySeenWebtoonIds, excludedWebtoonIds } =
        getExcludedIdsFromActionStates(
          recentSession?.actionStateByWebtoonId ?? {}
        );

      const selectionResult = createSimilarWorkSelectionResult({
        selectedWebtoons,
        allWebtoons: WEBTOONS,
        limit: 10,
        filterContext: {
          alreadySeenWebtoonIds,
          excludedWebtoonIds,
        },
      });

      const session = createFindPrimarySession({
        selectionResult,
        selectedSourceWebtoons: selectedWebtoons,
        actionStateByWebtoonId:
          recentSession?.actionStateByWebtoonId ?? {},
      });

      saveFindPrimarySession(session);
      setRecentSession(session);
      router.push("/find/results");
    } catch {
      setErrorMessage(
        "잠시 문제가 생겼어요.\n고른 작품은 그대로 두었으니 다시 시도해 주세요."
      );
      setIsCreatingRecommendation(false);
    }
  }

  function handleStartSecondaryRecommendation() {
    if (!canUseSecondary || isCreatingRecommendation) return;

    setErrorMessage(null);
    setIsCreatingRecommendation(true);

    try {
      const latestProfile = buildStoredUserTasteProfile();
      setCurrentTasteProfile(latestProfile);

      if (!latestProfile || !hasAnyTasteScore(latestProfile)) {
        setErrorMessage(
          "저장된 취향 점수를 찾지 못했어요.\n취향 테스트 결과를 다시 확인해 주세요."
        );
        setIsCreatingRecommendation(false);
        return;
      }

      const { alreadySeenWebtoonIds, excludedWebtoonIds } =
        getExcludedIdsFromActionStates(
          recentSession?.actionStateByWebtoonId ?? {}
        );

      const selectionResult = createInstantRecommendationSelectionResult({
        allWebtoons: WEBTOONS,
        storedUserTasteProfile: latestProfile,
        filterContext: {
          alreadySeenWebtoonIds,
          excludedWebtoonIds,
        },
      });

      const session = createFindSecondarySession({
        selectionResult,
        actionStateByWebtoonId:
          recentSession?.actionStateByWebtoonId ?? {},
      });

      saveFindPrimarySession(session);
      setRecentSession(session);
      router.push("/find/results");
    } catch {
      setErrorMessage(
        "잠시 문제가 생겼어요.\n저장된 취향은 그대로 두었으니 다시 시도해 주세요."
      );
      setIsCreatingRecommendation(false);
    }
  }

  return (
    <main className="find-page">
      <PageContainer className="find-page__container">
        <header className="find-page__header">
          <p className="find-page__eyebrow">지금 볼 웹툰 찾기</p>
          <h1 className="find-page__title">재밌게 본 웹툰을 골라주세요</h1>
          <p className="find-page__description">
            작품명을 검색하고, 재밌게 본 웹툰을 선택해 주세요.
          </p>
        </header>

        <section className="find-search" aria-labelledby="find-search-title">
          <h2 id="find-search-title" className="sr-only">
            작품 검색
          </h2>
          <label className="find-search__label" htmlFor="webtoon-search-input">
            작품명 검색
          </label>
          <div className="find-search__field-wrap">
            <span className="find-search__icon" aria-hidden="true">
              ⌕
            </span>
            <input
              id="webtoon-search-input"
              className="find-search__input"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setErrorMessage(null);
              }}
              placeholder="예: 나 혼자만 레벨업"
              autoComplete="off"
            />
          </div>
        </section>

        <SearchResultList
          query={query}
          searchResults={searchResults}
          selectedIdSet={selectedIdSet}
          selectedCount={selectedWebtoons.length}
          onSelectWebtoon={handleSelectWebtoon}
        />

        <SelectedWebtoonList
          selectedWebtoons={selectedWebtoons}
          onRemoveWebtoon={handleRemoveWebtoon}
        />

        {errorMessage ? (
          <StatePanel
            tone="error"
            eyebrow="다시 시도해 주세요"
            title="잠시 문제가 생겼어요."
            description={errorMessage}
            primaryAction={{
              label: "다시 추천받기",
              onClick: canSubmitPrimary
                ? handleStartPrimaryRecommendation
                : handleStartSecondaryRecommendation,
            }}
            secondaryAction={{
              label: "처음으로",
              href: "/",
            }}
          />
        ) : null}

        <StickyActionBar className="find-primary-action">
          <div className="find-primary-action__inner">
            <div className="find-primary-action__summary" aria-live="polite">
              <strong>선택한 작품 {selectedWebtoons.length}개</strong>
              <span>
                {selectedWebtoons.length > 0
                  ? selectedWebtoons.map((webtoon) => webtoon.title).join(", ")
                  : "재밌게 본 작품을 골라주세요."}
              </span>
            </div>
            <AppButton
              fullWidth
              disabled={!canSubmitPrimary || isCreatingRecommendation}
              onClick={handleStartPrimaryRecommendation}
            >
              {isCreatingRecommendation
                ? "취향에 맞는 웹툰을 찾고 있어요"
                : "이 작품들로 추천받기"}
            </AppButton>
          </div>
        </StickyActionBar>

        <section className="find-secondary-section" aria-labelledby="find-secondary-title">
          <div>
            <p className="find-secondary-section__eyebrow">작품이 바로 떠오르지 않는다면</p>
            <h2 id="find-secondary-title" className="find-secondary-section__title">
              내 취향으로 바로 추천받기
            </h2>
            <p className="find-secondary-section__description">
              저장된 취향 테스트 결과가 있으면 추가 질문 없이 바로 골라드려요.
            </p>
          </div>
          <div className="find-secondary-section__action">
            <AppButton
              variant="secondary"
              fullWidth
              disabled={!canUseSecondary || isCreatingRecommendation}
              onClick={handleStartSecondaryRecommendation}
            >
              내 취향으로 추천받기
            </AppButton>
            {!canUseSecondary ? (
              <p className="find-secondary-section__disabled-copy">
                취향 테스트를 하나 이상 완료하면
                <br />내 취향으로 바로 추천받을 수 있어요.
              </p>
            ) : null}
          </div>
        </section>

        {recentSession ? (
          <AppCard as="section" variant="muted" className="find-recent-session">
            <div>
              <p className="find-recent-session__eyebrow">
                최근 추천 · {formatSessionDate(recentSession.updatedAt)}
              </p>
              <h2 className="find-recent-session__title">지난 추천 결과가 있어요.</h2>
              <p className="find-recent-session__description">
                새로 계산하지 않고 저장된 결과를 그대로 불러옵니다.
              </p>
            </div>
            <AppButton variant="secondary" onClick={handleRestoreRecentSession}>
              최근 추천 다시 보기
            </AppButton>
          </AppCard>
        ) : null}

        <nav className="find-page__links" aria-label="다른 기능으로 이동">
          <Link href="/tests">취향 테스트 보기</Link>
          <Link href="/">홈으로 돌아가기</Link>
        </nav>
      </PageContainer>
    </main>
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
  onSelectWebtoon: (webtoon: WebtoonSeedItem) => void;
}) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return (
      <AppCard as="section" variant="muted" className="find-search-state">
        <p>작품명을 입력하면 검색 결과가 여기에 표시돼요.</p>
      </AppCard>
    );
  }

  if (searchResults.length === 0) {
    return (
      <StatePanel
        tone="empty"
        eyebrow="검색 결과 없음"
        title="검색 결과를 찾지 못했어요."
        description={
          "작품명을 조금 짧게 입력하거나\n띄어쓰기를 바꿔서 다시 검색해보세요."
        }
      />
    );
  }

  return (
    <section className="find-results" aria-labelledby="find-results-title">
      <div className="find-section-heading">
        <h2 id="find-results-title">검색 결과</h2>
        <span>{searchResults.length}개</span>
      </div>
      <div className="find-results__list">
        {searchResults.map((webtoon) => {
          const isSelected = selectedIdSet.has(webtoon.canonicalWebtoonId);
          const isMaxSelected = selectedCount >= 3;
          const isDisabled = isSelected || isMaxSelected;

          return (
            <article
              key={webtoon.canonicalWebtoonId}
              className={[
                "find-result-row",
                isSelected ? "find-result-row--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="find-result-row__content">
                <h3 className="find-result-row__title">{webtoon.title}</h3>
                <p className="find-result-row__meta">
                  {webtoon.platform} · {getWebtoonDisplayAxisLabel(webtoon)} ·{" "}
                  {getStatusLabel(webtoon.metadata.status)}
                </p>
              </div>
              <button
                type="button"
                className="find-result-row__select"
                disabled={isDisabled}
                onClick={() => onSelectWebtoon(webtoon)}
              >
                {isSelected
                  ? "선택됨"
                  : isMaxSelected
                    ? "선택 완료"
                    : "선택"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SelectedWebtoonList({
  selectedWebtoons,
  onRemoveWebtoon,
}: {
  selectedWebtoons: WebtoonSeedItem[];
  onRemoveWebtoon: (canonicalWebtoonId: string) => void;
}) {
  return (
    <section className="find-selected" aria-labelledby="find-selected-title">
      <div className="find-section-heading">
        <h2 id="find-selected-title">선택한 작품</h2>
        <span>{selectedWebtoons.length} / 3</span>
      </div>

      {selectedWebtoons.length === 0 ? (
        <AppCard as="div" variant="muted" className="find-selected__empty">
          <p>검색 결과에서 재밌게 본 작품을 선택해 주세요.</p>
        </AppCard>
      ) : (
        <div className="find-selected__list">
          {selectedWebtoons.map((webtoon) => (
            <AppCard
              key={webtoon.canonicalWebtoonId}
              as="article"
              className="find-selected-card"
            >
              <div>
                <AppTag>{getWebtoonDisplayAxisLabel(webtoon)}</AppTag>
                <h3 className="find-selected-card__title">{webtoon.title}</h3>
              </div>
              <button
                type="button"
                className="find-selected-card__remove"
                onClick={() =>
                  onRemoveWebtoon(webtoon.canonicalWebtoonId)
                }
                aria-label={`${webtoon.title} 선택 해제`}
              >
                선택 해제
              </button>
            </AppCard>
          ))}
        </div>
      )}
    </section>
  );
}