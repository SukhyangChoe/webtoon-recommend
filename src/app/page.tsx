import Link from "next/link";

export default function HomePage() {
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
          maxWidth: 960,
          margin: "0 auto",
          borderRadius: 32,
          background: "#ffffff",
          padding: "clamp(28px, 6vw, 60px)",
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
            fontSize: "clamp(38px, 7vw, 68px)",
            lineHeight: 1.05,
            letterSpacing: "-0.05em",
          }}
        >
          지금 내 취향에 맞는
          <br />
          웹툰 세계를 찾아보세요
        </h1>

        <p
          style={{
            maxWidth: 720,
            margin: "22px 0 0",
            color: "#334155",
            fontSize: 18,
            lineHeight: 1.75,
          }}
        >
          먼저 전체 장르 취향을 확인하거나, 이미 끌리는 장르가 있다면
          장르별 세부 취향 테스트로 바로 들어갈 수 있어요.
        </p>

        <div
          style={{
            marginTop: 34,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          <HomeCtaCard
            title="내 웹툰 장르 취향 알아보기"
            description="짧은 장면 선택으로 내 웹툰 세계관 지도를 확인합니다."
            href="/genre-preference"
            buttonText="장르 취향 테스트 시작"
            primary
          />

          <HomeCtaCard
            title="장르별 세부 취향 테스트 보기"
            description="판타지, 무협, 로맨스·로판, 스릴러·공포, 드라마·일상 테스트를 모아봅니다."
            href="/tests"
            buttonText="테스트 목록 보기"
          />
        </div>

        <p
          style={{
            margin: "28px 0 0",
            color: "#64748b",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          작품 추천은 이후 “지금 볼 웹툰 찾기”에서 제공됩니다. 테스트 결과
          화면에는 작품 추천 리스트를 직접 노출하지 않습니다.
        </p>
      </section>
    </main>
  );
}

function HomeCtaCard({
  title,
  description,
  href,
  buttonText,
  primary = false,
}: {
  title: string;
  description: string;
  href: string;
  buttonText: string;
  primary?: boolean;
}) {
  return (
    <article
      style={{
        borderRadius: 24,
        border: "1px solid #e5e7eb",
        background: primary ? "#eef2ff" : "#f8fafc",
        padding: 24,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 24,
          letterSpacing: "-0.03em",
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: "10px 0 22px",
          color: "#475569",
          fontSize: 15,
          lineHeight: 1.7,
        }}
      >
        {description}
      </p>

      <Link
        href={href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          minHeight: 48,
          borderRadius: 14,
          background: primary ? "#4f46e5" : "#ffffff",
          border: primary ? "none" : "1px solid #c7d2fe",
          color: primary ? "#ffffff" : "#4338ca",
          padding: "12px 16px",
          fontSize: 15,
          fontWeight: 900,
          textDecoration: "none",
        }}
      >
        {buttonText}
      </Link>
    </article>
  );
}