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
  assert.equal(card.footer,'');
  assert.deepEqual(card.recommendations,[]);
});
test('personal recommendations retain saved order, show at most three and sanitize covers', () => {
  const picks = [
    {title:' 북검전기 ',coverUrl:'/match/covers/wt_murim_017.webp'},
    {title:'나노마신',coverUrl:'javascript:alert(1)'},
    {title:'긴 제목 & 추천작',coverUrl:'https://example.com/cover.webp'},
    {title:'네 번째 추천작',coverUrl:null},
  ];
  const card=createPersonalShareCard({topGenres:[]},picks);
  assert.deepEqual(card.recommendations,[{title:'북검전기',coverUrl:'/match/covers/wt_murim_017.webp'},{title:'나노마신',coverUrl:null},{title:'긴 제목 & 추천작',coverUrl:'https://example.com/cover.webp'}]);
  assert.match(shareCardDescription(card),/추천작: 북검전기, 나노마신, 긴 제목 & 추천작/);
  assert.equal(picks[0].title,' 북검전기 ');
  assert.deepEqual(createPersonalShareCard({topGenres:[]},[{title:' '},{title:null}]).recommendations,[]);
});
test('pair shares preserve zero scores, real participant genres and the current band', () => {
  const card = createPairShareCard({ownerNickname:'A',challengerNickname:'B',ownerGenreKey:'murim',challengerGenreKey:'action',score:0,sharedGenres:[]});
  assert.equal(card.score,0);
  assert.equal(card.title,'반대편 서가 안내자');
  assert.match(card.owner.imageSrc,/murim.png$/);
  assert.match(card.partner.imageSrc,/action.png$/);
  assert.match(shareCardDescription(card),/웹툰 취향 궁합: 반대편 서가 안내자, 0%/);
  assert.equal(card.bandLabel,null);
  assert.deepEqual(card.sharedGenres,[]);
});
test('pair cards use the same archetype and band label as the detail result',()=>{
  const card=createPairShareCard({ownerNickname:'A',challengerNickname:'B',score:44,band:{label:'반반 갈림'},sharedGenres:[]});
  assert.equal(card.title,'취향 맞다이 라이벌');assert.equal(card.bandLabel,'반반 갈림');
  assert.match(shareCardDescription(card),/웹툰 취향 궁합: 취향 맞다이 라이벌, 44%/);
});
test('ranking shares retain ties, exact values and only the three supplied public leaders', () => {
  const card = createRankingShareCard({ownerNickname:'주인장',ownerGenreKey:'murim',entryCount:5,top20:[1,1,3,4].map((rank,index)=>({rank,nickname:`독자${index}`,genreKey:'ropan',score:96-index}))});
  assert.deepEqual(card.participants.map(entry=>entry.rank),[1,1,3]);
  assert.equal(card.participants[0].score,96);
  assert.equal(card.entryCount,5);
  assert.equal(card.footer,'');
  assert.ok(card.participants.every(entry=>entry.imageSrc.includes('original-v1')));
  const empty=createRankingShareCard({ownerNickname:'A',entryCount:0,top20:[]});
  assert.equal(empty.participants.length,0);
  assert.match(shareCardDescription(empty),/첫 번째/);
});
