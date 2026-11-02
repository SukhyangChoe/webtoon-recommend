import { readMatchJson } from '@/features/match/server/requestBody';
import { matchJson } from '@/features/match/server/apiResponse';
import { updateProfileNickname } from "@/features/match/server/resultStore";
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ profilePublicId: string }> }) {
  try {
    const { profilePublicId } = await params;
    const body = await readMatchJson(request) as { anonymousId?: string; nickname?: string };
    if (!body.anonymousId || !isAnonymousId(body.anonymousId) || !body.nickname) {
      return matchJson(request, { error: "INVALID_REQUEST_BODY" }, { status: 400 });
    }
    return matchJson(request, await updateProfileNickname(profilePublicId, body.anonymousId, body.nickname));
  } catch (error) {
    const failure = toMatchApiFailure(error, "NICKNAME_UPDATE_FAILED");
    return matchJson(request, { error: failure.error }, { status: failure.status });
  }
}
