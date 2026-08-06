"use client";

import { useEffect, useMemo, useState } from "react";

import { FindRecommendationResult } from "@/components/find/FindRecommendationResult";
import { PageContainer } from "@/components/layout/PageContainer";
import { AppButton } from "@/components/ui/AppButton";
import { StatePanel } from "@/components/ui/StatePanel";
import webtoonSeedData from "@/data/webtoons/webtoons_seed_current.json";
import {
  DETAIL_TEST_ROUTE_BY_TEST_KEY,
  buildDetailTestRecommendationVector,
  isDetailTestKey,
  isStoredDetailTestResultForKey,
} from "@/lib/recommendation/detailTestRecommendation";
import {
  createDetailTestRecommendationSelectionResult,
  normalizeWebtoonSeedData,
} from "@/lib/recommendation/similarWorkRecommendation";
import { consumeDetailTestRecommendationEntry } from "@/lib/storage/findRecommendationEntryStorage";
import {
  createFindDetailTestSession,
  getExcludedIdsFromActionStates,
  loadFindPrimarySession,
  restoreRecommendationSelectionResultFromSession,
  saveFindPrimarySession,
} from "@/lib/storage/findPrimarySessionStorage";
import { loadTestResult } from "@/lib/storage/resultRepository";

import type { FindRecommendationSelectionResult } from "@/lib/recommendation/similarWorkRecommendation";
import type { FindRecommendationSession } from "@/lib/storage/findPrimarySessionStorage";
import type { DetailTestKey } from "@/types/testResults";

const WEBTOONS = normalizeWebtoonSeedData(webtoonSeedData);

type DetailEntryError = {
  kind: "invalid_source_test_key" | "missing_stored_result";
  sourceTestKey?: DetailTestKey;
};

export default function FindResultsPage() {
  const [session, setSession] =
    useState<FindRecommendationSession | null>(null);
  const [selectionResult, setSelectionResult] =
    useState<FindRecommendationSelectionResult | null>(null);
  const [entryError, setEntryError] =
    useState<DetailEntryError | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const currentSession = loadFindPrimarySession();
      const oneTimeEntry = consumeDetailTestRecommendationEntry();
      const searchParams = new URLSearchParams(window.location.search);
      const queryMode = searchParams.get("mode");
      const queryVectorSource = searchParams.get("vectorSource");
      const querySourceTestKey = searchParams.get("sourceTestKey");
      const queryRequestsDetailResult =
        queryMode === "instant_recommendation" &&
        queryVectorSource === "detail_test_result";

      if (
        queryRequestsDetailResult &&
        !isDetailTestKey(querySourceTestKey)
      ) {
        setEntryError({ kind: "invalid_source_test_key" });
        setHasLoaded(true);
        return;
      }

      const requestedSourceTestKey =
        oneTimeEntry?.sourceTestKey ??
        (queryRequestsDetailResult && isDetailTestKey(querySourceTestKey)
          ? querySourceTestKey
          : null);

      if (requestedSourceTestKey) {
        const canRestoreMatchingSession =
          !oneTimeEntry &&
          currentSession?.recommendationMode ===
            "instant_recommendation" &&
          currentSession.vectorSource === "detail_test_result" &&
          currentSession.sourceTestKey === requestedSourceTestKey;

        if (canRestoreMatchingSession && currentSession) {
          setSession(currentSession);
          setSelectionResult(
            restoreRecommendationSelectionResultFromSession(
              currentSession
            )
          );
          setHasLoaded(true);
          return;
        }

        const storedDetailResult = loadTestResult(
          requestedSourceTestKey
        );

        if (
          !isStoredDetailTestResultForKey(
            storedDetailResult,
            requestedSourceTestKey
          )
        ) {
          setEntryError({
            kind: "missing_stored_result",
            sourceTestKey: requestedSourceTestKey,
          });
          setHasLoaded(true);
          return;
        }

        const activeRecommendationVector =
          buildDetailTestRecommendationVector(
            requestedSourceTestKey,
            storedDetailResult
          );
        const previousActionStates =
          currentSession?.actionStateByWebtoonId ?? {};
        const {
          alreadySeenWebtoonIds,
          excludedWebtoonIds,
        } = getExcludedIdsFromActionStates(previousActionStates);
        const nextSelectionResult =
          createDetailTestRecommendationSelectionResult({
            sourceTestKey: requestedSourceTestKey,
            activeRecommendationVector,
            allWebtoons: WEBTOONS,
            filterContext: {
              alreadySeenWebtoonIds,
              excludedWebtoonIds,
            },
          });
        const nextSession = createFindDetailTestSession({
          selectionResult: nextSelectionResult,
          actionStateByWebtoonId: previousActionStates,
        });

        saveFindPrimarySession(nextSession);
        setSession(nextSession);
        setSelectionResult(nextSelectionResult);
        setHasLoaded(true);
        return;
      }

      setSession(currentSession);
      setSelectionResult(
        currentSession
          ? restoreRecommendationSelectionResultFromSession(
              currentSession
            )
          : null
      );
      setHasLoaded(true);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  const testRoute = useMemo(() => {
    if (!entryError?.sourceTestKey) return "/tests";

    return DETAIL_TEST_ROUTE_BY_TEST_KEY[entryError.sourceTestKey];
  }, [entryError]);

  return (
    <main className="find-results-page">
      <PageContainer size="result" className="find-results-page__container">
        {!hasLoaded ? (
          <LoadingState />
        ) : entryError ? (
          <DetailResultErrorState
            error={entryError}
            testRoute={testRoute}
          />
        ) : selectionResult && session ? (
          <>
            <nav
              className="find-results-page__nav"
              aria-label="추천 결과 보조 이동"
            >
              <AppButton href="/find" variant="ghost">
                ← 다시 찾아보기
              </AppButton>
              <AppButton href="/tests" variant="ghost">
                취향 테스트 보기
              </AppButton>
            </nav>

            <FindRecommendationResult
              selectionResult={selectionResult}
              initialActionStates={session.actionStateByWebtoonId}
              restoredSession={session}
            />
          </>
        ) : (
          <EmptyState />
        )}
      </PageContainer>
    </main>
  );
}

