import { NextResponse } from 'next/server';
import { isAnonymousId } from '@/features/match/storage/anonymousIdentity.mjs';
import { setRecommendationCommentLike } from '@/features/match/server/recommendationCommentStore';
import { toMatchApiFailure } from '@/features/match/server/apiErrors';
export const dynamic='force-dynamic';
export async function PUT(request:Request,{params}:{params:Promise<{commentId:string}>}){
  try{
    const {commentId}=await params;
    const body=await request.json() as {anonymousId?:string;liked?:boolean};
    if(!isAnonymousId(commentId)||!body.anonymousId||!isAnonymousId(body.anonymousId)||typeof body.liked!=='boolean')return NextResponse.json({error:'INVALID_REQUEST_BODY'},{status:400});
    return NextResponse.json(await setRecommendationCommentLike({commentId,likerAnonymousId:body.anonymousId,liked:body.liked}),{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){const failure=toMatchApiFailure(error,'RECOMMENDATION_LIKE_SAVE_FAILED');return NextResponse.json({error:failure.error},{status:failure.status});}
}
