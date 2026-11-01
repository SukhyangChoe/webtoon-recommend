import { NextResponse } from 'next/server';
import { getWorkDetail, getWorkFit, getWorkInfo } from './workDetailStore';
import { getWorkReadDatabase } from './database';
import { createWorkReadContext } from './workReadDeadline';
import { isAnonymousId } from '../storage/anonymousIdentity.mjs';
import { toMatchApiFailure } from './apiErrors';

export async function workDetailResponse(request: Request, id: string, kind: 'detail' | 'fit') {
  const headers: Record<string, string> = { 'Cache-Control': 'private, no-store', Vary: 'x-match-anonymous-id' };
  if (!/^[\w-]{1,100}$/.test(id)) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404, headers });
  const mode = kind === 'detail' && new URL(request.url).searchParams.get('view') === 'info' ? 'info' : kind;
  const read = createWorkReadContext({ getSql: getWorkReadDatabase, signal: request.signal, kind: mode, workId: id });
  headers['X-Request-Id'] = read.requestId;
  let status = 200;
  try {
    const identity = request.headers.get('x-match-anonymous-id');
    const viewer = isAnonymousId(identity) ? identity : null;
    const item = mode === 'info' ? await getWorkInfo(id, read) : mode === 'fit' ? await getWorkFit(id, viewer, read) : await getWorkDetail(id, viewer, read);
    status = item ? 200 : 404;
    headers['Server-Timing'] = read.finish(status);
    return NextResponse.json(item ?? { error: 'NOT_FOUND' }, { status, headers });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const databaseCode = typeof error === 'object' && error && 'code' in error ? error.code : '';
    const timedOut = code === 'WORK_DETAIL_TIMEOUT' || databaseCode === '57014' || databaseCode === '55P03';
    const failure = timedOut ? { error: 'WORK_DETAIL_TIMEOUT', status: 504 } : code === 'WORK_DETAIL_CANCELLED' ? { error: code, status: 499 } : toMatchApiFailure(error, 'WORK_DETAIL_LOAD_FAILED');
    status = failure.status;
    if (timedOut) headers['Retry-After'] = '1';
    headers['Server-Timing'] = read.finish(status);
    return NextResponse.json({ error: failure.error }, { status, headers });
  } finally { read.finish(status); }
}
