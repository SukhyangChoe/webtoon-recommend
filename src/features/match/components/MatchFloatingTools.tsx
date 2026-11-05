'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';
import { MatchIcon } from './MatchIcon';
import { showFloatingSearch, workSearchHref } from '../config/workSearchPresentation.mjs';
import { RecommendationNudge } from './RecommendationNudge';

export function MatchFloatingTools() {
  const path = usePathname(), params = useSearchParams();
  const currentPath = path + (params.size ? `?${params}` : '');
  const search = useRef<HTMLAnchorElement>(null);

  useLayoutEffect(() => {
    const parent = search.current?.closest<HTMLElement>('.match-module');
    if (!parent) return;
    const container: HTMLElement = parent;
    let frame = 0;
    const footers = new Set<Element>();
    const resize = new ResizeObserver(measure);
    // Work-detail footers are positioned inside a viewport-height canvas. Its
    // height can settle after a resize without changing the footer's own size.
    resize.observe(container);
    function measure() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      const current = new Set(container.querySelectorAll('.wm-action-bar, .wm-save-tray, .wm-work-action'));
      for (const footer of footers) if (!current.has(footer)) { resize.unobserve(footer); footers.delete(footer); }
      let height = 0;
      for (const footer of current) {
        if (!footers.has(footer)) { resize.observe(footer); footers.add(footer); }
        const rect = footer.getBoundingClientRect();
        // iOS rubber-band scrolling / browser chrome can temporarily put the
        // footer bottom outside innerHeight. Its occupied height is still real.
        if (rect.height > 0) height = Math.max(height, rect.height + Math.max(0, window.innerHeight - rect.bottom));
      }
      // Footers include their safe-area inset. Do not add it a second time.
      container.style.setProperty('--wm-search-bottom', height ? `${height + 12}px` : 'calc(16px + env(safe-area-inset-bottom))');
      container.style.setProperty('--wm-search-clearance', height ? `${height + 72}px` : 'calc(76px + env(safe-area-inset-bottom))');
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(measure); }
    // Late-loading action bars must be measured before paint, not a frame later.
    const mutations = new MutationObserver(measure);
    mutations.observe(container, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame); resize.disconnect(); mutations.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      container.style.removeProperty('--wm-search-bottom'); container.style.removeProperty('--wm-search-clearance');
    };
  }, [path]);

  return <>
    {showFloatingSearch(path) ? <Link ref={search} className="wm-floating-search" href={workSearchHref("", currentPath)} aria-label="작품 검색" prefetch={false}><MatchIcon name="search" /><span>작품 검색</span></Link> : null}
    <RecommendationNudge key={currentPath} currentPath={currentPath} />
  </>;
}
