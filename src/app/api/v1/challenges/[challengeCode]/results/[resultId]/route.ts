import { NextResponse } from "next/server";
import { getPublicPairResult } from "@/features/match/server/challengeStore";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ challengeCode: string; resultId: string }> }) {
  try {
    const { challengeCode, resultId } = await params;
    const candidateAnonymousId = request.headers.get("x-match-anonymous-id");
    const viewerAnonymousId = candidateAnonymousId && isAnonymousId(candidateAnonymousId)
      ? candidateAnonymousId
      : null;
    const result = await getPublicPairResult(challengeCode, resultId, viewerAnonymousId);
    if (!result) return NextResponse.json({ error: "PAIR_RESULT_NOT_FOUND" }, { status: 404 });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const failure = toMatchApiFailure(error, "PAIR_RESULT_LOAD_FAILED");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
