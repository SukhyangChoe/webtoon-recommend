"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BackIcon } from '@/components/layout/BackIcon';
import { searchBackPath } from '../config/workSearchPresentation.mjs';

export function MatchScreenHeader() {
  const path = usePathname();
  const query = useSearchParams();
  const isIntro = path === '/match/test/intro';
  if (path.startsWith('/match/work/')) return <div className="match-screen-header is-relationship" aria-hidden="true" />;
  // Personal results own their header; the relationship map uses only the shared home logo.
  if (path.startsWith("/match/result/") && path !== "/match/result/building") return null;
  if (/^\/match\/c\/[^/]+\/ranking$/.test(path) || /^\/match\/c\/[^/]+\/match\//.test(path)) return <div className="match-screen-header is-relationship" aria-hidden="true" />;
  let label = "시작";
  let href = "/match";
  if (path === '/match/search') {
    href = searchBackPath(query.get('from'));
    label = href === '/match' ? '시작' : /^\/match\/result\/[\w-]+$/.test(href) ? '내 취향 결과' : '이전 화면';
  }
  if (path.startsWith("/match/share/")) {
    const code = query.get("challengeCode");
    const resultId = query.get("resultId");
    const profileId = query.get("profilePublicId");
    label = path.endsWith("/personal") ? "내 취향 결과" : path.endsWith("/pair") ? "둘의 궁합" : "전체 랭킹";
    href = profileId ? `/match/result/${encodeURIComponent(profileId)}` : code ? resultId ? `/match/c/${encodeURIComponent(code)}/match/${encodeURIComponent(resultId)}` : `/match/c/${encodeURIComponent(code)}/ranking` : "/match";
    if (href === '/match') label = '시작';
  }
  return <nav className={`match-screen-header${path === "/match" ? " is-home" : " has-navigation"}${isIntro ? ' is-test-intro' : ''}`} aria-label="화면 이동">{path !== "/match" ? <Link className="site-back-control" href={href} aria-label={label}><BackIcon /></Link> : null}</nav>;
}
