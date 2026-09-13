import { NextResponse } from "next/server";
import { getChallengeRanking } from "@/features/match/server/challengeStore";

export const dynamic = "force-dynamic";

function ownerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ challengeCode: string }> }) {
  const { challengeCode } = await params;
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(20, Math.floor(requestedLimit))) : 20;
  const ranking = await getChallengeRanking({
    challengeCode,
    limit,
    viewerPublicProfileId: url.searchParams.get("viewerProfileId"),
    ownerManageToken: ownerToken(request),
  });
  if (!ranking) return NextResponse.json({ error: "CHALLENGE_NOT_FOUND" }, { status: 404 });
  return NextResponse.json(ranking);
}
