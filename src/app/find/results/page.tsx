"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FindRecommendationResult } from "@/components/find/FindRecommendationResult";
import {
  loadFindPrimarySession,
  restoreRecommendationSelectionResultFromSession,
} from "@/lib/storage/findPrimarySessionStorage";

import type { FindRecommendationSession } from "@/lib/storage/findPrimarySessionStorage";

export default function FindResultsPage() {
  const [session, setSession] =
    useState<FindRecommendationSession | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setSession(loadFindPrimarySession());
      setHasLoaded(true);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  const selectionResult = useMemo(() => {
    if (!session) return null;

    return restoreRecommendationSelectionResultFromSession(session);
  }, [session]);

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