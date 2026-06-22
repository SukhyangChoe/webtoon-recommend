import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 20px",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #ffffff 100%)",
        color: "#111827",
      }}
    >
      <section
        style={{
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <p
          style={{
            marginBottom: 12,
            fontSize: 14,
            fontWeight: 700,
            color: "#6366f1",
          }}
        >
          웹툰 추천 서비스 MVP
        </p>

        <h1
          style={{
            margin: 0,
            fontSize: 36,
            lineHeight: 1.2,
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
          지금 내 취향에 맞는
          <br />
          웹툰 세계를 찾아보세요
        </h1>

        <p
          style={{
            marginTop: 18,
            marginBottom: 32,
            fontSize: 17,
            lineHeight: 1.7,
            color: "#4b5563",
          }}
        >
          아직은 판타지 웹툰 취향 테스트부터 내부 MVP로 연결합니다.
          질문을 고르면 나중에 결과 화면과 추천 로직으로 이어질 예정입니다.
        </p>

        <div
          style={{
            display: "grid",
            gap: 16,
          }}
        >
          <Link
            href="/tests/fantasy"
            style={{
              display: "block",
              padding: 24,
              borderRadius: 20,
              background: "#111827",
              color: "#ffffff",
              textDecoration: "none",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#c7d2fe",
                marginBottom: 8,
              }}
            >
              D+2 작업 대상
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              판타지 웹툰 취향 테스트
            </h2>

            <p
              style={{
                marginTop: 10,
                marginBottom: 18,
                fontSize: 15,
                lineHeight: 1.6,
                color: "#e5e7eb",
              }}
            >
              제목 없는 판타지 웹툰 원고가 도착했습니다.
              <br />
              당신이 고르는 장면들이 모여 오래 머물 판타지의 방향을
              만들어갑니다.
            </p>

            <span
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 999,
                background: "#ffffff",
                color: "#111827",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              첫 페이지 넘기기 →
            </span>
          </Link>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <ComingSoonCard
              title="무협 웹툰 취향 테스트"
              description="D+2 이후 공통 엔진에 연결 예정"
            />

            <ComingSoonCard
              title="웹툰 장르 취향 테스트"
              description="내 웹툰 세계관 지도 결과로 연결 예정"
            />

            <ComingSoonCard
              title="지금 볼 웹툰 찾기"
              description="작품 추천 기능은 이 플로우에서만 제공 예정"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function ComingSoonCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        background: "rgba(255, 255, 255, 0.85)",
        border: "1px solid #e5e7eb",
      }}
    >
      <p
        style={{
          margin: 0,
          marginBottom: 8,
          fontSize: 12,
          fontWeight: 700,
          color: "#9ca3af",
        }}
      >
        준비 중
      </p>

      <h3
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 800,
          color: "#111827",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          marginTop: 8,
          marginBottom: 0,
          fontSize: 14,
          lineHeight: 1.5,
          color: "#6b7280",
        }}
      >
        {description}
      </p>
    </div>
  );
}