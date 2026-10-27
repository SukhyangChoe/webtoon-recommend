import { resetMatchDraft } from '../storage/draft.mjs';

// Keep the existing draft/result reachable until the server confirms deletion.
export async function restartMatchTest({ anonymousId, storage, fetcher = fetch }) {
  const response = await fetcher('/api/v1/test-restart', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ anonymousId }),
  });
  if (!response.ok) throw new Error('추천작을 초기화하지 못했어요. 잠시 후 다시 시도해 주세요.');
  const body = await response.json();
  if (body.cleared !== true) throw new Error('추천작 초기화를 확인하지 못했어요. 다시 시도해 주세요.');
  return resetMatchDraft(storage);
}
