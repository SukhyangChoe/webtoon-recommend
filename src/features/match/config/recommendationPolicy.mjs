export const RECOMMENDATION_COMMENT_MAX_LENGTH = 80;
import { CATALOG_ACCESS_POLICY_VERSION } from './catalogAgePolicy.mjs';
export const RECOMMENDATION_SEARCH_POLICY_VERSION = CATALOG_ACCESS_POLICY_VERSION;
export const RECOMMENDATION_AGE_RESTRICTION_MESSAGE = '성인 작품(isAdult=true)은 아직 추천작으로 등록할 수 없어요.';

// Presentation guard only. The server always checks the current catalog itself.
export function isRecommendationRegistrationBlocked(item) {
  return item?.recommendationRegistrationBlocked === true;
}

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
