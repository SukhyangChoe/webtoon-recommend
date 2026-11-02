'use client';

import { MatchLoading } from './MatchLoading';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MatchIcon } from './MatchIcon';
import { WorkCover } from './RecommendationWork';
import { WorkDetailLink } from './WorkDetailLink';
import { recommendationGenreLabel } from '../config/recommendationPresentation.mjs';
import { readWorkSearchState, searchBackPath, workSearchHref, WORK_SEARCH_STATE_KEY } from '../config/workSearchPresentation.mjs';
import type { WebtoonSummary } from '../server/webtoonCatalogStore';
import { CATALOG_ACCESS_POLICY_VERSION } from '../config/catalogAgePolicy.mjs';

type Results = { query: string; items: WebtoonSummary[]; page: number; hasMore: boolean; loading: boolean; moreLoading: boolean; error: string };
const empty = (query = ''): Results => ({ query, items: [], page: 0, hasMore: false, loading: false, moreLoading: false, error: '' });

async function requestPage(query: string, page: number, controller: AbortController) {
  const timer = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`/api/v1/webtoons/search?${new URLSearchParams({ q: query, scope: 'catalog', accessPolicy: CATALOG_ACCESS_POLICY_VERSION, page: String(page) })}`, { signal: controller.signal });
    if (!response.ok) throw new Error('검색하지 못했어요. 잠시 후 다시 시도해 주세요.');
    const body = await response.json();
    if (!Array.isArray(body.items) || typeof body.hasMore !== 'boolean' || body.page !== page) throw new Error('검색 결과를 확인하지 못했어요. 다시 시도해 주세요.');
    return body as { items: WebtoonSummary[]; hasMore: boolean; page: number };
  } finally { window.clearTimeout(timer); }
}

