import { dailySelectionKey } from './runtime02.mjs';
import { dailyWindow } from './policy.mjs';

// Increment when the persisted envelope changes, independently of the ranking policy.
export function persistedSelectionKey(evidence, catalogRevision, questionSeed, now = new Date()) {
  return dailySelectionKey({ persistenceVersion: 1, evidence, catalogRevision }, questionSeed, now);
}

function publicIdentities(selection) {
  if (!Array.isArray(selection?.items) || selection.items.length > 3) throw Error('DAILY_ENGINE_RESPONSE_INVALID');
  const seen = new Set();
  return { items: selection.items.map(item => {
    if (['canonicalWebtoonId', 'title', 'platform'].some(key => typeof item?.[key] !== 'string' || !item[key].trim())
      || seen.has(item.canonicalWebtoonId)) throw Error('DAILY_ENGINE_RESPONSE_INVALID');
    seen.add(item.canonicalWebtoonId);
    // Never persist internal scores, input evidence or worker diagnostics.
    return { canonicalWebtoonId: item.canonicalWebtoonId, title: item.title, platform: item.platform };
  }) };
}

/** The DB lease spans instances; engine work never holds a DB transaction open.
 * The first request awaits computation (no serverless fire-and-forget). Others poll.
 * A crashed worker can be replaced after its bounded lease expires.
 */
export async function resolvePersistedSelection({ repository, profileId, key, window, run, isCurrent, now = () => new Date() }) {
  const saved = await repository.read(profileId, key);
  if (saved) return publicIdentities(saved);
  const token = await repository.claim(profileId, key, window.expiresAt);
  if (!token) {
    const completed = await repository.read(profileId, key);
    return completed ? publicIdentities(completed) : null;
  }
  try {
    const selection = publicIdentities(await run());
    if (dailyWindow(now()).day !== window.day || !await isCurrent()) return null;
    return await repository.complete(profileId, key, token, selection) ? selection : null;
  } catch (error) {
    // A different reader may currently occupy this process's engine lane.
    if (error.message === 'DAILY_ENGINE_BUSY') return null;
    throw error;
  } finally {
    // Conditional release cannot erase a newer claim or a successfully saved result.
    await repository.release(profileId, key, token);
  }
}
