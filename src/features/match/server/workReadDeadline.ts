import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { WorkReadDatabase } from './workReadDatabase';

type Step = { stage: string; waitConnectMs: number; queryMs: number; totalMs: number; outcome: string };
const observers = (globalThis as typeof globalThis & { __workReadObservers?: Map<string, () => void> }).__workReadObservers ??= new Map<string, () => void>();

/** Driver debug hook: never log SQL or its parameters, only mark the start of execution. */
export function markWorkQueryStarted(_connection: number, statement: string) {
  const token = /^\/\*wm-work:([\w-]+)\*\//.exec(statement)?.[1];
  if (token) observers.get(token)?.();
}

export class WorkReadTimeoutError extends Error {
  constructor() { super('WORK_DETAIL_TIMEOUT'); }
}

export class WorkReadCancelledError extends Error {
  constructor() { super('WORK_DETAIL_CANCELLED'); }
}

export type WorkReadContext = {
  requestId: string;
  query<T extends object[]>(stage: string, statement: string, values: string[]): Promise<T>;
  measure<T>(stage: string, operation: () => T): T;
  finish(status: number): string;
};

/** One deadline covers pool/connect waits, every SQL read and computation in a request. */
export function createWorkReadContext({ getSql, signal, kind, workId, budgetMs = 8000, log = (value: object) => console.info(JSON.stringify(value)) }: {
  getSql: () => WorkReadDatabase; signal?: AbortSignal; kind: string; workId: string; budgetMs?: number; log?: (value: object) => void;
}): WorkReadContext {
  const started = performance.now(), requestId = randomUUID(), stop = new AbortController();
  const steps: Step[] = [], computeMs: Record<string, number> = {};
  let finished = false, expired = false;
  const timer = setTimeout(() => { expired = true; stop.abort(); }, budgetMs);
  const disconnect = () => stop.abort();
  signal?.addEventListener('abort', disconnect, { once: true });
  if (signal?.aborted) stop.abort();
  const failure = () => expired ? new WorkReadTimeoutError() : new WorkReadCancelledError();
  return {
    requestId,
    async query<T extends object[]>(stage: string, statement: string, values: string[]): Promise<T> {
      if (stop.signal.aborted) throw failure();
      const token = randomUUID(), start = performance.now();
      let executing: number | null = null, outcome = 'ok';
      const query = getSql().unsafe<T>(`/*wm-work:${token}*/ ${statement}`, values);
      observers.set(token, () => { executing = performance.now(); });
      let abort: () => void = () => {};
      try {
        const interrupted = new Promise<never>((_, reject) => {
          abort = () => {
            // The read lane removes queued jobs and cancels/closes active read-only work.
            try { void Promise.resolve(query.cancel()).catch(() => {}); } catch { /* DB statement_timeout is the second bound. */ }
            reject(failure());
          };
          stop.signal.addEventListener('abort', abort, { once: true });
        });
        return await Promise.race([Promise.resolve(query), interrupted]);
      } catch (error) {
        outcome = stop.signal.aborted ? expired ? 'timeout' : 'cancelled' : 'error';
        throw stop.signal.aborted ? failure() : error;
      } finally {
        stop.signal.removeEventListener('abort', abort); observers.delete(token);
        const end = performance.now();
        steps.push({ stage, waitConnectMs: Math.round((executing ?? end) - start), queryMs: executing === null ? 0 : Math.round(end - executing), totalMs: Math.round(end - start), outcome });
      }
    },
    measure<T>(stage: string, operation: () => T): T {
      if (performance.now() - started >= budgetMs) { expired = true; stop.abort(); }
      if (stop.signal.aborted) throw failure();
      const start = performance.now();
      try { return operation(); } finally { computeMs[stage] = Math.round((performance.now() - start) * 100) / 100; }
    },
    finish(status: number) {
      const elapsedMs = Math.round(performance.now() - started);
      clearTimeout(timer); signal?.removeEventListener('abort', disconnect);
      if (!finished) {
        finished = true;
        // No identity, nickname, vectors, query parameters or raw exception text are recorded.
        log({ event: 'work_detail_read', requestId, kind, workId, status, elapsedMs, steps, computeMs });
      }
      return `total;dur=${elapsedMs}` + steps.map((step, index) => `, db${index}_wait_connect;dur=${step.waitConnectMs}, db${index}_query;dur=${step.queryMs}`).join('');
    },
  };
}
