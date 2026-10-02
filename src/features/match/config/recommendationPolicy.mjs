export const RECOMMENDATION_COMMENT_MAX_LENGTH = 80;

export function normalizeRecommendationComment(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("INVALID_RECOMMENDATION_COMMENT");

  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (!normalized) return null;
  if ([...normalized].length > RECOMMENDATION_COMMENT_MAX_LENGTH) {
    throw new Error("INVALID_RECOMMENDATION_COMMENT");
  }
  return normalized;
}
