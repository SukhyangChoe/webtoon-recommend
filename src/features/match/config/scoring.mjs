export const MATCH_SCORING_CONFIG = Object.freeze({
  genreAffinity: Object.freeze({ baseWeight: 0.8, duelWeight: 0.2, duelScale: 3 }),
  totalStars: 18,
  rankedPositive: Object.freeze({
    weightsBySelectionCount: Object.freeze({
      1: Object.freeze([1]),
      2: Object.freeze([0.7, 0.3]),
      3: Object.freeze([0.5, 0.3, 0.2]),
      4: Object.freeze([0.4, 0.3, 0.2, 0.1]),
    }),
  }),
  recoveryBaseScore: 1.5,
  status: "CANDIDATE_FOR_PILOT",
});
