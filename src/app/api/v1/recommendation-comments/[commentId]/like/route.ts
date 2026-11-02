import { readMatchJson } from '@/features/match/server/requestBody';
import { matchJson } from '@/features/match/server/apiResponse';
import { isAnonymousId } from '@/features/match/storage/anonymousIdentity.mjs';
import { setRecommendationCommentLike } from '@/features/match/server/recommendationCommentStore';
import { toMatchApiFailure } from '@/features/match/server/apiErrors';
export const dynamic='force-dynamic';
export async function PUT(request:Request,{params}:{params:Promise<{commentId:string}>}){
  try{
    const {commentId}=await params;
    const body=await readMatchJson(request) as {anonymousId?:string;liked?:boolean};
    if(!isAnonymousId(commentId)||!body.anonymousId||!isAnonymousId(body.anonymousId)||typeof body.liked!=='boolean')return matchJson(request, {error:'INVALID_REQUEST_BODY'},{status:400});
    return matchJson(request, await setRecommendationCommentLike({commentId,likerAnonymousId:body.anonymousId,liked:body.liked}),{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){const failure=toMatchApiFailure(error,'RECOMMENDATION_LIKE_SAVE_FAILED');return matchJson(request, {error:failure.error},{status:failure.status});}
}
