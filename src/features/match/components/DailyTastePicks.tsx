'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ensureAnonymousId } from '../storage/anonymousIdentity.mjs';
import { loadWorkResource } from '../api/loadWorkResource.mjs';
import { WorkCover } from './RecommendationWork';
import { WorkDetailLink } from './WorkDetailLink';
import { MatchIcon } from './MatchIcon';
import { MatchLoading } from './MatchLoading';
import { TasteAvoidanceWarning, type AvoidanceWarning } from './TasteAvoidanceWarning';

type DailyPick = { canonicalWebtoonId: string; title: string; mainGenreLabel: string; platform: string; coverUrl: string | null; avoidanceWarnings?: AvoidanceWarning[] };
type DailyPicks = { publicProfileId: string; mode: 'personalized' | 'preparing'; selectionVersion: string; expiresAt?: string; retryAfterMs?: number; items: DailyPick[] };
const OPEN_HASH = '#daily-picks';
const CHANGE_EVENT = 'wm-daily-picks-change';
function subscribe(listener: () => void) {
  for (const event of ['popstate', 'hashchange', CHANGE_EVENT]) window.addEventListener(event, listener);
  return () => { for (const event of ['popstate', 'hashchange', CHANGE_EVENT]) window.removeEventListener(event, listener); };
}

