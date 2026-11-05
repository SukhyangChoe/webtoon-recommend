'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MatchIcon } from './MatchIcon';
import { showFloatingSearch, workSearchHref } from '../config/workSearchPresentation.mjs';
import { dismissRecommendationPrompt, readRecommendationPrompt, recommendationManagerHref } from '../config/recommendationOnboarding.mjs';

type Prompt = { profileId: string; destination: string };

export function MatchFloatingTools() {
  const path = usePathname(), params = useSearchParams(), router = useRouter();
  const currentPath = path + (params.size ? `?${params}` : '');
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const registerButton = useRef<HTMLButtonElement>(null);
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
        if (rect.height > 0 && rect.top >= 0 && rect.bottom >= window.innerHeight - 2) height = Math.max(height, window.innerHeight - rect.top);
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
    window.visualViewport?.addEventListener('resize', schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame); resize.disconnect(); mutations.disconnect();
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      container.style.removeProperty('--wm-search-bottom'); container.style.removeProperty('--wm-search-clearance');
    };
  }, [path]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setPrompt(readRecommendationPrompt(sessionStorage, currentPath)); } catch { setPrompt(null); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentPath]);

  useEffect(() => {
    const element = dialog.current;
    if (!prompt || !element) return;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    registerButton.current?.focus();
    return () => { element.close(); document.body.style.overflow = previousOverflow; };
  }, [prompt]);

  function dismiss() {
    try { dismissRecommendationPrompt(sessionStorage); } catch { /* Storage is optional. */ }
    setPrompt(null);
  }

  function register() {
    if (!prompt) return;
    const href = recommendationManagerHref(prompt.profileId, prompt.destination);
    dismiss();
    router.push(href);
  }

  return <>
    {showFloatingSearch(path) ? <Link ref={search} className="wm-floating-search" href={workSearchHref('', currentPath)} aria-label="작품 검색" prefetch={false}><MatchIcon name="search" /><span>작품 검색</span></Link> : null}
    {prompt ? <dialog ref={dialog} className="wm-recommendation-prompt" aria-labelledby="wm-recommendation-prompt-title" aria-describedby="wm-recommendation-prompt-copy" onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onCancel={event => { event.preventDefault(); dismiss(); }} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dismiss();
    }}>
      <button type="button" className="wm-prompt-close" aria-label="추천작 등록 안내 닫기" onClick={dismiss}><MatchIcon name="close" /></button>
      <span className="wm-prompt-book" aria-hidden="true"><MatchIcon name="book" /></span>
      <p className="wm-prompt-eyebrow">선택사항</p>
      <h2 id="wm-recommendation-prompt-title">좋아하는 작품을<br />더해볼까요?</h2>
      <p id="wm-recommendation-prompt-copy">추천작이나 최애작을 등록하면<br />작품 속 취향까지 반영해<br />결과를 더 자세히 볼 수 있어요.</p>
      <button ref={registerButton} type="button" className="wm-prompt-register" onClick={register}>추천작 등록하기<MatchIcon name="chevron" /></button>
      <button type="button" className="wm-prompt-later" onClick={dismiss}>나중에 할게요</button>
    </dialog> : null}
  </>;
}
