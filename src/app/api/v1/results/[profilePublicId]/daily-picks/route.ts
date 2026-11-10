import { matchJson } from '@/features/match/server/apiResponse';
import { toMatchApiFailure } from '@/features/match/server/apiErrors';
import { isTasteResultOwner } from '@/features/match/server/resultStore';
import { getDailyTastePicks } from '@/features/match/server/dailyTastePicks';
import { isAnonymousId } from '@/features/match/storage/anonymousIdentity.mjs';
import { dailyPicksProgressStream } from '@/features/match/server/dailyRecommendation/progressStream.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request, { params }: { params: Promise<{ profilePublicId: string }> }) {
  const started = Date.now();
  try {
    const { profilePublicId } = await params;
    const anonymousId = request.headers.get('x-match-anonymous-id');
    if (!anonymousId || !isAnonymousId(anonymousId) || !await isTasteResultOwner(profilePublicId, anonymousId)) {
      return matchJson(request, { error: 'RESULT_OWNER_MISMATCH' }, { status: 403 });
    }
    if (request.headers.get('accept')?.includes('application/x-ndjson')) {
      const stream = dailyPicksProgressStream(
        (onProgress: NonNullable<Parameters<typeof getDailyTastePicks>[1]>['onProgress']) => getDailyTastePicks(profilePublicId, { onProgress }),
        (error: unknown) => {
          const failure = toMatchApiFailure(error, 'DAILY_PICKS_LOAD_FAILED');
          console.warn(JSON.stringify({ event: 'daily_picks_failed', code: failure.error, elapsedMs: Date.now() - started }));
          return failure;
        },
      );
      return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'private, no-store, no-transform', 'X-Accel-Buffering': 'no', 'Vary': 'Accept' } });
    }
    const picks = await getDailyTastePicks(profilePublicId);
    return matchJson(request, picks, picks.mode === 'preparing' ? { status: 202, headers: { 'Retry-After': '2' } } : undefined);
  } catch (error) {
    const failure = toMatchApiFailure(error, 'DAILY_PICKS_LOAD_FAILED');
    // Operational diagnosis without logging readers, answers, vectors or DB errors.
    console.warn(JSON.stringify({ event: 'daily_picks_failed', code: failure.error, elapsedMs: Date.now() - started }));
    return matchJson(request, { error: failure.error }, { status: failure.status });
  }
}
