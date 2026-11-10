import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { normalizeRecommendationComment } from '../../src/features/match/config/recommendationPolicy.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(file,deps) {
 const filename=new URL(file,import.meta.url),compiledModule={exports:{}},local=createRequire(filename);
 const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{module:compiledModule,exports:compiledModule.exports,Error,require:name=>name==='server-only'?{}:deps[name]??local(name)});
 return compiledModule.exports;
}
function store({owner=true,member=true,current=[],available=[{recommendation_registration_blocked:false}]}={}) {
 const statements=[],comments=[];
 const sql=async(strings,...values)=>{
  const query=strings.join('?');statements.push({query,values});
  if(query.includes('for update of p'))return owner?[{profile_id:'profile'}]:[];
  if(query.includes('order by sort_order') && query.includes('select canonical_webtoon_id,sort_order'))return current;
  if(query.includes('lock_recommendation_catalog'))return available;
  if(query.includes('select canonical_webtoon_id'))return member?[{canonical_webtoon_id:'work'}]:[];
  return [];
 };
 const db={begin:async run=>run(sql)};
 const loaded=load('../../src/features/match/server/recommendationEditStore.ts',{
  './database':{getMatchDatabase:()=>db},'../config/recommendationPolicy.mjs':{normalizeRecommendationComment},
  './recommendationCommentStore':{writeRecommendationComment:async(...args)=>comments.push(args.slice(1))},
 });
 return {...loaded,statements,comments};
}
const input={publicProfileId:'public',anonymousId:'owner',canonicalWebtoonId:'work'};
test('one-work comment edit retains identity/likes and does not replace membership or sort order',async()=>{
 const s=store();await s.editProfileRecommendation({...input,action:'comment',recommendationComment:'  새  추천 한마디  '});
 assert.deepEqual(s.comments,[['profile','work','새 추천 한마디']]);
 const update=s.statements.at(-1);assert.match(update.query,/where profile_id=\?::uuid and canonical_webtoon_id=\?/);
 assert.deepEqual(update.values,['새 추천 한마디','profile','work']);
 assert.doesNotMatch(s.statements.map(x=>x.query).join(''),/delete|sort_order|match_recommendation_comment_likes/i);
});
test('explicit blank clears comment but invalid/missing/overlong comments never mutate',async()=>{
 const s=store();await s.editProfileRecommendation({...input,action:'comment',recommendationComment:'  '});assert.equal(s.comments[0][2],null);
 for(const value of [undefined,123,'가'.repeat(81)]){
  const invalid=store();await assert.rejects(invalid.editProfileRecommendation({...input,action:'comment',recommendationComment:value}),/INVALID_RECOMMENDATION_COMMENT/);
  assert.equal(invalid.statements.length,0);
 }
});
test('ownership and current membership are checked under the same lock before writing',async()=>{
 for(const [options,error] of [[{owner:false},'RESULT_OWNER_MISMATCH'],[{member:false},'RECOMMENDATION_NOT_FOUND']]){
  const s=store(options);await assert.rejects(s.editProfileRecommendation({...input,action:'remove'}),new RegExp(error));
  assert.equal(s.comments.length,0);assert.ok(s.statements.every(x=>!/^\s*(delete|update)/.test(x.query)));
 }
});
test('deletion removes only the selected membership, not other works or stored comments/likes',async()=>{
 const s=store();await s.editProfileRecommendation({...input,action:'remove'});
 assert.equal(s.comments.length,0);assert.match(s.statements.at(-1).query,/delete from public.match_profile_recommendations\s+where profile_id=\?::uuid and canonical_webtoon_id=\?/);
 assert.deepEqual(s.statements.at(-1).values,['profile','work']);
 assert.equal(s.statements.filter(x=>/delete/.test(x.query)).length,1);
});
test('single-work API validates input, returns only current public items and refreshes pair taste for membership changes',async()=>{
 let body,edits=0,refreshes=0;
 const api=load('../../src/app/api/v1/results/[profilePublicId]/recommendations/[canonicalWebtoonId]/route.ts',{
  '@/features/match/server/requestBody':{readMatchJson:async()=>body},
  '@/features/match/server/apiResponse':{matchJson:(_r,b,init)=>({body:b,status:init?.status??200,headers:init?.headers})},
  '@/features/match/storage/anonymousIdentity.mjs':{isAnonymousId:id=>id==='valid-owner'},
  '@/features/match/server/recommendationEditStore':{editProfileRecommendation:async()=>{edits++;return {profileId:'private'};}},
  '@/features/match/server/webtoonCatalogStore':{getProfileRecommendations:async()=>[{canonicalWebtoonId:'retained'}]},
  '@/features/match/server/challengeStore':{refreshCompatibilityForProfile:async()=>{refreshes++;}},
  '@/features/match/server/apiErrors':{toMatchApiFailure:()=>({error:'FAILED',status:500})},
 });
 const context={params:Promise.resolve({profilePublicId:'public',canonicalWebtoonId:'work'})};
 for(body of [null,{}, {anonymousId:'invalid',recommendationComment:'x'}, {anonymousId:'valid-owner'}, {anonymousId:'valid-owner',recommendationComment:123}]){
  assert.equal((await api.PATCH({},context)).status,400);assert.equal((await api.POST({},context)).status,400);
 }
 assert.equal(edits,0);
 body={anonymousId:'valid-owner',recommendationComment:'수정'};
 assert.equal((await api.PATCH({},context)).status,200);assert.equal(refreshes,0);
 body={anonymousId:'valid-owner'};const deleted=await api.DELETE({},context);
 assert.equal(deleted.status,200);assert.equal(refreshes,1);assert.equal(deleted.headers['Cache-Control'],'private, no-store');
 assert.equal(deleted.body.items[0].canonicalWebtoonId,'retained');assert.equal(edits,2);
 body={anonymousId:'valid-owner',recommendationComment:null};const added=await api.POST({},context);
 assert.equal(added.status,200);assert.equal(refreshes,2);assert.equal(edits,3);
 assert.equal(added.headers['Cache-Control'],'private, no-store');
});

