import { NextResponse } from 'next/server';
import { isAnonymousId } from '@/features/match/storage/anonymousIdentity.mjs';
import { getOwnRecommendationComment } from '@/features/match/server/recommendationCommentStore';
import { toMatchApiFailure } from '@/features/match/server/apiErrors';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{profilePublicId:string;canonicalWebtoonId:string}>}){
  try{
    const {profilePublicId,canonicalWebtoonId}=await params;
    const anonymousId=request.headers.get('x-match-anonymous-id');
    if(!anonymousId||!isAnonymousId(anonymousId))return NextResponse.json({error:'OWNER_AUTH_REQUIRED'},{status:403,headers:{'Cache-Control':'private, no-store'}});
    return NextResponse.json(await getOwnRecommendationComment({publicProfileId:profilePublicId,canonicalWebtoonId,anonymousId}),{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){const failure=toMatchApiFailure(error,'RECOMMENDATION_COMMENT_LOAD_FAILED');return NextResponse.json({error:failure.error},{status:failure.status,headers:{'Cache-Control':'private, no-store'}});}
}