export function WorkSearchView() {
  const router = useRouter(), params = useSearchParams();
  const query = (params.get('q') ?? '').normalize('NFC').trim().slice(0, 100);
  const from = searchBackPath(params.get('from'));
  const href = workSearchHref(query, from);
  const [input, setInput] = useState(query);
  const [results, setResults] = useState<Results>(empty());
  const [retry, setRetry] = useState(0);
  const requestRef = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousQuery = useRef(query);

  useEffect(() => {
    const revision = ++generation.current;
    const previous = previousQuery.current;
    previousQuery.current = query;
    const controller = new AbortController();
    requestRef.current?.abort(); requestRef.current = controller;
    let active = true, frame = 0;
    void Promise.resolve().then(async () => {
      if (!active) return;
      // A slow URL transition must not overwrite a newer search the user is typing.
      setInput(value => value === previous ? query : value);
      if (!query) { setResults(empty()); return; }
      let cached = null;
      try { cached = retry === 0 ? readWorkSearchState(sessionStorage, query) : null; } catch { /* Storage is optional. */ }
      if (cached) {
        setResults({ ...cached, loading: false, moreLoading: false, error: '' });
        frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => { if (active) window.scrollTo({ top: cached.scrollY, behavior: 'instant' }); }); });
        return;
      }
      setResults({ ...empty(query), loading: true });
      try {
        const body = await requestPage(query, 1, controller);
        if (active && generation.current === revision) setResults({ ...body, query, loading: false, moreLoading: false, error: '' });
      } catch {
        if (active && generation.current === revision) setResults({ ...empty(query), error: '검색하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.' });
      }
    });
    return () => {
      active = false;
      // A numeric request generation, not a DOM ref: invalidate late responses after unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      requestRef.current?.abort(); cancelAnimationFrame(frame);
    };
  }, [query, retry]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = input.normalize('NFC').trim();
    if (!next) return;
    setInput(next);
    try { sessionStorage.removeItem(WORK_SEARCH_STATE_KEY); } catch { /* Optional cache. */ }
    if (next === query) setRetry(value => value + 1);
    else { setRetry(0); router.replace(workSearchHref(next, from), { scroll: false }); }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  async function more() {
    if (results.query !== query || results.loading || results.moreLoading || !results.hasMore) return;
    const revision = generation.current, controller = new AbortController();
    requestRef.current?.abort(); requestRef.current = controller;
    setResults(value => ({ ...value, moreLoading: true, error: '' }));
    try {
      const body = await requestPage(query, results.page + 1, controller);
      if (generation.current === revision) setResults(value => ({ ...value, items: [...new Map([...value.items, ...body.items].map(item => [item.canonicalWebtoonId, item])).values()], page: body.page, hasMore: body.hasMore, moreLoading: false }));
    } catch {
      if (generation.current === revision && !controller.signal.aborted) setResults(value => ({ ...value, moreLoading: false, error: '다음 작품을 불러오지 못했어요. 다시 시도해 주세요.' }));
      else if (generation.current === revision) setResults(value => ({ ...value, moreLoading: false, error: '응답이 지연되고 있어요. 다시 시도해 주세요.' }));
    }
  }

  function remember() {
    try {
      sessionStorage.removeItem(WORK_SEARCH_STATE_KEY);
      if (results.items.length <= 1000) sessionStorage.setItem(WORK_SEARCH_STATE_KEY, JSON.stringify({ query, items: results.items, page: results.page, hasMore: results.hasMore, scrollY: window.scrollY, savedAt: Date.now() }));
    } catch { /* The URL still preserves the search term. */ }
  }

  function clear() {
    setInput(''); setRetry(0);
    try { sessionStorage.removeItem(WORK_SEARCH_STATE_KEY); } catch { /* Optional cache. */ }
    router.replace(workSearchHref('', from), { scroll: false }); inputRef.current?.focus();
  }

  const loading = Boolean(query && (results.query !== query || results.loading));
  const visible = results.query === query ? results.items : [];
  return <main className="match-page wm-screen wm-work-search">
    <header className="wm-work-search-hero"><p className="wm-eyebrow">작품 검색</p><h1>궁금한 작품을<br />찾아보세요</h1><p>작품을 찾아보고, 내 취향과도 맞춰보세요.</p></header>
    <form className="wm-search-form" role="search" onSubmit={submit}><div className="wm-search-input"><MatchIcon name="search" /><input ref={inputRef} type="search" maxLength={100} value={input} onChange={event => setInput(event.target.value)} placeholder="작품명을 입력해 주세요" aria-label="작품명 검색" />{input ? <button type="button" aria-label="검색어 지우기" onClick={clear}><MatchIcon name="close" /></button> : null}</div><button className="match-button" type="submit" disabled={!input.trim()}>검색</button></form>
    <section className="wm-catalog-section" aria-label="작품 검색 결과" aria-busy={loading || results.moreLoading}>
      {loading ? <MatchLoading message="작품을 찾고 있어요…" /> : !query ? <div className="wm-catalog-message"><MatchIcon name="search" /><h2>어떤 작품이 궁금하세요?</h2><p>제목의 일부만 입력해도 찾을 수 있어요.<br />테스트 전에도 작품 정보를 볼 수 있어요.</p></div> : <>
        <div className="wm-catalog-heading"><h2>검색 결과</h2><span aria-live="polite">{visible.length}개 표시{results.hasMore ? ' · 더 있어요' : ''}</span></div>
        {visible.length ? <ul className="wm-catalog-list">{visible.map(item => <li key={item.canonicalWebtoonId}><WorkDetailLink id={item.canonicalWebtoonId} returnTo={href} onOpen={remember} className="wm-catalog-card" label={`${item.title} 작품 상세 보기`}><WorkCover item={item} sizes="80px" /><div className="wm-catalog-copy"><h3>{item.title}</h3><div><span className="wm-genre-tag">{recommendationGenreLabel(item.mainGenre)}</span><span className="wm-catalog-platform">{item.platform}</span></div>{item.introduction ? <p>{item.introduction}</p> : null}</div><MatchIcon name="chevron" /></WorkDetailLink></li>)}</ul> : !results.error ? <div className="wm-catalog-message"><MatchIcon name="book" /><h3>검색 결과가 없어요.</h3><p>다른 제목이나 짧은 검색어로 찾아보세요.</p></div> : null}
        {results.error ? <div className="wm-catalog-error" role="alert"><p>{results.error}</p><button type="button" onClick={() => visible.length ? void more() : setRetry(value => value + 1)}>다시 시도</button></div> : null}
        {results.hasMore && !results.error ? <button type="button" className="match-button match-button--secondary wm-catalog-more" disabled={results.moreLoading} onClick={() => void more()}>{results.moreLoading ? '불러오는 중…' : '작품 더 보기'}<MatchIcon name="down" /></button> : null}
      </>}
    </section>
  </main>;
}
