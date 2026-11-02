/* Real catalog + real API code, but every DB statement runs inside READ ONLY. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const postgres=require('postgres'),ts=require('typescript');
const {createRequire}=require('node:module');
function load(relative,dependencies){
  const filename=path.resolve(relative),localRequire=createRequire(filename),compiledModule={exports:{}};
  const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{module:compiledModule,exports:compiledModule.exports,URL,Error,SyntaxError,require:name=>dependencies[name]??localRequire(name)},{filename});return compiledModule.exports;
}
(async()=>{
  const connection=postgres(process.env.WEBTOON_MATCH_RUNTIME_DATABASE_URL||process.env.WEBTOON_MATCH_DATABASE_URL,{max:1,prepare:false,ssl:'require',onnotice:()=>{}});
  try{
    await connection.begin('read only',async tx=>{
      assert.equal((await tx`select current_setting('transaction_read_only') as value`)[0].value,'on');
      // A read-only transaction cannot acquire production row locks. Remove only
      // lock clauses; keep the real queries/values and prohibit every DB write.
      let writes=0;
      const readDatabase=(strings,...values)=>{
        const query=strings.join('?').trim();
        if(!/^select\b/i.test(query)){writes++;throw new Error('TEST_WRITE_FORBIDDEN');}
        if(query.includes('from public.lock_recommendation_catalog'))return tx`select canonical_webtoon_id,title,platform,official_url,main_genre,not public.webtoon_is_public_safe(raw_data) as recommendation_registration_blocked from public.webtoons where canonical_webtoon_id=any(${values[0]}::text[]) and catalog_status='active' and recommendation_eligible`;
        const parts=strings.map(part=>part.replace(/for update of profiles\b/gi,'').replace(/for share\b/gi,''));
        Object.defineProperty(parts,'raw',{value:[...parts]});return tx(parts,...values);
      };
      readDatabase.begin=callback=>callback(readDatabase);
      const store=load('src/features/match/server/webtoonCatalogStore.ts',{'server-only':{},'./database':{getMatchDatabase:()=>readDatabase},'./recommendationCommentStore':{writeRecommendationComment:async()=>{throw new Error('TEST_WRITE_FORBIDDEN');}}});
      const restricted=await tx`
        select canonical_webtoon_id,title from public.webtoons
        where catalog_status='active' and recommendation_eligible=true
          and raw_data#>>'{metadata,isAdult}'='true'
          and char_length(title)<90
        order by canonical_webtoon_id limit 2
      `;
      assert.equal(restricted.length,2,'existing restricted catalog works are available');
      const owners=await tx`
        select p.anonymous_id::text,s.public_profile_id from public.match_profiles p
        join public.match_taste_snapshots s on s.profile_id=p.profile_id
        where s.public_profile_id='xys7o3_7JlgZl91b' limit 1
      `;
      assert.equal(owners.length,1,'existing test profile available; identity is never printed');
      const before=await tx`select md5(coalesce(string_agg(r::text,'' order by profile_id,canonical_webtoon_id),'')) digest from public.match_profile_recommendations r`;
      const {toMatchApiFailure}=load('src/features/match/server/apiErrors.ts',{'server-only':{},'./database':{MatchDatabaseNotConfiguredError:class extends Error{}}});
      let refreshes=0;
      const api=load('src/app/api/v1/results/[profilePublicId]/recommendations/route.ts',{
        '@/features/match/server/apiResponse':{matchJson:(_request,body,options)=>Response.json(body,options)},
        '@/features/match/server/requestBody':{readMatchJson:request=>request.json()},
        'next/server':{NextResponse:{json:(body,options)=>Response.json(body,options)}},
        '@/features/match/storage/anonymousIdentity.mjs':require('../../src/features/match/storage/anonymousIdentity.mjs'),
        '@/features/match/server/webtoonCatalogStore':store,
        '@/features/match/server/challengeStore':{refreshCompatibilityForProfile:async()=>{refreshes++;throw new Error('TEST_WRITE_FORBIDDEN');}},
        '@/features/match/server/resultStore':{getPublicTasteResult:async()=>{throw new Error('TEST_WRITE_FORBIDDEN');}},
        '@/features/match/server/apiErrors':{toMatchApiFailure},
      });
      for(const work of restricted){
        const matches=await store.searchWebtoons(work.title);
        assert.ok(matches.every(item=>!item.recommendationRegistrationBlocked));assert.ok(!matches.some(item=>item.canonicalWebtoonId===work.canonical_webtoon_id));
        const catalog=await store.searchCatalogWebtoons(work.title);
        assert.ok(!catalog.items.some(item=>item.canonicalWebtoonId===work.canonical_webtoon_id),'general search also excludes isAdult=true');
        const response=await api.PUT(new Request('http://localhost/api/v1/results/test/recommendations',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({anonymousId:owners[0].anonymous_id,recommendations:[{canonicalWebtoonId:work.canonical_webtoon_id,recommendationRegistrationBlocked:false}]})}),{params:Promise.resolve({profilePublicId:owners[0].public_profile_id})});
        assert.equal(response.status,403);assert.deepEqual(await response.json(),{error:'RECOMMENDATION_AGE_VERIFICATION_REQUIRED'});
      }
      const after=await tx`select md5(coalesce(string_agg(r::text,'' order by profile_id,canonical_webtoon_id),'')) digest from public.match_profile_recommendations r`;
      assert.equal(before[0].digest,after[0].digest);assert.equal(writes,0);assert.equal(refreshes,0);
      console.log(JSON.stringify({ok:true,restrictedWorksChecked:restricted.length,checks:['real current isAdult metadata','both searches exclude adult works','actual PUT code rejects forged flags with 403','rejection before mutations or refresh','READ ONLY transaction','existing recommendations unchanged']}));
    });
  }finally{await connection.end({timeout:2});}
})().catch(error=>{console.error({name:error.name,code:error.code,message:error.name==='AssertionError'?error.message:'Read-only recommendation restriction check failed'});process.exitCode=1;});
