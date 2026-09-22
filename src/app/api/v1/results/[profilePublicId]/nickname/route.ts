import { NextResponse } from "next/server";
import { updateProfileNickname } from "@/features/match/server/resultStore";
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ profilePublicId: string }> }) {
  try {
    const { profilePublicId } = await params;
    const body = await request.json() as { anonymousId?: string; nickname?: string };
    if (!body.anonymousId || !isAnonymousId(body.anonymousId) || !body.nickname) {
      return NextResponse.json({ error: "INVALID_REQUEST_BODY" }, { status: 400 });
    }
    return NextResponse.json(await updateProfileNickname(profilePublicId, body.anonymousId, body.nickname));
  } catch (error) {
    const failure = toMatchApiFailure(error, "NICKNAME_UPDATE_FAILED");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