function LoadingState() {
  return (
    <StatePanel
      tone="loading"
      eyebrow="추천을 준비하고 있어요"
      title="취향에 맞는 웹툰을 찾고 있어요"
      description={
        "재밌게 본 작품의 분위기와\n잘 맞는 웹툰을 살펴보는 중이에요."
      }
    />
  );
}

function DetailResultErrorState({
  error,
  testRoute,
}: {
  error: DetailEntryError;
  testRoute: string;
}) {
  const isInvalidSource = error.kind === "invalid_source_test_key";

  return (
    <StatePanel
      tone="error"
      eyebrow="결과를 불러오지 못했어요"
      title={
        isInvalidSource
          ? "올바른 취향 테스트 정보를 확인하지 못했어요."
          : "저장된 취향 결과를 찾지 못했어요."
      }
      description={
        isInvalidSource
          ? "취향 테스트 목록에서 원하는 테스트를 다시 선택해 주세요."
          : "테스트 결과를 다시 확인한 뒤 추천받아 주세요."
      }
      primaryAction={{
        label: isInvalidSource
          ? "취향 테스트 보기"
          : "테스트 다시 확인하기",
        href: testRoute,
      }}
      secondaryAction={{
        label: "다시 찾아보기",
        href: "/find",
      }}
    />
  );
}

function EmptyState() {
  return (
    <StatePanel
      tone="empty"
      eyebrow="추천 결과 없음"
      title="지금 조건에 맞는 웹툰을 찾지 못했어요."
      description={
        "다른 작품을 기준으로 다시 찾아보거나\n취향 테스트 결과로 추천받아보세요."
      }
      primaryAction={{
        label: "다시 찾아보기",
        href: "/find",
      }}
      secondaryAction={{
        label: "취향 테스트 보기",
        href: "/tests",
      }}
    />
  );
}