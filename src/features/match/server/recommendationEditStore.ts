import 'server-only';
import { getMatchDatabase } from './database';
import { normalizeRecommendationComment } from '../config/recommendationPolicy.mjs';
import { writeRecommendationComment } from './recommendationCommentStore';

/** One-work mutation, serialized with the manager's profile lock. Never replace
 * the full list from an old result-page snapshot or delete independent likes. */
export async function editProfileRecommendation(input: {
  publicProfileId: string; anonymousId: string; canonicalWebtoonId: string;
  action: 'comment' | 'remove'; recommendationComment?: string | null;
}) {
  const comment = input.action === 'comment' ? normalizeRecommendationComment(input.recommendationComment) : undefined;
  if (input.action === 'comment' && comment === undefined) throw Error('INVALID_RECOMMENDATION_COMMENT');
  return getMatchDatabase().begin(async sql => {
    const profiles = await sql<{ profile_id: string }[]>`
      select p.profile_id::text from public.match_profiles p
      join public.match_taste_snapshots s on s.profile_id=p.profile_id
      where s.public_profile_id=${input.publicProfileId} and p.anonymous_id=${input.anonymousId}::uuid
      limit 1 for update of p
    `;
    const profileId = profiles[0]?.profile_id;
    if (!profileId) throw Error('RESULT_OWNER_MISMATCH');
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
