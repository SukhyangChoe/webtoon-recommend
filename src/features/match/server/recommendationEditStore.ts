import 'server-only';
import { getMatchDatabase } from './database';
import { normalizeRecommendationComment } from '../config/recommendationPolicy.mjs';
import { writeRecommendationComment } from './recommendationCommentStore';

/** One-work mutation, serialized with the manager's profile lock. Never replace
 * the full list from an old result-page snapshot or delete independent likes. */
export async function editProfileRecommendation(input: {
  publicProfileId: string; anonymousId: string; canonicalWebtoonId: string;
  action: 'add' | 'comment' | 'remove'; recommendationComment?: string | null;
}) {
  const comment = input.action !== 'remove' ? normalizeRecommendationComment(input.recommendationComment) : undefined;
  if (input.action !== 'remove' && comment === undefined) throw Error('INVALID_RECOMMENDATION_COMMENT');
  return getMatchDatabase().begin(async sql => {
    const profiles = await sql<{ profile_id: string }[]>`
      select p.profile_id::text from public.match_profiles p
      join public.match_taste_snapshots s on s.profile_id=p.profile_id
      where s.public_profile_id=${input.publicProfileId} and p.anonymous_id=${input.anonymousId}::uuid
      limit 1 for update of p
    `;
    const profileId = profiles[0]?.profile_id;
    if (!profileId) throw Error('RESULT_OWNER_MISMATCH');
    if (input.action === 'add') {
      const current = await sql<{ canonical_webtoon_id: string; sort_order: number }[]>`
        select canonical_webtoon_id,sort_order from public.match_profile_recommendations
        where profile_id=${profileId}::uuid order by sort_order
      `;
      if (current.some(item => item.canonical_webtoon_id === input.canonicalWebtoonId)) throw Error('RECOMMENDATION_ALREADY_EXISTS');
      if (current.length >= 10) throw Error('RECOMMENDATION_LIMIT_REACHED');
      const available = await sql<{ recommendation_registration_blocked: boolean }[]>`
        select * from public.lock_recommendation_catalog(${[input.canonicalWebtoonId]}::text[])
      `;
      if (available.length !== 1) throw Error('WEBTOON_NOT_AVAILABLE');
      if (available[0].recommendation_registration_blocked) throw Error('RECOMMENDATION_AGE_VERIFICATION_REQUIRED');
      // Compact holes left by deletions, preserving relative order. The unique
      // profile/sort constraint is deferred; every position stays within 1–10.
      await sql`
        with positions as (
          select canonical_webtoon_id,row_number() over(order by sort_order) as position
          from public.match_profile_recommendations where profile_id=${profileId}::uuid
        ) update public.match_profile_recommendations r set sort_order=positions.position
          from positions where r.profile_id=${profileId}::uuid
          and r.canonical_webtoon_id=positions.canonical_webtoon_id and r.sort_order<>positions.position
      `;
      await writeRecommendationComment(sql, profileId, input.canonicalWebtoonId, comment);
      await sql`insert into public.match_profile_recommendations(profile_id,canonical_webtoon_id,sort_order,recommendation_comment)
        values(${profileId}::uuid,${input.canonicalWebtoonId},${current.length + 1},${comment ?? null})`;
      return { profileId };
    }
    const members = await sql<{ canonical_webtoon_id: string }[]>`
      select canonical_webtoon_id from public.match_profile_recommendations
      where profile_id=${profileId}::uuid and canonical_webtoon_id=${input.canonicalWebtoonId}
    `;
    if (!members.length) throw Error('RECOMMENDATION_NOT_FOUND');
    if (input.action === 'remove') {
      await sql`delete from public.match_profile_recommendations
        where profile_id=${profileId}::uuid and canonical_webtoon_id=${input.canonicalWebtoonId}`;
    } else {
      await writeRecommendationComment(sql, profileId, input.canonicalWebtoonId, comment);
      await sql`update public.match_profile_recommendations set recommendation_comment=${comment ?? null},updated_at=now()
        where profile_id=${profileId}::uuid and canonical_webtoon_id=${input.canonicalWebtoonId}`;
    }
    return { profileId };
  });
}
