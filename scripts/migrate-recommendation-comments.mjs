// Scoped, additive migration. Default is a fully rolled-back dry run.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import postgres from 'postgres';
const apply=process.argv.includes('--apply');
const source=fs.readFileSync(new URL('../supabase/migrations/202611010001_independent_recommendation_comments.sql',import.meta.url),'utf8').replace(/^begin;\s*/,'').replace(/\s*commit;\s*$/,'');
const sql=postgres(process.env.WEBTOON_MATCH_DATABASE_URL,{ssl:'require',max:1,prepare:false,connect_timeout:10,onnotice:()=>{}});
const rollback=new Error('DRY_RUN_ROLLBACK');
let report;
try{
  await sql.begin(async tx=>{
    await tx`set local lock_timeout='5s'`;await tx`set local statement_timeout='30s'`;
    const existing=await tx`select to_regclass('public.match_recommendation_comments') as comments,to_regclass('public.match_recommendation_comment_likes') as likes`;
    if(existing[0].comments||existing[0].likes){assert.ok(existing[0].comments&&existing[0].likes,'partial migration needs manual inspection');report={mode:'already-applied'};return;}
    const before=await tx`select
      (select md5(coalesce(string_agg(r::text,'' order by profile_id,canonical_webtoon_id),'')) from public.match_profile_recommendations r) as recommendations,
      (select md5(coalesce(string_agg(l::text,'' order by recommender_profile_id,canonical_webtoon_id,liker_profile_id),'')) from public.match_profile_recommendation_likes l) as likes`;
    await tx.unsafe(source);
    const missing=await tx`select count(*)::int count from public.match_profile_recommendations r
      left join public.match_recommendation_comments c on c.author_profile_id=r.profile_id and c.canonical_webtoon_id=r.canonical_webtoon_id and c.deleted_at is null
      where r.recommendation_comment is not null and c.body is distinct from r.recommendation_comment`;
    assert.equal(missing[0].count,0,'all current comments copied exactly');
    const missingLikes=await tx`select count(*)::int count from public.match_profile_recommendation_likes l
      join public.match_recommendation_comments c on c.author_profile_id=l.recommender_profile_id and c.canonical_webtoon_id=l.canonical_webtoon_id and c.deleted_at is null
      left join public.match_recommendation_comment_likes n on n.comment_id=c.comment_id and n.liker_profile_id=l.liker_profile_id where n.comment_id is null`;
    assert.equal(missingLikes[0].count,0,'all likes on existing comments copied');
    const after=await tx`select
      (select md5(coalesce(string_agg(r::text,'' order by profile_id,canonical_webtoon_id),'')) from public.match_profile_recommendations r) as recommendations,
      (select md5(coalesce(string_agg(l::text,'' order by recommender_profile_id,canonical_webtoon_id,liker_profile_id),'')) from public.match_profile_recommendation_likes l) as likes`;
    assert.deepEqual(after[0],before[0],'legacy rows remain byte-for-byte unchanged');
    const counts=await tx`select (select count(*)::int from public.match_recommendation_comments) comments,(select count(*)::int from public.match_recommendation_comment_likes) likes`;
    report={mode:apply?'applied':'dry-run-rolled-back',...counts[0],legacyDataUnchanged:true};
    if(!apply)throw rollback;
  }).catch(error=>{if(error!==rollback)throw error;});
  console.log(JSON.stringify(report));
}catch(error){console.error({error:'COMMENT_MIGRATION_FAILED',code:error.code??null});process.exitCode=1;}
finally{await sql.end({timeout:2});}
