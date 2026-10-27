"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { recommendationCarouselState, recommendationGenreLabel, workCoverSources } from "../config/recommendationPresentation.mjs";
import { WorkDetailLink } from './WorkDetailLink';
import { useHorizontalScrollIndicator } from './useHorizontalScrollIndicator';

export type RecommendationWorkItem = {
  canonicalWebtoonId: string;
  title: string;
  mainGenre: string;
  coverUrl?: string | null;
  introduction?: string | null;
  recommendationComment?: string | null;
  likeCount?: number;
  mainGenreLabel?: string;
  tasteFitHighlighted?: boolean;
};

export function WorkCover({ item, eager = false, sizes }: { item: Pick<RecommendationWorkItem, "title" | "coverUrl">; eager?: boolean; sizes?: string }) {
  const { src, srcSet } = workCoverSources(item.coverUrl);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return src && failedSrc !== src
    // eslint-disable-next-line @next/next/no-img-element -- Pre-sized immutable WebP variants are served directly by Storage CDN.
    ? <img className="wm-work-cover" src={src} srcSet={srcSet} sizes={srcSet ? (sizes ?? (eager ? '(max-width: 540px) 100vw, 540px' : '(max-width: 350px) 144px, 176px')) : undefined} alt={`${item.title} 작품 커버`} width={83} height={129} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedSrc(src)} />
    : <div className="wm-work-cover wm-work-cover--empty" role="img" aria-label="작품 커버 미등록"><span className="wm-cover-book" aria-hidden="true" /><span>커버 준비 중</span></div>;
}

function RecommendationTitle({ title, level }: { title: string; level: 3 | 4 }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const Heading = level === 3 ? 'h3' : 'h4';
  useEffect(() => {
    const heading = headingRef.current;
    const text = heading?.firstElementChild as HTMLSpanElement | null;
    if (!heading || !text) return;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const distance = Math.max(0, text.offsetWidth - heading.clientWidth);
      // Keep the entire title as one accessible heading, without duplicated text.
      heading.dataset.overflow = String(heading.clientWidth > 0 && distance > 1);
      text.style.setProperty('--wm-title-travel', `${-distance}px`);
      text.style.setProperty('--wm-title-duration', `${Math.max(12, distance / 22 * 2 + 4)}s`);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(heading);
    resize.observe(text);
    const visibility = new IntersectionObserver(([entry]) => {
      heading.dataset.visible = String(entry.isIntersecting);
    });
    visibility.observe(heading);
    measure();
    void document.fonts.ready.then(measure);
    return () => { disposed = true; resize.disconnect(); visibility.disconnect(); };
  }, [title]);
  return <Heading ref={headingRef} className="wm-scrolling-title" title={title}><span>{title}</span></Heading>;
}

