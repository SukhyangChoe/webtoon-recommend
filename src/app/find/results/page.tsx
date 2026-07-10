import Link from "next/link";

type FindResultsPageProps = {
  searchParams: Promise<{
    mode?: string | string[];
    testKey?: string | string[];
  }>;
};

const TEST_LABELS: Record<string, string> = {
  genre_preference: "장르 취향 테스트",
  fantasy_detail: "판타지 세부취향 테스트",
  murim_detail: "무협 세부취향 테스트",
  romance_ropan_detail:
    "로맨스·로판 세부취향 테스트",
  thriller_horror_detail:
    "스릴러·공포 세부취향 테스트",
  drama_daily_detail:
    "드라마·일상 세부취향 테스트",
};

function getFirstValue(
  value: string | string[] | undefined
) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function FindResultsPage({
  searchParams,
}: FindResultsPageProps) {
  const params = await searchParams;

  const mode = getFirstValue(params.mode);
  const testKey = getFirstValue(params.testKey);

  const testLabel = testKey
    ? TEST_LABELS[testKey] ??
      "저장된 세부취향 테스트"
    : "최근 테스트";

  const isTestResultMode =
    mode === "test_result";

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
          boxShadow:
            "0 24px 80px rgba(15, 23, 42, 0.28)",
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
          Secondary · test_result
        </p>

        <h1
          style={{
            margin: 0,
            color: "#0f172a",
            fontSize:
              "clamp(36px, 7vw, 60px)",
            lineHeight: 1.08,
            letterSpacing: "-0.05em",
          }}
        >
          최근 테스트 결과로
          <br />
          추천받기
        </h1>

        {isTestResultMode ? (
          <>
            <p
              style={{
                margin: "22px 0 0",
                color: "#334155",
                fontSize: 18,
                lineHeight: 1.75,
              }}
            >
              {testLabel} 결과를 기준으로 추천
              후보를 만드는 연결 화면이에요.
              <br />
              실제 후보 계산과 결과 카드는 다음
              작업에서 연결합니다.
            </p>

            <section
              style={{
                marginTop: 30,
                borderRadius: 22,
                border:
                  "1px solid #c7d2fe",
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
                현재 준비 상태
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
                테스트 결과 추천 route가
                준비됐어요.
              </h2>

              <p
                style={{
                  margin: "10px 0 0",
                  color: "#475569",
                  fontSize: 15,
                  lineHeight: 1.7,
                }}
              >
                D+32에서는 진입 route와 사용자
                안내 화면까지만 연결합니다.
                저장된 테스트 결과 읽기,
                candidatePool 생성, Secondary
                가중치 계산은 아직 실행하지
                않습니다.
              </p>
            </section>
          </>
        ) : (
          <p
            style={{
              margin: "22px 0 0",
              color: "#475569",
              fontSize: 17,
              lineHeight: 1.75,
            }}
          >
            현재 지원되지 않는 추천 진입
            방식이에요. 지금 볼 웹툰 찾기
            화면으로 돌아가 다시 선택해주세요.
          </p>
        )}

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
              border:
                "1px solid #c7d2fe",
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

        {process.env.NODE_ENV ===
        "development" ? (
          <details
            style={{
              marginTop: 26,
              borderRadius: 16,
              border:
                "1px solid #bbf7d0",
              background: "#f0fdf4",
              color: "#166534",
              padding: 14,
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              개발 확인용 route parameters
            </summary>

            <pre
              style={{
                margin: "10px 0 0",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 12,
                lineHeight: 1.55,
              }}
            >
              {JSON.stringify(
                {
                  mode,
                  testKey,
                  testLabel,
                  implementationStatus:
                    "placeholder_only",
                },
                null,
                2
              )}
            </pre>
          </details>
        ) : null}
      </section>
    </main>
  );
}