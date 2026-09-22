import { NextResponse } from "next/server";
import { isChallengeNicknameAvailable } from "@/features/match/server/challengeStore";
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ challengeCode: string }> }) {
  try {
    const { challengeCode } = await params;
    const body = await request.json() as { nickname?: string; anonymousId?: string };
    if (!body.nickname || (body.anonymousId && !isAnonymousId(body.anonymousId))) {
      return NextResponse.json({ error: "INVALID_REQUEST_BODY" }, { status: 400 });
    }
    const available = await isChallengeNicknameAvailable({ challengeCode, nickname: body.nickname, anonymousId: body.anonymousId });
    return NextResponse.json({ available });
  } catch (error) {
    const failure = toMatchApiFailure(error, "NICKNAME_CHECK_FAILED");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
