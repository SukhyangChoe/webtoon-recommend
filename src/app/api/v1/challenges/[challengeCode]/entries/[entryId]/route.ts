import { NextResponse } from "next/server";
import { updateChallengeEntryVisibility } from "@/features/match/server/challengeStore";

export const dynamic = "force-dynamic";

function ownerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ challengeCode: string; entryId: string }> }) {
  try {
    const { challengeCode, entryId } = await params;
    const body = await request.json() as { hiddenByOwner?: boolean };
    if (typeof body.hiddenByOwner !== "boolean") {
      return NextResponse.json({ error: "INVALID_ENTRY_VISIBILITY" }, { status: 400 });
    }
    const updated = updateChallengeEntryVisibility({
      challengeCode,
      entryId,
      hiddenByOwner: body.hiddenByOwner,
      ownerManageToken: ownerToken(request),
    });
    return NextResponse.json(updated);
  } catch (error) {
    const code = error instanceof Error ? error.message : "CHALLENGE_ENTRY_UPDATE_FAILED";
    const status = code === "OWNER_AUTH_REQUIRED" ? 403 : code.endsWith("NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
