'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
    {showFloatingSearch(path) ? <Link className="wm-floating-search" href={path === '/match/search' ? currentPath : workSearchHref('', currentPath)} aria-label="작품 검색" title="작품 검색" aria-current={path === '/match/search' ? 'page' : undefined} prefetch={false}><MatchIcon name="search" /></Link> : null}
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
