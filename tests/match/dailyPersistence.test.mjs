import test from 'node:test';
import assert from 'node:assert/strict';
import { persistedSelectionKey, resolvePersistedSelection } from '../../src/features/match/server/dailyRecommendation/persistentSelection.mjs';
import { dailyWindow } from '../../src/features/match/server/dailyRecommendation/policy.mjs';

const selection = { items: [{ canonicalWebtoonId: 'work', title: '작품', platform: '플랫폼' }] };
function fixture() {
  let time = Date.parse('2026-11-05T03:00:00Z'), sequence = 0;
  const rows = new Map();
  const repository = {
    async read(profile, key) { const row = rows.get(profile); return row?.key === key && row.expires > time ? row.selection ?? null : null; },
    async claim(profile, key, expiry) {
      const row = rows.get(profile);
      if (row?.key === key && row.expires > time && (row.selection || row.lease > time)) return null;
      const token = String(++sequence);
      rows.set(profile, { key, token, expires: Date.parse(expiry), lease: time + 90000 });
      return token;
    },
    async complete(profile, key, token, value) {
      const row = rows.get(profile);
      if (row?.key !== key || row.token !== token || row.lease <= time || row.expires <= time) return false;
      row.selection = value; return true;
    },
    async release(profile, key, token) {
      const row = rows.get(profile);
      if (row?.key === key && row.token === token && !row.selection) row.lease = time;
    },
  };
  return { rows, repository, advance: ms => { time += ms; },
    args: () => ({ repository, profileId: 'owner', key: 'key', window: dailyWindow(new Date(time)),
      run: async () => selection, isCurrent: async () => true, now: () => new Date(time) }) };
}
test('a fresh instance reads a persisted batch without invoking the engine; empty results are cached too', async () => {
  for (const value of [selection, { items: [] }]) {
    const f = fixture(); let runs = 0;
    assert.deepEqual(await resolvePersistedSelection({ ...f.args(), run: async () => { runs++; return value; } }), value);
    assert.deepEqual(await resolvePersistedSelection({ ...f.args(), run: async () => { throw Error('must not run'); } }), value);
    assert.equal(runs, 1);
  }
});
test('cross-instance overlapping requests share one lease and expose preparing, not stale picks', async () => {
  const f = fixture(); let finish, started;
  const begun = new Promise(resolve => { started = resolve; });
  const first = resolvePersistedSelection({ ...f.args(), run: () => { started(); return new Promise(resolve => { finish = resolve; }); } });
  await begun;
  assert.equal(await resolvePersistedSelection({ ...f.args(), run: () => { throw Error('duplicate'); } }), null);
  finish(selection); assert.deepEqual(await first, selection);
  assert.deepEqual(await resolvePersistedSelection(f.args()), selection);
});
test('answers, latest snapshot, registered works, question seed, catalog revision and KST day invalidate the persisted key', () => {
  const now = new Date('2026-11-05T14:59:59Z');
  const input = { snapshotId: 'one', answers: { avoidance: ['a'] }, recommendations: ['work'] };
  const key = persistedSelectionKey(input, '1', {}, now);
  for (const changed of [{ ...input, snapshotId: 'two' }, { ...input, answers: { avoidance: ['b'] } }, { ...input, recommendations: [] }]) {
    assert.notEqual(persistedSelectionKey(changed, '1', {}, now), key);
  }
  assert.notEqual(persistedSelectionKey(input, '2', {}, now), key);
  assert.notEqual(persistedSelectionKey(input, '1', { new: true }, now), key);
  assert.notEqual(persistedSelectionKey(input, '1', {}, new Date('2026-11-05T15:00:00Z')), key);
  assert.equal(persistedSelectionKey({ recommendations: ['work'], answers: { avoidance: ['a'] }, snapshotId: 'one' }, '1', {}, now), key);
});
test('a changed taste during generation is not saved or returned; no same-day stale fallback', async () => {
  const f = fixture();
  assert.equal(await resolvePersistedSelection({ ...f.args(), isCurrent: async () => false }), null);
  assert.equal(f.rows.get('owner').selection, undefined);
  assert.deepEqual(await resolvePersistedSelection({ ...f.args(), key: 'latest' }), selection);
});
test('a computation crossing KST midnight is not saved or returned', async () => {
  const f = fixture();
  assert.equal(await resolvePersistedSelection({ ...f.args(), run: async () => { f.advance(86400000); return selection; } }), null);
  assert.equal(f.rows.get('owner').selection, undefined);
});
test('a late worker cannot overwrite a replacement lease; crashed leases recover', async () => {
  const f = fixture();
  const old = await f.repository.claim('owner', 'key', f.args().window.expiresAt);
  f.advance(90001);
  const replacement = await f.repository.claim('owner', 'key', f.args().window.expiresAt);
  assert.ok(replacement); assert.notEqual(replacement, old);
  assert.equal(await f.repository.complete('owner', 'key', old, selection), false);
  await f.repository.release('owner', 'key', old);
  assert.equal(f.rows.get('owner').token, replacement);
});
test('failed/busy workers release leases; private engine fields never enter persistence', async () => {
  const f = fixture();
  await assert.rejects(resolvePersistedSelection({ ...f.args(), run: async () => { throw Error('failed'); } }), /failed/);
  assert.equal(await resolvePersistedSelection({ ...f.args(), run: async () => { throw Error('DAILY_ENGINE_BUSY'); } }), null);
  await resolvePersistedSelection({ ...f.args(), run: async () => ({ ...selection, rawScores: [1], answers: {}, items: [{ ...selection.items[0], vector: [1] }] }) });
  assert.deepEqual(f.rows.get('owner').selection, selection);
});
test('malformed or duplicate identities fail closed and never poison the persisted batch', async () => {
  for (const items of [[{}, {}], [selection.items[0], selection.items[0]], Array(4).fill(selection.items[0])]) {
    const f = fixture();
    await assert.rejects(resolvePersistedSelection({ ...f.args(), run: async () => ({ items }) }), /DAILY_ENGINE_RESPONSE_INVALID/);
    assert.equal(f.rows.get('owner').selection, undefined);
  }
});
