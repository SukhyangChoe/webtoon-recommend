"use client";

import { useState } from "react";
import {
  genrePreferenceQuestions,
  genrePreferenceStartCopy,
  genrePreferenceTest,
} from "@/data/tests/genrePreference";

export default function GenrePreferencePage() {
  const [hasStarted, setHasStarted] = useState(false);

  if (hasStarted) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#ffffff",
          padding: 24,
        }}
      >
        <section
          style={{
            maxWidth: 760,
            margin: "0 auto",
            paddingTop: 72,
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              color: "#a5b4fc",
              fontWeight: 900,
              fontSize: 14,
            }}
          >
            D+9 착수 준비 페이지
          </p>

          <h1
            style={{
              margin: "0 0 16px",
              fontSize: 30,
              lineHeight: 1.3,
            }}
          >
            {genrePreferenceTest.displayName} v1.4 준비 완료
          </h1>

          <p
            style={{
              margin: "0 0 24px",
              color: "#cbd5e1",
              fontSize: 18,
              lineHeight: 1.7,
            }}
          >
            Q1~Q10 이미지 카드 UI와 세계관 지도 결과 화면은 다음 작업에서
            연결합니다. 오늘은 route, 메타 정보, 문항 데이터, 계산 함수 초안이
            준비된 상태까지만 확인합니다.
          </p>

          <section
            style={{
              borderRadius: 20,
              border: "1px solid #334155",
              background: "#0f172a",
              padding: 18,
              marginBottom: 18,
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 18,
              }}
            >
              현재 연결된 기본 정보
            </h2>

            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "150px 1fr",
                gap: "8px 12px",
                margin: 0,
                color: "#e2e8f0",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <dt style={{ color: "#94a3b8" }}>testKey</dt>
              <dd style={{ margin: 0 }}>{genrePreferenceTest.testKey}</dd>

              <dt style={{ color: "#94a3b8" }}>testVersion</dt>
              <dd style={{ margin: 0 }}>{genrePreferenceTest.testVersion}</dd>

              <dt style={{ color: "#94a3b8" }}>selectMode</dt>
              <dd style={{ margin: 0 }}>{genrePreferenceTest.selectMode}</dd>

              <dt style={{ color: "#94a3b8" }}>questionCount</dt>
              <dd style={{ margin: 0 }}>{genrePreferenceTest.questionCount}</dd>

              <dt style={{ color: "#94a3b8" }}>pairCount</dt>
              <dd style={{ margin: 0 }}>{genrePreferenceTest.pairCount}</dd>

              <dt style={{ color: "#94a3b8" }}>resultMode</dt>
              <dd style={{ margin: 0 }}>{genrePreferenceTest.resultMode}</dd>
            </dl>
          </section>

          <section
            style={{
              borderRadius: 20,
              border: "1px solid #334155",
              background: "#0f172a",
              padding: 18,
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 18,
              }}
            >
              Q1~Q10 장르 비교쌍
            </h2>

            <ol
              style={{
                margin: 0,
                paddingLeft: 20,
                color: "#e2e8f0",
                lineHeight: 1.8,
                fontSize: 14,
              }}
            >
              {genrePreferenceQuestions.map((question) => (
                <li key={question.questionKey}>
                  {question.left.genreName} vs {question.right.genreName}
                </li>
              ))}
            </ol>
          </section>

          <button
            type="button"
            onClick={() => setHasStarted(false)}
            style={{
              width: "100%",
              marginTop: 24,
              border: "1px solid #475569",
              borderRadius: 16,
              background: "transparent",
              color: "#e2e8f0",
              padding: "14px 16px",
              fontSize: 15,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            시작 화면으로 돌아가기
          </button>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#ffffff",
        padding: 24,
      }}
    >
      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          paddingTop: 72,
        }}
      >
        <p
          style={{
            margin: "0 0 12px",
            color: "#a5b4fc",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          {genrePreferenceStartCopy.helperText}
        </p>

        <h1
          style={{
            margin: "0 0 20px",
            fontSize: 34,
            lineHeight: 1.25,
          }}
        >
          {genrePreferenceStartCopy.title}
        </h1>

        <div
          style={{
            display: "grid",
            gap: 6,
            marginBottom: 28,
            color: "#cbd5e1",
            fontSize: 18,
            lineHeight: 1.7,
          }}
        >
          {genrePreferenceStartCopy.descriptionLines.map((line, index) =>
            line ? (
              <p key={`${line}-${index}`} style={{ margin: 0 }}>
                {line}
              </p>
            ) : (
              <div key={`space-${index}`} style={{ height: 8 }} />
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => setHasStarted(true)}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 16,
            background: "#ffffff",
            color: "#0f172a",
            padding: "16px 18px",
            fontSize: 17,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {genrePreferenceStartCopy.buttonText}
        </button>

        <p
          style={{
            margin: "18px 0 0",
            color: "#94a3b8",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          D+9에서는 시작 화면과 v1.4 기본 데이터만 연결합니다. 실제 Q1~Q10
          카드 UI와 결과 지도는 다음 단계에서 구현합니다.
        </p>
      </section>
    </main>
  );
}