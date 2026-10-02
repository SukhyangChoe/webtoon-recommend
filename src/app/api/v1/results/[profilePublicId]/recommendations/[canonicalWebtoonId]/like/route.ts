import { NextResponse } from "next/server";
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";
import { setProfileRecommendationLike } from "@/features/match/server/webtoonCatalogStore";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ profilePublicId: string; canonicalWebtoonId: string }> },
) {
  try {
    const { profilePublicId, canonicalWebtoonId } = await params;
    const body = await request.json() as { anonymousId?: string; liked?: boolean };
    if (!body.anonymousId || !isAnonymousId(body.anonymousId) || typeof body.liked !== "boolean") {
      return NextResponse.json({ error: "INVALID_REQUEST_BODY" }, { status: 400 });
    }
    return NextResponse.json(await setProfileRecommendationLike({
      recommenderPublicProfileId: profilePublicId,
      canonicalWebtoonId,
      likerAnonymousId: body.anonymousId,
      liked: body.liked,
    }));
  } catch (error) {
    const failure = toMatchApiFailure(error, "RECOMMENDATION_LIKE_SAVE_FAILED");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
