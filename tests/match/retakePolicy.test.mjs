import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { restartMatchTest } from '../../src/features/match/api/restartTest.mjs';
import { createEmptyMatchDraft, readMatchDraft, writeMatchDraft } from '../../src/features/match/storage/draft.mjs';
import { MATCH_ANONYMOUS_STORAGE_KEY } from '../../src/features/match/storage/anonymousIdentity.mjs';
import { buildTasteSnapshot } from '../../src/features/match/engine/resultEngine.mjs';
import { applyRecommendationTaste } from '../../src/features/match/engine/recommendationTasteEngine.mjs';

const seed = JSON.parse(readFileSync(new URL('../../src/features/match/data/questionSeed.v0.4.json', import.meta.url), 'utf8'));
const anonymousId = '11111111-1111-4111-8111-111111111111';
function storedRetake() {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const draft = { ...createEmptyMatchDraft(), resultPublicId: 'old-result', snapshotId: 'old-snapshot', nickname: '기존 닉네임', answers: { genre: { ropan: 'high' } } };
  writeMatchDraft(storage, draft);
  storage.setItem(MATCH_ANONYMOUS_STORAGE_KEY, anonymousId);
  return { storage, draft: readMatchDraft(storage) };
}

test('restart waits for acknowledged deletion before clearing answers, retaining identity', async () => {
  const { storage, draft } = storedRetake();
  let acknowledge;
  const response = new Promise(resolve => { acknowledge = resolve; });
  const operation = restartMatchTest({ anonymousId, storage, fetcher: async (url, init) => {
    assert.equal(url, '/api/v1/test-restart');
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body), { anonymousId });
    return response;
  } });
  assert.deepEqual(readMatchDraft(storage), draft);
  acknowledge({ ok: true, json: async () => ({ cleared: true, removedCount: 3 }) });
  await operation;
  const fresh = readMatchDraft(storage);
  assert.deepEqual(fresh.answers, {});
  assert.equal(fresh.resultPublicId, undefined);
  assert.equal(fresh.snapshotId, undefined);
  assert.equal(fresh.currentPath, '/match/test/intro');
  assert.equal(storage.getItem(MATCH_ANONYMOUS_STORAGE_KEY), anonymousId);
});

for (const [name, fetcher] of [
  ['network failure', async () => { throw new Error('offline'); }],
  ['failed deletion', async () => ({ ok: false })],
  ['missing acknowledgement', async () => ({ ok: true, json: async () => ({ cleared: false }) })],
]) test(`restart preserves the old draft after ${name}`, async () => {
  const { storage, draft } = storedRetake();
  await assert.rejects(restartMatchTest({ anonymousId, storage, fetcher }));
  assert.deepEqual(readMatchDraft(storage), draft);
});

test('restart SQL is owner-scoped and never deletes profiles, snapshots or participation history', () => {
  const store = readFileSync(new URL('../../src/features/match/server/webtoonCatalogStore.ts', import.meta.url), 'utf8');
  const restart = store.split('export async function clearRecommendationsForRestart')[1].split('export function normalizeWebtoonTitle')[0];
  assert.match(restart, /where anonymous_id = \$\{anonymousId\}::uuid[\s\S]*for update/);
  assert.match(restart, /delete from public\.match_profile_recommendations\s+where profile_id = \$\{profileId\}::uuid/);
  assert.doesNotMatch(restart, /delete from public\.(match_profiles|match_taste_snapshots|match_challenge_entries|match_challenges)/);
  for (const file of ['MatchBootstrap', 'ChallengeLanding', 'ChallengeCreator']) {
    const component = readFileSync(new URL(`../../src/features/match/components/${file}.tsx`, import.meta.url), 'utf8');
    assert.match(component, /await restartMatchTest/);
    assert.doesNotMatch(component, /resetMatchDraft/);
  }
});

