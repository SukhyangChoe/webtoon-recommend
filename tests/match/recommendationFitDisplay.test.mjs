import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendationFitDisplayScore as display, recommendationFitPresentation as present } from '../../src/features/match/config/recommendationFitDisplay.mjs';
import { calculateRecommendationFit } from '../../src/features/match/engine/recommendationFitEngine.mjs';
import { recommendationToTasteVector } from '../../src/features/match/engine/tasteVectorEngine.mjs';
import { createRequire } from 'node:module';
const seed = createRequire(import.meta.url)('../../src/features/match/data/questionSeed.v0.4.json');

test('sqrt display uses explicit 0..1 engine units and rounds only the final display', () => {
  for (const [raw100, expected] of [[0,0],[25,50],[40,63],[50,71],[60,77],[65,81],[70,84],[80,89],[100,100]]) {
    assert.equal(display(raw100 / 100), expected);
  }
  assert.equal(display(.255),50,'25.5 raw points must not first become 26');
  assert.equal(display(.654321),81);
  assert.deepEqual(present(.255),{rawScore:.255,percent:26,displayScore:50,displayScoreVersion:'sqrt_v1'});
});

test('unknown, invalid, out-of-range and already-scaled values are not coerced or clamped', () => {
  for (const raw of [null,undefined,NaN,Infinity,-Infinity,-.000001,1.000001,25,65,'0.65',false,{},[]]) {
    assert.equal(display(raw),null);assert.equal(present(raw),null);
  }
  assert.equal(present(0).displayScore,0,'a genuine comparable zero remains a valid score');
});

test('display is monotonic throughout 0..1, including fractional scores and boundaries', () => {
  let previous=-1;
  for(let i=0;i<=100000;i++) {
    const raw=i/100000,score=display(raw);
    assert.ok(score>=previous&&score>=0&&score<=100);previous=score;
    assert.equal(present(raw).rawScore,raw);
  }
});

test('presentation leaves engine results, raw ordering, tied displays and highlight gates unchanged', () => {
  const viewer=recommendationToTasteVector({tagScores:{revenge:3,growth:2},contentAxisScores:{battle:3},artStyleScores:{detailed_rendering:3}},seed);
  const works=[{tagScores:{love:3},contentAxisScores:{romance:3}}, {tagScores:{revenge:2,growth:1},contentAxisScores:{battle:2}}, {tagScores:{revenge:3,growth:2},contentAxisScores:{battle:3}}];
  const before=works.map(work=>calculateRecommendationFit(viewer,work,seed));
  const after=before.map(fit=>({...fit,...present(fit.score)}));
  assert.deepEqual(works.map(work=>calculateRecommendationFit(viewer,work,seed)),before);
  assert.deepEqual(after.map(fit=>({score:fit.rawScore,highlighted:fit.highlighted,comparableAxes:fit.comparableAxes})),before);
  const order=values=>values.map((value,id)=>({id,score:value})).sort((a,b)=>b.score-a.score||a.id-b.id).map(row=>row.id);
  assert.deepEqual(order(after.map(fit=>fit.rawScore)),order(before.map(fit=>fit.score)));
  assert.equal(display(.650001),display(.650002));
  assert.deepEqual(order([present(.650001).rawScore,present(.650002).rawScore]),[1,0]);
});
