import Link from "next/link";

export default function FindPage() {
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
          maxWidth: 880,
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
          웹툰 추천 서비스 MVP
        </p>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(36px, 7vw, 64px)",
            lineHeight: 1.05,
            letterSpacing: "-0.05em",
          }}
        >
          지금 볼 웹툰 찾기
        </h1>

        <p
          style={{
            margin: "22px 0 0",
            color: "#334155",
            fontSize: 18,
            lineHeight: 1.75,
          }}
        >
          이곳에서 취향에 맞는 웹툰을 추천받을 수 있어요.
          <br />
          추천 기능은 다음 단계에서 연결됩니다.
        </p>

        <div
          style={{
            marginTop: 30,
            display: "grid",
            gap: 12,
          }}
        >
          <div
            style={{
              borderRadius: 20,
              border: "1px solid #e5e7eb",
              background: "#f8fafc",
              padding: 20,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                letterSpacing: "-0.03em",
              }}
            >
              다음 단계에서 연결될 기능
            </h2>

            <ul
              style={{
                margin: "12px 0 0",
                paddingLeft: 20,
                color: "#475569",
                lineHeight: 1.8,
              }}
            >
              <li>재밌게 본 작품으로 찾기</li>
              <li>지금 끌리는 분위기로 찾기</li>
              <li>취향 점수 기반 추천 TOP10</li>
            </ul>
          </div>

          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            D+21에서는 추천 카드와 작품 리스트를 아직 노출하지 않습니다.
          </p>
        </div>

        <div
          style={{
            marginTop: 34,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/tests"
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
            테스트 목록으로 돌아가기
          </Link>

          <Link
            href="/genre-preference"
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
            장르 취향 테스트 하기
          </Link>
        </div>
      </section>
    </main>
  );
}