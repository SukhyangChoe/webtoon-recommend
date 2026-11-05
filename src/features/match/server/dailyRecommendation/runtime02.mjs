import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { DAILY_ENGINE_TIMEOUT_MS, DAILY_INPUT_VERSION, DAILY_SELECTION_VERSION, dailyWindow } from './policy.mjs';

const root = process.cwd();
const runtimeRoot = () => path.join(root, '.private-daily-recommendations/runtime');
const scripts = path.join(root, 'scripts/daily-recommendation');
const adapter = path.join(root, 'src/features/match/server/dailyRecommendation/requestAdapter.mjs');
export const canonicalJson = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
export function dailySelectionKey(input, questionSeed, now = new Date()) {
  return createHash('sha256').update(canonicalJson({ selection: DAILY_SELECTION_VERSION, adapter: DAILY_INPUT_VERSION,
    day: dailyWindow(now).day, input, questionSeed })).digest('hex');
}
export async function runtime02Available() {
  try { await fs.access(path.join(runtimeRoot(), 'SHA256SUMS.txt')); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
export function runRuntime02(input, questionSeed) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-r', path.join(scripts, 'portable-paths.cjs'),
      path.join(scripts, 'runtime-worker.cjs'), runtimeRoot(), adapter], {
      stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
      // The pinned pipeline uses no environment credentials or external services.
      env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, LANG: 'C.UTF-8' },
    });
    let output = '', overflow = false, settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (error) reject(error); else resolve(result);
    };
    const timer = setTimeout(() => { child.kill(); finish(Error('DAILY_ENGINE_TIMEOUT')); }, DAILY_ENGINE_TIMEOUT_MS);
    child.stdout.on('data', chunk => {
      if (Buffer.byteLength(output) + chunk.length > 64 * 1024) { overflow = true; child.kill(); }
      else output += chunk;
    });
    child.stderr.resume(); // Never log potentially private upstream errors.
    child.on('error', () => finish(Error('DAILY_ENGINE_UNAVAILABLE')));
    child.stdin.on('error', () => {});
    child.on('close', code => {
      if (code !== 0 || overflow) return finish(Error('DAILY_ENGINE_FAILED'));
      try {
        const result = JSON.parse(output);
        if (!Array.isArray(result.items) || result.items.length > 3 || !result.seedSha256) throw Error();
        finish(null, result);
      } catch { finish(Error('DAILY_ENGINE_RESPONSE_INVALID')); }
    });
    child.stdin.end(JSON.stringify({ input, questionSeed }));
  });
}

/** Deterministic across instances: the day affects cache lifetime, not ranking.
 * No re-exposure exclusions, randomization, or new diversity bonuses are added.
 * Cache has no raw scores/DB rows and is invalidated by ALL original input.
 */
export function createDailySelector({ run = runRuntime02, maxEntries = 64 } = {}) {
  const cache = new Map();
  let active = 0;
  return async function select(input, questionSeed, now = new Date()) {
    const key = dailySelectionKey(input, questionSeed, now);
    const existing = cache.get(key);
    if (existing && Date.parse(existing.expiresAt) > new Date(now).getTime()) return existing.promise;
    for (const [id, entry] of cache) if (Date.parse(entry.expiresAt) <= new Date(now).getTime()) cache.delete(id);
    if (active >= 1) throw Error('DAILY_ENGINE_BUSY');
    active++;
    const promise = Promise.resolve().then(() => run(input, questionSeed)).finally(() => { active--; });
    cache.set(key, { expiresAt: dailyWindow(now).expiresAt, promise });
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
    try { return await promise; } catch (error) { cache.delete(key); throw error; }
  };
}
export const selectDailyRuntime02 = createDailySelector();
