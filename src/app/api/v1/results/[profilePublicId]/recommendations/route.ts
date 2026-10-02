import { NextResponse } from "next/server";
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";
import { getProfileRecommendations, replaceProfileRecommendations } from "@/features/match/server/webtoonCatalogStore";
import { refreshCompatibilityForProfile } from "@/features/match/server/challengeStore";
import { getPublicTasteResult } from "@/features/match/server/resultStore";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ profilePublicId: string }> }) {
  try {
    const { profilePublicId } = await params;
    const candidateAnonymousId = request.headers.get("x-match-anonymous-id");
    const viewerAnonymousId = candidateAnonymousId && isAnonymousId(candidateAnonymousId)
      ? candidateAnonymousId
      : null;
    return NextResponse.json({
      items: await getProfileRecommendations(profilePublicId, viewerAnonymousId),
    });
  } catch (error) {
    const failure = toMatchApiFailure(error, "RECOMMENDATIONS_LOAD_FAILED");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ profilePublicId: string }> }) {
  try {
    const { profilePublicId } = await params;
    const body = await request.json() as {
      anonymousId?: string;
      recommendations?: Array<{ canonicalWebtoonId?: string; recommendationComment?: string | null }>;
      canonicalWebtoonIds?: string[];
    };
    if (!body.anonymousId || !isAnonymousId(body.anonymousId)) {
      return NextResponse.json({ error: "INVALID_REQUEST_BODY" }, { status: 400 });
    }
    const recommendations = Array.isArray(body.recommendations)
      ? body.recommendations
      : Array.isArray(body.canonicalWebtoonIds)
        ? body.canonicalWebtoonIds.map((canonicalWebtoonId) => ({ canonicalWebtoonId }))
        : null;
    if (!recommendations || recommendations.some((item) => typeof item?.canonicalWebtoonId !== "string")) {
      return NextResponse.json({ error: "INVALID_REQUEST_BODY" }, { status: 400 });
    }
    const replacement = await replaceProfileRecommendations({
      publicProfileId: profilePublicId,
      anonymousId: body.anonymousId,
      recommendations: recommendations as Array<{ canonicalWebtoonId: string; recommendationComment?: string | null }>,
    });
    const refreshed = await refreshCompatibilityForProfile(replacement.profileId);
    const tasteResult = await getPublicTasteResult(profilePublicId);
    return NextResponse.json({
      items: replacement.items,
      recommendationInfluence: tasteResult?.recommendationInfluence ?? { workCount: 0, recommendationPercent: 0, testPercent: 100 },
      ...refreshed,
    });
  } catch (error) {
    const failure = toMatchApiFailure(error, "RECOMMENDATIONS_SAVE_FAILED");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
