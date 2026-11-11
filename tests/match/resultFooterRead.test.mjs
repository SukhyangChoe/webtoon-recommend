import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import { withReaderComic } from '../../src/features/match/server/readerComics.mjs';
import { COMIC_JOBS } from '../../scripts/reader-comics/jobs.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
const owner='00000000-0000-4000-8000-000000000001';

function load(relative,dependencies){
 const filename=new URL(relative,import.meta.url),localRequire=createRequire(filename),compiled={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(source,{module:compiled,exports:compiled.exports,URL,Error,require:name=>dependencies[name]??localRequire(name)},{filename:filename.pathname});
 return compiled.exports;
}
test('result read returns owner-only navigation with no full challenge or extra ownership read',async()=>{
 for(const viewer of [owner,'00000000-0000-4000-8000-000000000002',null])for(const code of ['active-map',null]){
  let reads=0;
  const database=async()=>{reads++;return [];};
  database.unsafe=async(query,values)=>{
   reads++;assert.match(query,/case when snapshot.anonymous_id = \$2::text/);assert.match(query,/status = 'active'/);
   assert.deepEqual(Array.from(values),['public-result',viewer]);
   return [{snapshot_id:'snapshot',profile_id:'private-profile',public_profile_id:'public-result',anonymous_id:owner,display_name:'닉네임',snapshot_data:{},active_challenge_code:viewer===owner?code:null}];
  };
  const store=load('../../src/features/match/server/resultStore.ts',{
   './database':{getMatchDatabase:()=>database},
   '../engine/recommendationTasteEngine.mjs':{applyRecommendationTaste:snapshot=>snapshot},
   '../engine/resultEngine.mjs':{toPublicTasteResult:snapshot=>({publicProfileId:snapshot.publicProfileId}),buildTasteSnapshot:()=>({})},
   './nickname.mjs':{sanitizeMatchNickname:value=>value},
  });
  const result=await store.getPublicTasteResultForViewer('public-result',viewer);
  assert.equal(reads,2,'one snapshot/navigation read and existing recommendation vector read only');
  assert.equal(result.canManage,viewer===owner);assert.equal(result.activeChallengeCode,viewer===owner?code:null);
  for(const field of ['anonymousId','profileId','snapshotId','active_challenge_code'])assert.equal(Object.hasOwn(result,field),false);
 }
});
test('result API normalizes validated viewer identity and keeps missing/invalid viewers public',async()=>{
 const seen=[];
 const episode=COMIC_JOBS[0];
 const route=load('../../src/app/api/v1/results/[profilePublicId]/route.ts',{
  '@/features/match/server/requestBody':{},
  '@/features/match/server/apiResponse':{matchJson:(_request,body,init)=>({body,status:init?.status??200})},
  '@/features/match/server/resultStore':{getPublicTasteResultForViewer:async(id,viewer)=>{seen.push([id,viewer]);return id==='missing'?null:{canManage:false,activeChallengeCode:null,readerExplanation:{genreKey:episode.genre,sceneKey:episode.key,scene:episode.sourceScene}};}},
  '@/features/match/server/readerComics.mjs':{withReaderComic},
  '@/features/match/server/apiErrors':{toMatchApiFailure:()=>({error:'FAIL',status:500})},
  '@/features/match/storage/anonymousIdentity.mjs':{isAnonymousId:value=>/^[a-f\d-]{36}$/i.test(value)},
 });
 for(const value of [owner.toUpperCase(),'not-a-uuid',null]){
  const response=await route.GET({url:'http://localhost/api/v1/results/public-result'+(value?'?anonymousId='+value:'')},{params:Promise.resolve({profilePublicId:'public-result'})});
  assert.equal(response.status,200);assert.equal(seen.at(-1)[1],value===null||value==='not-a-uuid'?null:owner);
  assert.equal(response.body.readerExplanation.comic.src,episode.src,'existing result reads attach the matching static episode');
 }
 assert.equal((await route.GET({url:'http://localhost/api/v1/results/missing'},{params:Promise.resolve({profilePublicId:'missing'})})).status,404);
});
