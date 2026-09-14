export const MATCH_PENDING_CHALLENGE_KEY = "webtoon-match:pending-challenge:v1";
export const MATCH_OWNER_TOKEN_PREFIX = "webtoon-match:owner-token:v1:";
export const MATCH_CHALLENGE_RESULT_PREFIX = "webtoon-match:challenge-result:v1:";

export function writePendingChallenge(storage, challengeCode) {
  storage?.setItem(MATCH_PENDING_CHALLENGE_KEY, JSON.stringify({ challengeCode, savedAt: new Date().toISOString() }));
}

export function readPendingChallenge(storage) {
  const raw = storage?.getItem(MATCH_PENDING_CHALLENGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.challengeCode === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingChallenge(storage) {
  storage?.removeItem(MATCH_PENDING_CHALLENGE_KEY);
}

export function writeOwnerManageToken(storage, challengeCode, token) {
  storage?.setItem(`${MATCH_OWNER_TOKEN_PREFIX}${challengeCode}`, token);
}

export function readOwnerManageToken(storage, challengeCode) {
  const token = storage?.getItem(`${MATCH_OWNER_TOKEN_PREFIX}${challengeCode}`);
  return typeof token === "string" && token.length > 0 ? token : null;
}

export function writeChallengeResult(storage, challengeCode, resultId) {
  storage?.setItem(`${MATCH_CHALLENGE_RESULT_PREFIX}${challengeCode}`, JSON.stringify({ resultId, savedAt: new Date().toISOString() }));
}

export function readChallengeResult(storage, challengeCode) {
  const raw = storage?.getItem(`${MATCH_CHALLENGE_RESULT_PREFIX}${challengeCode}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.resultId === "string" && parsed.resultId.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}
