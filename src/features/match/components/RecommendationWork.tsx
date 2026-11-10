"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { recommendationGenreLabel, recommendationScrollTarget, recommendationTitleMotion, workCoverSources } from "../config/recommendationPresentation.mjs";
import { readRailOffset, writeRailOffset } from '../storage/workReturnStorage.mjs';
import { WorkDetailLink } from './WorkDetailLink';
import { useHorizontalScrollIndicator } from './useHorizontalScrollIndicator';
import { MatchIcon } from './MatchIcon';
import Link from 'next/link';

export type RecommendationWorkItem = {
  commentId?: string | null;
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

export function WorkCover({ item, eager = false, sizes, decorative = false }: { item: Pick<RecommendationWorkItem, "title" | "coverUrl">; eager?: boolean; sizes?: string; decorative?: boolean }) {
  const { src, srcSet } = workCoverSources(item.coverUrl);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return src && failedSrc !== src
    // eslint-disable-next-line @next/next/no-img-element -- Pre-sized immutable WebP variants are served directly by Storage CDN.
    ? <img className="wm-work-cover" src={src} srcSet={srcSet} sizes={srcSet ? (sizes ?? (eager ? '(max-width: 540px) 100vw, 540px' : '(max-width: 350px) 144px, 176px')) : undefined} alt={decorative ? '' : `${item.title} 작품 커버`} aria-hidden={decorative || undefined} width={83} height={129} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedSrc(src)} />
    : <div className="wm-work-cover wm-work-cover--empty" role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : '작품 커버 미등록'} aria-hidden={decorative || undefined}><span className="wm-cover-book" aria-hidden="true" /><span>커버 준비 중</span></div>;
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
      const overflow = Math.max(0, text.offsetWidth - heading.clientWidth);
      const { travel, duration, moveStartPercent, moveEndPercent } = recommendationTitleMotion(overflow ? overflow + 2 : 0);
      // Keep the entire title as one accessible heading, without duplicated text.
      heading.dataset.overflow = String(heading.clientWidth > 0 && overflow > 1);
      text.style.setProperty('--wm-title-travel', `${-travel}px`);
      text.style.setProperty('--wm-title-duration', `${duration}s`);
      text.style.setProperty('--wm-title-move-start', `${moveStartPercent}%`);
      text.style.setProperty('--wm-title-move-end', `${moveEndPercent}%`);
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
export function RecommendationCard({ item, returnTo, onOpen, headingLevel = 4, likeAction, onEdit }: {
  item: RecommendationWorkItem;
  returnTo: string;
  onOpen: () => void;
  headingLevel?: 3 | 4;
  likeAction?: { liked: boolean; saving: boolean; onToggle: () => void };
  onEdit?: () => void;
}) {
  return <article className={`wm-recommendation-card wm-pair-work-card${item.tasteFitHighlighted ? ' is-taste-fit' : ''}`}>
    <div className="wm-pair-work-artwork">
      {onEdit ? <button type="button" className="wm-work-card-link wm-work-edit-target" onClick={onEdit} aria-label={`${item.title} 추천 한마디 수정`}><WorkCover item={item} sizes="160px" /></button> : <WorkDetailLink id={item.canonicalWebtoonId} returnTo={returnTo} onOpen={onOpen} label={`${item.title} 작품 상세 보기`} className="wm-work-card-link"><WorkCover item={item} sizes="160px" /></WorkDetailLink>}
      {item.tasteFitHighlighted ? <span className="wm-pair-work-fit"><span aria-hidden="true">✦</span>취향 저격</span> : null}
      <div className="wm-pair-work-copy">
        {onEdit ? <button type="button" className="wm-pair-work-title wm-work-edit-target" onClick={onEdit} aria-label={`${item.title} 추천 수정`}><RecommendationTitle title={item.title} level={headingLevel} /></button> : <WorkDetailLink id={item.canonicalWebtoonId} returnTo={returnTo} onOpen={onOpen} className="wm-pair-work-title"><RecommendationTitle title={item.title} level={headingLevel} /></WorkDetailLink>}
        <div className="wm-pair-work-meta"><small>{item.mainGenreLabel ?? recommendationGenreLabel(item.mainGenre)}</small></div>
      </div>
    </div>
    {item.recommendationComment?.trim() ? <div className="wm-recommendation-comment" data-comment-id={item.commentId ?? undefined}>
      <blockquote><q>{item.recommendationComment}</q></blockquote>
      <div className="wm-comment-actions">
      {onEdit ? <button type="button" className="wm-recommendation-edit" aria-label={`${item.title} ${item.recommendationComment?.trim() ? '추천 코멘트 수정 및 삭제' : '추천 한마디 입력'}`} onClick={onEdit}><MatchIcon name="edit" /></button> : null}
      {likeAction ? <button type="button" className={`wm-pair-work-like${likeAction.liked ? ' is-liked' : ''}`} disabled={likeAction.saving} aria-pressed={likeAction.liked} aria-label={`${item.title} 추천 코멘트 ${likeAction.liked ? '좋아요 취소' : '좋아요'}`} onClick={event => { event.preventDefault(); event.stopPropagation(); likeAction.onToggle(); }}><span aria-hidden="true">{likeAction.liked ? '♥' : '♡'}</span><b>{item.likeCount ?? 0}</b></button> : <span className="wm-pair-work-like-count" aria-label={`추천 코멘트 좋아요 ${item.likeCount ?? 0}개`}><span aria-hidden="true">♡</span> {item.likeCount ?? 0}</span>}
    </div></div> : onEdit ? <button type="button" className="wm-recommendation-comment-needed" aria-label={`${item.title} 추천 한마디 입력`} onClick={onEdit}><b aria-hidden="true">!</b><span>추천 한마디</span></button> : null}
  </article>;
}

