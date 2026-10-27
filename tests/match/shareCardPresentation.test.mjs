import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalShareCard, createPairShareCard, createRankingShareCard, shareCardDescription } from '../../src/features/match/share/shareCardPresentation.mjs';

test('personal shares use the current leading genre and exact star counts with original portraits', () => {
  const card = createPersonalShareCard({ nickname:'무협', topGenres:[{genreKey:'murim',displayLabel:'무협',stars:18},{genreKey:'action',displayLabel:'액션',stars:0}] });
  assert.match(card.owner.imageSrc,/original-v1\/murim.png$/);
  assert.equal(card.title,'내공 만렙 정주행러');
  assert.deepEqual(card.genres,[{label:'무협',stars:18}]);
  assert.match(shareCardDescription(card),/별 18개/);
  assert.deepEqual(createPersonalShareCard({topGenres:[]}).genres,[]);
  assert.equal(createPersonalShareCard({topGenres:[]}).owner.imageSrc,null);
});
test('pair shares preserve zero scores, real participant genres and the current band', () => {
  const card = createPairShareCard({ownerNickname:'A',challengerNickname:'B',ownerGenreKey:'murim',challengerGenreKey:'action',score:0,sharedGenres:[]});
  assert.equal(card.score,0);
  assert.equal(card.title,'반대편 서가 안내자');
  assert.match(card.owner.imageSrc,/murim.png$/);
  assert.match(card.partner.imageSrc,/action.png$/);
  assert.match(shareCardDescription(card),/궁합 0%/);
  assert.deepEqual(card.sharedGenres,[]);
});
test('ranking shares retain ties, exact values and only the three supplied public leaders', () => {
  const card = createRankingShareCard({ownerNickname:'주인장',ownerGenreKey:'murim',entryCount:5,top20:[1,1,3,4].map((rank,index)=>({rank,nickname:`독자${index}`,genreKey:'ropan',score:96-index}))});
  assert.deepEqual(card.participants.map(entry=>entry.rank),[1,1,3]);
  assert.equal(card.participants[0].score,96);
  assert.equal(card.entryCount,5);
  assert.ok(card.participants.every(entry=>entry.imageSrc.includes('original-v1')));
  const empty=createRankingShareCard({ownerNickname:'A',entryCount:0,top20:[]});
  assert.equal(empty.participants.length,0);
  assert.match(shareCardDescription(empty),/첫 번째/);
});