test('add locks owner and catalog, compacts gaps, appends one work and retains independent comments/likes',async()=>{
 const s=store({current:[{canonical_webtoon_id:'other',sort_order:10}]});
 await s.editProfileRecommendation({...input,action:'add',recommendationComment:'  좋아요  '});
 assert.deepEqual(s.comments,[['profile','work','좋아요']]);
 assert.match(s.statements[0].query,/for update of p/);
 assert.match(s.statements[2].query,/lock_recommendation_catalog/);
 assert.match(s.statements[3].query,/row_number\(\) over\(order by sort_order\)/);
 assert.match(s.statements.at(-1).query,/insert into public.match_profile_recommendations/);
 assert.deepEqual(s.statements.at(-1).values,['profile','work',2,'좋아요']);
 assert.doesNotMatch(s.statements.map(x=>x.query).join(''),/delete|match_recommendation_comment_likes/i);
});
test('add rejects foreign owners, duplicate/eleventh work, unavailable or restricted catalog entries before writes',async()=>{
 for(const [options,error] of [
  [{owner:false},'RESULT_OWNER_MISMATCH'],
  [{current:[{canonical_webtoon_id:'work',sort_order:1}]},'RECOMMENDATION_ALREADY_EXISTS'],
  [{current:Array.from({length:10},(_,i)=>({canonical_webtoon_id:'old-'+i,sort_order:i+1}))},'RECOMMENDATION_LIMIT_REACHED'],
  [{available:[]},'WEBTOON_NOT_AVAILABLE'],
  [{available:[{recommendation_registration_blocked:true}]},'RECOMMENDATION_AGE_VERIFICATION_REQUIRED'],
 ]) {
  const s=store(options);await assert.rejects(s.editProfileRecommendation({...input,action:'add',recommendationComment:null}),new RegExp(error));
  assert.equal(s.comments.length,0);assert.ok(s.statements.every(x=>!/^\s*(delete|update|insert|with)/.test(x.query)));
 }
 for(const value of [undefined,123,'가'.repeat(81)]) {
  const s=store();await assert.rejects(s.editProfileRecommendation({...input,action:'add',recommendationComment:value}),/INVALID_RECOMMENDATION_COMMENT/);assert.equal(s.statements.length,0);
 }
});
