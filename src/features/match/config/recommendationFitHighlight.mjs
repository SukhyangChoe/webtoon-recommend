import { recommendationFitDisplayScore } from './recommendationFitDisplay.mjs';

// Explicit product policy: compare the rounded score users actually see.
// This changes the badge only, never candidate eligibility or recommendation order.
export const RECOMMENDATION_FIT_HIGHLIGHT_DISPLAY_THRESHOLD = 75;
export const RECOMMENDATION_FIT_MIN_COMPARABLE_AXES = 2;

export function recommendationFitHighlighted(rawScore01, comparableAxisCount) {
  const score = recommendationFitDisplayScore(rawScore01);
  return Number.isInteger(comparableAxisCount)
    && comparableAxisCount >= RECOMMENDATION_FIT_MIN_COMPARABLE_AXES
    && score !== null
    && score >= RECOMMENDATION_FIT_HIGHLIGHT_DISPLAY_THRESHOLD;
}
