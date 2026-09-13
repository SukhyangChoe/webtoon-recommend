import { NextResponse } from "next/server";
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";
import { createChallenge, getActiveChallengeForOwner } from "@/features/match/server/challengeStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const anonymousId = url.searchParams.get("anonymousId");
  if (!anonymousId || !isAnonymousId(anonymousId)) {
    return NextResponse.json({ error: "INVALID_CHALLENGE_OWNER" }, { status: 400 });
  }

  const challenge = await getActiveChallengeForOwner(anonymousId);
  if (!challenge) return NextResponse.json({ active: false });
  return NextResponse.json({
    active: true,
    ...challenge,
    challengeUrl: `${url.origin}/match/c/${challenge.challengeCode}`,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { anonymousId?: string; ownerPublicProfileId?: string; ownerNickname?: string; rankingVisibility?: boolean };
    if (!body.anonymousId || !isAnonymousId(body.anonymousId) || !body.ownerPublicProfileId || !body.ownerNickname) {
      return NextResponse.json({ error: "INVALID_CHALLENGE_INPUT" }, { status: 400 });
    }
    const created = await createChallenge({
      anonymousId: body.anonymousId,
      ownerPublicProfileId: body.ownerPublicProfileId,
      ownerNickname: body.ownerNickname,
      rankingVisibility: body.rankingVisibility,
    });
    const challengeUrl = `${new URL(request.url).origin}/match/c/${created.challenge.challengeCode}`;
    return NextResponse.json({ ...created.challenge, challengeUrl, ownerManageToken: created.ownerManageToken }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "CHALLENGE_CREATE_FAILED";
    const status = code === "ACTIVE_CHALLENGE_EXISTS" ? 409 : code === "NICKNAME_REJECTED" ? 422 : code === "OWNER_SNAPSHOT_NOT_FOUND" ? 404 : 400;
    const challengeCode = error && typeof error === "object" && "challengeCode" in error && typeof error.challengeCode === "string" ? error.challengeCode : null;
    const challengeUrl = challengeCode ? `${new URL(request.url).origin}/match/c/${challengeCode}` : null;
    return NextResponse.json({ error: code, ...(challengeCode ? { challengeCode, challengeUrl } : {}) }, { status });
  }
}
