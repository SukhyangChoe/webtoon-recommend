import {
  getWebtoonDisplayAxisLabel,
} from "@/lib/recommendation/similarWorkRecommendation";

import type {
  SimilarWorkSelectedWebtoon,
} from "@/lib/recommendation/similarWorkRecommendation";

export function SelectedSourceWorks({
  selectedWebtoons,
}: {
  selectedWebtoons: SimilarWorkSelectedWebtoon[];
}) {
  return (
    <section
      style={{
        borderRadius: 20,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        padding: 18,
        display: "grid",
        gap: 12,
      }}
    >
      <h3
        style={{
          margin: 0,
          color: "#0f172a",
          fontSize: 17,
          lineHeight: 1.4,
        }}
      >
        기준 작품
      </h3>

      <div
        style={{
          display: "grid",
          gap: 10,
        }}
      >
        {selectedWebtoons.map((webtoon) => (
          <div
            key={webtoon.canonicalWebtoonId}
            style={{
              borderRadius: 14,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              padding: 13,
            }}
          >
            <strong
              style={{
                color: "#0f172a",
                fontSize: 15,
                lineHeight: 1.5,
              }}
            >
              {webtoon.title}
            </strong>

            <p
              style={{
                margin: "5px 0 0",
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {webtoon.platform} ·{" "}
              {getWebtoonDisplayAxisLabel(webtoon)}
            </p>

            {process.env.NODE_ENV === "development" ? (
              <details
                style={{
                  marginTop: 9,
                  color: "#166534",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  DB 출처 / contentAxis 확인
                </summary>

                <pre
                  style={{
                    margin: "8px 0 0",
                    maxHeight: 240,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: 11,
                    lineHeight: 1.5,
                  }}
                >
                  {JSON.stringify(
                    {
                      canonicalWebtoonId:
                        webtoon.canonicalWebtoonId,
                      sourceDb: webtoon.sourceDb,
                      sourceWeight: webtoon.sourceWeight,
                      primaryContentAxisKey:
                        webtoon.primaryContentAxisKey,
                      displayAxisLabel:
                        webtoon.displayAxisLabel,
                      contentAxisScores:
                        webtoon.contentAxisScores,
                    },
                    null,
                    2
                  )}
                </pre>
              </details>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}