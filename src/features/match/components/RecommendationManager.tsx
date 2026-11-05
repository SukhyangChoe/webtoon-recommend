"use client";

import { MatchLoading } from './MatchLoading';

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MatchIcon } from './MatchIcon';
import { RECOMMENDATION_COMMENT_MAX_LENGTH, RECOMMENDATION_SEARCH_POLICY_VERSION, RECOMMENDATION_AGE_RESTRICTION_MESSAGE, isRecommendationRegistrationBlocked } from "../config/recommendationPolicy.mjs";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackIcon } from '@/components/layout/BackIcon';
import { WorkCover } from "./RecommendationWork";
import { WorkDetailLink } from './WorkDetailLink';
import { appendRecommendationReason, recommendationGenreLabel, reorderRecommendation } from "../config/recommendationPresentation.mjs";
import { recommendationManagerHref, recommendationReturnLabel, recommendationReturnPath } from '../config/recommendationOnboarding.mjs';

type Webtoon = {
  canonicalWebtoonId: string;
  title: string;
  platform: string;
  officialUrl: string | null;
  mainGenre: string;
  coverUrl?: string | null;
  introduction?: string | null;
  recommendationComment?: string | null;
  likeCount?: number;
  likedByViewer?: boolean;
  recommendationRegistrationBlocked?: boolean;
};

const quickReasons = ["작화가 좋아요", "전개가 빨라요", "케미가 좋아요"];

