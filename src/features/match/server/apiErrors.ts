import "server-only";

import { MatchDatabaseNotConfiguredError } from "./database";

const STATUS_BY_CODE: Record<string, number> = {
  ACTIVE_CHALLENGE_EXISTS: 409,
  CHALLENGE_CLOSED: 410,
  CHALLENGE_ENTRY_NOT_FOUND: 404,
  CHALLENGE_NOT_FOUND: 404,
  CHALLENGER_SNAPSHOT_NOT_FOUND: 404,
  COMPATIBILITY_VERSION_MISMATCH: 409,
  GENRE_RECOVERY_REQUIRED: 422,
  INVALID_ANALYTICS_INPUT: 400,
  INVALID_CHALLENGE_ENTRY_INPUT: 400,
  INVALID_CHALLENGE_INPUT: 400,
  INVALID_CHALLENGE_OWNER: 400,
  INVALID_CHALLENGE_STATUS: 400,
  INVALID_ENTRY_VISIBILITY: 400,
  INVALID_FEEDBACK: 400,
  INVALID_RANKING_VISIBILITY: 400,
  INVALID_RECOMMENDATION_LIST: 400,
  INVALID_REQUEST_BODY: 400,
  INVALID_TASTE_SNAPSHOT_INPUT: 400,
  NICKNAME_REJECTED: 422,
  OWNER_AUTH_REQUIRED: 403,
  OWNER_SNAPSHOT_NOT_FOUND: 404,
  PAIR_RESULT_NOT_FOUND: 404,
  QUESTION_VERSION_MISMATCH: 409,
  RATE_LIMITED: 429,
  RESULT_NOT_FOUND: 404,
  RESULT_OWNER_MISMATCH: 403,
  SELF_CHALLENGE_NOT_ALLOWED: 409,
  WEBTOON_NOT_AVAILABLE: 409,
};

export type MatchApiFailure = { error: string; status: number };

export function toMatchApiFailure(error: unknown, fallbackCode: string): MatchApiFailure {
  if (error instanceof MatchDatabaseNotConfiguredError) {
    return { error: "MATCH_SERVICE_UNAVAILABLE", status: 503 };
  }
  if (error instanceof SyntaxError) {
    return { error: "INVALID_REQUEST_BODY", status: 400 };
  }

  const candidate = error instanceof Error ? error.message : "";
  const status = STATUS_BY_CODE[candidate];
  return status
    ? { error: candidate, status }
    : { error: fallbackCode, status: 500 };
}
