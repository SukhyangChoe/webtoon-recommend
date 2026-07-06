"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import { loadAllKnownTestResults } from "@/lib/storage/resultRepository";
import type { StoredTestResult, TestKey } from "@/types/testResults";

type TestHubCard = {
  testKey: TestKey;
  title: string;
  description: string;
  route: string;
  badge: string;
};

const TEST_CARDS: TestHubCard[] = [
  {
    testKey: "genre_preference",
    title: "웹툰 장르 취향 테스트",
    description:
      "짧은 장면 선택으로 내 웹툰 세계관 지도를 확인하는 대표 테스트입니다.",
    route: "/genre-preference",
    badge: "대표 테스트",
  },
  {
    testKey: "fantasy_detail",
    title: "판타지 웹툰 취향 테스트",
    description:
      "시스템, 힘숨찐, 성장, 생존, 왕국 전략처럼 오래 머물 판타지 취향을 확인합니다.",
    route: "/tests/fantasy",
    badge: "세부 테스트",
  },
  {
    testKey: "murim_detail",
    title: "무협 웹툰 취향 테스트",
    description:
      "수련, 절대강자, 복수, 문파 정치, 협객형 무협 취향을 확인합니다.",
    route: "/tests/murim",
    badge: "세부 테스트",
  },
  {
    testKey: "romance_ropan_detail",
    title: "로맨스·로판 웹툰 취향 테스트",
    description:
      "계약·빙의, 주도권 역전, 감정선, 궁정 권력, 직진 케미, 힐링 동행 취향을 확인합니다.",
    route: "/tests/romance-ropan",
    badge: "세부 테스트",
  },
  {
    testKey: "thriller_horror_detail",
    title: "스릴러·공포 웹툰 취향 테스트",
    description:
      "추리, 생존, 오컬트, 범죄 응징, 심리 압박, 음모 반전 취향을 확인합니다.",
    route: "/tests/thriller-horror",
    badge: "세부 테스트",
  },
  {
    testKey: "drama_daily_detail",
    title: "드라마·일상 웹툰 취향 테스트",
    description:
      "현실 공감, 청춘 성장, 힐링 일상, 가족 관계, 감정 여운, 생활 코미디 취향을 확인합니다.",
    route: "/tests/drama-daily",
    badge: "세부 테스트",
  },
];

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#020617",
  color: "#0f172a",
  padding: "48px 20px",
};

const containerStyle: CSSProperties = {
  width: "100%",
  maxWidth: 1120,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  marginBottom: 28,
  color: "#ffffff",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 18,
};

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  minHeight: 260,
  borderRadius: 24,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  padding: 24,
  boxShadow: "0 18px 60px rgba(15, 23, 42, 0.22)",
};

const badgeStyle: CSSProperties = {
  width: "fit-content",
  borderRadius: 999,
  background: "#eef2ff",
  color: "#4f46e5",
  padding: "6px 10px",
  fontSize: 13,
  fontWeight: 900,
};

const savedBadgeStyle: CSSProperties = {
  width: "fit-content",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#15803d",
  padding: "6px 10px",
  fontSize: 13,
  fontWeight: 900,
};

const emptyBadgeStyle: CSSProperties = {
  width: "fit-content",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#64748b",
  padding: "6px 10px",
  fontSize: 13,
  fontWeight: 900,
};

const primaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  borderRadius: 14,
  background: "#4f46e5",
  color: "#ffffff",
  padding: "12px 16px",
  fontSize: 15,
  fontWeight: 900,
  textDecoration: "none",
};

const secondaryButtonStyle: CSSProperties = {
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

function formatCompletedAt(completedAt?: string) {
  if (!completedAt) return "완료 시각 정보 없음";

  const date = new Date(completedAt);

  if (Number.isNaN(date.getTime())) {
    return completedAt;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TestsPage() {
  const [storedResults, setStoredResults] = useState<
    Partial<Record<TestKey, StoredTestResult>>
  >({});
  const [storageChecked, setStorageChecked] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStoredResults(loadAllKnownTestResults());
      setStorageChecked(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <header style={headerStyle}>
          <p
            style={{
              margin: "0 0 12px",
              color: "#a5b4fc",
              fontSize: 15,
              fontWeight: 900,
            }}
          >
            웹툰 추천 서비스 MVP
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(34px, 6vw, 56px)",
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
            }}
          >
            어떤 테스트부터
            <br />
            시작해볼까요?
          </h1>

          <p
            style={{
              maxWidth: 680,
              margin: "18px 0 0",
              color: "#cbd5e1",
              fontSize: 17,
              lineHeight: 1.7,
            }}
          >
            먼저 내 웹툰 세계관 지도를 확인하거나, 이미 끌리는 장르가
            있다면 장르별 세부 취향 테스트로 바로 들어갈 수 있어요.
          </p>
        </header>

        <section style={gridStyle} aria-label="웹툰 테스트 목록">
          {TEST_CARDS.map((card) => {
            const storedResult = storedResults[card.testKey];
            const hasStoredResult = Boolean(storedResult);

            return (
              <article key={card.testKey} style={cardStyle}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={badgeStyle}>{card.badge}</span>
                  <span
                    style={hasStoredResult ? savedBadgeStyle : emptyBadgeStyle}
                  >
                    {!storageChecked
                      ? "저장 결과 확인 중"
                      : hasStoredResult
                        ? "결과 저장됨"
                        : "아직 안 했어요"}
                  </span>
                </div>

                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 24,
                      lineHeight: 1.25,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {card.title}
                  </h2>

                  <p
                    style={{
                      margin: "10px 0 0",
                      color: "#475569",
                      fontSize: 15,
                      lineHeight: 1.7,
                    }}
                  >
                    {card.description}
                  </p>
                </div>

                {storedResult ? (
                  <div
                    style={{
                      borderRadius: 16,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      padding: 14,
                      color: "#334155",
                      fontSize: 14,
                      lineHeight: 1.65,
                    }}
                  >
                    <strong style={{ color: "#0f172a" }}>
                      {storedResult.resultName}
                    </strong>
                    <br />
                    {formatCompletedAt(storedResult.completedAt)}
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    marginTop: "auto",
                  }}
                >
                  <Link href={card.route} style={primaryButtonStyle}>
                    {hasStoredResult ? "결과 다시 보기" : "테스트 시작하기"}
                  </Link>

                  {hasStoredResult ? (
                    <Link href={card.route} style={secondaryButtonStyle}>
                      다시 테스트하기
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

        <p
          style={{
            margin: "24px 0 0",
            color: "#94a3b8",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          저장 결과가 있는 테스트는 해당 테스트 화면에서 결과를 다시 보거나
          다시 테스트할 수 있어요.
        </p>
      </div>
    </main>
  );
}