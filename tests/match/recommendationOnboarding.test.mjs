import test from 'node:test';
import assert from 'node:assert/strict';
import { queueRecommendationPrompt, readRecommendationPrompt, dismissRecommendationPrompt, recommendationReturnPath, recommendationReturnLabel, recommendationManagerHref, RECOMMENDATION_PROMPT_KEY } from '../../src/features/match/config/recommendationOnboarding.mjs';
import { showFloatingSearch, searchBackPath, workSearchHref } from '../../src/features/match/config/workSearchPresentation.mjs';

function memory() { const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)}; }

test('floating search covers home and non-test match screens while excluding tests',()=>{
 for(const path of ['/match/test/intro','/match/test/duel/1','/match/test/avoidance','/match/result/building','/match/search'])assert.equal(showFloatingSearch(path),false,path);
 for(const path of ['/match','/match/result/me','/match/result/me/recommendations','/match/c/invite','/match/c/invite/ranking','/match/c/invite/match/pair','/match/work/work-1','/match/share/personal','/match/challenge/new'])assert.equal(showFloatingSearch(path),true,path);
 for(const path of ['/match/result/me/recommendations?returnTo=%2Fmatch%2Fc%2Finvite%2Fmatch%2Fpair','/match/c/invite/match/pair?from=ranking','/match/work/work-1?returnTo=%2Fmatch%2Fsearch','/match/share/personal?profilePublicId=me']){
  assert.equal(searchBackPath(path),path);assert.equal(new URL(workSearchHref('',path),'http://localhost').searchParams.get('from'),path);
 }
});

test('registration returns only to a safe personal/pair/work result, never a different user or editor/test/external page',()=>{
 const allowed=['/match/result/me','/match/result/me?from=home','/match/c/invite/match/pair','/match/work/work-1?returnTo=%2Fmatch%2Fsearch'];
 for(const path of allowed){assert.equal(recommendationReturnPath(path,'me'),path);assert.equal(new URL(recommendationManagerHref('me',path),'http://localhost').searchParams.get('returnTo'),path);}
 for(const path of [undefined,'https://evil.example','//evil.example','/match/test/intro','/match/result/other','/match/result/me/recommendations','/match/c/invite/ranking','/match/work/../evil','/match/\\evil'])assert.equal(recommendationReturnPath(path,'me'),'/match/result/me');
 assert.equal(recommendationReturnLabel(allowed[0]),'내 취향 결과');assert.equal(recommendationReturnLabel(allowed[2]),'궁합');assert.equal(recommendationReturnLabel(allowed[3]),'작품 상세');
 assert.equal(recommendationManagerHref('me'),'/match/result/me/recommendations');
});

test('optional prompt is scoped to its completed destination and can be dismissed once without navigation or writes',()=>{
 const session=memory(),path='/match/c/invite/match/pair';
 assert.equal(queueRecommendationPrompt(session,'me',path,100),true);
 assert.equal(readRecommendationPrompt(session,'/match/result/me',101),null);
 assert.deepEqual(readRecommendationPrompt(session,path,101),{profileId:'me',destination:path});
 assert.equal(readRecommendationPrompt(session,path,99),null);assert.equal(readRecommendationPrompt(session,path,100+25*60*60*1000),null);
 dismissRecommendationPrompt(session);assert.equal(readRecommendationPrompt(session,path,101),null);
 assert.equal(queueRecommendationPrompt({setItem(){throw new Error('blocked');}},'me',path),false,'blocked storage never blocks result completion');
 assert.equal(queueRecommendationPrompt(session,'../bad',path),false);
 session.setItem(RECOMMENDATION_PROMPT_KEY,'broken JSON');assert.equal(readRecommendationPrompt(session,path),null);
 session.setItem(RECOMMENDATION_PROMPT_KEY,JSON.stringify({profileId:'me',destination:'https://evil.example',savedAt:100}));assert.equal(readRecommendationPrompt(session,'/match/result/me',101),null);
});