// Personal and pair results share the same presentation and separate link/like hit areas.
export function RecommendationCard({ item, profileId, returnTo, onOpen, headingLevel = 4, likeAction }: {
  item: RecommendationWorkItem;
  profileId?: string | null;
  returnTo: string;
  onOpen: () => void;
  headingLevel?: 3 | 4;
  likeAction?: { liked: boolean; saving: boolean; onToggle: () => void };
}) {
  return <article className={`wm-recommendation-card wm-pair-work-card${item.tasteFitHighlighted ? ' is-taste-fit' : ''}`}>
    <div className="wm-pair-work-artwork">
      <WorkDetailLink id={item.canonicalWebtoonId} profileId={profileId} returnTo={returnTo} onOpen={onOpen} label={`${item.title} 작품 상세 보기`} className="wm-work-card-link"><WorkCover item={item} sizes="(max-width: 540px) 61vw, 300px" /></WorkDetailLink>
      <div className="wm-pair-work-copy">
        <WorkDetailLink id={item.canonicalWebtoonId} profileId={profileId} returnTo={returnTo} onOpen={onOpen} className="wm-pair-work-title"><RecommendationTitle title={item.title} level={headingLevel} /></WorkDetailLink>
        <div className="wm-pair-work-meta"><small>{item.mainGenreLabel ?? recommendationGenreLabel(item.mainGenre)}</small>
          {likeAction ? <button type="button" className={`wm-pair-work-like${likeAction.liked ? ' is-liked' : ''}`} disabled={likeAction.saving} aria-pressed={likeAction.liked} aria-label={`${item.title} 추천 ${likeAction.liked ? '좋아요 취소' : '좋아요'}`} onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            likeAction.onToggle();
          }}><span aria-hidden="true">{likeAction.liked ? '♥' : '♡'}</span><b>{item.likeCount ?? 0}</b></button>
            : <span className="wm-pair-work-like-count" aria-label={`좋아요 ${item.likeCount ?? 0}개`} onClick={event => { event.preventDefault(); event.stopPropagation(); }}><span aria-hidden="true">♡</span> {item.likeCount ?? 0}</span>}
        </div>
      </div>
    </div>
    {item.tasteFitHighlighted ? <span className="wm-pair-work-fit"><span aria-hidden="true">✦</span>취향에 잘 맞아요</span> : null}
    {item.recommendationComment ? <blockquote><q>{item.recommendationComment}</q></blockquote> : null}
  </article>;
}

