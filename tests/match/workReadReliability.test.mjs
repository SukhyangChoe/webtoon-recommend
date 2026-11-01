import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { loadWorkResource } from '../../src/features/match/api/loadWorkResource.mjs';

const require = createRequire(import.meta.url);
function load(relative, dependencies = {}) {
  const filename = new URL(relative, import.meta.url), localRequire = createRequire(filename), compiledModule = {exports:{}};
  const code = require('typescript').transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:1,target:9,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{Error,URL,AbortController,setTimeout,clearTimeout,module:compiledModule,exports:compiledModule.exports,require:name=>dependencies[name]??localRequire(name)},{filename:filename.pathname});
  return compiledModule.exports;
}
const deadline = load('../../src/features/match/server/workReadDeadline.ts');

for (const executing of [false,true]) test(`server deadline cancels ${executing?'executing':'queued'} SQL and records only safe timings`,async()=>{
  const logs=[];let cancelled=0;
  const sql={unsafe(statement){
    const query=new Promise(()=>{});query.cancel=()=>{cancelled++;return Promise.reject(new Error('cancel network failure'));};
    if(executing)queueMicrotask(()=>deadline.markWorkQueryStarted(1,statement));
    return query;
  }};
  const read=deadline.createWorkReadContext({getSql:()=>sql,kind:'fit',workId:'public-work',budgetMs:25,log:value=>logs.push(value)});
  await assert.rejects(read.query('taste_snapshot','select secret_column',['private-viewer']),/WORK_DETAIL_TIMEOUT/);
  assert.equal(cancelled,1);
  assert.match(read.finish(504),/db0_wait_connect;dur=\d+, db0_query;dur=\d+/);read.finish(504);
  assert.equal(logs.length,1);assert.equal(logs[0].steps[0].outcome,'timeout');
  assert.equal(logs[0].steps[0].queryMs===0,!executing);
  assert.doesNotMatch(JSON.stringify(logs),/private-viewer|secret_column|anonymous|nickname/);
});

test('disconnection cancels SQL, prevents subsequent reads, and successful timings finish once',async()=>{
  const controller=new AbortController();let cancelled=0,calls=0;
  const read=deadline.createWorkReadContext({getSql:()=>({unsafe(){calls++;const query=new Promise(()=>{});query.cancel=()=>{cancelled++;};return query;}}),signal:controller.signal,kind:'info',workId:'work',log:()=>{}});
  const pending=read.query('work','select 1',[]);controller.abort();
  await assert.rejects(pending,/WORK_DETAIL_CANCELLED/);await assert.rejects(read.query('work','select 1',[]),/WORK_DETAIL_CANCELLED/);
  assert.equal(cancelled,1);assert.equal(calls,1);read.finish(499);
  const logs=[];
  const success=deadline.createWorkReadContext({getSql:()=>({unsafe:()=>Promise.resolve([{value:1}])}),kind:'info',workId:'work',log:value=>logs.push(value)});
  assert.deepEqual(await success.query('work','select 1',[]),[{value:1}]);
  assert.equal(success.measure('fit_compute',()=>42),42);success.finish(200);success.finish(200);
  assert.equal(logs.length,1);assert.equal(logs[0].steps[0].outcome,'ok');assert.ok('fit_compute' in logs[0].computeMs);
});

test('idempotent client reads retry once, never retry 404, and disable response caching',async()=>{
  let calls=0,retries=0;
  assert.deepEqual(await loadWorkResource('/work',{retryDelayMs:1,onRetry:()=>retries++,fetcher:async(_url,options)=>{assert.equal(options.cache,'no-store');return ++calls===1?new Response('',{status:503}):Response.json({title:'work'});}}),{title:'work'});
  assert.equal(calls,2);assert.equal(retries,1);calls=0;
  await assert.rejects(loadWorkResource('/missing',{fetcher:async()=>{calls++;return new Response('',{status:404});}}),/찾지 못/);
  assert.equal(calls,1);
});

