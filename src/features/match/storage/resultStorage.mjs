export const MATCH_RESULT_STORAGE_PREFIX = "webtoon-match:public-result:v1:";

export function writePublicResult(storage, result) {
  if (!result?.publicProfileId) throw new Error("Cannot store a result without a public id");
  storage?.setItem(`${MATCH_RESULT_STORAGE_PREFIX}${result.publicProfileId}`, JSON.stringify(result));
}

export function readPublicResult(storage, publicProfileId) {
  const raw = storage?.getItem(`${MATCH_RESULT_STORAGE_PREFIX}${publicProfileId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.publicProfileId === publicProfileId ? parsed : null;
  } catch {
    return null;
  }
}
