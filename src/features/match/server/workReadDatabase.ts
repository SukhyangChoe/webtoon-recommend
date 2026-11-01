import postgres from 'postgres';
import { markWorkQueryStarted } from './workReadDeadline';

export type WorkReadDatabase = {
  unsafe<T extends object[]>(statement: string, values: string[]): Promise<T> & { cancel(): void };
};
type Job = { cancelled: boolean; run(): Promise<void>; cancelActive(): void; reject(error: Error): void };

/** A cancellable, single-connection lane, isolated from analytics and writes. */
export function createWorkReadDatabase(connectionString: string, { statementTimeoutMs = 5000, lockTimeoutMs = 1000 } = {}): WorkReadDatabase & { end(): Promise<void> } {
  let connection: ReturnType<typeof postgres> | null = null;
  let active: Job | null = null;
  const queue: Job[] = [];
  const connect = () => connection ??= postgres(connectionString, {
    max: 1, prepare: false, ssl: 'require', idle_timeout: 300, max_lifetime: 1800, connect_timeout: 4,
    debug: markWorkQueryStarted, onnotice: () => undefined,
  });
  async function drain() {
    if (active) return;
    const job = queue.shift();
    if (!job) return;
    active = job;
    try { if (!job.cancelled) await job.run(); }
    finally { active = null; void drain(); }
  }
  return {
    unsafe<T extends object[]>(statement: string, values: string[]) {
      let resolve!: (value: T) => void, reject!: (error: unknown) => void;
      const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
      let executing: { cancel(): unknown } | null = null;
      const job: Job = {
        cancelled: false,
        reject,
        async run() {
          try {
            const sql = connect();
            const result = await sql.begin('read only', async tx => {
              if (job.cancelled) throw new Error('WORK_DETAIL_CANCELLED');
              // Transaction poolers can ignore startup/session settings. SET LOCAL is
              // applied on this transaction's actual backend and cannot leak to others.
              const settings = tx.unsafe(`set local statement_timeout = '${Math.max(1, Math.floor(statementTimeoutMs))}ms'; set local lock_timeout = '${Math.max(1, Math.floor(lockTimeoutMs))}ms'`).simple();
              executing = settings;
              await settings;
              if (job.cancelled) throw new Error('WORK_DETAIL_CANCELLED');
              const query = tx.unsafe<T>(statement, values);
              executing = query;
              return await query;
            });
            resolve(result as T);
          } catch (error) { reject(error); }
          finally { executing = null; }
        },
        cancelActive() {
          try { void Promise.resolve(executing?.cancel()).catch(() => {}); } catch { /* Closing the isolated connection is the fallback. */ }
          const previous = connection; connection = null;
          // Also bounds BEGIN/COMMIT/network waits, where no user SQL handle exists.
          if (previous) void previous.end({ timeout: 0 }).catch(() => {});
        },
      };
      const pending = Object.assign(promise, { cancel() {
        if (job.cancelled) return;
        job.cancelled = true;
        const index = queue.indexOf(job);
        if (index >= 0) queue.splice(index, 1);
        if (active === job) job.cancelActive();
        reject(new Error('WORK_DETAIL_CANCELLED'));
      } });
      queue.push(job); queueMicrotask(() => { void drain(); });
      return pending;
    },
    async end() {
      for (const job of queue.splice(0)) { job.cancelled = true; job.reject(new Error('WORK_DETAIL_CANCELLED')); }
      const previous = connection; connection = null;
      if (previous) await previous.end({ timeout: 0 });
    },
  };
}
