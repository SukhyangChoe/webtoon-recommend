import { NextResponse } from "next/server";
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";
import { createChallengeEntry } from "@/features/match/server/challengeStore";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ challengeCode: string }> }) {
  try {
    const { challengeCode } = await params;
    const body = await request.json() as { anonymousId?: string; challengerPublicProfileId?: string; challengerNickname?: string };
    if (!body.anonymousId || !isAnonymousId(body.anonymousId) || !body.challengerPublicProfileId || !body.challengerNickname) {
      return NextResponse.json({ error: "INVALID_CHALLENGE_ENTRY_INPUT" }, { status: 400 });
    }
    const created = await createChallengeEntry({
      challengeCode,
      anonymousId: body.anonymousId,
      challengerPublicProfileId: body.challengerPublicProfileId,
      challengerNickname: body.challengerNickname,
    });
    return NextResponse.json({
      ...created,
      pairResultUrl: `/match/c/${challengeCode}/match/${created.resultId}`,
    }, { status: created.updated ? 200 : 201 });
  } catch (error) {
    const failure = toMatchApiFailure(error, "CHALLENGE_ENTRY_FAILED");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
