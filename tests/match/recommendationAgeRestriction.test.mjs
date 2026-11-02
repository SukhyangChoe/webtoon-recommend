import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {isRecommendationRegistrationBlocked} from '../../src/features/match/config/recommendationPolicy.mjs';
import {isPublicCatalogWork} from '../../src/features/match/config/catalogAgePolicy.mjs';

const require=createRequire(import.meta.url),ts=require('typescript');
function load(relative,dependencies){
  const filename=new URL(relative,import.meta.url),localRequire=createRequire(filename),compiledModule={exports:{}};
  const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(source,{module:compiledModule,exports:compiledModule.exports,URL,Error,SyntaxError,require:name=>dependencies[name]??localRequire(name)},{filename:filename.pathname});
  return compiledModule.exports;
}
function harness(){
  const catalog=new Map([
    ['safe',{canonical_webtoon_id:'safe',title:'일반 작품',metadata:{sexualCore:false,isAdult:false,ageRating:'전체이용가'}}],
    ['restricted',{canonical_webtoon_id:'restricted',title:'등록 제한 작품',metadata:{isAdult:true,sexualCore:false}}],
    ['sexual-only',{canonical_webtoon_id:'sexual-only',title:'성적 콘텐츠 분류만 있는 작품',metadata:{isAdult:false,sexualCore:true}}],
    ['missing-flag',{canonical_webtoon_id:'missing-flag',title:'등급 미확인',metadata:{}}],
    ['revision',{canonical_webtoon_id:'revision',title:'15세 개정판',metadata:{isAdult:false,ageRating:'15세 이용가'}}],
    ['adult',{canonical_webtoon_id:'adult',title:'성인 작품',metadata:{isAdult:true,sexualCore:false}}],
    ['conflict',{canonical_webtoon_id:'conflict',title:'등급 충돌',metadata:{isAdult:false,ageRating:'19세'}}],
  ]);
  const saved=new Map([['safe',{canonical_webtoon_id:'safe',recommendation_comment:'기존 이유',sort_order:1}]]),statements=[],writes=[];
  let owner=true;
  const row=work=>({...work,platform:'네이버',main_genre:'murim',official_url:null,recommendation_registration_blocked:!isPublicCatalogWork({metadata:work.metadata})});
  const database=async(strings,...values)=>{
    const query=strings.join('?').replace(/\s+/g,' ').trim();statements.push({query,values});
    if(query.includes('from public.match_profiles profiles'))return owner?[{profile_id:'profile'}]:[];
    if(query.includes('from public.webtoons')||query.includes('from public.lock_recommendation_catalog')){
      if(query.includes('from public.lock_recommendation_catalog')){
        return values[0].map(id=>catalog.get(id)).filter(Boolean).map(row);
      }
      assert.match(query,/public\.webtoon_is_public_safe\(raw_data\)/,'restriction is read from current DB metadata');
      assert.match(query,/and public\.webtoon_is_public_safe\(raw_data\)/);
      return [...catalog.values()].filter(work=>isPublicCatalogWork({metadata:work.metadata})).map(row);
    }
    if(query.startsWith('select canonical_webtoon_id, body as recommendation_comment'))return [...saved.values()];
    if(query.startsWith('delete from public.match_profile_recommendations')){
      writes.push(query);for(const id of saved.keys())if(!values[1]?.includes(id))saved.delete(id);return [];
    }
    if(query.startsWith('insert into public.match_profile_recommendations')){
      writes.push(query);saved.set(values[1],{canonical_webtoon_id:values[1],sort_order:values[2],recommendation_comment:values[3]});return [];
    }
    if(query.includes('from public.match_profile_recommendations recommendations'))return [...saved.values()].sort((a,b)=>a.sort_order-b.sort_order).map(item=>({...row(catalog.get(item.canonical_webtoon_id)),...item,like_count:0,liked_by_viewer:false}));
    throw new Error('Unexpected test SQL: '+query);
  };
  database.begin=callback=>callback(database);
  const store=load('../../src/features/match/server/webtoonCatalogStore.ts',{'server-only':{},'./database':{getMatchDatabase:()=>database},'./recommendationCommentStore':{writeRecommendationComment:async()=>{}}});
  const save=recommendations=>store.replaceProfileRecommendations({publicProfileId:'result',anonymousId:'owner',recommendations});
  return {store,save,catalog,saved,writes,statements,setOwner:value=>{owner=value;}};
}

test('both searches restrict isAdult=true only; unknown, sexualCore and rating text do not block',async()=>{
  const h=harness();
  const recommended=await h.store.searchWebtoons('작품');
  assert.deepEqual(Array.from(recommended,item=>item.canonicalWebtoonId),['safe','sexual-only','missing-flag','revision','conflict']);
  const catalog=await h.store.searchCatalogWebtoons('작품');
  assert.deepEqual(Array.from(catalog.items,item=>item.canonicalWebtoonId),['safe','sexual-only','missing-flag','revision','conflict']);
  assert.equal(h.writes.length,0);
});

