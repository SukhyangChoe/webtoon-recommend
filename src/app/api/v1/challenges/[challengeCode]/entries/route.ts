import { readMatchJson } from '@/features/match/server/requestBody';
import { matchJson } from '@/features/match/server/apiResponse';
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";
import { createChallengeEntry, getExistingChallengeEntry } from "@/features/match/server/challengeStore";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ challengeCode: string }> }) {
  try {
    const { challengeCode } = await params;
    const body = await readMatchJson(request) as { anonymousId?: string; challengerPublicProfileId?: string; challengerNickname?: string; lookupOnly?: boolean };
    if (!body.anonymousId || !isAnonymousId(body.anonymousId) || !body.challengerPublicProfileId) {
      return matchJson(request, { error: "INVALID_CHALLENGE_ENTRY_INPUT" }, { status: 400 });
    }
    if (body.lookupOnly) {
      const entry = await getExistingChallengeEntry({ challengeCode, anonymousId: body.anonymousId, challengerPublicProfileId: body.challengerPublicProfileId });
      if (!entry) return matchJson(request, { error: "CHALLENGE_ENTRY_NOT_FOUND" }, { status: 404 });
      return matchJson(request, entry);
    }
    if (!body.challengerNickname) return matchJson(request, { error: "INVALID_CHALLENGE_ENTRY_INPUT" }, { status: 400 });
    const created = await createChallengeEntry({
      challengeCode,
      anonymousId: body.anonymousId,
      challengerPublicProfileId: body.challengerPublicProfileId,
      challengerNickname: body.challengerNickname,
    });
    return matchJson(request, {
      ...created,
      pairResultUrl: `/match/c/${challengeCode}/match/${created.resultId}`,
    }, { status: created.updated || created.existing ? 200 : 201 });
  } catch (error) {
    const failure = toMatchApiFailure(error, "CHALLENGE_ENTRY_FAILED");
    return matchJson(request, { error: failure.error }, { status: failure.status });
  }
}
