import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(relative,dependencies){
 const filename=new URL(relative,import.meta.url),localRequire=createRequire(filename),compiled={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(source,{module:compiled,exports:compiled.exports,URL,Error,Map,require:name=>name==='./dailyRecommendationStore'?dependencies[name]??{getRuntimeDailyTastePicks:async()=>null}:dependencies[name]??localRequire(name)},{filename:filename.pathname});
 return compiled.exports;
}
test('there is no fixed selection or preview fallback in the entry point',()=>{
 const source=fs.readFileSync(new URL('../../src/features/match/server/dailyTastePicks.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source,/PREVIEW_WORK_IDS|fixed-preview|wt_romance/);
 assert.match(source,/getDailyTastePicks = getRuntimeDailyTastePicks/);
});
test('daily picks require verified result ownership; invalid/other viewers cannot trigger selection',async()=>{
 let owns=true,selections=0,checks=0,fail=false,preparing=false;
 const route=load('../../src/app/api/v1/results/[profilePublicId]/daily-picks/route.ts',{
  '@/features/match/server/apiResponse':{matchJson:(_r,body,init)=>({body,status:init?.status??200})},
  '@/features/match/server/apiErrors':{toMatchApiFailure:()=>({error:'DAILY_PICKS_LOAD_FAILED',status:500})},
  '@/features/match/server/resultStore':{isTasteResultOwner:async()=>{checks++;return owns;}},
  '@/features/match/server/dailyTastePicks':{getDailyTastePicks:async()=>{selections++;if(fail)throw new Error('private database error');return {mode:preparing?'preparing':'personalized',items:[]};}},
  '@/features/match/storage/anonymousIdentity.mjs':{isAnonymousId:value=>value==='valid'},
 });
 const get=value=>route.GET({headers:{get:()=>value}},{params:Promise.resolve({profilePublicId:'profile'})});
 assert.equal((await get(null)).status,403);assert.equal((await get('invalid')).status,403);assert.equal(checks,0);
 owns=false;assert.equal((await get('valid')).status,403);assert.equal(selections,0);
 owns=true;assert.equal((await get('valid')).status,200);assert.equal(selections,1);
 preparing=true;assert.equal((await get('valid')).status,202);
 fail=true;const response=await get('valid');assert.equal(response.status,500);assert.equal(response.body.error,'DAILY_PICKS_LOAD_FAILED');
});
test('approved personalized output replaces the preview; engine failure never falls back to fixed picks',async()=>{
 let calls=0,fail=false;
 const store=load('../../src/features/match/server/dailyTastePicks.ts',{'server-only':{},
  './database':{getMatchDatabase:()=>{calls++;throw Error('preview must not run');}},
  './dailyRecommendationStore':{getRuntimeDailyTastePicks:async()=>{if(fail)throw Error('engine unavailable');return {mode:'personalized',items:[]};}},
  '../config/recommendationPresentation.mjs':{},
 });
 assert.equal((await store.getDailyTastePicks('profile')).mode,'personalized');assert.equal(calls,0);
 fail=true;await assert.rejects(()=>store.getDailyTastePicks('profile'),/engine unavailable/);assert.equal(calls,0);
});
