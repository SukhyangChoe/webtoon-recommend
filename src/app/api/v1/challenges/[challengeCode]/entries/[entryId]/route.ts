import { readMatchJson } from '@/features/match/server/requestBody';
import { matchJson } from '@/features/match/server/apiResponse';
import { updateChallengeEntryVisibility } from "@/features/match/server/challengeStore";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";

export const dynamic = "force-dynamic";

function ownerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

function ownerAnonymousId(request: Request) {
  const value = request.headers.get("x-match-owner-id");
  return isAnonymousId(value) ? value : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ challengeCode: string; entryId: string }> }) {
  try {
    const { challengeCode, entryId } = await params;
    const body = await readMatchJson(request) as { hiddenByOwner?: boolean };
    if (typeof body.hiddenByOwner !== "boolean") {
      return matchJson(request, { error: "INVALID_ENTRY_VISIBILITY" }, { status: 400 });
    }
    const updated = await updateChallengeEntryVisibility({
      challengeCode,
      entryId,
      hiddenByOwner: body.hiddenByOwner,
      ownerManageToken: ownerToken(request),
      ownerAnonymousId: ownerAnonymousId(request),
    });
    return matchJson(request, updated);
  } catch (error) {
    const failure = toMatchApiFailure(error, "CHALLENGE_ENTRY_UPDATE_FAILED");
    return matchJson(request, { error: failure.error }, { status: failure.status });
  }
}
