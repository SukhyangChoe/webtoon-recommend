import { readMatchJson } from '@/features/match/server/requestBody';
import { matchJson } from '@/features/match/server/apiResponse';
import { toMatchApiFailure } from '@/features/match/server/apiErrors';
import { isAnonymousId } from '@/features/match/storage/anonymousIdentity.mjs';
import { reorderProfileRecommendations } from '@/features/match/server/recommendationOrderStore';
import { getProfileRecommendations } from '@/features/match/server/webtoonCatalogStore';

export const dynamic='force-dynamic';
export async function PATCH(request:Request,{params}:{params:Promise<{profilePublicId:string}>}) {
  try {
    const {profilePublicId}=await params;
    const body=await readMatchJson(request) as {anonymousId?:string;canonicalWebtoonIds?:string[]};
    if(!body?.anonymousId||!isAnonymousId(body.anonymousId)||!Array.isArray(body.canonicalWebtoonIds))return matchJson(request,{error:'INVALID_REQUEST_BODY'},{status:400});
    await reorderProfileRecommendations({publicProfileId:profilePublicId,anonymousId:body.anonymousId,canonicalWebtoonIds:body.canonicalWebtoonIds});
    return matchJson(request,{items:await getProfileRecommendations(profilePublicId,body.anonymousId)});
  } catch(error) {
    const failure=toMatchApiFailure(error,'RECOMMENDATION_ORDER_FAILED');
    return matchJson(request,{error:failure.error},{status:failure.status});
  }
}
