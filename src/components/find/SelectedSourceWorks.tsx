import type { SimilarWorkSelectedWebtoon } from "@/lib/recommendation/similarWorkRecommendation";

export function SelectedSourceWorks({
  selectedWebtoons,
}: {
  selectedWebtoons: SimilarWorkSelectedWebtoon[];
}) {
  return (
    <section className="selected-source-works">
      <h2 className="selected-source-works__title">
        재밌게 봤던 작품
      </h2>

      <div className="selected-source-works__list">
        {selectedWebtoons.map((webtoon) => (
          <span
            key={webtoon.canonicalWebtoonId}
            className="selected-source-works__item"
          >
            {webtoon.title}
          </span>
        ))}
      </div>
    </section>
  );
}