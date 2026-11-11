'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ensureAnonymousId } from '../storage/anonymousIdentity.mjs';
import { loadWorkResource } from '../api/loadWorkResource.mjs';
import { WorkCover } from './RecommendationWork';
import { WorkDetailLink } from './WorkDetailLink';
import { MatchIcon } from './MatchIcon';
import { MatchLoading } from './MatchLoading';
import { TasteAvoidanceWarning, type AvoidanceWarning } from './TasteAvoidanceWarning';
import { readDailyPicksResponse } from '../api/dailyPicksProgress.mjs';
import { useDailyPickProgress, type DailyPickProgressStage } from './useDailyPickProgress';
import { isDailyRecalculationStage } from '../config/dailyPicksPresentation.mjs';
import { safeOfficialWorkUrl } from '../config/workDetailPresentation.mjs';
import { useDailyPickSheet } from './useDailyPickSheet';

type DailyPick = { canonicalWebtoonId: string; title: string; mainGenreLabel: string; platform: string; coverUrl: string | null; officialUrl?: string | null; avoidanceWarnings?: AvoidanceWarning[]; matchReason?: { version: number; summary: string; labels: string[]; referenceWork?: {canonicalWebtoonId:string;title:string;labels:string[]} } };
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
  const [loadedCovers,setLoadedCovers] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const sheetBody = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pushedEntry = useRef(false);
  const loading = useRef(false);
  const pendingSince = useRef<number | null>(null);
  const restoreScroll = useRef<number | null>(null);
  const restorePage = useRef<number | null>(null);
  const titleId = useId();
  const storageKey = `webtoon-match:daily-picks-return:v1:${publicProfileId}`;
  const preparing = !error && (!verified || !data || data.mode === 'preparing');
  const items = !preparing && data?.mode === 'personalized' ? data.items : [];
  const { message: progressMessage, recalculating, start: startProgress, finish: finishProgress, onProgress } = useDailyPickProgress();
  const coversPreparing = !error && items.some(item => item.coverUrl && !loadedCovers.includes(`${item.canonicalWebtoonId}:${item.coverUrl}`));
  const busy = preparing || coversPreparing;
  const showProgress = recalculating && !error && busy;
  const loadingMessage = coversPreparing ? '선정한 작품 표지를 불러오고 있어요…' : progressMessage;

  useEffect(() => {
    if (!verified) return;
    const changed = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.profileId !== publicProfileId || detail.membershipChanged === false) return;
      pendingSince.current = null; setData(null); setError(''); setRetry(value=>value+1);
    };
    window.addEventListener('match-recommendations-changed',changed);
    return () => window.removeEventListener('match-recommendations-changed',changed);
  }, [publicProfileId,verified]);

  useEffect(() => {
    if (!verified) return;
    const controller = new AbortController();
    let active = true;
    loading.current = true;
    async function load() {
      setError('');
      startProgress(pendingSince.current !== null);
      try {
        const identity = ensureAnonymousId({ cookieText: document.cookie, storage: localStorage });
        const body = await loadWorkResource(`/api/v1/results/${encodeURIComponent(publicProfileId)}/daily-picks`, {
          headers: { 'x-match-anonymous-id': identity.anonymousId, accept: 'application/x-ndjson' }, signal: controller.signal, timeoutMs: 65000,
          parseResponse: response => readDailyPicksResponse(response, (stage: DailyPickProgressStage) => {
            if (active && !controller.signal.aborted) {
              if (isDailyRecalculationStage(stage)) setData(null);
              onProgress(stage);
            }
          }),
        }) as DailyPicks;
        if (body.publicProfileId !== publicProfileId || !['personalized', 'preparing'].includes(body.mode) || !Array.isArray(body.items)) throw new Error('INVALID_DAILY_PICKS');
        if (active) {
          if (body.mode === 'personalized') pendingSince.current = null;
          else { pendingSince.current ??= Date.now(); onProgress('waiting'); }
          setData(body);
        }
      } catch {
        if (active && !controller.signal.aborted) {
          setData(null);
          setError('작품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
        }
      } finally {
        if (active) { loading.current = false; finishProgress(); }
      }
    }
    void load();
    return () => { active = false; loading.current = false; controller.abort(); finishProgress(); };
  }, [publicProfileId, verified, retry, onProgress, startProgress, finishProgress]);

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
        if (!loading.current) {
          if (Number.isFinite(expiry) && expiry <= Date.now()) { pendingSince.current = null; setData(null); }
          setRetry(value => value + 1);
        }
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
    element.querySelector<HTMLButtonElement>('.wm-daily-close')?.focus({preventScroll:true});
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
    if (open && data && sheetBody.current && restoreScroll.current !== null) {
      const element = sheetBody.current, sheetY = restoreScroll.current, pageY = restorePage.current;
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

  const {handle:sheetHandle,expanded:sheetExpanded,close} = useDailyPickSheet(open,dialog,commitClose);

  function show() {
    if (open) return;
    pushedEntry.current = true;
    window.history.pushState(null, '', `${location.pathname}${location.search}${OPEN_HASH}`);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  function commitClose() {
    if (pushedEntry.current) { pushedEntry.current = false; window.history.back(); }
    else {
      window.history.replaceState(null, '', location.pathname + location.search);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  }
  function rememberScroll() {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ at: Date.now(), pageY: window.scrollY, sheetY: sheetBody.current?.scrollTop ?? 0 })); } catch { /* Optional storage. */ }
  }
  function coverLoaded(key: string) {
    setLoadedCovers(previous => previous.includes(key) ? previous : [...previous, key]);
  }

  return <section className="wm-daily-picks" aria-label="오늘의 취향작">
    <button ref={trigger} className="wm-daily-preview" type="button" aria-label="오늘의 취향작 열기" aria-haspopup="dialog" aria-expanded={open} aria-busy={busy} onClick={show}>
      <span className="wm-daily-preview-copy"><span className="wm-daily-eyebrow">나를 위한</span><strong>오늘의 취향작</strong>{showProgress ? <span className="wm-daily-preview-loading" role="status" aria-live="polite"><span className="wm-daily-preview-description">{loadingMessage}</span><span className="wm-daily-loading-track" aria-hidden="true"><span /></span></span> : null}{error ? <span className="wm-daily-preview-description">취향작을 불러오지 못했어요. 눌러서 확인해 주세요.</span> : null}{items.some(item => item.avoidanceWarnings?.length) ? <span className="wm-daily-preview-warning"><MatchIcon name="warning" />기피 요소가 겹치는 작품이 있어요</span> : null}</span>
      <span className="wm-daily-preview-covers" aria-hidden="true">{[0, 1, 2].map(index => {
        const item = items[index], key = item ? `${item.canonicalWebtoonId}:${item.coverUrl}` : '';
        return <span key={key || index} className={showProgress && (!item || (item.coverUrl && !loadedCovers.includes(key))) ? 'wm-daily-cover-loading' : undefined} onLoadCapture={() => coverLoaded(key)} onErrorCapture={() => coverLoaded(key)}>{item ? <WorkCover item={item} eager decorative sizes="(max-width: 360px) 42px, 52px" /> : <span className="wm-daily-cover-placeholder" />}</span>;
      })}</span>
      <MatchIcon name="chevron" className="wm-daily-preview-arrow" />
    </button>
    <dialog ref={dialog} className="wm-daily-sheet" aria-labelledby={titleId} onKeyDown={event => {
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
      <button ref={sheetHandle} className="wm-daily-sheet-grab" type="button" aria-label="취향작 팝업 크기 조절" aria-expanded={sheetExpanded}><span /></button>
      <header className="wm-daily-sheet-heading"><div><p className="wm-daily-eyebrow">나를 위한 맞춤 추천</p><h2 id={titleId}>오늘의 취향작</h2></div><button className="wm-daily-close" type="button" onClick={close} aria-label="오늘의 취향작 닫기" autoFocus><MatchIcon name="close" /></button></header>
      <div ref={sheetBody} className="wm-daily-sheet-body" tabIndex={0} aria-label="오늘의 취향작 목록 스크롤">
      {error ? <div className="wm-daily-state" role="alert"><p>{error}</p><button type="button" onClick={() => { pendingSince.current = null; setRetry(value => value + 1); }}>다시 불러오기</button></div> : !data || data.mode === 'preparing' ? <div className="wm-daily-state" aria-busy="true">{showProgress ? <MatchLoading message={loadingMessage} /> : <div className="wm-daily-quiet-placeholder" aria-hidden="true">{[0,1,2].map(index=><span key={index}><i /><span><i /><i /></span></span>)}</div>}</div> : !items.length ? <p className="wm-daily-state">현재 보여드릴 수 있는 작품을 준비 중이에요.</p> : <ol className="wm-daily-list">{items.map(item => <li key={item.canonicalWebtoonId}>
        <div className="wm-daily-work">
          <WorkDetailLink id={item.canonicalWebtoonId} returnTo={`/match/result/${encodeURIComponent(publicProfileId)}${OPEN_HASH}`} onOpen={rememberScroll} className="wm-daily-cover-link" label={`${item.title} 표지로 더 알아보기`}><WorkCover item={item} sizes="(max-width: 360px) 76px, 94px" /></WorkDetailLink>
          <div className="wm-daily-work-copy">
            <small>{item.platform}</small><h3 title={item.title}><WorkDetailLink id={item.canonicalWebtoonId} returnTo={`/match/result/${encodeURIComponent(publicProfileId)}${OPEN_HASH}`} onOpen={rememberScroll} label={`${item.title} 제목으로 더 알아보기`}>{item.title}</WorkDetailLink></h3><span>{item.mainGenreLabel}</span>
            <WorkDetailLink id={item.canonicalWebtoonId} returnTo={`/match/result/${encodeURIComponent(publicProfileId)}${OPEN_HASH}`} onOpen={rememberScroll} className="wm-daily-detail" label={`${item.title} 더 알아보기`}>더 알아보기<MatchIcon name="arrowRight" /></WorkDetailLink>
          </div>
          <DailyPickWatch item={item} />
        </div>
        {item.matchReason?.summary ? <div className="wm-daily-match-reason"><p><span aria-hidden="true">✦</span> 나와 맞는 부분</p>{item.matchReason.referenceWork ? <WorkDetailLink id={item.matchReason.referenceWork.canonicalWebtoonId} returnTo={`/match/result/${encodeURIComponent(publicProfileId)}${OPEN_HASH}`} onOpen={rememberScroll} className="wm-daily-reference" label={`내 추천작 ${item.matchReason.referenceWork.title} 더 알아보기`}><MatchIcon name="book" /><span>내 추천작 <strong>{item.matchReason.referenceWork.title}</strong>와 닮았어요</span><MatchIcon name="chevron" /></WorkDetailLink> : null}<span>{item.matchReason.summary}</span></div> : null}
        <TasteAvoidanceWarning warnings={item.avoidanceWarnings ?? []} compact />
      </li>)}</ol>}
      <p className="wm-daily-sheet-note">매일 자정, 한국시간 기준으로 새로 골라요. 취향 답변이나 내 추천작을 바꾸면 바로 반영돼요.</p>
      <button className="wm-daily-return" type="button" onClick={close}>내 결과로 돌아가기</button>
      </div>
    </dialog>
  </section>;
}

function DailyPickWatch({ item }: { item: DailyPick }) {
  const officialUrl = safeOfficialWorkUrl(item.officialUrl);
  if (!officialUrl) return null;
  return <a className="wm-daily-watch" href={officialUrl} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} ${item.platform}에서 감상하기 (새 탭)`}>
    <span className="wm-daily-book-disc" aria-hidden="true"><MatchIcon name="bookClosed" className="wm-daily-book-closed" /><MatchIcon name="book" className="wm-daily-book-open" /></span>
    <span>감상하기</span>
  </a>;
}
