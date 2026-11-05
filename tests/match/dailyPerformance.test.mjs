import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withDailyRelationIndex } from '../../src/features/match/server/dailyRecommendation/performance.mjs';
import { DAILY_ENGINE_TIMEOUT_MS } from '../../src/features/match/server/dailyRecommendation/policy.mjs';

function fixture() {
  let validations = 0;
  const catalog = { nodes: ['a','b'], edges: [{ a:'a',b:'b',strength:.5 }] };
  // Deliberately tiny stand-in, not a copy of private matching/scoring code.
  function fit(aa,bb,{enabled=true,scale=1,relations=catalog}={}) {
    validate(relations);
    const lookup=new Map(relations.edges.map(e=>[pair(e.a,e.b),e]));
    return { size:lookup.size, a:profile(aa), b:profile(bb), enabled, scale };
  }
  const semantic = { catalog, fit, validate: value => { validations++;assert.ok(value.nodes&&value.edges); } };
  return { semantic, original:fit, validations:()=>validations };
}
test('pinned relation indexes are reused only inside the request; scoring export is restored',()=>{
  const f=fixture();
  withDailyRelationIndex(f.semantic, [f.semantic.catalog],()=>{
    assert.notEqual(f.semantic.fit,f.original);
    for(let i=0;i<5;i++)assert.deepEqual(f.semantic.fit({a:3,b:0},{b:2}),{size:1,a:{a:3},b:{b:2},enabled:true,scale:1});
    assert.equal(f.validations(),1,'static relation table is not revalidated for every comparison');
    assert.ok(Object.isFrozen(f.semantic.catalog)&&Object.isFrozen(f.semantic.catalog.edges));
    assert.throws(()=>{f.semantic.catalog.edges[0].strength=.9;},TypeError);
    const dynamic={nodes:['a','b'],edges:[]};f.semantic.fit({},{},{relations:dynamic});f.semantic.fit({},{},{relations:dynamic});
    assert.equal(f.validations(),3,'derived relation tables still undergo original validation');
    assert.throws(()=>f.semantic.fit({a:4},{}),/Invalid centrality/);
  });
  assert.equal(f.semantic.fit,f.original);
});
test('an execution failure restores the original export, and unrecognized source is never transformed',()=>{
  const f=fixture();
  assert.throws(()=>withDailyRelationIndex(f.semantic,[],()=>{throw Error('stop');}),/stop/);
  assert.equal(f.semantic.fit,f.original);
  f.semantic.fit=()=>null;
  assert.throws(()=>withDailyRelationIndex(f.semantic,[],()=>{}),/DAILY_PERFORMANCE_ADAPTER_INCOMPATIBLE/);
});
test('daily engine, hosting and client budgets have explicit cold-start headroom',()=>{
  const route=fs.readFileSync(new URL('../../src/app/api/v1/results/[profilePublicId]/daily-picks/route.ts',import.meta.url),'utf8');
  const component=fs.readFileSync(new URL('../../src/features/match/components/DailyTastePicks.tsx',import.meta.url),'utf8');
  const hosting=Number(route.match(/maxDuration = (\d+)/)[1])*1000;
  const client=Number(component.match(/timeoutMs: (\d+)/)[1]);
  assert.equal(DAILY_ENGINE_TIMEOUT_MS,45000);
  assert.ok(DAILY_ENGINE_TIMEOUT_MS<hosting&&hosting<client);
  assert.match(route,/event: 'daily_picks_failed', code: failure.error, elapsedMs:/);
});
