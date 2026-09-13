import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const MATCH_ROOT = "/match";
const MATCH_API_ROOT = "/api/v1";

function isMatchRoute(pathname: string) {
  return pathname === MATCH_ROOT || pathname.startsWith(`${MATCH_ROOT}/`);
}

function isMatchApiRoute(pathname: string) {
  return pathname === MATCH_API_ROOT || pathname.startsWith(`${MATCH_API_ROOT}/`);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isMatchRoute(pathname) || isMatchApiRoute(pathname)) {
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
