import type { SimilarWorkSelectedWebtoon } from "@/lib/recommendation/similarWorkRecommendation";

export function SelectedSourceWorks({
  selectedWebtoons,
}: {
  selectedWebtoons: SimilarWorkSelectedWebtoon[];
}) {
  return (
    <section>
      <h3
        style={{
          margin: "0 0 8px",
          color: "#14532d",
          fontSize: 17,
          letterSpacing: "-0.02em",
        }}
      >
        기준 작품
      </h3>

      <ul
        style={{
          margin: 0,
          paddingLeft: 20,
          color: "#166534",
          lineHeight: 1.7,
        }}
      >
        {selectedWebtoons.map((webtoon) => (
          <li key={webtoon.canonicalWebtoonId}>
            {webtoon.title} / {webtoon.platform}
          </li>
        ))}
      </ul>
    </section>
  );
}