test('murim retake reproduces the reported recommendation override and is murim-first after clearing', () => {
  const answers = {
    genre: Object.fromEntries(seed.publicGenrePolicy.publicGenres.map(({ genreKey }) => [genreKey, genreKey === 'murim' ? 'high' : genreKey === 'action' ? 'medium' : 'low'])),
    duels: {
      wm_duel_01_fantasy_vs_murim: { swapped: false, choiceKey: 'both' },
      wm_duel_02_romance_vs_ropan: { swapped: false, choiceKey: 'neither' },
      wm_duel_03_action_vs_sports: { swapped: true, choiceKey: 'neither' },
      wm_duel_04_drama_vs_comedy: { swapped: true, choiceKey: 'neither' },
      wm_duel_05_thriller_vs_action: { swapped: false, choiceKey: 'right' },
      wm_duel_06_fantasy_vs_ropan: { swapped: true, choiceKey: 'right' },
    },
  };
  const snapshot = buildTasteSnapshot({ seed, answers, anonymousId, profileId: 'test-profile', snapshotId: 'test-snapshot', publicProfileId: 'test-public' });
  assert.deepEqual(snapshot.displayGenres.slice(0, 3).map(item => [item.genreKey, item.stars]), [['murim', 11], ['action', 5], ['fantasy', 2]]);
  const ids = ['wt_romance_ropan_019', 'wt_romance_ropan_173', 'wt_fantasy_295'];
  const catalog = JSON.parse(readFileSync(new URL('../../src/data/webtoons/webtoons_seed_current.json', import.meta.url), 'utf8'));
  const recommendations = ids.map(id => catalog.find(work => work.canonicalWebtoonId === id).recommendation);
  const blended = applyRecommendationTaste(snapshot, recommendations, seed);
  assert.equal(blended.displayGenres[0].genreKey, 'ropan');
  assert.equal(blended.recommendationInfluence.recommendationPercent, 80);
  const restarted = applyRecommendationTaste(snapshot, [], seed);
  assert.equal(restarted.displayGenres[0].genreKey, 'murim');
  assert.deepEqual(restarted.recommendationInfluence, { workCount: 0, recommendationPercent: 0, testPercent: 100 });
});

test('active relationships resolve the latest completed snapshot within the same question version, without replacing history', () => {
  const store = readFileSync(new URL('../../src/features/match/server/resultStore.ts', import.meta.url), 'utf8');
  const batch = store.split('export async function getTasteSnapshotsByIds')[1].split('export async function getPublicTasteResult')[0];
  assert.match(batch, /latestForProfile = false/);
  assert.match(batch, /distinct on \(profile_id, question_set_version\)/);
  assert.match(batch, /order by profile_id, question_set_version, completed_at desc, snapshot_id desc/);
  assert.doesNotMatch(batch, /\b(update|delete|insert)\s+(into|from|public\.)/i);
  const pinned = store.split('export async function getTasteSnapshot(publicProfileId')[1].split('export async function getTasteSnapshotById')[0];
  assert.match(pinned, /where snapshots.public_profile_id = \$1/);
  assert.doesNotMatch(pinned, /latestForProfile/);
});

test('relationship scores, avatars, and pair details share the same live snapshots while closed challenges remain pinned', () => {
  const store = readFileSync(new URL('../../src/features/match/server/challengeStore.ts', import.meta.url), 'utf8');
  const resolver = store.split('async function currentChallengeState')[1].split('async function rankedEntries')[0];
  assert.match(resolver, /latestForProfile: challenge.status === 'active'/);
  assert.match(resolver, /challenge.status !== 'active'/);
  assert.match(resolver, /score: result.overallScore, sharedGenres: result.sharedGenres/);
  const pair = store.split('export async function getPublicPairResult')[1].split('export async function getChallengeRanking')[0];
  assert.match(pair, /currentChallengeState/);
  assert.match(pair, /current.results\[entry.entryId\]/);
  const ranking = store.split('export async function getChallengeRanking')[1].split('export async function updateChallengeEntryVisibility')[0];
  assert.match(ranking, /currentChallengeState/);
  assert.match(ranking, /denseRankEntries\(current.entries\)/);
  assert.match(ranking, /const snapshots = current.snapshots/);
});