test('restricted work IDs, mixed lists and forged client flags are rejected before any existing recommendations change',async()=>{
  for(const recommendations of [
    [{canonicalWebtoonId:'restricted'}],
    [{canonicalWebtoonId:'adult'}],
    [{canonicalWebtoonId:'safe'},{canonicalWebtoonId:'restricted',recommendationRegistrationBlocked:false,isAdult:false}],
  ]){
    const h=harness();await assert.rejects(h.save(recommendations),/RECOMMENDATION_AGE_VERIFICATION_REQUIRED/);
    assert.equal(h.writes.length,0);assert.equal(h.saved.size,1);assert.equal(h.saved.get('safe').recommendation_comment,'기존 이유');
  }
});

test('save validation reads fresh flags even when a safe search result was cached before a catalog update',async()=>{
  const h=harness();await h.store.searchWebtoons('작품');
  h.catalog.get('safe').metadata.isAdult=true;
  await assert.rejects(h.save([{canonicalWebtoonId:'safe'}]),/RECOMMENDATION_AGE_VERIFICATION_REQUIRED/);
  assert.equal(h.writes.length,0);
});

test('verified nonadult registration, removal of restricted items and empty saves still work',async()=>{
  const h=harness();h.saved.set('restricted',{canonical_webtoon_id:'restricted',sort_order:2,recommendation_comment:'기존 등록'});
  const result=await h.save([{canonicalWebtoonId:'revision',recommendationComment:'새 이유'},{canonicalWebtoonId:'safe'}]);
  assert.deepEqual(Array.from(result.items,item=>item.canonicalWebtoonId),['revision','safe']);
  assert.equal(h.saved.get('safe').recommendation_comment,'기존 이유');assert.equal(h.saved.has('restricted'),false);
  assert.ok(result.items.every(item=>!item.recommendationRegistrationBlocked));
  await h.save([]);assert.equal(h.saved.size,0);
});

test('saving accepts missing isAdult, sexualCore=true with isAdult=false, and conflicting rating text',async()=>{
  const h=harness();
  const result=await h.save([{canonicalWebtoonId:'sexual-only'},{canonicalWebtoonId:'missing-flag'},{canonicalWebtoonId:'conflict'}]);
  assert.deepEqual(Array.from(result.items,item=>item.canonicalWebtoonId),['sexual-only','missing-flag','conflict']);
  assert.ok(result.items.every(item=>!item.recommendationRegistrationBlocked));
});

test('owner and unavailable-work validation are preserved; only the explicit registration flag is a UI restriction',async()=>{
  const h=harness();h.setOwner(false);await assert.rejects(h.save([{canonicalWebtoonId:'restricted'}]),/RESULT_OWNER_MISMATCH/);assert.equal(h.writes.length,0);
  h.setOwner(true);await assert.rejects(h.save([{canonicalWebtoonId:'unknown'}]),/WEBTOON_NOT_AVAILABLE/);assert.equal(h.writes.length,0);
  for(const value of [null,undefined,{}, {sexualCore:true},{recommendationRegistrationBlocked:false}])assert.equal(isRecommendationRegistrationBlocked(value),false);
  assert.equal(isRecommendationRegistrationBlocked({recommendationRegistrationBlocked:true}),true);
});

test('registration denial is a clear 403 API response and skips compatibility refreshes and result reads',async()=>{
  let refreshed=0;
  const {toMatchApiFailure}=load('../../src/features/match/server/apiErrors.ts',{'server-only':{},'./database':{MatchDatabaseNotConfiguredError:class extends Error{}}});
  const route=load('../../src/app/api/v1/results/[profilePublicId]/recommendations/route.ts',{
    '@/features/match/server/apiResponse':{matchJson:(_request,body,options)=>Response.json(body,options)},
    '@/features/match/server/requestBody':{readMatchJson:request=>request.json()},
    'next/server':{NextResponse:{json:(body,options)=>Response.json(body,options)}},
    '@/features/match/storage/anonymousIdentity.mjs':require('../../src/features/match/storage/anonymousIdentity.mjs'),
    '@/features/match/server/webtoonCatalogStore':{replaceProfileRecommendations:async()=>{throw new Error('RECOMMENDATION_AGE_VERIFICATION_REQUIRED');}},
    '@/features/match/server/challengeStore':{refreshCompatibilityForProfile:async()=>{refreshed++;}},
    '@/features/match/server/resultStore':{getPublicTasteResult:async()=>{throw new Error('must not load');}},
    '@/features/match/server/apiErrors':{toMatchApiFailure},
  });
  const response=await route.PUT(new Request('http://localhost/api/v1/results/result/recommendations',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({anonymousId:'11111111-1111-4111-8111-111111111111',canonicalWebtoonIds:['restricted']})}),{params:Promise.resolve({profilePublicId:'result'})});
  assert.equal(response.status,403);assert.deepEqual(await response.json(),{error:'RECOMMENDATION_AGE_VERIFICATION_REQUIRED'});assert.equal(refreshed,0);
});
