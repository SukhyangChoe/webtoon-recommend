/** Display conversion. Eligibility and sorting use raw scores; the explicit badge policy is separate. */
export const RECOMMENDATION_FIT_DISPLAY_VERSION = 'sqrt_v1';

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
