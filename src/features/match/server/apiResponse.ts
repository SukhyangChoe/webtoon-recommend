import 'server-only';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

const publicSegments=new Set(['api','v1','results','recommendations','recommendation-comments','daily-picks','like','nickname','webtoons','search','fit','challenges','entries','ranking','taste-snapshots','match-events','test-restart']);
/** Record timings and statuses, never bodies, queries, identity or raw errors. */
export function matchJson(request: Request, body: unknown, init?: ResponseInit) {
  const start=Number(request.headers.get('x-wm-request-start'));
  const elapsed=Number.isFinite(start)&&start>0?Math.max(0,Date.now()-start):0;
  const headers=new Headers(init?.headers);
  if(!headers.has('Cache-Control'))headers.set('Cache-Control','private, no-store');
  const requestId=randomUUID();
  headers.set('X-Request-Id',requestId);
  headers.append('Server-Timing',`api;dur=${elapsed}`);
  const route=new URL(request.url).pathname.split('/').map(s=>!s||publicSegments.has(s)?s:':id').join('/');
  console.info(JSON.stringify({event:'match_api_response',requestId,route,method:request.method,status:init?.status??200,elapsedMs:elapsed}));
  return NextResponse.json(body,{...init,headers});
}
