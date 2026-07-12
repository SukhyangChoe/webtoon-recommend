"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FindRecommendationResult } from "@/components/find/FindRecommendationResult";
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
import {
  consumeDetailTestRecommendationEntry,
} from "@/lib/storage/findRecommendationEntryStorage";
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
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#0f172a",
        padding: "48px 20px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 980,
          margin: "0 auto",
          borderRadius: 32,
          background: "#ffffff",
          padding: "clamp(28px, 6vw, 56px)",
          boxShadow: "0 24px 80px rgba(15, 23, 42, 0.28)",
        }}
      >
        <p
          style={{
            margin: "0 0 12px",
            color: "#4f46e5",
            fontSize: 15,
            fontWeight: 900,
          }}
        >
          지금 볼 웹툰 찾기
        </p>

        {!hasLoaded ? (
          <LoadingState />
        ) : entryError ? (
          <DetailResultErrorState
            error={entryError}
            testRoute={testRoute}
          />
        ) : selectionResult && session ? (
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <Link href="/find" style={linkButtonStyle}>
                ← 찾기 방식 다시 고르기
              </Link>

              <Link href="/tests" style={linkButtonStyle}>
                취향 테스트 보기
              </Link>
            </div>

            <FindRecommendationResult
              selectionResult={selectionResult}
              initialActionStates={session.actionStateByWebtoonId}
              restoredSession={session}
            />
          </>
        ) : (
          <EmptyState />
        )}
      </section>
    </main>
  );
}

function LoadingState() {
  return (
    <section
      style={{
        marginTop: 24,
        borderRadius: 22,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        padding: 22,
      }}
    >
      <h1
        style={{
          margin: 0,
          color: "#0f172a",
          fontSize: "clamp(30px, 6vw, 48px)",
          lineHeight: 1.15,
          letterSpacing: "-0.04em",
        }}
      >
        추천 결과를 불러오고 있어요.
      </h1>
    </section>
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
    <>
      <h1
        style={{
          margin: 0,
          color: "#0f172a",
          fontSize: "clamp(34px, 7vw, 56px)",
          lineHeight: 1.08,
          letterSpacing: "-0.05em",
        }}
      >
        {isInvalidSource
          ? "올바른 취향 테스트 정보를 확인하지 못했어요."
          : "저장된 취향 결과를 찾지 못했어요."}
      </h1>

      <p
        style={{
          margin: "22px 0 0",
          color: "#334155",
          fontSize: 18,
          lineHeight: 1.75,
        }}
      >
        {isInvalidSource
          ? "취향 테스트 목록에서 원하는 테스트를 다시 선택해 주세요."
          : "테스트 결과를 다시 확인한 뒤 추천받아 주세요."}
      </p>

      <div
        style={{
          marginTop: 28,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <Link
          href={testRoute}
          style={{
            ...linkButtonStyle,
            border: "none",
            background: "#4f46e5",
            color: "#ffffff",
          }}
        >
          {isInvalidSource ? "취향 테스트 보기" : "테스트 다시 확인하기"}
        </Link>

        <Link href="/find" style={linkButtonStyle}>
          지금 볼 웹툰 찾기
        </Link>
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <>
      <h1
        style={{
          margin: 0,
          color: "#0f172a",
          fontSize: "clamp(36px, 7vw, 60px)",
          lineHeight: 1.08,
          letterSpacing: "-0.05em",
        }}
      >
        아직 저장된 추천 결과가 없어요.
      </h1>

      <p
        style={{
          margin: "22px 0 0",
          color: "#334155",
          fontSize: 18,
          lineHeight: 1.75,
        }}
      >
        /find에서 재밌게 본 작품을 고르거나, 저장된 취향으로 바로
        추천받아주세요.
      </p>

      <div
        style={{
          marginTop: 28,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <Link
          href="/find"
          style={{
            ...linkButtonStyle,
            border: "none",
            background: "#4f46e5",
            color: "#ffffff",
          }}
        >
          지금 볼 웹툰 찾기
        </Link>

        <Link href="/tests" style={linkButtonStyle}>
          취향 테스트 보기
        </Link>
      </div>
    </>
  );
}

const linkButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  borderRadius: 14,
  border: "1px solid #c7d2fe",
  background: "#ffffff",
  color: "#4338ca",
  padding: "12px 18px",
  fontSize: 15,
  fontWeight: 900,
  textDecoration: "none",
} as const;