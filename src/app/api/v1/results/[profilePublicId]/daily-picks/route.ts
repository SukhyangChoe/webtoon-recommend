import { matchJson } from '@/features/match/server/apiResponse';
import { toMatchApiFailure } from '@/features/match/server/apiErrors';
import { isTasteResultOwner } from '@/features/match/server/resultStore';
import { getDailyTastePicks } from '@/features/match/server/dailyTastePicks';
import { isAnonymousId } from '@/features/match/storage/anonymousIdentity.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: Request, { params }: { params: Promise<{ profilePublicId: string }> }) {
  try {
    const { profilePublicId } = await params;
    const anonymousId = request.headers.get('x-match-anonymous-id');
    if (!anonymousId || !isAnonymousId(anonymousId) || !await isTasteResultOwner(profilePublicId, anonymousId)) {
      return matchJson(request, { error: 'RESULT_OWNER_MISMATCH' }, { status: 403 });
    }
    return matchJson(request, await getDailyTastePicks(profilePublicId));
  } catch (error) {
    const failure = toMatchApiFailure(error, 'DAILY_PICKS_LOAD_FAILED');
    return matchJson(request, { error: failure.error }, { status: failure.status });
  }
}