/** Independent from the result request: selection stays on the private daily-picks API. */
export function DailyTastePicks({ publicProfileId, verified }: { publicProfileId: string; verified: boolean }) {
  const open = useSyncExternalStore(subscribe, () => window.location.hash === OPEN_HASH, () => false);
  const [data, setData] = useState<DailyPicks | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pushedEntry = useRef(false);
  const loading = useRef(false);
  const pendingSince = useRef<number | null>(null);
  const restoreScroll = useRef<number | null>(null);
  const restorePage = useRef<number | null>(null);
  const titleId = useId();
  const copyId = useId();
  const storageKey = `webtoon-match:daily-picks-return:v1:${publicProfileId}`;
  const items = data?.mode === 'personalized' ? data.items : [];

  useEffect(() => {
    if (!verified) return;
    const controller = new AbortController();
    let active = true;
    loading.current = true;
    async function load() {
      setError('');
      try {
        const identity = ensureAnonymousId({ cookieText: document.cookie, storage: localStorage });
        const body = await loadWorkResource(`/api/v1/results/${encodeURIComponent(publicProfileId)}/daily-picks`, {
          headers: { 'x-match-anonymous-id': identity.anonymousId }, signal: controller.signal, timeoutMs: 65000,
        }) as DailyPicks;
        if (body.publicProfileId !== publicProfileId || !['personalized', 'preparing'].includes(body.mode) || !Array.isArray(body.items)) throw new Error('INVALID_DAILY_PICKS');
        if (active) {
          if (body.mode === 'personalized') pendingSince.current = null;
          else pendingSince.current ??= Date.now();
          setData(body);
        }
      } catch {
        if (active && !controller.signal.aborted) {
          setData(null);
          setError('작품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
        }
      } finally {
        if (active) loading.current = false;
      }
    }
    void load();
    return () => { active = false; loading.current = false; controller.abort(); };
  }, [publicProfileId, verified, retry]);

  useEffect(() => {
    if (!verified || error || data?.mode !== 'preparing') return;
    if (pendingSince.current !== null && Date.now() - pendingSince.current >= 120000) {
      setError('추천 준비가 지연되고 있어요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    const timer = window.setTimeout(() => setRetry(value => value + 1), Math.min(5000, Math.max(1000, data.retryAfterMs ?? 2000)));
    return () => window.clearTimeout(timer);
  }, [data, error, verified]);

  useEffect(() => {
    if (data?.mode !== 'personalized' || !verified) return;
    // Re-check current input after managing recommendations in another screen/tab.
    // Midnight refresh does not introduce a daily randomization bonus.
    // Focus and visibility often fire together. One persisted-cache read suffices;
    // never cancel an already-running first calculation to start another request.
    let debounce: number | undefined;
    const refresh = () => {
      if (document.visibilityState !== 'visible' || loading.current) return;
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        if (!loading.current) setRetry(value => value + 1);
      }, 300);
    };
    const expiry = Date.parse(data.expiresAt ?? '');
    const timer = Number.isFinite(expiry) ? window.setTimeout(refresh, Math.max(1000, expiry - Date.now())) : null;
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.clearTimeout(debounce);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [data?.mode, data?.expiresAt, verified]);

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocus = trigger.current;
    element.showModal();
    document.body.style.overflow = 'hidden';
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
      sessionStorage.removeItem(storageKey);
      if (saved && Number.isFinite(saved.at) && Date.now() >= saved.at && Date.now() - saved.at < 30 * 60 * 1000 && Number.isFinite(saved.pageY) && saved.pageY >= 0 && Number.isFinite(saved.sheetY) && saved.sheetY >= 0) {
        window.scrollTo({ top: saved.pageY, behavior: 'instant' });
        restorePage.current = saved.pageY;
        restoreScroll.current = saved.sheetY;
      }
    } catch { /* Scroll restoration is optional. */ }
    return () => {
      element.close(); document.body.style.overflow = previousOverflow;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    };
  }, [open, storageKey]);

  useLayoutEffect(() => {
    if (open && data && dialog.current && restoreScroll.current !== null) {
      const element = dialog.current, sheetY = restoreScroll.current, pageY = restorePage.current;
      let frame = 0;
      const until = performance.now() + 400;
      const cancel = () => { cancelAnimationFrame(frame); restoreScroll.current = null; restorePage.current = null; };
      const restore = () => {
        element.scrollTop = sheetY;
        if (pageY !== null) window.scrollTo({ top: pageY, behavior: 'instant' });
        if (performance.now() < until) frame = requestAnimationFrame(restore);
        else cancel();
      };
      // Allow Next's history scroll pass and async result layout to settle first.
      frame = requestAnimationFrame(restore);
      const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
      for (const event of events) window.addEventListener(event, cancel, { passive: true });
      return () => { cancelAnimationFrame(frame); for (const event of events) window.removeEventListener(event, cancel); };
    }
  }, [open, data]);

  function show() {
    if (open) return;
    pushedEntry.current = true;
    window.history.pushState(null, '', `${location.pathname}${location.search}${OPEN_HASH}`);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  function close() {
    if (pushedEntry.current) { pushedEntry.current = false; window.history.back(); }
    else {
      window.history.replaceState(null, '', location.pathname + location.search);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  }
  function rememberScroll() {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ at: Date.now(), pageY: window.scrollY, sheetY: dialog.current?.scrollTop ?? 0 })); } catch { /* Optional storage. */ }
  }

  return <section className="wm-daily-picks" aria-label="오늘의 취향작">
    <button ref={trigger} className="wm-daily-preview" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={show}>
      <span className="wm-daily-preview-copy"><span className="wm-daily-eyebrow">취향으로 고른 작품</span><strong>오늘의 취향작</strong><span className="wm-daily-preview-description">오늘 꽂힐 이야기, 만나보세요.</span>{items.some(item => item.avoidanceWarnings?.length) ? <span className="wm-daily-preview-warning"><MatchIcon name="warning" />기피 요소가 겹치는 작품이 있어요</span> : null}<span className="wm-daily-preview-action">{data ? items.length ? `${items.length}편 만나보기` : '목록 확인하기' : error ? '다시 확인하기' : '3편 만나보기'}<MatchIcon name="chevron" /></span></span>
      <span className="wm-daily-preview-covers" aria-hidden="true">{[0, 1, 2].map(index => <span key={index}>{items[index] ? <WorkCover item={items[index]} decorative sizes="40px" /> : <span className="wm-daily-cover-placeholder" />}</span>)}</span>
    </button>
    <dialog ref={dialog} className="wm-daily-sheet" aria-labelledby={titleId} aria-describedby={copyId} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)');
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onCancel={event => { event.preventDefault(); close(); }} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    }}>
      <div className="wm-daily-sheet-grab" aria-hidden="true" />
      <header className="wm-daily-sheet-heading"><div><p className="wm-daily-eyebrow">내 취향을 바탕으로</p><h2 id={titleId}>오늘의 취향작</h2></div><button className="wm-daily-close" type="button" onClick={close} aria-label="오늘의 취향작 닫기" autoFocus><MatchIcon name="close" /></button></header>
      <p id={copyId} className="wm-daily-sheet-intro">{items.length ? `최신 취향을 참고해 고른 ${items.length}편이에요.` : '내 취향에 맞는 작품을 확인하고 있어요.'}</p>
      {error ? <div className="wm-daily-state" role="alert"><p>{error}</p><button type="button" onClick={() => { pendingSince.current = null; setRetry(value => value + 1); }}>다시 불러오기</button></div> : !data || data.mode === 'preparing' ? <div className="wm-daily-state"><MatchLoading message={verified ? data?.mode === 'preparing' ? '새 취향에 맞춰 세 편을 고르고 있어요…' : '세 편을 불러오는 중이에요…' : '내 결과를 확인하고 있어요…'} /></div> : !items.length ? <p className="wm-daily-state">현재 보여드릴 수 있는 작품을 준비 중이에요.</p> : <ol className="wm-daily-list">{items.map(item => <li key={item.canonicalWebtoonId}><WorkDetailLink id={item.canonicalWebtoonId} returnTo={`/match/result/${encodeURIComponent(publicProfileId)}${OPEN_HASH}`} onOpen={rememberScroll} className="wm-daily-work" label={`${item.title} 작품 상세 보기`}><WorkCover item={item} sizes="72px" /><span className="wm-daily-work-copy"><small>{item.mainGenreLabel}</small><h3>{item.title}</h3><span>{item.platform}</span></span><MatchIcon name="chevron" /></WorkDetailLink><TasteAvoidanceWarning warnings={item.avoidanceWarnings ?? []} compact /></li>)}</ol>}
      <p className="wm-daily-sheet-note">매일 자정, 한국시간 기준으로 새로 골라요. 취향 답변이나 내 추천작을 바꾸면 바로 반영돼요.</p>
      <button className="wm-daily-return" type="button" onClick={close}>내 결과로 돌아가기</button>
    </dialog>
  </section>;
}
