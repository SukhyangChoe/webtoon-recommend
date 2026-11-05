import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { matchedAvoidanceWarnings } from '../../src/features/match/engine/avoidanceEngine.mjs';
import { persistedSelectionKey, resolvePersistedSelection } from '../../src/features/match/server/dailyRecommendation/persistentSelection.mjs';
import { dailyWindow } from '../../src/features/match/server/dailyRecommendation/policy.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
function load({approved=true,enabled=true,available=true,select=async()=>({items:[{canonicalWebtoonId:'selected',title:'작품',platform:'플랫폼'}]}),live=true,warn=false,hold=false}={}) {
 const queries=[];
 let saved=null, key=null, revision='1';
 const repository={
  read:async(_profile,next)=>key===next?saved:null,
  claim:async(_profile,next)=>{if(hold)return null;key=next;saved=null;return 'token';},
  complete:async(_profile,next,_token,value)=>{if(next!==key)return false;saved=value;return true;},
  release:async()=>{},
 };
 const database=async(strings,...values)=>{
  const text=strings.join('?');queries.push({text,values});assert.doesNotMatch(text,/\b(?:insert|update|delete)\b/i);
  if(text.includes('snapshot_data'))return [{snapshot_id:'snapshot',profile_id:'profile',completed_at:'2026-11-04T00:00:00Z',question_set_version:'version',catalog_revision:revision,snapshot_data:{},answers:{appeal:['actual-choice'],...(warn?{avoidance:['avoid_repetition']}: {})},recommendations:[]}];
  return live?[{canonical_webtoon_id:'selected',title:'작품',platform:'플랫폼',main_genre:'fantasy',cover_url:null,raw_data:{private:true},personalFit:.99,avoidance_tag_scores:warn?{progression_fatigue:3}:{}}]:[];
 };
 const filename=new URL('../../src/features/match/server/dailyRecommendationStore.ts',import.meta.url);
 const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 const deps={'server-only':{},'../data/questionSeed.v0.4.json':{questionSetVersion:'version',avoidanceFeatureCatalog:[{featureKey:'avoid_repetition',webtoonFitCompatibility:{avoidanceTagKeys:['progression_fatigue']}}]},'./database':{getMatchDatabase:()=>database},
  './dailyRecommendation/runtime02.mjs':{runtime02Available:async()=>available,selectDailyRuntime02:select},
  './dailyRecommendation/policy.mjs':{DAILY_INPUT_MAPPING_APPROVED:approved,DAILY_SELECTION_VERSION:'runtime02',dailyWindow},
  './dailySelectionRepository':{dailySelectionRepository:()=>repository},
  './dailyRecommendation/persistentSelection.mjs':{persistedSelectionKey,resolvePersistedSelection},
  '../config/recommendationPresentation.mjs':{recommendationGenreLabel:()=> '판타지',safeWorkCoverUrl:value=>value}};
 deps['../engine/avoidanceEngine.mjs']={matchedAvoidanceWarnings};
 vm.runInNewContext(source,{module,exports:module.exports,Map,Error,process:{env:enabled?{WEBTOON_DAILY_INPUT_MAPPING:'mapped-positive-v1'}:{}},require:name=>{if(!(name in deps))throw Error('UNEXPECTED_IMPORT');return deps[name];}},{filename:filename.pathname});
 return {store:module.exports,queries,bumpCatalog:()=>{revision=String(Number(revision)+1);}};
}
test('real selection is the default without an environment flag',async()=>{
 const {store}=load({enabled:false});assert.equal((await store.getRuntimeDailyTastePicks('public')).mode,'personalized');
});
test('missing private runtime returns unavailable, never fixed preview works',async()=>{
 const {store,queries}=load({available:false});await assert.rejects(()=>store.getRuntimeDailyTastePicks('public'),/DAILY_ENGINE_UNAVAILABLE/);assert.equal(queries.length,1);
});
test('only original evidence enters selection; public response contains no internal scores or raw evidence',async()=>{
 let input;const {store,queries}=load({select:async value=>{input=value;return {items:[{canonicalWebtoonId:'selected',title:'작품',platform:'플랫폼'}],candidateOverallFit:.8,raw_data:{private:true}};}});
 const result=await store.getRuntimeDailyTastePicks('public');
 assert.equal(input.snapshotId,'snapshot');assert.equal(input.answers.appeal[0],'actual-choice');assert.equal(input.tasteVector,undefined);
 assert.match(queries[0].text,/order by s.completed_at desc, s.snapshot_id desc/);
 assert.equal(input.liveCatalog[0].canonicalWebtoonId,'selected','live availability enters engine before selection');
 assert.equal(result.mode,'personalized');assert.equal(result.items.length,1);
 assert.deepEqual(Object.keys(result.items[0]).sort(),['canonicalWebtoonId','coverUrl','mainGenreLabel','platform','title']);
 assert.doesNotMatch(JSON.stringify(result),/"(?:profileId|answers|personalFit|candidateOverallFit|raw_data|seedSha|vector|quality)"/i);
 assert.match(queries[1].text,/webtoon_is_public_safe/);assert.match(queries[1].text,/recommendation_eligible=true/);assert.match(queries[1].text,/verified_precision/);
});
test('unavailable live candidates are removed without force filling',async()=>{
 const {store}=load({live:false});const result=await store.getRuntimeDailyTastePicks('public');assert.equal(result.mode,'personalized');assert.equal(result.items.length,0);
});
test('matched fallback works carry warnings checked against current live data, not raw vectors or the worker payload',async()=>{
 const {store}=load({warn:true});const result=await store.getRuntimeDailyTastePicks('public');
 assert.equal(result.items[0].avoidanceWarnings[0].key,'progression_fatigue');
 assert.doesNotMatch(JSON.stringify(result),/avoidance_tag_scores|"answers"|personalFit/);
});
test('engine failure propagates and cannot silently become a personalized fixed preview',async()=>{
 const {store,queries}=load({select:async()=>{throw Error('engine failure');}});await assert.rejects(()=>store.getRuntimeDailyTastePicks('public'),/engine failure/);assert.equal(queries.length,2);
});
test('repeat visits reuse the persisted batch without whole-catalog reads or engine work; catalog edits invalidate it',async()=>{
 let runs=0;
 const {store,queries,bumpCatalog}=load({select:async()=>{runs++;return {items:[{canonicalWebtoonId:'selected',title:'작품',platform:'플랫폼'}]};}});
 const first=await store.getRuntimeDailyTastePicks('public');
 queries.length=0;
 const second=await store.getRuntimeDailyTastePicks('public');
 assert.equal(runs,1);assert.equal(queries.length,2);
 assert.match(queries[1].text,/canonical_webtoon_id=any/);
 assert.equal(JSON.stringify(first),JSON.stringify(second));
 bumpCatalog();await store.getRuntimeDailyTastePicks('public');assert.equal(runs,2);
});
test('an in-flight persisted lease returns preparing with no old works, no engine and no catalog scan',async()=>{
 const {store,queries}=load({hold:true,select:async()=>{throw Error('must not run');}});
 const value=await store.getRuntimeDailyTastePicks('public');
 assert.equal(value.mode,'preparing');assert.equal(value.retryAfterMs,2000);assert.equal(value.items.length,0);assert.equal(queries.length,1);
});
