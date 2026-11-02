import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { allowMatchRequest } from '@/features/match/server/apiRateLimit';

const MATCH_ROOT = "/match";
const MATCH_API_ROOT = "/api/v1";

function isMatchRoute(pathname: string) {
  return pathname === MATCH_ROOT || pathname.startsWith(`${MATCH_ROOT}/`);
}

function isMatchApiRoute(pathname: string) {
  return pathname === MATCH_API_ROOT || pathname.startsWith(`${MATCH_API_ROOT}/`);
}

export async function proxy(request: NextRequest) {
  const requestStarted=Date.now();
  const { pathname } = request.nextUrl;

  if (isMatchApiRoute(pathname)) {
    const write=!['GET','HEAD','OPTIONS'].includes(request.method);
    if(write&&request.headers.get('origin')&&request.headers.get('origin')!==request.nextUrl.origin)
      return NextResponse.json({error:'CROSS_ORIGIN_WRITE_FORBIDDEN'},{status:403});
    if(Number(request.headers.get('content-length')||0)>128*1024)
      return NextResponse.json({error:'REQUEST_BODY_TOO_LARGE'},{status:413});
    try{
      const quota=await allowMatchRequest(request);
      if(!quota.allowed)return NextResponse.json({error:'RATE_LIMITED'},{status:429,headers:{'Retry-After':String(quota.retryAfter),'Cache-Control':'no-store'}});
    }catch{return NextResponse.json({error:'MATCH_SERVICE_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'3'}});}
    const headers=new Headers(request.headers);
    headers.set('x-wm-request-start',String(requestStarted));
    return NextResponse.next({request:{headers}});
  }
  if (isMatchRoute(pathname)) {
    return NextResponse.next();
  }

  const matchUrl = request.nextUrl.clone();
  matchUrl.pathname = MATCH_ROOT;
  matchUrl.search = "";

  return NextResponse.redirect(matchUrl, 307);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
