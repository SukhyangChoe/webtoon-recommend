import 'server-only';
import type { TransactionSql } from 'postgres';
import { getMatchDatabase } from './database';

export async function getOwnRecommendationComment(input: { publicProfileId: string; anonymousId: string; canonicalWebtoonId: string }) {
  const sql=getMatchDatabase();
  const profiles=await sql<{profile_id:string}[]>`
    select p.profile_id::text from public.match_profiles p
    join public.match_taste_snapshots s on s.profile_id=p.profile_id
    where s.public_profile_id=${input.publicProfileId} and p.anonymous_id=${input.anonymousId}::uuid limit 1
  `;
  if(!profiles[0])throw new Error('RESULT_OWNER_MISMATCH');
  const rows=await sql<{comment_id:string;body:string}[]>`
    select comment_id::text,body from public.match_recommendation_comments
    where author_profile_id=${profiles[0].profile_id}::uuid and canonical_webtoon_id=${input.canonicalWebtoonId} and deleted_at is null
  `;
  return {commentId:rows[0]?.comment_id??null,recommendationComment:rows[0]?.body??null};
}

/** Only an explicit blank clears a comment. Membership deletion never calls this. */
export async function writeRecommendationComment(sql: TransactionSql, authorId: string, workId: string, body: string | null | undefined) {
  if(body===undefined)return;
  if(body===null){
    await sql`update public.match_recommendation_comments set deleted_at=now(),updated_at=now()
      where author_profile_id=${authorId}::uuid and canonical_webtoon_id=${workId} and deleted_at is null`;
    return;
  }
  await sql`insert into public.match_recommendation_comments(author_profile_id,canonical_webtoon_id,body)
    values(${authorId}::uuid,${workId},${body})
    on conflict(author_profile_id,canonical_webtoon_id) where deleted_at is null do update
      set body=excluded.body,updated_at=now() where match_recommendation_comments.body is distinct from excluded.body`;
}

export async function setRecommendationCommentLike(input: {commentId:string;likerAnonymousId:string;liked:boolean}) {
  return getMatchDatabase().begin(async sql=>{
    const rows=await sql<{comment_id:string;author_profile_id:string;canonical_webtoon_id:string}[]>`
      select c.comment_id::text,c.author_profile_id::text,c.canonical_webtoon_id
      from public.match_recommendation_comments c join public.webtoons w using(canonical_webtoon_id)
      where c.comment_id=${input.commentId}::uuid and c.deleted_at is null and w.catalog_status='active' and public.webtoon_is_public_safe(w.raw_data) for update of c
    `;
    const comment=rows[0];if(!comment)throw new Error('RECOMMENDATION_COMMENT_NOT_FOUND');
    const profiles=await sql<{profile_id:string}[]>`select profile_id::text from public.match_profiles where anonymous_id=${input.likerAnonymousId}::uuid limit 1`;
    const liker=profiles[0]?.profile_id;if(!liker)throw new Error('LIKE_PROFILE_REQUIRED');
    if(liker===comment.author_profile_id)throw new Error('SELF_RECOMMENDATION_LIKE_FORBIDDEN');
    if(input.liked){
      await sql`insert into public.match_recommendation_comment_likes(comment_id,author_profile_id,liker_profile_id)
        values(${comment.comment_id}::uuid,${comment.author_profile_id}::uuid,${liker}::uuid) on conflict do nothing`;
      // Compatibility mirror only while this work is currently in the list.
      await sql`insert into public.match_profile_recommendation_likes(recommender_profile_id,canonical_webtoon_id,liker_profile_id)
        select ${comment.author_profile_id}::uuid,${comment.canonical_webtoon_id},${liker}::uuid
        where exists(select 1 from public.match_profile_recommendations where profile_id=${comment.author_profile_id}::uuid and canonical_webtoon_id=${comment.canonical_webtoon_id})
        on conflict do nothing`;
    }else{
      await sql`delete from public.match_recommendation_comment_likes where comment_id=${comment.comment_id}::uuid and liker_profile_id=${liker}::uuid`;
      await sql`delete from public.match_profile_recommendation_likes where recommender_profile_id=${comment.author_profile_id}::uuid and canonical_webtoon_id=${comment.canonical_webtoon_id} and liker_profile_id=${liker}::uuid`;
    }
    const counts=await sql<{like_count:number;liked_by_viewer:boolean}[]>`select count(*)::int as like_count,coalesce(bool_or(liker_profile_id=${liker}::uuid),false) as liked_by_viewer
      from public.match_recommendation_comment_likes where comment_id=${comment.comment_id}::uuid`;
    return {commentId:comment.comment_id,likeCount:Number(counts[0]?.like_count)||0,likedByViewer:Boolean(counts[0]?.liked_by_viewer)};
  });
}
