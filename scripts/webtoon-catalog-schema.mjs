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

// 최신 원본 DB에 이미 포함된 5건은 사용자 확인 전까지 원값과 계산을 보존한다.
// 이 목록은 action을 여섯 번째 기준 장르로 승인하는 목록이 아니라,
// 새 action 값의 확산을 막기 위한 명시적인 임시 예외 목록이다.
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
