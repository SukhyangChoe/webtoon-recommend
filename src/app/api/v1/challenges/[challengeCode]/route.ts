import { NextResponse } from "next/server";
import { getPublicChallenge, updateChallenge } from "@/features/match/server/challengeStore";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ challengeCode: string }> }) {
  try {
    const { challengeCode } = await params;
    const challenge = await getPublicChallenge(challengeCode);
    if (!challenge) return NextResponse.json({ error: "CHALLENGE_NOT_FOUND" }, { status: 404 });
    return NextResponse.json(challenge);
  } catch (error) {
    const failure = toMatchApiFailure(error, "CHALLENGE_LOAD_FAILED");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

function ownerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ challengeCode: string }> }) {
  try {
    const { challengeCode } = await params;
    const body = await request.json() as { status?: string; rankingVisibility?: boolean };
    if (body.status !== undefined && body.status !== "active" && body.status !== "closed") {
      return NextResponse.json({ error: "INVALID_CHALLENGE_STATUS" }, { status: 400 });
    }
    if (body.rankingVisibility !== undefined && typeof body.rankingVisibility !== "boolean") {
      return NextResponse.json({ error: "INVALID_RANKING_VISIBILITY" }, { status: 400 });
    }
    const challenge = await updateChallenge({
      challengeCode,
      status: body.status,
      rankingVisibility: body.rankingVisibility,
      ownerManageToken: ownerToken(request),
    });
    return NextResponse.json(challenge);
  } catch (error) {
    const failure = toMatchApiFailure(error, "CHALLENGE_UPDATE_FAILED");
    const activeChallengeCode = error && typeof error === "object" && "challengeCode" in error && typeof error.challengeCode === "string" ? error.challengeCode : null;
    return NextResponse.json({ error: failure.error, ...(failure.error === "ACTIVE_CHALLENGE_EXISTS" && activeChallengeCode ? { challengeCode: activeChallengeCode } : {}) }, { status: failure.status });
  }
}