for(const hangsInBody of [false,true])test(`client bounds ${hangsInBody?'body parsing':'fetch'} even when the transport ignores abort`,async()=>{
  const signals=[];
  await assert.rejects(loadWorkResource('/slow',{timeoutMs:15,retryDelayMs:1,fetcher:async(_url,{signal})=>{signals.push(signal);return hangsInBody?{ok:true,json:()=>new Promise(()=>{})}:new Promise(()=>{});}}),error=>error.status===504);
  assert.equal(signals.length,2);assert.ok(signals.every(signal=>signal.aborted));
});

test('navigation cancels client reads and retry delay without another attempt',async()=>{
  const controller=new AbortController();let calls=0;
  const pending=loadWorkResource('/work',{signal:controller.signal,fetcher:async()=>{calls++;return new Promise(()=>{});}});
  controller.abort();await assert.rejects(pending,error=>error.name==='AbortError');assert.equal(calls,1);
  const duringRetry=new AbortController();calls=0;
  await assert.rejects(loadWorkResource('/work',{signal:duringRetry.signal,retryDelayMs:100,onRetry:()=>duringRetry.abort(),fetcher:async()=>{calls++;return new Response('',{status:503});}}),error=>error.name==='AbortError');assert.equal(calls,1);
});

test('split API keeps work info independent, binds fit to viewer and exposes bounded failures',async()=>{
  const calls=[],logs=[];let failure=null;
  const read={requestId:'request-safe',finish:status=>{logs.push(status);return 'total;dur=8';}};
  const store={getWorkInfo:async(id,context)=>{calls.push({mode:'info',id,context});if(failure)throw failure;return {title:'work'};},getWorkFit:async(id,viewer,context)=>{calls.push({mode:'fit',id,viewer,context});if(failure)throw failure;return {fitStatus:'ready',fit:{percent:80}};}};
  const api=load('../../src/features/match/server/workDetailResponse.ts',{
    'next/server':{NextResponse:{json:(body,options)=>Response.json(body,options)}},'./workDetailStore':store,
    './database':{getWorkReadDatabase:()=>{}},'./workReadDeadline':{createWorkReadContext:()=>read},
    '../storage/anonymousIdentity.mjs':require('../../src/features/match/storage/anonymousIdentity.mjs'),
    './apiErrors':{toMatchApiFailure:()=>({error:'FAILED',status:500})},
  });
  const viewer='11111111-1111-4111-8111-111111111111';
  const response=await api.workDetailResponse(new Request('http://local/work?view=info&profile=other',{headers:{'x-match-anonymous-id':viewer}}),'work','detail');
  assert.equal(response.status,200);assert.equal(calls.at(-1).mode,'info');assert.equal(calls.at(-1).context,read);
  await api.workDetailResponse(new Request('http://local/work/fit?profile=other',{headers:{'x-match-anonymous-id':viewer}}),'work','fit');
  assert.equal(calls.at(-1).viewer,viewer);
  for(const error of [new Error('WORK_DETAIL_TIMEOUT'),Object.assign(new Error('cancelled'),{code:'57014'}),Object.assign(new Error('lock timeout'),{code:'55P03'})]){
    failure=error;const result=await api.workDetailResponse(new Request('http://local/work/fit'),'work','fit');
    assert.equal(result.status,504);assert.equal(result.headers.get('retry-after'),'1');assert.equal(result.headers.get('cache-control'),'private, no-store');assert.equal(result.headers.get('server-timing'),'total;dur=8');assert.equal(result.headers.get('x-request-id'),'request-safe');assert.equal((await result.json()).error,'WORK_DETAIL_TIMEOUT');
  }
  failure=new Error('WORK_DETAIL_CANCELLED');assert.equal((await api.workDetailResponse(new Request('http://local/work'),'work','fit')).status,499);
});
