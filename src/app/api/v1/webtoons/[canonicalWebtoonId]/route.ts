import { NextResponse } from 'next/server';
import { getWorkDetail } from '@/features/match/server/workDetailStore';
import { isAnonymousId } from '@/features/match/storage/anonymousIdentity.mjs';
import { toMatchApiFailure } from '@/features/match/server/apiErrors';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ canonicalWebtoonId: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'x-match-anonymous-id' };
  try {
    const { canonicalWebtoonId } = await params;
    const profile = new URL(request.url).searchParams.get('profile');
    if (!/^[\w-]{1,100}$/.test(canonicalWebtoonId) || (profile !== null && !/^[\w-]{1,100}$/.test(profile))) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404, headers });
    const identity = request.headers.get('x-match-anonymous-id');
    const item = await getWorkDetail(canonicalWebtoonId, profile, isAnonymousId(identity) ? identity : null);
    return item ? NextResponse.json(item, { headers }) : NextResponse.json({ error: 'NOT_FOUND' }, { status: 404, headers });
  } catch (error) {
    const failure = toMatchApiFailure(error, 'WORK_DETAIL_LOAD_FAILED');
    return NextResponse.json({ error: failure.error }, { status: failure.status, headers });
  }
}
