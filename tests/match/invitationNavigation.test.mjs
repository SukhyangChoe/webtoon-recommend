import test from 'node:test';
import assert from 'node:assert/strict';
import { completePendingInvitation } from '../../src/features/match/api/completeInvitation.mjs';
import { pairViewerRole, relationshipDestination } from '../../src/features/match/config/relationshipDestination.mjs';
import { writePendingChallenge, readPendingChallenge, readChallengeResult } from '../../src/features/match/storage/challengeStorage.mjs';

function memoryStorage() { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) }; }
test('pair viewer role uses the stable server profile identity, not nickname or snapshot ID',()=>{
  assert.equal(pairViewerRole('owner','owner','challenger'),'owner');
  assert.equal(pairViewerRole('challenger','owner','challenger'),'challenger');
  for(const visitor of [null,undefined,'stranger'])assert.equal(pairViewerRole(visitor,'owner','challenger'),null);
});
test('direct tests keep their personal destination without submitting a challenge entry', async () => {
  assert.equal(await completePendingInvitation({ storage: memoryStorage(), anonymousId: 'viewer', publicProfileId: 'result', fetcher: () => assert.fail('unexpected entry request') }), null);
});
test('invitation completes first and stores its reusable result, not a personal-page prompt', async () => {
  const storage = memoryStorage(); writePendingChallenge(storage, 'invitation', '도전자');
  const href = await completePendingInvitation({ storage, anonymousId: 'viewer', publicProfileId: 'result', fetcher: async (url, options) => {
    assert.equal(url, '/api/v1/challenges/invitation/entries');
    assert.deepEqual(JSON.parse(options.body), { anonymousId: 'viewer', challengerPublicProfileId: 'result', challengerNickname: '도전자' });
    return { ok: true, json: async () => ({ resultId: 'pair', existing: true }) };
  } });
  assert.equal(href, '/match/c/invitation/match/pair');
  assert.equal(readChallengeResult(storage, 'invitation').publicProfileId, 'result');
  assert.equal(readPendingChallenge(storage), null);
  assert.equal(storage.getItem('webtoon-match:pair-result-prompt:v1'), null);
});
test('failed and closed invitations retain consent for retry and never consume the pending link', async () => {
  const storage = memoryStorage(); writePendingChallenge(storage, 'invitation', '도전자');
  for (const error of ['CHALLENGE_CLOSED', 'QUESTION_VERSION_MISMATCH', 'UNKNOWN']) {
    await assert.rejects(completePendingInvitation({ storage, anonymousId: 'viewer', publicProfileId: 'result', fetcher: async () => ({ ok: false, json: async () => ({ error }) }) }));
    assert.equal(readPendingChallenge(storage).challengeCode, 'invitation');
    assert.equal(readChallengeResult(storage, 'invitation'), null);
  }
});
test('missing consent cannot silently create a public challenge entry', async () => {
  const storage = memoryStorage(); writePendingChallenge(storage, 'invitation');
  await assert.rejects(completePendingInvitation({ storage, anonymousId: 'viewer', publicProfileId: 'result', fetcher: () => assert.fail('no consent') }), /공개 범위/);
});
test('nickname destinations respect public, private, owner and not-yet-created states', () => {
  const publicMap = { challengeCode: 'public-map', rankingVisibility: 'public_by_link' };
  const privateMap = { challengeCode: 'secret-code', rankingVisibility: 'private' };
  assert.deepEqual(relationshipDestination(publicMap, 'person', null), { state: 'ready', href: '/match/c/public-map/ranking' });
  assert.deepEqual(relationshipDestination(privateMap, 'person', 'stranger'), { state: 'private', href: null });
  assert.deepEqual(relationshipDestination(privateMap, 'person', 'person'), { state: 'ready', href: '/match/c/secret-code/ranking' });
  assert.deepEqual(relationshipDestination(null, 'person', 'person'), { state: 'create', href: '/match/challenge/new' });
  assert.deepEqual(relationshipDestination(null, 'person', 'stranger'), { state: 'unavailable', href: null });
});
