import { DAILY_PROGRESS_MESSAGES } from '../config/dailyPicksPresentation.mjs';
import { WorkResourceError } from './loadWorkResource.mjs';

/** Both old JSON servers and the opt-in progress stream are supported. */
export async function readDailyPicksResponse(response, onProgress) {
  if (!response.headers.get('content-type')?.includes('application/x-ndjson')) return response.json();
  const reader = response.body?.getReader();
  if (!reader) throw new WorkResourceError('취향작 응답을 받지 못했어요.', 502);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let pending = '', bytes = 0;
  function record(line) {
    if (!line.trim()) return null;
    let event;
    try { event = JSON.parse(line); } catch { throw new WorkResourceError('취향작 응답을 확인하지 못했어요.', 502); }
    if (event?.type === 'progress') {
      if (Object.hasOwn(DAILY_PROGRESS_MESSAGES, event.stage)) onProgress(event.stage);
    } else if (event?.type === 'result' && event.data && typeof event.data === 'object') {
      return { data: event.data };
    } else if (event?.type === 'error') {
      const status = Number.isInteger(event.status) && event.status >= 400 && event.status <= 599 ? event.status : 502;
      throw new WorkResourceError('취향작을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', status);
    }
    return null;
  }
  try {
    while (true) {
      const { done, value } = await reader.read();
      bytes += value?.byteLength ?? 0;
      if (bytes > 256 * 1024) throw new WorkResourceError('취향작 응답을 확인하지 못했어요.', 502);
      pending += decoder.decode(value, { stream: !done });
      let newline;
      while ((newline = pending.indexOf('\n')) !== -1) {
        const result = record(pending.slice(0, newline));
        pending = pending.slice(newline + 1);
        if (result) return result.data;
      }
      if (done) {
        const result = record(pending);
        if (result) return result.data;
        throw new WorkResourceError('취향작 응답이 중단됐어요.', 502);
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
