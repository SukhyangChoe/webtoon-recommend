import { readMatchJson } from '@/features/match/server/requestBody';
import { matchJson } from '@/features/match/server/apiResponse';
import { isAnonymousId } from '@/features/match/storage/anonymousIdentity.mjs';
import { editProfileRecommendation } from '@/features/match/server/recommendationEditStore';
import { getProfileRecommendations } from '@/features/match/server/webtoonCatalogStore';
import { refreshCompatibilityForProfile } from '@/features/match/server/challengeStore';
import { toMatchApiFailure } from '@/features/match/server/apiErrors';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ profilePublicId: string; canonicalWebtoonId: string }> };
async function mutate(request: Request, context: Context, action: 'comment' | 'remove') {
  try {
    const { profilePublicId, canonicalWebtoonId } = await context.params;
    const body = await readMatchJson(request) as { anonymousId?: string; recommendationComment?: string | null };
    if (!body || !body.anonymousId || !isAnonymousId(body.anonymousId) || !/^[\w-]{1,100}$/.test(canonicalWebtoonId)
      || action === 'comment' && typeof body.recommendationComment !== 'string' && body.recommendationComment !== null) {
      return matchJson(request, { error: 'INVALID_REQUEST_BODY' }, { status: 400 });
    }
    const changed = await editProfileRecommendation({ publicProfileId: profilePublicId, anonymousId: body.anonymousId,
      canonicalWebtoonId, action, recommendationComment: body.recommendationComment });
    if (action === 'remove') await refreshCompatibilityForProfile(changed.profileId);
    return matchJson(request, { items: await getProfileRecommendations(profilePublicId, body.anonymousId) },
      { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const failure = toMatchApiFailure(error, 'RECOMMENDATIONS_SAVE_FAILED');
    return matchJson(request, { error: failure.error }, { status: failure.status });
  }
}
export const PATCH = (request: Request, context: Context) => mutate(request, context, 'comment');
export const DELETE = (request: Request, context: Context) => mutate(request, context, 'remove');
