import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { recommendationToTasteVector } from '../../src/features/match/engine/tasteVectorEngine.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const seed = require('../../src/features/match/data/questionSeed.v0.4.json');
const viewerA = '11111111-1111-4111-8111-111111111111';
const viewerB = '22222222-2222-4222-8222-222222222222';
const murim = { genreScores:{murim:3}, tagScores:{revenge:3}, contentAxisScores:{battle:3}, artStyleScores:{detailed_rendering:3} };
const romance = { genreScores:{romance:3}, tagScores:{love:3}, contentAxisScores:{romance:3}, artStyleScores:{rounded_cute:3} };

function load(relative, dependencies) {
  const filename = new URL(relative, import.meta.url), localRequire = createRequire(filename);
  const compiledModule = {exports:{}};
  const code = ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{URL,module:compiledModule,exports:compiledModule.exports,require:name=>dependencies[name]??localRequire(name)},{filename:filename.pathname});
  return compiledModule.exports;
}

function harness() {
  const rows=[], recommendations=new Map(), reads=[];
  let currentWork = {canonical_webtoon_id:'work-1',title:'작품',platform:'네이버',main_genre:'murim',recommendation:murim};
  const database = async (strings,...values) => {
    const sql=strings.join('?').replace(/\s+/g,' ').trim();
    reads.push({sql,values});
    assert.match(sql,/^select /i,'work details must never write a score or clear a cache');
    if(sql.includes('from public.match_profile_recommendations')) return (recommendations.get(values[0])??[]).map(recommendation=>({raw_data:{recommendation}}));
    if(sql.includes('from public.webtoons w')) return values[0]==='work-1'&&currentWork ? [currentWork] : [];
    throw new Error('Unexpected SQL: '+sql);
  };
  database.unsafe=async (sql,values)=>{
    reads.push({sql,values});
    assert.match(sql,/where profiles.anonymous_id = \$1::uuid order by snapshots.completed_at desc, snapshots.snapshot_id desc limit 1/);
    return rows.filter(row=>row.anonymous_id===values[0]).sort((a,b)=>b.completed_at.localeCompare(a.completed_at)||b.snapshot_id.localeCompare(a.snapshot_id)).slice(0,1);
  };
  const results=load('../../src/features/match/server/resultStore.ts',{'./database':{getMatchDatabase:()=>database}});
  const details=load('../../src/features/match/server/workDetailStore.ts',{
    'server-only':{},'./database':{getMatchDatabase:()=>database},'./resultStore':results,
    '@/data/tags/tagLabels':{tagLabelMap:{revenge:'복수',love:'사랑'}},
    '@/data/contentAxis/contentAxisLabels':{CONTENT_AXIS_LABELS:{battle:'전투',romance:'로맨스'}},
  });
  function snapshot(anonymousId,publicId,completedAt,recommendation) {
    rows.push({snapshot_id:publicId,public_profile_id:publicId,profile_id:anonymousId,anonymous_id:anonymousId,display_name:publicId,
      completed_at:completedAt,snapshot_data:{tasteVector:recommendationToTasteVector(recommendation,seed)}});
  }
  return {details,results,reads,recommendations,snapshot,setWork:value=>{currentWork=value;},changeWorkVector:value=>{currentWork={...currentWork,recommendation:value};}};
}

test('work detail uses the viewer’s latest test, current saved works and current work vector on every read, with no writes',async()=>{
  const h=harness();
  h.snapshot(viewerA,'old-result','2026-10-01',romance);
  h.snapshot(viewerB,'other-viewer','2026-10-03',romance);
  h.snapshot(viewerA,'new-result','2026-10-02',murim);
  const initial=await h.details.getWorkDetail('work-1',viewerA);
  assert.equal(initial.fitStatus,'ready');
  assert.equal(initial.fit.profilePublicId,'new-result');
  assert.equal(initial.fit.percent,100);
  assert.equal((await h.details.getWorkDetail('work-1',viewerB)).fit.percent,0,'another viewer uses their own different taste');
  h.recommendations.set(viewerA,[romance]);
  const afterRecommendations=await h.details.getWorkDetail('work-1',viewerA);
  assert.ok(afterRecommendations.fit.percent<initial.fit.percent,'saved recommendation changes affect the very next read');
  h.changeWorkVector(romance);
  const afterWork=await h.details.getWorkDetail('work-1',viewerA);
  assert.ok(afterWork.fit.percent>afterRecommendations.fit.percent,'updated work analysis affects the very next read');
  h.recommendations.set(viewerA,[]);
  assert.equal((await h.details.getWorkDetail('work-1',viewerA)).fit.percent,0,'removing saved works restores test-only taste');
  h.snapshot(viewerA,'retested-result','2026-10-04',romance);
  const retested=await h.details.getWorkDetail('work-1',viewerA);
  assert.equal(retested.fit.percent,100);
  assert.equal(retested.fit.profilePublicId,'retested-result');
  for(const secret of ['tasteVector','anonymousId','recommendation','raw_data'])assert.equal(secret in retested,false);
  assert.equal(h.reads.filter(({sql})=>sql.includes('from public.webtoons w')).length,6,'the current work is read every time');
});

test('missing viewer/test or insufficient work data never borrows someone else’s score or fabricates a zero',async()=>{
  const h=harness(); h.snapshot(viewerA,'result','2026-10-01',murim);
  for(const identity of [null,undefined,viewerB]){
    const detail=await h.details.getWorkDetail('work-1',identity);
    assert.equal(detail.fit,null);assert.equal(detail.fitStatus,'test_required');
  }
  for(const recommendation of [null,{tagScores:{revenge:3}}]){
    h.changeWorkVector(recommendation);
    const detail=await h.details.getWorkDetail('work-1',viewerA);
    assert.equal(detail.fit,null);assert.equal(detail.fitStatus,'insufficient_data');
  }
  assert.equal(await h.details.getWorkDetail('missing',viewerA),null);
});

test('API ignores legacy profile overrides, validates the viewer and disables caching',async()=>{
  const calls=[];
  const api=load('../../src/features/match/server/workDetailResponse.ts',{
    'next/server':{NextResponse:{json:(body,options)=>Response.json(body,options)}},
    './workDetailStore':{getWorkDetail:async(id,identity)=>{calls.push({id,identity});return {fit:null};}},
    './database':{getWorkReadDatabase:()=>{}},
    './workReadDeadline':{createWorkReadContext:()=>({requestId:'test',finish:()=> 'total;dur=1'})},
    '../storage/anonymousIdentity.mjs':require('../../src/features/match/storage/anonymousIdentity.mjs'),
    './apiErrors':{toMatchApiFailure:()=>({error:'TEST_FAILED',status:500})},
  });
  for(const identity of [viewerA,viewerB,null,'invalid']){
    const request=new Request('http://localhost/api/v1/webtoons/work-1?profile=someone-else',{headers:identity?{'x-match-anonymous-id':identity}:{}});
    const response=await api.workDetailResponse(request,'work-1','detail');
    assert.equal(response.status,200);
    assert.equal(response.headers.get('cache-control'),'private, no-store');
    assert.equal(response.headers.get('vary'),'x-match-anonymous-id');
    assert.equal(calls.at(-1).identity,[viewerA,viewerB].includes(identity)?identity:null);
  }
});
