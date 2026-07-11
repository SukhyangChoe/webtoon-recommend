import Link from "next/link";

export default function FindResultsPage() {
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
          maxWidth: 820,
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

        <h1
          style={{
            margin: 0,
            color: "#0f172a",
            fontSize: "clamp(36px, 7vw, 60px)",
            lineHeight: 1.08,
            letterSpacing: "-0.05em",
          }}
        >
          Secondary 추천은
          <br />
          다음 작업에서 연결해요.
        </h1>

        <p
          style={{
            margin: "22px 0 0",
            color: "#334155",
            fontSize: 18,
            lineHeight: 1.75,
          }}
        >
          D+33에서는 Primary의 v2.1.1 점수 파이프라인과 추천 세션 저장을
          우선 적용했습니다.
          <br />
          userTasteProfile 또는 세부취향 결과를 이용한 즉시 추천 UI와 계산은
          아직 실행하지 않습니다.
        </p>

        <section
          style={{
            marginTop: 30,
            borderRadius: 22,
            border: "1px solid #c7d2fe",
            background: "#eef2ff",
            padding: 22,
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
            D+33 범위
          </p>

          <h2
            style={{
              margin: "8px 0 0",
              color: "#0f172a",
              fontSize: 23,
              lineHeight: 1.4,
              letterSpacing: "-0.03em",
            }}
          >
            Primary 추천 결과는 /find에서 확인할 수 있어요.
          </h2>

          <p
            style={{
              margin: "10px 0 0",
              color: "#475569",
              fontSize: 15,
              lineHeight: 1.7,
            }}
          >
            재밌게 본 작품을 1~3개 선택하면 selected_webtoons 벡터로 추천을
            생성합니다.
          </p>
        </section>

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
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 48,
              borderRadius: 14,
              background: "#4f46e5",
              color: "#ffffff",
              padding: "12px 18px",
              fontSize: 15,
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            지금 볼 웹툰 찾기로 돌아가기
          </Link>

          <Link
            href="/tests"
            style={{
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
            }}
          >
            테스트 목록 보기
          </Link>
        </div>
      </section>
    </main>
  );
}