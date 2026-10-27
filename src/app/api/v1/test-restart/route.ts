import { NextResponse } from 'next/server';
import { isAnonymousId } from '@/features/match/storage/anonymousIdentity.mjs';
import { clearRecommendationsForRestart } from '@/features/match/server/webtoonCatalogStore';
import { refreshCompatibilityForProfile } from '@/features/match/server/challengeStore';
import { toMatchApiFailure } from '@/features/match/server/apiErrors';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { anonymousId?: string } | null;
    const anonymousId = body?.anonymousId;
    if (!anonymousId || !isAnonymousId(anonymousId)) return NextResponse.json({ error: 'INVALID_REQUEST_BODY' }, { status: 400 });
    const cleared = await clearRecommendationsForRestart(anonymousId);
    // Re-running after a failed refresh is safe, even when the list is already empty.
    if (cleared.profileId) await refreshCompatibilityForProfile(cleared.profileId);
    return NextResponse.json({ cleared: true, removedCount: cleared.removedCount }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const failure = toMatchApiFailure(error, 'TEST_RESTART_FAILED');
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