export function RecommendationManager({ publicProfileId, returnTo, initialSelected, initialLoadFailed = false }: { publicProfileId: string; returnTo?: string; initialSelected: Webtoon[]; initialLoadFailed?: boolean }) {
  const router = useRouter();
  const destination = recommendationReturnPath(returnTo, publicProfileId);
  const returnLabel = recommendationReturnLabel(destination);
  const returnLinkLabel = `${returnLabel}${destination.startsWith('/match/c/') ? '으로' : '로'} 돌아가기`;
  const managerHref = recommendationManagerHref(publicProfileId, returnTo);
  const [selected, setSelected] = useState<Webtoon[]>(initialSelected);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Webtoon[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchAnchor = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState(initialLoadFailed ? "추천작을 불러오지 못했어요." : "");
  const [removedWorkId, setRemovedWorkId] = useState<string | null>(null);
  const searchController = useRef<AbortController | null>(null);
  const restoreController = useRef<AbortController | null>(null);
  const commentDrafts = useRef(new Map(initialSelected.map(item => [item.canonicalWebtoonId, item.recommendationComment ?? null])));
  const [addingId, setAddingId] = useState<string | null>(null);
  const [restoredIds, setRestoredIds] = useState<Set<string>>(new Set());
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [reorderId, setReorderId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const hasRestrictedSelection = selected.some(isRecommendationRegistrationBlocked);

  useEffect(() => () => { searchController.current?.abort(); restoreController.current?.abort(); }, []);
  useEffect(() => {
    if (!removedWorkId) return;
    const timer = window.setTimeout(() => setRemovedWorkId(null), 4500);
    return () => window.clearTimeout(timer);
  }, [removedWorkId]);

  useEffect(() => {
    if (!searchOpen) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchAnchor.current?.contains(event.target)) setSearchOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [searchOpen]);

  useLayoutEffect(() => {
    const anchor = searchAnchor.current;
    if (!searchOpen || !anchor) return;
    function measure() {
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect(), viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const footer = document.querySelector('.wm-save-tray')?.getBoundingClientRect();
      const bottom = footer && footer.top > rect.bottom ? Math.min(viewportBottom, footer.top) : viewportBottom;
      const header = document.querySelector('.brand-bar')?.getBoundingClientRect().bottom ?? viewportTop;
      const below = bottom - rect.bottom - 12, above = rect.top - Math.max(viewportTop, header) - 12;
      const upwards = below < 180 && above > below;
      anchor.dataset.dropdownSide = upwards ? 'above' : 'below';
      anchor.style.setProperty('--wm-dropdown-height', `${Math.max(80, Math.min(420, upwards ? above : below))}px`);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(anchor);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive:true });
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);
    measure();
    return () => {
      observer.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure);
      window.visualViewport?.removeEventListener('resize', measure); window.visualViewport?.removeEventListener('scroll', measure);
    };
  }, [searchOpen]);

  function changeQuery(value: string) {
    searchController.current?.abort(); searchController.current = null;
    setQuery(value); setResults([]); setSearched(false); setSearching(false); setSearchOpen(false);
  }

  function closeSearch() {
    setSearchOpen(false);
    searchInput.current?.focus({ preventScroll:true });
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearched(false);
    setSearchOpen(true);
    setSearchTerm(query.trim());
    setResults([]);
    setMessage("");
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    try {
      const response = await fetch(`/api/v1/webtoons/search?q=${encodeURIComponent(query.trim())}&registrationPolicy=${RECOMMENDATION_SEARCH_POLICY_VERSION}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]), cache: 'no-store' });
      const body = await response.json();
      if (controller.signal.aborted || searchController.current !== controller) return;
      if (!response.ok) throw new Error();
      setResults(Array.isArray(body.items) ? body.items.filter((item: Webtoon) => !isRecommendationRegistrationBlocked(item)) : []);
      setSearched(true);
    } catch {
      if (controller.signal.aborted || searchController.current !== controller) return;
      setSearchOpen(false);
      setMessage("작품을 검색하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (searchController.current === controller) { searchController.current = null; setSearching(false); }
    }
  }

  async function add(item: Webtoon) {
    if (saving || restoreController.current) return;
    setMessage("");
    if (isRecommendationRegistrationBlocked(item)) {
      setMessage(RECOMMENDATION_AGE_RESTRICTION_MESSAGE);
      return;
    }
    if (selected.some((selectedItem) => selectedItem.canonicalWebtoonId === item.canonicalWebtoonId)) {
      setMessage("이미 추천 목록에 있는 작품이에요.");
      return;
    }
    if (selected.length >= 10) {
      setMessage("추천작은 최대 10개까지 등록할 수 있어요.");
      return;
    }
    let comment = commentDrafts.current.get(item.canonicalWebtoonId) ?? null;
    if (!commentDrafts.current.has(item.canonicalWebtoonId)) {
      const controller = new AbortController(); restoreController.current = controller; setAddingId(item.canonicalWebtoonId);
      try {
        const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
        const response = await fetch(`/api/v1/results/${publicProfileId}/recommendation-comments/${encodeURIComponent(item.canonicalWebtoonId)}`, { headers: { 'x-match-anonymous-id': identity.anonymousId }, cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) });
        const body = await response.json();
        if (!response.ok || !body || !Object.hasOwn(body, 'recommendationComment') || (body.recommendationComment !== null && typeof body.recommendationComment !== 'string')) throw new Error('COMMENT_RESTORE_FAILED');
        comment = typeof body.recommendationComment === 'string' ? body.recommendationComment : null;
        commentDrafts.current.set(item.canonicalWebtoonId, comment);
        if (comment) setRestoredIds(ids => new Set([...ids, item.canonicalWebtoonId]));
      } catch {
        if (!controller.signal.aborted) setMessage('이전 코멘트를 확인하지 못했어요. 내용을 보호하기 위해 추가하지 않았어요. 다시 시도해 주세요.');
        return;
      } finally {
        restoreController.current = null;
        if (!controller.signal.aborted) setAddingId(null);
      }
      if (controller.signal.aborted) return;
    }
    setSelected(items => items.some(selectedItem => selectedItem.canonicalWebtoonId === item.canonicalWebtoonId) || items.length >= 10 ? items : [...items, { ...item, recommendationComment: comment }]);
    setRemovedWorkId(null);
  }

  function remove(canonicalWebtoonId: string) {
    setMessage(''); setRemovedWorkId(canonicalWebtoonId);
    setSelected((items) => { const removed=items.find(item=>item.canonicalWebtoonId===canonicalWebtoonId); if(removed)commentDrafts.current.set(canonicalWebtoonId,removed.recommendationComment??null); return items.filter((item) => item.canonicalWebtoonId !== canonicalWebtoonId); });
  }

  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= selected.length) return;
    setSelected((items) => {
      const next = [...items];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  function updateComment(canonicalWebtoonId: string, recommendationComment: string) {
    setMessage("");
    commentDrafts.current.set(canonicalWebtoonId,recommendationComment);
    setSelected((items) => items.map((item) => (
      item.canonicalWebtoonId === canonicalWebtoonId
        ? { ...item, recommendationComment }
        : item
    )));
  }

  async function save() {
    if (saving || initialLoadFailed || addingId) return;
    if (hasRestrictedSelection) { setMessage(RECOMMENDATION_AGE_RESTRICTION_MESSAGE); return; }
    setSaving(true);
    setMessage("");
    try {
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      const response = await fetch(`/api/v1/results/${publicProfileId}/recommendations`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          anonymousId: identity.anonymousId,
          recommendations: selected.map((item) => ({
            canonicalWebtoonId: item.canonicalWebtoonId,
            recommendationComment: item.recommendationComment ?? null,
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (body.error === 'RECOMMENDATION_AGE_VERIFICATION_REQUIRED') throw new Error(RECOMMENDATION_AGE_RESTRICTION_MESSAGE);
        if (body.error === "WEBTOON_NOT_AVAILABLE") throw new Error("현재 등록할 수 없는 작품이 포함되어 있어요.");
        if (body.error === "RESULT_OWNER_MISMATCH") throw new Error("이 추천 목록을 수정할 권한이 없어요.");
        throw new Error("추천작을 저장하지 못했어요.");
      }
      window.dispatchEvent(new CustomEvent('match-recommendations-changed', { detail: { profileId: publicProfileId, count: selected.length } }));
      router.replace(destination);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "추천작을 저장하지 못했어요.");
      setSaving(false);
    }
  }

  return <main className="match-page match-recommendation-manager wm-screen wm-manager-screen">
    <nav className="wm-local-nav" aria-label="추천작 관리 화면 이동"><Link className="site-back-control" href={destination} aria-label={returnLinkLabel}><BackIcon /></Link></nav>
    <header className="wm-manager-hero"><div><p className="wm-eyebrow">내 추천작</p><h1>친구에게 추천할 작품을<br />골라 주세요</h1><p className="wm-note">최대 10개까지 등록할 수 있어요.</p></div><div className="wm-hero-book" aria-hidden="true"><span>♛</span><i>GOOD<br />WEBTOON<br />FOR YOU</i></div></header>
    <section className="wm-manager-section wm-search-section"><h2>작품 검색</h2>
      <div ref={searchAnchor} className="wm-manager-search-anchor" onKeyDown={event => {
        if (event.key === 'Escape' && searchOpen) { event.preventDefault(); event.stopPropagation(); closeSearch(); }
      }}>
        <form className="wm-search-form" onSubmit={search}><div className="wm-search-input"><span aria-hidden="true">⌕</span><input ref={searchInput} type="search" value={query} onChange={event => changeQuery(event.target.value)} onClick={() => { if (searched) setSearchOpen(true); }} onKeyDown={event => {
          if (event.key !== 'ArrowDown' || !searched && !searching) return;
          event.preventDefault(); setSearchOpen(true);
          requestAnimationFrame(() => searchAnchor.current?.querySelector<HTMLElement>('[data-search-add]:not(:disabled), .wm-search-results a')?.focus());
        }} placeholder="작품명을 입력해 주세요" aria-label="추천할 웹툰 검색" aria-controls="wm-manager-search-results" aria-haspopup="dialog" />{query ? <button type="button" aria-label="검색어 지우기" onClick={() => { changeQuery(''); searchInput.current?.focus(); }}>×</button> : null}</div><button ref={searchButton} className="match-button" type="submit" aria-haspopup="dialog" aria-controls="wm-manager-search-results" aria-expanded={searchOpen} disabled={searching || saving || !query.trim()}>{searching ? "검색 중" : "검색"}</button></form>
        {searchOpen ? <section id="wm-manager-search-results" className="wm-search-dropdown" role="dialog" aria-modal="false" aria-labelledby="wm-search-dropdown-title" aria-busy={searching}>
          <header className="wm-search-dropdown-heading"><h3 id="wm-search-dropdown-title">{searching ? '작품을 찾고 있어요' : '검색 결과'}{searched ? <small>{results.length}편</small> : null}</h3><button type="button" aria-label="검색 결과 닫기" onClick={closeSearch}><MatchIcon name="close" /></button></header>
          <div className="wm-search-dropdown-scroll">
            {searching ? <MatchLoading message="추천할 작품을 찾고 있어요…" /> : null}
            {searched && results.length ? <ul className="wm-search-results">{results.map(item => {
              const added = selected.some(selectedItem => selectedItem.canonicalWebtoonId === item.canonicalWebtoonId);
              return <li key={item.canonicalWebtoonId}><WorkDetailLink id={item.canonicalWebtoonId} returnTo={managerHref} className="wm-work-card-link" newTab label={`${item.title} 작품 상세 보기 (새 탭)`}><WorkCover item={item} /></WorkDetailLink><div className="wm-work-copy"><WorkDetailLink id={item.canonicalWebtoonId} returnTo={managerHref} className="wm-work-card-link" newTab><h3>{item.title}</h3></WorkDetailLink><span className="wm-genre-tag">{recommendationGenreLabel(item.mainGenre)}</span>{item.introduction ? <p className="wm-note" title={item.introduction}>{item.introduction}</p> : null}</div><button data-search-add type="button" disabled={saving || initialLoadFailed || Boolean(addingId) || added || selected.length >= 10} onClick={() => void add(item)}>{addingId === item.canonicalWebtoonId ? '불러오는 중…' : added ? "추가됨" : "추가"}</button></li>;
            })}</ul> : searched && !searching ? <p className="wm-empty">‘{searchTerm}’ 검색 결과가 없어요.<br />다른 제목으로 검색해 보세요.</p> : null}
          </div>
        </section> : null}
      </div>
      <span className="wm-sr-only" role="status">{searched ? `검색 결과 ${results.length}편. 작품을 추가하면 선택한 목록에 담겨요.` : ''}</span>
      {saving ? <MatchLoading compact message="추천작을 저장하고 있어요…" /> : null}
    </section>
    <section className="wm-manager-section"><div className="wm-panel-heading"><h2>선택한 작품</h2><span className="wm-count">{selected.length} / 10</span></div>
      {initialLoadFailed ? <p className="wm-load-error" role="alert">추천작을 불러오지 못했어요. 기존 목록을 보호하기 위해 저장을 잠시 막았어요. <button type="button" onClick={() => window.location.reload()}>다시 불러오기</button></p> : null}
      {hasRestrictedSelection ? <p className="wm-load-error" role="alert">{RECOMMENDATION_AGE_RESTRICTION_MESSAGE} 등록할 수 없는 작품을 목록에서 삭제한 뒤 저장해 주세요.</p> : null}
      {selected.length ? <ol className="wm-selected-list">{selected.map((item, index) => <li key={item.canonicalWebtoonId} className={draggedId === item.canonicalWebtoonId ? "is-dragging" : ""} onDragOver={event => { if (!saving && draggedId) event.preventDefault(); }} onDrop={event => { event.preventDefault(); if (saving || !draggedId) return; setSelected(items => reorderRecommendation(items, draggedId, item.canonicalWebtoonId)); setDraggedId(null); }}>
        <div className="wm-selected-header"><div className="wm-numbered-cover"><WorkDetailLink id={item.canonicalWebtoonId} returnTo={managerHref} className="wm-work-card-link" newTab label={`${item.title} 작품 상세 보기 (새 탭)`}><WorkCover item={item} /></WorkDetailLink><span>{index + 1}</span></div><div className="wm-work-copy"><WorkDetailLink id={item.canonicalWebtoonId} returnTo={managerHref} className="wm-work-card-link" newTab><h3>{item.title}</h3></WorkDetailLink><div className="wm-work-meta"><span className="wm-genre-tag">{recommendationGenreLabel(item.mainGenre)}</span></div></div><div className="wm-card-tools">
          <button className="wm-drag-handle" type="button" draggable={!saving} disabled={saving} aria-label={`${item.title} 순서 변경`} aria-expanded={reorderId === item.canonicalWebtoonId} title="드래그하거나 눌러 순서를 변경하세요" onDragStart={event => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.canonicalWebtoonId); setDraggedId(item.canonicalWebtoonId); }} onDragEnd={() => setDraggedId(null)} onClick={() => setReorderId(reorderId === item.canonicalWebtoonId ? null : item.canonicalWebtoonId)}>⠿</button>
          <button type="button" disabled={saving} onClick={() => remove(item.canonicalWebtoonId)} aria-label={`${item.title} 추천작에서 삭제`}><span className="wm-trash-icon" aria-hidden="true" /></button>
        </div></div>
        {reorderId === item.canonicalWebtoonId ? <div className="wm-reorder-actions"><button type="button" disabled={saving || index === 0} onClick={() => move(index, -1)}>↑ 위로 이동</button><button type="button" disabled={saving || index === selected.length - 1} onClick={() => move(index, 1)}>↓ 아래로 이동</button></div> : null}
        {isRecommendationRegistrationBlocked(item) ? <p className="wm-load-error">현재 등록할 수 없는 작품이에요.</p> : null}
        <label className="wm-comment-field"><span className="wm-sr-only">{item.title} 추천 이유 (선택, 최대 80자)</span><textarea rows={2} disabled={saving} maxLength={RECOMMENDATION_COMMENT_MAX_LENGTH} placeholder="추천 이유 한마디 (선택)" value={item.recommendationComment ?? ""} onFocus={() => setActiveCommentId(item.canonicalWebtoonId)} onChange={event => updateComment(item.canonicalWebtoonId, event.target.value)} /><small>{[...(item.recommendationComment ?? "")].length} / {RECOMMENDATION_COMMENT_MAX_LENGTH}</small></label>
        {restoredIds.has(item.canonicalWebtoonId) ? <p className="wm-note wm-restored-comment">이전 코멘트를 불러왔어요. 그대로 저장하거나 수정할 수 있어요.</p> : null}
        {activeCommentId === item.canonicalWebtoonId ? <div className="wm-quick-reasons"><p>추천 이유를 빠르게 추가해 보세요!</p><div>{quickReasons.map(reason => <button type="button" disabled={saving} key={reason} onClick={() => { const next = appendRecommendationReason(item.recommendationComment ?? "", reason, RECOMMENDATION_COMMENT_MAX_LENGTH); if (next === null) { setMessage("추천 이유는 80자까지 적을 수 있어요."); return; } updateComment(item.canonicalWebtoonId, next); }}>{reason}</button>)}</div></div> : null}
      </li>)}</ol> : !initialLoadFailed ? <p className="wm-empty">검색해서 추천작을 추가해 주세요.</p> : null}
    </section>
    {message && !initialLoadFailed ? <div className="wm-floating-toast is-error" role="alert"><span>{message}</span><button type="button" aria-label="알림 닫기" onClick={() => setMessage("")}>×</button></div> : removedWorkId ? <div className="wm-floating-toast" role="status"><span>목록에서 뺐어요. 코멘트는 보관돼요.<br />다시 추가하면 이전 내용을 불러옵니다.</span><button type="button" aria-label="삭제 안내 닫기" onClick={() => setRemovedWorkId(null)}>×</button></div> : null}
    <div className="wm-save-tray"><span><strong>{selected.length}개</strong> 선택됨</span><button className="match-button" type="button" disabled={saving || initialLoadFailed || hasRestrictedSelection || Boolean(addingId)} onClick={() => void save()}>{saving ? "저장 중…" : returnTo ? `저장하고 ${returnLabel} 보기` : "추천작 저장"}</button></div>
  </main>;
}
