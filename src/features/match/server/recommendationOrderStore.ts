import 'server-only';
import { getMatchDatabase } from './database';

/** Reorder current membership only. Never add/remove works or rewrite comments. */
export async function reorderProfileRecommendations(input:{publicProfileId:string;anonymousId:string;canonicalWebtoonIds:string[]}) {
  const ids=input.canonicalWebtoonIds;
  if(!Array.isArray(ids)||ids.length>10||ids.some(id=>typeof id!=='string'||!/^[-\w]{1,100}$/.test(id))||new Set(ids).size!==ids.length)throw Error('INVALID_RECOMMENDATION_LIST');
  return getMatchDatabase().begin(async sql=>{
    const [profile]=await sql<{profile_id:string}[]>`
      select p.profile_id::text from public.match_profiles p join public.match_taste_snapshots s on s.profile_id=p.profile_id
      where s.public_profile_id=${input.publicProfileId} and p.anonymous_id=${input.anonymousId}::uuid
      limit 1 for update of p
    `;
    if(!profile)throw Error('RESULT_OWNER_MISMATCH');
    const current=await sql<{canonical_webtoon_id:string}[]>`select canonical_webtoon_id from public.match_profile_recommendations where profile_id=${profile.profile_id}::uuid order by sort_order`;
    if(current.length!==ids.length||current.some(item=>!ids.includes(item.canonical_webtoon_id)))throw Error('RECOMMENDATION_ORDER_CHANGED');
    if(current.some((item,index)=>item.canonical_webtoon_id!==ids[index]))await sql`
      update public.match_profile_recommendations r set sort_order=desired.position::integer
      from unnest(${ids}::text[]) with ordinality as desired(canonical_webtoon_id,position)
      where r.profile_id=${profile.profile_id}::uuid and r.canonical_webtoon_id=desired.canonical_webtoon_id
    `;
    return {profileId:profile.profile_id};
  });
}