// Free native scrolling: persist pixels without snapping/re-aligning a selected card.
export function useRecommendationCarousel(count: number, restorationKey: string) {
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let storage: Storage | undefined;
    try { storage=window.sessionStorage; } catch { /* Optional storage. */ }
    let restored = false;
    const remember = () => {
      if (list.clientWidth) writeRailOffset(storage, restorationKey, list.scrollLeft);
    };
    const restore = () => {
      if (restored || !list.clientWidth) return;
      restored = true;
      const left = Math.min(readRailOffset(storage, restorationKey), Math.max(0, list.scrollWidth-list.clientWidth));
      list.scrollTo({ left, behavior: 'instant' });
    };
    restore();
    const observer = new ResizeObserver(restore);
    observer.observe(list);
    list.addEventListener('scroll', remember, { passive: true });
    return () => { remember(); observer.disconnect(); list.removeEventListener('scroll', remember); };
  }, [count, restorationKey]);
  function prepareNavigation() {
    const list = listRef.current;
    if (list) { try { writeRailOffset(sessionStorage, restorationKey, list.scrollLeft); } catch { /* Optional storage. */ } }
  }
  function onKeyDown(event: KeyboardEvent<HTMLOListElement>) {
    if (count <= 1 || event.target !== event.currentTarget || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const list = event.currentTarget;
    const left = recommendationScrollTarget(list.scrollLeft, list.clientWidth, list.scrollWidth, event.key);
    list.scrollTo({ left, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  return { listRef, prepareNavigation, onKeyDown, railKey: restorationKey };
}

export function PersonalRecommendationCarousel({ items, publicProfileId, onEdit, registrationHref }: { items: RecommendationWorkItem[]; publicProfileId?: string; onEdit?: (item: RecommendationWorkItem) => void; registrationHref?: string }) {
  const returnTo = publicProfileId ? `/match/result/${publicProfileId}` : '/match';
  const { listRef, railKey, prepareNavigation, onKeyDown } = useRecommendationCarousel(items.length, `personal:${returnTo}`);
  const { containerRef, barRef, thumbRef } = useHorizontalScrollIndicator(listRef, items.length);
  if (!items.length) return registrationHref ? <div className="wm-recommendation-empty">
    <p className="wm-recommendation-empty-title">아직 등록한 추천작이 없어요.</p>
    <p className="wm-recommendation-empty-copy">좋아하는 작품을 등록하면 내 취향이 결과와 오늘의 취향작에 더 잘 반영돼요.</p>
    <Link className="wm-recommendation-register-link wm-recommendation-register-button" href={registrationHref}>추천작 등록하기</Link>
  </div> : <p className="wm-empty">아직 등록한 추천작이 없어요.</p>;
  return <div ref={containerRef} className="wm-personal-carousel">
    <ol ref={listRef} data-recommendation-rail={railKey} className={`wm-pair-work-track${items.length === 1 ? ' is-single' : ''}`} tabIndex={items.length > 1 ? 0 : undefined} aria-label="내 추천작 목록" onKeyDown={onKeyDown}>{items.map((item, itemIndex) => <li className="wm-pair-work-slide" key={item.canonicalWebtoonId} aria-label={`추천작 ${itemIndex + 1} / ${items.length}`}>
      <RecommendationCard item={item} returnTo={returnTo} onOpen={prepareNavigation} headingLevel={3} onEdit={onEdit ? () => onEdit(item) : undefined} />
    </li>)}</ol>
    {items.length > 1 ? <div ref={barRef} className="wm-rail-scrollbar wm-personal-scrollbar" aria-hidden="true"><span ref={thumbRef} /></div> : null}
  </div>;
}
