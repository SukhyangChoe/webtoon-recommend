import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { matchedAvoidanceWarnings } from '../../src/features/match/engine/avoidanceEngine.mjs';
import { safeOfficialWorkUrl } from '../../src/features/match/config/workDetailPresentation.mjs';
import { persistedSelectionKey, resolvePersistedSelection } from '../../src/features/match/server/dailyRecommendation/persistentSelection.mjs';
import { dailyWindow } from '../../src/features/match/server/dailyRecommendation/policy.mjs';
import { DAILY_PROGRESS_MESSAGES } from '../../src/features/match/config/dailyPicksPresentation.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
function load({approved=true,enabled=true,available=true,select=async()=>({items:[{canonicalWebtoonId:'selected',title:'작품',platform:'플랫폼'}]}),live=true,warn=false,hold=false,publicRecommendation=null,officialUrl='https://comic.naver.com/webtoon/list?titleId=123'}={}) {
 const queries=[];
 let saved=null, key=null, revision='1', reasonRuns=0, explanationUpdates=0;
 const repository={
  read:async(_profile,next)=>key===next?saved:null,
  claim:async(_profile,next)=>{if(hold)return null;key=next;saved=null;return 'token';},
  complete:async(_profile,next,_token,value)=>{if(next!==key)return false;saved=value;return true;},
  release:async()=>{},
  updateExplanations:async(_profile,next,value)=>{assert.equal(next,key);explanationUpdates++;saved=value;},
 };
 const database=async(strings,...values)=>{
  const text=strings.join('?');queries.push({text,values});assert.doesNotMatch(text,/\b(?:insert|update|delete)\b/i);
  if(text.includes('snapshot_data'))return [{snapshot_id:'snapshot',profile_id:'profile',completed_at:'2026-11-04T00:00:00Z',question_set_version:'version',catalog_revision:revision,snapshot_data:{},answers:{appeal:['actual-choice'],...(warn?{avoidance:['avoid_repetition']}: {})},recommendations:[]}];
  return live?[{canonical_webtoon_id:'selected',title:'작품',platform:'플랫폼',main_genre:'fantasy',official_url:officialUrl,cover_url:null,recommendation:publicRecommendation,raw_data:{private:true},personalFit:.99,avoidance_tag_scores:warn?{progression_fatigue:3}:{}}]:[];
 };
 const filename=new URL('../../src/features/match/server/dailyRecommendationStore.ts',import.meta.url);
 const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const compiledModule={exports:{}};
 const deps={'server-only':{},'../data/questionSeed.v0.4.json':{questionSetVersion:'version',avoidanceFeatureCatalog:[{featureKey:'avoid_repetition',webtoonFitCompatibility:{avoidanceTagKeys:['progression_fatigue']}}]},'./database':{getMatchDatabase:()=>database},
  './dailyRecommendation/runtime02.mjs':{runtime02Available:async()=>available,selectDailyRuntime02:select},
  './dailyRecommendation/policy.mjs':{DAILY_INPUT_MAPPING_APPROVED:approved,DAILY_SELECTION_VERSION:'runtime02',dailyWindow},
  './dailySelectionRepository':{dailySelectionRepository:()=>repository},
  './dailyRecommendation/persistentSelection.mjs':{persistedSelectionKey,resolvePersistedSelection},
  './dailyRecommendation/matchReason.mjs':{dailyMatchReason:()=>{reasonRuns++;return {version:2,summary:'내 취향과 겹치는 성장 요소가 있어요.',labels:['성장']};}},
  '@/data/tags/tagLabels':{tagLabelMap:{}},'@/data/contentAxis/contentAxisLabels':{CONTENT_AXIS_LABELS:{}},
  '../config/workDetailPresentation.mjs':{safeOfficialWorkUrl},
  '../config/dailyPicksPresentation.mjs':{DAILY_PROGRESS_MESSAGES},
  '../config/recommendationPresentation.mjs':{recommendationGenreLabel:()=> '판타지',safeWorkCoverUrl:value=>value}};
 deps['../engine/avoidanceEngine.mjs']={matchedAvoidanceWarnings};
 vm.runInNewContext(source,{module:compiledModule,exports:compiledModule.exports,Map,Error,process:{env:enabled?{WEBTOON_DAILY_INPUT_MAPPING:'mapped-positive-v1'}:{}},require:name=>{if(!(name in deps))throw Error('UNEXPECTED_IMPORT');return deps[name];}},{filename:filename.pathname});
 return {store:compiledModule.exports,queries,reasonRuns:()=>reasonRuns,explanationUpdates:()=>explanationUpdates,ageExplanation:()=>{saved.items[0].matchReason.version=1;},bumpCatalog:()=>{revision=String(Number(revision)+1);}};
}
test('real selection is the default without an environment flag',async()=>{
 const {store}=load({enabled:false});assert.equal((await store.getRuntimeDailyTastePicks('public')).mode,'personalized');
});
test('progress follows actual work; cache hits and another worker never pretend to rerun selection',async()=>{
 const {store}=load(),stages=[];
 await store.getRuntimeDailyTastePicks('public',{onProgress:stage=>stages.push(stage)});
 assert.deepEqual(stages,['checking','narrowing','selecting','saving','readying']);
 stages.length=0;
 await store.getRuntimeDailyTastePicks('public',{onProgress:stage=>stages.push(stage)});
 assert.deepEqual(stages,['checking','readying']);
 const pending=load({hold:true}),waiting=[];
 assert.equal((await pending.store.getRuntimeDailyTastePicks('public',{onProgress:stage=>waiting.push(stage)})).mode,'preparing');
 assert.deepEqual(waiting,['checking','waiting']);
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
 assert.deepEqual(Object.keys(result.items[0]).sort(),['canonicalWebtoonId','coverUrl','mainGenreLabel','matchReason','officialUrl','platform','title']);
 assert.equal(result.items[0].officialUrl,'https://comic.naver.com/webtoon/list?titleId=123');
 assert.equal(result.items[0].matchReason.labels[0],'성장');
 assert.doesNotMatch(JSON.stringify(result),/"(?:profileId|answers|personalFit|candidateOverallFit|raw_data|seedSha|vector|quality)"/i);
 assert.match(queries[1].text,/webtoon_is_public_safe/);assert.match(queries[1].text,/recommendation_eligible=true/);assert.match(queries[1].text,/verified_precision/);
});
test('platform actions use only safe official URLs, never guessed links or executable schemes',async()=>{
 for(const officialUrl of [null,'javascript:alert(1)','http://example.com/work','https://user:password@example.com/work']){
  const {store}=load({officialUrl});const result=await store.getRuntimeDailyTastePicks('public');assert.equal(result.items[0].officialUrl,null);
 }
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
 const {store,queries,bumpCatalog,reasonRuns}=load({select:async()=>{runs++;return {items:[{canonicalWebtoonId:'selected',title:'작품',platform:'플랫폼'}]};}});
 const first=await store.getRuntimeDailyTastePicks('public');
 queries.length=0;
 const second=await store.getRuntimeDailyTastePicks('public');
 assert.equal(runs,1);assert.equal(queries.length,2);assert.equal(reasonRuns(),1,'explanation is also reused from persistence');
 assert.match(queries[1].text,/canonical_webtoon_id=any/);
 assert.equal(JSON.stringify(first),JSON.stringify(second));
 bumpCatalog();await store.getRuntimeDailyTastePicks('public');assert.equal(runs,2);assert.equal(reasonRuns(),2);
});
test('an in-flight persisted lease returns preparing with no old works, no engine and no catalog scan',async()=>{
 const {store,queries}=load({hold:true,select:async()=>{throw Error('must not run');}});
 const value=await store.getRuntimeDailyTastePicks('public');
 assert.equal(value.mode,'preparing');assert.equal(value.retryAfterMs,2000);assert.equal(value.items.length,0);assert.equal(queries.length,1);
});
test('cached legacy explanations upgrade once without rerunning selection or extending the daily window',async()=>{
 let runs=0;
 const {store,reasonRuns,ageExplanation,explanationUpdates}=load({publicRecommendation:{typeScores:{growth:3}},select:async()=>{runs++;return {items:[{canonicalWebtoonId:'selected',title:'작품',platform:'플랫폼'}]};}});
 const first=await store.getRuntimeDailyTastePicks('public');
 ageExplanation();
 const stages=[],second=await store.getRuntimeDailyTastePicks('public',{onProgress:stage=>stages.push(stage)});
 assert.equal(runs,1);assert.equal(reasonRuns(),2);assert.equal(explanationUpdates(),1);
 assert.equal(second.expiresAt,first.expiresAt);assert.equal(second.items[0].matchReason.version,2);
 assert.deepEqual(stages,['checking','readying']);
 await store.getRuntimeDailyTastePicks('public');
 assert.equal(reasonRuns(),2);assert.equal(explanationUpdates(),1);
});
