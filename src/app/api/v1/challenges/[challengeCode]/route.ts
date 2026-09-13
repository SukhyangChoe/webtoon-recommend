import { NextResponse } from "next/server";
import { getPublicChallenge, updateChallenge } from "@/features/match/server/challengeStore";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ challengeCode: string }> }) {
  const { challengeCode } = await params;
  const challenge = await getPublicChallenge(challengeCode);
  if (!challenge) return NextResponse.json({ error: "CHALLENGE_NOT_FOUND" }, { status: 404 });
  return NextResponse.json(challenge);
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
    const code = error instanceof Error ? error.message : "CHALLENGE_UPDATE_FAILED";
    const status = code === "ACTIVE_CHALLENGE_EXISTS" ? 409 : code === "OWNER_AUTH_REQUIRED" ? 403 : code.endsWith("NOT_FOUND") ? 404 : 400;
    const activeChallengeCode = error && typeof error === "object" && "challengeCode" in error && typeof error.challengeCode === "string" ? error.challengeCode : null;
    return NextResponse.json({ error: code, ...(activeChallengeCode ? { challengeCode: activeChallengeCode } : {}) }, { status });
  }
}