// Both result screens share settled positions and detail-page return restoration.
export function useRecommendationCarousel(count: number, restorationKey?: string) {
  const listRef = useRef<HTMLOListElement>(null);
  const [index, setIndex] = useState(0);
  const activeIndex = useRef(0);
  const pendingScroll = useRef<{ index: number; left: number } | null>(null);
  const position = recommendationCarouselState(index, count);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const remember = (value: number) => {
      if (restorationKey) { try { sessionStorage.setItem(`wm-rail:${restorationKey}`, String(value)); } catch { /* Optional storage. */ } }
    };
    let settleTimer: number | undefined;
    pendingScroll.current = null;
    const update = () => {
      if (!list.clientWidth) return; // A hidden comparison tab must not reset the current card.
      const first = list.firstElementChild as HTMLElement | null;
      const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0;
      const step = (first?.getBoundingClientRect().width ?? list.clientWidth) + gap;
      const current = recommendationCarouselState(list.scrollLeft / Math.max(1, step), count).index;
      activeIndex.current = current;
      setIndex(current);
      remember(current);
    };
    const settle = () => {
      window.clearTimeout(settleTimer);
      pendingScroll.current = null;
      update();
    };
    const onScroll = () => {
      window.clearTimeout(settleTimer);
      const pending = pendingScroll.current;
      // Keep the requested card's arrows throughout its smooth transition.
      // A partly scrolled first/last card is not an extra available card.
      if (pending && Math.abs(list.scrollLeft - pending.left) > 2) {
        settleTimer = window.setTimeout(settle, 200);
        return;
      }
      settle();
    };
    const onScrollEnd = () => {
      if (!pendingScroll.current || Math.abs(list.scrollLeft - pendingScroll.current.left) <= 2) settle();
    };
    let previousWidth = list.clientWidth;
    const onResize = () => {
      const width = list.clientWidth;
      // Fitting a page's height must not cancel an in-flight horizontal move.
      if (!width || Math.abs(width - previousWidth) < 1) return;
      previousWidth = width;
      window.clearTimeout(settleTimer);
      pendingScroll.current = null;
      const next = recommendationCarouselState(activeIndex.current, count).index;
      const first = list.firstElementChild as HTMLElement | null;
      const target = list.children[next] as HTMLElement | undefined;
      if (first && target) list.scrollTo({ left: target.offsetLeft - first.offsetLeft, behavior: "instant" });
      update();
    };
    if (restorationKey) {
      try {
        const saved = recommendationCarouselState(Number(sessionStorage.getItem(`wm-rail:${restorationKey}`)), count).index;
        const first = list.firstElementChild as HTMLElement | null;
        const target = list.children[saved] as HTMLElement | undefined;
        if (first && target && list.clientWidth) list.scrollTo({ left: target.offsetLeft - first.offsetLeft, behavior: 'instant' });
      } catch { /* Keep the first card when storage is unavailable. */ }
    }
    update();
    list.addEventListener("scroll", onScroll, { passive: true });
    list.addEventListener("scrollend", onScrollEnd);
    list.addEventListener("pointerdown", settle, { passive: true });
    list.addEventListener("wheel", settle, { passive: true });
    list.addEventListener("keydown", settle);
    const observer = new ResizeObserver(onResize);
    observer.observe(list);
    return () => {
      window.clearTimeout(settleTimer);
      list.removeEventListener("scroll", onScroll);
      list.removeEventListener("scrollend", onScrollEnd);
      list.removeEventListener("pointerdown", settle);
      list.removeEventListener("wheel", settle);
      list.removeEventListener("keydown", settle);
      observer.disconnect();
    };
  }, [count, restorationKey]);
  function scroll(direction: number) {
    const list = listRef.current;
    const first = list?.firstElementChild as HTMLElement | null;
    if (!list || !first) return;
    const next = recommendationCarouselState(activeIndex.current + direction, count).index;
    const target = list.children[next] as HTMLElement | undefined;
    if (!target) return;
    const left = Math.max(0, Math.min(list.scrollWidth - list.clientWidth, target.offsetLeft - first.offsetLeft));
    activeIndex.current = next;
    pendingScroll.current = { index: next, left };
    setIndex(next);
    list.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  function prepareNavigation(index: number) {
    const list = listRef.current;
    const first = list?.firstElementChild as HTMLElement | null;
    const target = list?.children[index] as HTMLElement | undefined;
    if (list && first && target) list.scrollTo({ left: target.offsetLeft - first.offsetLeft, behavior: 'instant' });
    activeIndex.current = index;
    pendingScroll.current = null;
    if (restorationKey) { try { sessionStorage.setItem(`wm-rail:${restorationKey}`, String(index)); } catch { /* Optional storage. */ } }
  }
  function onKeyDown(event: KeyboardEvent<HTMLOListElement>) {
    if (count <= 1 || event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    scroll(event.key === 'Home' ? -count : event.key === 'End' ? count : event.key === 'ArrowRight' ? 1 : -1);
  }
  return { listRef, position, scroll, prepareNavigation, onKeyDown };
}

export function PersonalRecommendationCarousel({ items, publicProfileId }: { items: RecommendationWorkItem[]; publicProfileId?: string }) {
  const returnTo = publicProfileId ? `/match/result/${publicProfileId}` : '/match';
  const { listRef, position, prepareNavigation, onKeyDown } = useRecommendationCarousel(items.length, `${returnTo}:${items.map(item => item.canonicalWebtoonId).join(',')}`);
  const { containerRef, barRef, thumbRef } = useHorizontalScrollIndicator(listRef, items.length);
  if (!items.length) return <p className="wm-empty">아직 등록한 추천작이 없어요.</p>;
  return <div ref={containerRef} className="wm-personal-carousel">
    <div className="wm-carousel-controls"><span aria-live="polite">추천작 {position.index + 1} / {items.length}</span></div>
    <ol ref={listRef} className={`wm-pair-work-track${items.length === 1 ? ' is-single' : ''}`} tabIndex={items.length > 1 ? 0 : undefined} aria-label="내 추천작 목록" onKeyDown={onKeyDown}>{items.map((item, itemIndex) => <li className="wm-pair-work-slide" key={item.canonicalWebtoonId} aria-label={`추천작 ${itemIndex + 1} / ${items.length}`}>
      <RecommendationCard item={item} profileId={publicProfileId} returnTo={returnTo} onOpen={() => prepareNavigation(itemIndex)} headingLevel={3} />
    </li>)}</ol>
    {items.length > 1 ? <div ref={barRef} className="wm-rail-scrollbar wm-personal-scrollbar" aria-hidden="true"><span ref={thumbRef} /></div> : null}
  </div>;
}
