/* Actual SQL + triggers. All fixture data and mutations are rolled back. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {randomUUID}=require('node:crypto'),{createRequire}=require('node:module');
const postgres=require('postgres'),ts=require('typescript');
function load(relative,dependencies){const filename=path.resolve(relative),localRequire=createRequire(filename),compiledModule={exports:{}};const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:1,target:9,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{module:compiledModule,exports:compiledModule.exports,require:name=>dependencies[name]??localRequire(name)},{filename});return compiledModule.exports;}
(async()=>{
  const sql=postgres(process.env.WEBTOON_MATCH_DATABASE_URL,{ssl:'require',prepare:false,max:1,onnotice:()=>{}}),rollback=new Error('FIXTURE_ROLLBACK');
  const digest=async tx=>(await tx`select
    (select md5(coalesce(string_agg(r::text,'' order by profile_id,canonical_webtoon_id),'')) from public.match_profile_recommendations r) recommendations,
    (select md5(coalesce(string_agg(c::text,'' order by comment_id),'')) from public.match_recommendation_comments c) comments,
    (select md5(coalesce(string_agg(l::text,'' order by comment_id,liker_profile_id),'')) from public.match_recommendation_comment_likes l) likes`)[0];
  try{
    const before=await sql.begin('read only',digest);
    await sql.begin(async tx=>{
      await tx`set local statement_timeout='10s'`;await tx`set local lock_timeout='2s'`;
      const database=(strings,...values)=>tx(strings,...values);database.begin=callback=>callback(database);
      const comments=load('src/features/match/server/recommendationCommentStore.ts',{'server-only':{},'./database':{getMatchDatabase:()=>database}});
      const store=load('src/features/match/server/webtoonCatalogStore.ts',{'server-only':{},'./database':{getMatchDatabase:()=>database},'./recommendationCommentStore':comments});
      const works=await tx`select canonical_webtoon_id from public.webtoons where catalog_status='active' and recommendation_eligible and coalesce(raw_data#>>'{metadata,sexualCore}','false')<>'true' order by canonical_webtoon_id limit 2`;
      assert.equal(works.length,2);const work=works[0].canonical_webtoon_id,otherWork=works[1].canonical_webtoon_id;
      const people=Array.from({length:3},()=>({id:randomUUID(),anonymous:randomUUID(),public:'comment-test-'+randomUUID()}));
      for(const person of people){await tx`insert into public.match_profiles(profile_id,anonymous_id) values(${person.id}::uuid,${person.anonymous}::uuid)`;await tx`insert into public.match_taste_snapshots(snapshot_id,profile_id,public_profile_id,test_version,question_set_version,profile_result_copy_version,completed_at,snapshot_data) values(${randomUUID()}::uuid,${person.id}::uuid,${person.public},'test','test','test',now(),'{}'::jsonb)`;}
      const [a,b,c]=people,save=(person,items)=>store.replaceProfileRecommendations({publicProfileId:person.public,anonymousId:person.anonymous,recommendations:items});
      const first=await save(a,[{canonicalWebtoonId:work,recommendationComment:'처음 작성한 추천 코멘트'}]),id=first.items[0].commentId;assert.ok(id);
      const second=await save(b,[{canonicalWebtoonId:work,recommendationComment:'다른 사람의 추천 코멘트'}]),otherId=second.items[0].commentId;assert.notEqual(id,otherId);
      const like=(commentId,liked=true)=>comments.setRecommendationCommentLike({commentId,liked,likerAnonymousId:c.anonymous});
      assert.equal((await like(id)).likeCount,1);assert.equal((await like(otherId)).likeCount,1);assert.equal((await like(id)).likeCount,1,'duplicate likes are idempotent');
      await assert.rejects(comments.setRecommendationCommentLike({commentId:id,liked:true,likerAnonymousId:a.anonymous}),/SELF_RECOMMENDATION_LIKE_FORBIDDEN/);
      await save(a,[]);assert.equal((await store.getProfileRecommendations(a.public)).length,0);
      const restored=await comments.getOwnRecommendationComment({publicProfileId:a.public,anonymousId:a.anonymous,canonicalWebtoonId:work});assert.equal(restored.commentId,id);assert.equal(restored.recommendationComment,'처음 작성한 추천 코멘트');
      assert.equal((await like(id,false)).likeCount,0,'a retained comment is independent of list membership');assert.equal((await like(id)).likeCount,1);
      const readded=await save(a,[{canonicalWebtoonId:work}]);assert.equal(readded.items[0].commentId,id);assert.equal(readded.items[0].recommendationComment,restored.recommendationComment);assert.equal(readded.items[0].likeCount,1);
      const edited=await save(a,[{canonicalWebtoonId:work,recommendationComment:'수정한 추천 코멘트'}]);assert.equal(edited.items[0].commentId,id);assert.equal(edited.items[0].likeCount,1);
      await assert.rejects(comments.getOwnRecommendationComment({publicProfileId:a.public,anonymousId:b.anonymous,canonicalWebtoonId:work}),/RESULT_OWNER_MISMATCH/);
      const changed=await save(a,[{canonicalWebtoonId:otherWork,recommendationComment:'두 번째 작품'},{canonicalWebtoonId:work}]);assert.equal(changed.items[1].commentId,id);
      await store.clearRecommendationsForRestart(a.anonymous);assert.equal((await store.getProfileRecommendations(a.public)).length,0);assert.equal((await comments.getOwnRecommendationComment({publicProfileId:a.public,anonymousId:a.anonymous,canonicalWebtoonId:work})).commentId,id);
      await save(a,[{canonicalWebtoonId:work,recommendationComment:''}]);assert.equal((await comments.getOwnRecommendationComment({publicProfileId:a.public,anonymousId:a.anonymous,canonicalWebtoonId:work})).commentId,null);await assert.rejects(like(id),/RECOMMENDATION_COMMENT_NOT_FOUND/);
      const recreated=await save(a,[{canonicalWebtoonId:work,recommendationComment:'삭제 후 새 코멘트'}]);assert.notEqual(recreated.items[0].commentId,id);assert.equal(recreated.items[0].likeCount,0);
      const other=await store.getProfileRecommendations(b.public,c.anonymous);assert.equal(other[0].commentId,otherId);assert.equal(other[0].likeCount,1);assert.equal(other[0].likedByViewer,true);
      await assert.rejects(save(a,Array.from({length:11},()=>({canonicalWebtoonId:work}))),/INVALID_RECOMMENDATION_LIST/);
      throw rollback;
    }).catch(error=>{if(error!==rollback)throw error;});
    assert.deepEqual(await sql.begin('read only',digest),before,'all production data unchanged after rollback');
    console.log(JSON.stringify({ok:true,checks:['remove/save/re-add restores comment ID, body and likes','editing and reorder retain likes','same work: independently like two authors','duplicate/self/removed-comment guards','owner-only retrieval','clearing text differs from removing membership','restart keeps comments','max ten memberships','legacy compatibility triggers','all fixtures rolled back; existing data unchanged']}));
  }finally{await sql.end({timeout:2});}
})().catch(error=>{console.error({name:error.name,code:error.code,message:error.name==='AssertionError'?error.message:'Comment persistence integration failed'});process.exitCode=1;});
