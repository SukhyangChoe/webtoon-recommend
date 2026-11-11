import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dailyMatchReason, publicDailyMatchReason } from '../../src/features/match/server/dailyRecommendation/matchReason.mjs';
import { buildTasteSnapshot } from '../../src/features/match/engine/resultEngine.mjs';
const seed=JSON.parse(fs.readFileSync(new URL('../../src/features/match/data/questionSeed.v0.4.json',import.meta.url),'utf8'));
const labels={tagLabels:{growth:'성장',revenge:'복수'},contentLabels:{action:'액션'}};
function input(){const snapshot=buildTasteSnapshot({seed,answers:{genre:{murim:'high'}},profileId:'p',snapshotId:'s'});snapshot.tasteVector.tagScores={growth:3};snapshot.tasteVector.genreScores={murim:3};return {snapshotData:snapshot,answers:{genre:{murim:'high'}},recommendations:[]};}
test('daily explanation uses genuine shared positive dimensions, never avoidance or engine scores',()=>{
 const result=dailyMatchReason(input(),{mainGenre:'murim',recommendation:{tagScores:{growth:2,revenge:3},avoidanceTagScores:{gore:3}}},seed,labels);
 assert.deepEqual(result.labels,['성장']);assert.match(result.summary,/성장/);assert.doesNotMatch(result.summary,/복수|gore|\d/);
 assert.deepEqual(Object.keys(result).sort(),['labels','summary','version']);
});
test('no positive feature overlap uses a supported genre, otherwise a neutral non-fabricated summary',()=>{
 assert.match(dailyMatchReason(input(),{mainGenre:'murim',recommendation:{}},seed,labels).summary,/무협/);
 assert.equal(dailyMatchReason(input(),{mainGenre:'fantasy',recommendation:{}},seed,labels).summary,'여러 취향 요소를 함께 비교해 고른 작품이에요.');
});
test('disabled registrations do not become an explanation; result vector is not mutated',()=>{
 const value=input(),before=JSON.stringify(value);value.recommendations=[{affectsTaste:false,recommendation:{tagScores:{revenge:3}}}];
 assert.deepEqual(dailyMatchReason(value,{mainGenre:'murim',recommendation:{tagScores:{revenge:3}}},seed,labels).labels,[]);
 value.recommendations=[];assert.equal(JSON.stringify(value),before);
});
test('the closest current registered work is selected by actual comparable vectors, never by title or list order',()=>{
 const target={canonicalWebtoonId:'target',mainGenre:'murim',recommendation:{tagScores:{growth:3},contentAxisScores:{combat_growth:3},artStyleScores:{detailed_rendering:3}}};
 const close={canonicalWebtoonId:'close',title:'내가 등록한 수련 이야기',recommendation:target.recommendation};
 const far={canonicalWebtoonId:'far',title:'다른 이야기',recommendation:{tagScores:{revenge:3},contentAxisScores:{office_romance:3},artStyleScores:{rounded_cute:3}}};
 const value=input();value.recommendations=[far,{...close,canonicalWebtoonId:'disabled',affectsTaste:false},close,{...close,canonicalWebtoonId:'target'}];
 const result=dailyMatchReason(value,target,seed,labels);
 assert.equal(result.version,2);assert.equal(result.referenceWork.canonicalWebtoonId,'close');assert.match(result.summary,/내가 등록한 수련 이야기/);
 assert.doesNotMatch(result.summary,/읽었|읽은|감상한/);
 assert.equal(dailyMatchReason({...value,recommendations:[{...close,recommendation:{tagScores:{growth:3}}}]},target,seed,labels).referenceWork,undefined,'one comparable axis is insufficient');
 const safe=publicDailyMatchReason({...result,privateScore:.99,referenceWork:{...result.referenceWork,vector:{private:true},score:.99}});
 assert.deepEqual(Object.keys(safe.referenceWork).sort(),['canonicalWebtoonId','labels','title']);
 assert.doesNotMatch(JSON.stringify(safe),/privateScore|vector|\.99/);
});
