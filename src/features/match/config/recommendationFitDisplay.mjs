/** Display conversion. Eligibility and sorting use raw scores; the explicit badge policy is separate. */
export const RECOMMENDATION_FIT_DISPLAY_VERSION = 'sqrt_v1';

// Reader-facing interpretation, not measured enjoyment probabilities or new gates.
export const FIT_SCORE_GUIDE_BANDS = Object.freeze([
  { min:90, max:100, label:'많은 취향 요소가 겹쳐요' },
  { min:70, max:89, label:'취향이 비교적 잘 맞아요' },
  { min:50, max:69, label:'일부 취향 요소가 겹쳐요' },
  { min:0, max:49, label:'새로운 취향을 탐색해 볼 작품이에요' },
]);

/** @param {unknown} rawScore01 The engine's unrounded-to-percent 0..1 score. */
export function recommendationFitDisplayScore(rawScore01) {
  if (typeof rawScore01 !== 'number' || !Number.isFinite(rawScore01)
    || rawScore01 < 0 || rawScore01 > 1) return null;
  return Math.round(100 * Math.sqrt(rawScore01));
}

/** Preserve the legacy linear percent field; add explicitly named display fields. */
export function recommendationFitPresentation(rawScore01) {
  if (typeof rawScore01 !== 'number') return null;
  const displayScore = recommendationFitDisplayScore(rawScore01);
  if (displayScore === null) return null;
  return {
    rawScore: rawScore01,
    percent: Math.round(rawScore01 * 100),
    displayScore,
    displayScoreVersion: RECOMMENDATION_FIT_DISPLAY_VERSION,
  };
}
