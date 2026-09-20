export const MATCH_PENDING_CHALLENGE_KEY = "webtoon-match:pending-challenge:v1";
export const MATCH_OWNER_TOKEN_PREFIX = "webtoon-match:owner-token:v1:";
export const MATCH_CHALLENGE_RESULT_PREFIX = "webtoon-match:challenge-result:v1:";
export const MATCH_PAIR_RESULT_PROMPT_KEY = "webtoon-match:pair-result-prompt:v1";

export function writePendingChallenge(storage, challengeCode, challengerNickname = "") {
  const savedAt = new Date().toISOString();
  storage?.setItem(MATCH_PENDING_CHALLENGE_KEY, JSON.stringify({
    challengeCode,
    challengerNickname,
    agreedAt: challengerNickname ? savedAt : undefined,
    savedAt,
  }));
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

export function writeChallengeResult(storage, challengeCode, resultId, publicProfileId = "") {
  storage?.setItem(`${MATCH_CHALLENGE_RESULT_PREFIX}${challengeCode}`, JSON.stringify({ resultId, publicProfileId, savedAt: new Date().toISOString() }));
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

export function readLatestChallengeResult(storage, publicProfileId = "") {
  if (!storage || typeof storage.length !== "number" || typeof storage.key !== "function") return null;
  const results = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(MATCH_CHALLENGE_RESULT_PREFIX)) continue;
    const challengeCode = key.slice(MATCH_CHALLENGE_RESULT_PREFIX.length);
    const saved = readChallengeResult(storage, challengeCode);
    if (!saved) continue;
    if (publicProfileId && saved.publicProfileId && saved.publicProfileId !== publicProfileId) continue;
    results.push({ ...saved, challengeCode });
  }
  return results.sort((left, right) => String(right.savedAt ?? "").localeCompare(String(left.savedAt ?? "")))[0] ?? null;
}

export function writePairResultPrompt(storage, challengeCode, resultId, publicProfileId) {
  storage?.setItem(MATCH_PAIR_RESULT_PROMPT_KEY, JSON.stringify({
    challengeCode,
    resultId,
    publicProfileId,
    savedAt: new Date().toISOString(),
  }));
}

export function readPairResultPrompt(storage) {
  const raw = storage?.getItem(MATCH_PAIR_RESULT_PROMPT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.challengeCode === "string" && typeof parsed?.resultId === "string" && typeof parsed?.publicProfileId === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPairResultPrompt(storage) {
  storage?.removeItem(MATCH_PAIR_RESULT_PROMPT_KEY);
}
