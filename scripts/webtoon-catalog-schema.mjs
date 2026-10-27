export const CATALOG_GENRE_SCORE_KEYS = Object.freeze([
  "drama_daily",
  "fantasy",
  "murim",
  "romance_ropan",
  "thriller_horror",
]);

export const CATALOG_TYPE_PARENT_KEYS = Object.freeze([
  "drama_daily",
  "fantasy",
  "murim",
  "romance_ropan",
  "thriller_horror",
]);

// Historical exceptions retained for auditing older snapshots. The user-approved
// integrated 20261023 source removes these five action values. Do not reinsert
// them or require their presence in new catalogs; other action values stay invalid.
export const PRESERVED_ACTION_GENRE_SCORE_EXCEPTIONS = Object.freeze({
  wt_thriller_horror_add_040: Object.freeze({
    title: "재력으로 후려치는 환생 경찰",
    score: 4,
  }),
  wt_thriller_horror_add_041: Object.freeze({
    title: "기사도",
    score: 4,
  }),
  wt_romance_ropan_2634: Object.freeze({
    title: "충직한 검이 되려 했는데",
    score: 3,
  }),
  wt_fantasy_1565: Object.freeze({
    title: "무제한의 세균술사",
    score: 3,
  }),
  wt_romance_ropan_6000: Object.freeze({
    title: "에리카 - 친구가 내게 집착할 때",
    score: 3,
  }),
});

export function isPreservedActionGenreScore(webtoon) {
  const exception = PRESERVED_ACTION_GENRE_SCORE_EXCEPTIONS[webtoon?.canonicalWebtoonId];
  return Boolean(
    exception
    && webtoon?.title === exception.title
    && webtoon?.recommendation?.genreScores?.action === exception.score,
  );
}
