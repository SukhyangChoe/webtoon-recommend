"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BackIcon } from '@/components/layout/BackIcon';
import { MatchLoading } from './MatchLoading';
import { MatchIcon } from './MatchIcon';
import { WorkCover, type RecommendationWorkItem } from './RecommendationWork';
import { RecommendationEditor } from './RecommendationEditor';
import { RECOMMENDATION_SEARCH_POLICY_VERSION, isRecommendationRegistrationBlocked } from '../config/recommendationPolicy.mjs';
import { WorkSearchDropdown, WorkSearchResultContent } from './WorkSearchResults';
import { useWorkSearchDropdown } from './useWorkSearchDropdown';
import { recommendationManagerHref, recommendationReturnLabel, recommendationReturnPath } from '../config/recommendationOnboarding.mjs';

type Webtoon = RecommendationWorkItem & { recommendationRegistrationBlocked?: boolean };

export function RecommendationManager({ publicProfileId, returnTo, initialSelected, initialLoadFailed = false }: {
  publicProfileId: string; returnTo?: string; initialSelected: Webtoon[]; initialLoadFailed?: boolean;
}) {
  const destination = recommendationReturnPath(returnTo, publicProfileId);
  const returnLabel = recommendationReturnLabel(destination);
  const managerHref = recommendationManagerHref(publicProfileId, returnTo);
  const [selected, setSelected] = useState<Webtoon[]>(initialSelected);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Webtoon[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<{ item: Webtoon; mode: 'add' | 'edit' } | null>(null);
  const searchAnchor = useWorkSearchDropdown(searchOpen, () => setSearchOpen(false));
  const searchInput = useRef<HTMLInputElement>(null);
  const searchController = useRef<AbortController | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => () => searchController.current?.abort(), []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function changeQuery(value: string) {
    searchController.current?.abort(); searchController.current = null;
    setQuery(value); setResults([]); setSearched(false); setSearching(false); setSearchOpen(false);
  }
  function closeSearch() {
    setSearchOpen(false); searchInput.current?.focus({ preventScroll: true });
  }
  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true); setSearched(false); setSearchOpen(true); setSearchTerm(query.trim()); setResults([]); setMessage('');
    searchController.current?.abort();
    const controller = new AbortController(); searchController.current = controller;
    try {
      const response = await fetch(`/api/v1/webtoons/search?q=${encodeURIComponent(query.trim())}&registrationPolicy=${RECOMMENDATION_SEARCH_POLICY_VERSION}`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]), cache: 'no-store',
      });
      const body = await response.json();
      if (controller.signal.aborted || searchController.current !== controller) return;
      if (!response.ok || !Array.isArray(body.items)) throw Error('SEARCH_FAILED');
      setResults(body.items.filter((item: Webtoon) => !isRecommendationRegistrationBlocked(item))); setSearched(true);
    } catch {
      if (controller.signal.aborted || searchController.current !== controller) return;
      setSearchOpen(false); setMessage('작품을 검색하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (searchController.current === controller) { searchController.current = null; setSearching(false); }
    }
  }
  function openEditor(item: Webtoon, trigger: HTMLElement, fromSearch = false) {
    if (initialLoadFailed) return;
    const existing = selected.find(work => work.canonicalWebtoonId === item.canonicalWebtoonId);
    if (!existing && (selected.length >= 10 || isRecommendationRegistrationBlocked(item))) return;
    returnFocus.current = fromSearch ? searchInput.current : trigger;
    setSearchOpen(false); setMessage(''); setNotice('');
    setEditor({ item: existing ?? item, mode: existing ? 'edit' : 'add' });
  }
  function closeEditor() {
    setEditor(null);
    requestAnimationFrame(() => {
      const target = returnFocus.current?.isConnected ? returnFocus.current : searchInput.current;
      target?.focus({ preventScroll: true });
    });
  }

  return <main className="match-page match-recommendation-manager wm-screen wm-manager-screen wm-library-manager">
    <nav className="wm-local-nav" aria-label="추천작 관리 화면 이동"><Link className="site-back-control" href={destination} aria-label={`${returnLabel}${destination.startsWith('/match/c/') ? '으로' : '로'} 돌아가기`}><BackIcon /></Link></nav>
    <div className="wm-library-toolbar">
    <section className="wm-manager-section wm-search-section" aria-labelledby="wm-library-search-title">
      <h2 id="wm-library-search-title" className="wm-sr-only">작품 검색</h2>
      <div ref={searchAnchor} className="wm-manager-search-anchor" onKeyDown={event => {
        if (event.key === 'Escape' && searchOpen) { event.preventDefault(); event.stopPropagation(); closeSearch(); }
      }}>
        <form className="wm-search-form" onSubmit={search}>
          <div className="wm-search-input"><MatchIcon name="search" /><input ref={searchInput} type="search" value={query} onChange={event => changeQuery(event.target.value)} onClick={() => { if (searched || searching) setSearchOpen(true); }} onKeyDown={event => {
            if (event.key !== 'ArrowDown' || !searched && !searching) return;
            event.preventDefault(); setSearchOpen(true);
            requestAnimationFrame(() => searchAnchor.current?.querySelector<HTMLButtonElement>('[data-search-work]:not(:disabled)')?.focus());
          }} placeholder="작품 제목으로 찾아보세요" aria-label="추천할 웹툰 검색" aria-controls={searchOpen ? 'wm-manager-search-results' : undefined} aria-haspopup="dialog" />{query ? <button type="button" aria-label="검색어 지우기" onClick={() => { changeQuery(''); searchInput.current?.focus(); }}>×</button> : null}</div>
          <button className="match-button" type="submit" aria-haspopup="dialog" aria-controls={searchOpen ? 'wm-manager-search-results' : undefined} aria-expanded={searchOpen} disabled={searching || !query.trim()}>{searching ? '검색 중' : '검색'}</button>
        </form>
        {searchOpen ? <WorkSearchDropdown id="wm-manager-search-results" titleId="wm-search-dropdown-title" loading={searching} count={searched ? results.length : undefined} onClose={closeSearch}>
            {searching ? <MatchLoading message="추천할 작품을 찾고 있어요…" /> : null}
            {searched && results.length ? <ul className="wm-library-search-results">{results.map(item => {
              const added = selected.some(work => work.canonicalWebtoonId === item.canonicalWebtoonId);
              return <li key={item.canonicalWebtoonId}><button data-search-work className="wm-search-result" type="button" disabled={initialLoadFailed || !added && selected.length >= 10} aria-label={`${item.title} ${added ? '추천 한마디 수정' : '추천작 담기'}`} onClick={event => openEditor(item, event.currentTarget, true)}>
                <WorkSearchResultContent item={item} selected={added} action={added ? 'edit' : 'add'} />
              </button></li>;
            })}</ul> : searched && !searching ? <p className="wm-empty">‘{searchTerm}’ 검색 결과가 없어요.<br />다른 제목으로 검색해 보세요.</p> : null}
        </WorkSearchDropdown> : null}
      </div>
      <span className="wm-sr-only" role="status">{searched ? `검색 결과 ${results.length}편. 작품을 누르면 추천 한마디를 작성할 수 있어요.` : ''}</span>
    </section>
    <header className="wm-library-identity">
      <div><div className="wm-library-title-row"><h1 id="wm-library-title">내 추천작 관리</h1><span className="wm-count" aria-label={`${selected.length}개, 최대 10개`}>{selected.length} / 10</span></div><p>친구에게 건네고 싶은 웹툰</p></div>
      <svg className="wm-library-symbol" width="82" height="72" viewBox="0 0 82 72" fill="none" aria-hidden="true" focusable="false">
        <ellipse cx="41" cy="39" rx="37" ry="30" fill="#e0f6fa" />
        <g stroke="#6899a8" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
          <path d="M10 62h62" />
          <rect x="16" y="25" width="12" height="36" rx="2.5" fill="#d4eaf0" />
          <path d="M20 31h4m-4 23h4" />
          <g transform="rotate(-10 39 60)">
            <rect x="29" y="13" width="19" height="48" rx="3" fill="#fff" />
            <path d="M34 14v46" stroke="#bddce5" />
            <path d="M39 14h6v13l-3-2-3 2V14Z" fill="#4ed7c1" stroke="#29a793" />
            <path d="M39 49h5m-5 5h5" />
          </g>
          <path d="m52 27 8-2a2 2 0 0 1 2.4 1.5l7 30.5a2 2 0 0 1-1.5 2.4l-8 1.9a2 2 0 0 1-2.4-1.5l-7-30.4A2 2 0 0 1 52 27Z" fill="#99dce9" />
          <path d="m55 33 5-1m1 21 5-1" />
        </g>
      </svg>
    </header>
    </div>
    <section className="wm-manager-section wm-library-collection" aria-labelledby="wm-library-title">
      {initialLoadFailed ? <p className="wm-load-error" role="alert">추천작을 불러오지 못했어요. 기존 목록을 보호하기 위해 수정을 잠시 막았어요. <button type="button" onClick={() => window.location.reload()}>다시 불러오기</button></p> : selected.length ? <ol className="wm-library-grid">{selected.map(item => <li key={item.canonicalWebtoonId}><button type="button" aria-label={`${item.title} 추천 한마디 ${item.recommendationComment?.trim() ? '수정' : '입력'}`} title={item.title} onClick={event => openEditor(item, event.currentTarget)}><WorkCover item={item} sizes="(max-width: 540px) 30vw, 160px" decorative /><span className="wm-library-work-title">{item.title}</span>{!item.recommendationComment?.trim() ? <span className="wm-library-comment-needed"><b aria-hidden="true">!</b> 추천 한마디<span className="wm-sr-only">를 남겨주세요</span></span> : null}</button></li>)}</ol> : <div className="wm-library-empty"><span className="wm-library-empty-icon" aria-hidden="true"><MatchIcon name="book" /></span><p>등록한 추천작이 없어요.</p></div>}
      <p className="wm-library-footnote">최대 10편까지 저장할 수 있어요.</p>
    </section>
    {message || notice ? <div className={`wm-floating-toast${message ? ' is-error' : ''}`} role={message ? 'alert' : 'status'}><span>{message || notice}</span><button type="button" aria-label="알림 닫기" onClick={() => { setMessage(''); setNotice(''); }}>×</button></div> : null}
    {editor ? <RecommendationEditor key={editor.item.canonicalWebtoonId} item={editor.item} mode={editor.mode} publicProfileId={publicProfileId} returnTo={managerHref} confirmUnsaved onClose={closeEditor} onSaved={items => {
      setSelected(items); setMessage('');
      setNotice(items.length < selected.length ? '목록에서 뺐어요. 코멘트는 보관되며 다시 추가하면 불러올 수 있어요.' : editor.mode === 'add' ? '추천작을 서재에 담았어요.' : '추천 한마디를 저장했어요.');
    }} /> : null}
  </main>;
}
