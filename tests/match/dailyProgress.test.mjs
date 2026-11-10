import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyPicksProgressStream } from '../../src/features/match/server/dailyRecommendation/progressStream.mjs';
import { readDailyPicksResponse } from '../../src/features/match/api/dailyPicksProgress.mjs';
import { loadWorkResource, WorkResourceError } from '../../src/features/match/api/loadWorkResource.mjs';

const headers={'content-type':'application/x-ndjson'};
const picks={mode:'personalized',items:[{canonicalWebtoonId:'work',title:'작품',platform:'플랫폼'}]};
const failure=()=>({error:'DAILY_ENGINE_FAILED',status:503});

test('progress is available while the actual selection promise is still pending',async()=>{
 let finish,complete=false;const gate=new Promise(resolve=>{finish=resolve;}),stages=[];
 const stream=dailyPicksProgressStream(async emit=>{emit('checking');await gate;emit('selecting');return picks;},failure);
 const result=readDailyPicksResponse(new Response(stream,{headers}),stage=>stages.push(stage)).then(value=>{complete=true;return value;});
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(stages,['loading','checking']);assert.equal(complete,false);
 finish();assert.deepEqual(await result,picks);assert.deepEqual(stages,['loading','checking','selecting']);
});
test('fragmented Korean UTF-8 and newlines decode correctly; unknown progress cannot expose internals',async()=>{
 const body=[{type:'progress',stage:'narrowing'},{type:'progress',stage:'private_engine_score'},{type:'result',data:picks}].map(JSON.stringify).join('\n');
 const bytes=new TextEncoder().encode(body),stages=[];
 const stream=new ReadableStream({start(controller){for(const byte of bytes)controller.enqueue(Uint8Array.of(byte));controller.close();}});
 assert.deepEqual(await readDailyPicksResponse(new Response(stream,{headers}),stage=>stages.push(stage)),picks);
 assert.deepEqual(stages,['narrowing']);
});
test('truncated or oversized streams fail instead of returning an empty successful selection',async()=>{
 for(const body of [JSON.stringify({type:'progress',stage:'checking'})+'\n',' '.repeat(256*1024+1)]) {
  await assert.rejects(()=>readDailyPicksResponse(new Response(body,{headers}),()=>{}),error=>error instanceof WorkResourceError&&error.status===502);
 }
});
test('stream errors use the existing bounded read retry and never leak private exception text',async()=>{
 let calls=0;const stages=[];
 const result=await loadWorkResource('/daily-picks',{
  retryDelayMs:0,fetcher:async()=>new Response(dailyPicksProgressStream(async emit=>{
   calls++;emit('checking');if(calls===1)throw Error('PRIVATE DATABASE DETAILS');return picks;
  },failure),{headers}),parseResponse:response=>readDailyPicksResponse(response,stage=>stages.push(stage)),
 });
 assert.equal(calls,2);assert.deepEqual(result,picks);assert.deepEqual(stages,['loading','checking','loading','checking']);
 const response=new Response(dailyPicksProgressStream(async()=>{throw Error('PRIVATE DATABASE DETAILS');},failure),{headers});
 assert.doesNotMatch(await response.text(),/PRIVATE DATABASE DETAILS/);
});
test('old JSON responses remain compatible and cannot manufacture progress events',async()=>{
 const stages=[];assert.deepEqual(await readDailyPicksResponse(Response.json(picks),stage=>stages.push(stage)),picks);assert.deepEqual(stages,[]);
});
