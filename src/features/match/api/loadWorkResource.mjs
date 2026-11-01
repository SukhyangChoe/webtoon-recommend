export class WorkResourceError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}

function abortError() { return new DOMException('Request cancelled', 'AbortError'); }

function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(abortError()); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
  });
}

/** Only idempotent reads retry once; unmount/navigation cancels both requests and retry delay. */
/** @param {string} url @param {{signal?: AbortSignal, headers?: HeadersInit, onRetry?: () => void, fetcher?: typeof fetch, timeoutMs?: number, retryDelayMs?: number}} [options] */
export async function loadWorkResource(url, { signal, headers = {}, onRetry = () => {}, fetcher = globalThis.fetch, timeoutMs = 10000, retryDelayMs = 350 } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (signal?.aborted) throw abortError();
    const controller = new AbortController();
    let timer, timedOut = false, abort = () => {};
    try {
      const interrupted = new Promise((_, reject) => {
        abort = () => { controller.abort(); reject(abortError()); };
        signal?.addEventListener('abort', abort, { once: true });
        timer = setTimeout(() => { timedOut = true; controller.abort(); reject(new WorkResourceError('응답이 지연되고 있어요. 다시 시도해 주세요.', 504)); }, timeoutMs);
      });
      const request = async () => {
        const response = await fetcher(url, { signal: controller.signal, cache: 'no-store', headers });
        if (!response.ok) throw new WorkResourceError(response.status === 404 ? '작품을 찾지 못했어요.' : '정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', response.status);
        return response.json();
      };
      return await Promise.race([request(), interrupted]);
    } catch (error) {
      if (signal?.aborted) throw abortError();
      const status = timedOut ? 504 : error instanceof WorkResourceError ? error.status : 0;
      if (attempt === 1 || ![0, 408, 500, 502, 503, 504].includes(status)) throw timedOut ? new WorkResourceError('응답이 지연되고 있어요. 다시 시도해 주세요.', 504) : error;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
    onRetry();
    await pause(retryDelayMs, signal);
  }
}
