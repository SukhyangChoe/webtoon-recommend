import { NextResponse } from "next/server";
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";
import { createChallengeEntry } from "@/features/match/server/challengeStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ challengeCode: string }> }) {
  try {
    const { challengeCode } = await params;
    const body = await request.json() as { anonymousId?: string; challengerPublicProfileId?: string; challengerNickname?: string };
    if (!body.anonymousId || !isAnonymousId(body.anonymousId) || !body.challengerPublicProfileId || !body.challengerNickname) {
      return NextResponse.json({ error: "INVALID_CHALLENGE_ENTRY_INPUT" }, { status: 400 });
    }
    const created = createChallengeEntry({
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
    const code = error instanceof Error ? error.message : "CHALLENGE_ENTRY_FAILED";
    const status = code === "QUESTION_VERSION_MISMATCH" || code === "COMPATIBILITY_VERSION_MISMATCH" ? 409 : code === "CHALLENGE_CLOSED" ? 410 : code === "NICKNAME_REJECTED" ? 422 : code.endsWith("NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
