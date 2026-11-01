"use client";

import { BackIcon } from '@/components/layout/BackIcon';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { WorkDetail, WorkFit } from '../server/workDetailStore';
import { ensureAnonymousId } from '../storage/anonymousIdentity.mjs';
import { safeWorkReturnPath } from '../config/workDetailPresentation.mjs';
import { WorkCover } from './RecommendationWork';
import { WorkFeatureIcon } from './WorkFeatureIcon';
import { MatchIcon } from './MatchIcon';
import { useWorkDetailSheet } from './useWorkDetailSheet';
import { WorkTasteTestButton } from './WorkTasteTestButton';
import { loadWorkResource } from '../api/loadWorkResource.mjs';

export function WorkDetailView({ id, returnTo }: { id: string; returnTo?: string }) {
  const router = useRouter();
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [slow, setSlow] = useState(false);
  const [fitLoading, setFitLoading] = useState(true);
  const [fitSlow, setFitSlow] = useState(false);
  const [fitError, setFitError] = useState('');
  const [fitRetry, setFitRetry] = useState(0);
  const infoRun = useRef(0);
  const [infoRevision, setInfoRevision] = useState(0);
  const workReady = Boolean(work && work.canonicalWebtoonId === id && !loading);
  const hasInfo = Boolean(work && (work.creators.length || work.platform || work.statusLabel || work.ageRating || work.artStyles.length || work.contentLabels.length));
  const hasReading = Boolean(work && (work.introduction || work.fit?.reasons.length || work.appreciationPoints.length || work.contentLabels.length));
  const { stage, compact, root, sheet, summary, header, body, info, footer, handle, openPanel, closePanel } = useWorkDetailSheet(!loading && Boolean(work), hasReading ? 'reasons' : 'info');
  const expanded = stage !== 'collapsed';
  const reasonTab = useRef<HTMLButtonElement>(null);
  const infoTab = useRef<HTMLButtonElement>(null);
  const back = safeWorkReturnPath(returnTo);

  useEffect(() => {
    const revision = ++infoRun.current;
    const controller = new AbortController();
    const slowTimer = window.setTimeout(() => setSlow(true), 3000);
    let active = true;
    void loadWorkResource(`/api/v1/webtoons/${encodeURIComponent(id)}?view=info`, { signal: controller.signal, onRetry: () => { if (active) setSlow(true); } })
      .then(item => { if (active) {
        setWork({ ...item, fit: null, fitStatus: 'pending' } as WorkDetail); setError('');
        setFitLoading(true); setFitError(''); setFitSlow(false); setInfoRevision(revision);
      } })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : '작품 정보를 불러오지 못했어요.'); })
      .finally(() => { window.clearTimeout(slowTimer); if (active) setLoading(false); });
    return () => { active = false; controller.abort(); window.clearTimeout(slowTimer); };
  }, [id, retry]);

  useEffect(() => {
    // Next's retained pages can reactivate effects: only the newly loaded work
    // revision may start fit loading, never an older restored page snapshot.
    if (!workReady || infoRevision !== infoRun.current) return;
    const controller = new AbortController();
    let active = true, anonymousId: string | undefined;
    const slowTimer = window.setTimeout(() => setFitSlow(true), 3000);
    try { anonymousId = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage }).anonymousId; } catch { /* Public work details work without storage. */ }
    void loadWorkResource(`/api/v1/webtoons/${encodeURIComponent(id)}/fit`, { signal: controller.signal, headers: anonymousId ? { 'x-match-anonymous-id': anonymousId } : {}, onRetry: () => { if (active) setFitSlow(true); } })
      .then(item => { if (active) { setWork(previous => previous ? { ...previous, ...item as WorkFit } : previous); setFitError(''); } })
      .catch(() => { if (active) setFitError('핏점수를 불러오지 못했어요. 작품 정보는 계속 볼 수 있어요.'); })
      .finally(() => { window.clearTimeout(slowTimer); if (active) setFitLoading(false); });
    return () => { active = false; controller.abort(); window.clearTimeout(slowTimer); };
  }, [id, workReady, infoRevision, fitRetry]);

  function goBack() {
    try {
      const entry = JSON.parse(sessionStorage.getItem('wm-work-entry') ?? 'null');
      if (entry?.href === location.pathname + location.search && Date.now() - entry.at < 30 * 60 * 1000 && history.length > 1) {
        sessionStorage.removeItem('wm-work-entry'); router.back(); return;
      }
    } catch { /* Use the safe in-app fallback. */ }
    router.push(back);
  }

  const backControl = <button className="wm-work-back site-back-control" type="button" onClick={goBack} aria-label="이전 화면으로 돌아가기"><BackIcon /></button>;
  if (loading) return <main className="wm-work-page wm-work-state">{backControl}<p role="status">{slow ? '작품 정보를 불러오는 데 시간이 걸리고 있어요. 연결을 다시 확인하고 있어요.' : '작품을 불러오는 중…'}</p><Link href={back}>이전 화면으로 돌아가기</Link></main>;
  if (error || !work) return <main className="wm-work-page wm-work-state">{backControl}<h1>{error || '작품을 찾지 못했어요.'}</h1><button type="button" onClick={() => { setLoading(true); setSlow(false); setFitLoading(true); setFitError(''); setFitSlow(false); setRetry(value => value + 1); }}>다시 시도</button><Link href={back}>이전 화면으로 돌아가기</Link></main>;

  const credits = work.creators.map(creator => `${creator.roles.join('·')}${creator.roles.length ? ' ' : ''}${creator.name}`).join(' · ');
  const fitLabel = '핏점수';
  const cta = work.officialUrl ? <a className="wm-work-watch" href={work.officialUrl} target="_blank" rel="noopener noreferrer">지금 바로 감상하기 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg></a> : null;

  return <main ref={root} className="wm-work-page" data-stage={stage}>
    {backControl}
    <div className="wm-work-hero"><WorkCover item={work} eager /></div>
    <button className="wm-work-cover-close" type="button" aria-label="표지를 눌러 작품 정보 접기" hidden={!expanded} />
    <section ref={sheet} className="wm-work-sheet" role={expanded ? 'dialog' : undefined} aria-modal={expanded ? false : undefined} aria-labelledby={expanded ? 'wm-work-detail-title' : undefined}>
      <button ref={handle} type="button" className="wm-work-grab" disabled={!hasReading && !hasInfo} aria-controls="wm-work-reading" aria-expanded={expanded} aria-label={expanded ? '아래로 드래그하여 기본 화면으로 돌아가기' : '위로 드래그하여 작품 소개 열기'}><span /></button>
      <div className="wm-work-header-clip" aria-hidden={!expanded} inert={!expanded}><div ref={header}>
        <header className="wm-work-sheet-header"><div><span className="wm-work-eyebrow">{work.mainGenreLabel}</span><h2 id="wm-work-detail-title" tabIndex={-1}>{compact ? '작품 상세' : work.title}</h2></div><button type="button" onClick={closePanel} aria-label="작품 정보 접기"><MatchIcon name="close" /></button></header>
        <div className="wm-work-tabs" role="tablist" aria-label="작품 상세 정보" onKeyDown={event => { if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) { event.preventDefault(); const next = !hasReading ? 'info' : !hasInfo ? 'reasons' : event.key === 'Home' ? 'reasons' : event.key === 'End' ? 'info' : stage === 'reasons' ? 'info' : 'reasons'; openPanel(next); (next === 'reasons' ? reasonTab : infoTab).current?.focus(); } }}>
          {hasReading ? <button ref={reasonTab} id="wm-work-reasons-tab" type="button" role="tab" aria-controls="wm-work-reading" aria-selected={stage === 'reasons'} tabIndex={stage === 'reasons' ? 0 : -1} onClick={() => openPanel('reasons')}>궁합 · 소개</button> : null}{hasInfo ? <button ref={infoTab} id="wm-work-info-tab" type="button" role="tab" aria-controls="wm-work-reading" aria-selected={stage === 'info'} tabIndex={stage === 'info' ? 0 : -1} onClick={() => openPanel('info')}>작품 정보</button> : null}
        </div>
      </div></div>
      <div ref={body} className="wm-work-dialog-body" tabIndex={expanded ? 0 : -1} aria-label="작품 상세 세로 스크롤">
    <div ref={summary} className="wm-work-summary" aria-hidden={expanded} inert={expanded}>
      <div className="wm-work-summary-heading"><div className="wm-work-summary-title"><span className="wm-work-eyebrow">{work.mainGenreLabel}</span><h1>{work.title}</h1>{credits ? <p className="wm-work-credits">{credits}</p> : null}</div>
        {work.fit ? <div className="wm-work-fit"><div><span><WorkFeatureIcon name="spark" />핏점수</span><strong>{work.fit.percent}<small>%</small></strong></div><div className="wm-work-fit-track" role="meter" aria-label={fitLabel} aria-valuenow={work.fit.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${work.fit.percent}%` }} /></div></div> : fitLoading ? <div className="wm-work-fit wm-work-fit-pending" role="status">핏점수<br />확인 중…</div> : null}
      </div>
      {fitLoading && fitSlow ? <p className="wm-work-fit-note" role="status">핏점수 확인에 시간이 걸리고 있어요. 작품 정보는 먼저 볼 수 있어요.</p> : null}
      {fitError ? <div className="wm-work-fit-error" role="alert"><p>{fitError}</p><button type="button" onClick={() => { setFitLoading(true); setFitSlow(false); setFitError(''); setFitRetry(value => value + 1); }}>핏점수 다시 불러오기</button></div> : !fitLoading && !work.fit ? work.fitStatus === 'test_required' ? <WorkTasteTestButton workId={id} returnTo={back} /> : <p className="wm-work-fit-note">비교할 취향 정보가 부족해 핏점수를 표시하지 않아요.</p> : null}
      {hasReading ? <button className="wm-work-open" type="button" onClick={() => openPanel('reasons')}><strong>{work.fit?.reasons.length ? '이런 점이 잘 맞아요' : '작품 소개 · 감상 포인트'}</strong><MatchIcon name="chevron" /></button> : null}
    </div>
    <div className="wm-work-reading" id="wm-work-reading" role="tabpanel" aria-labelledby={stage === 'info' || !hasReading ? 'wm-work-info-tab' : 'wm-work-reasons-tab'} aria-hidden={!expanded} inert={!expanded}>
        {compact ? <h2 className="wm-work-flow-title">{work.title}</h2> : null}
        {hasReading ? <div className="wm-work-sheet-page" id="wm-work-reasons" hidden={stage === 'info'}>
          {work.fit?.reasons.length ? <section className="wm-work-reasons"><h3>이런 점이 잘 맞아요</h3>{work.fit.reasons.map(item => <div className="wm-work-reason" key={item.key}><span><WorkFeatureIcon name={item.icon} /></span><strong>{item.label}</strong></div>)}</section> : null}
          {work.introduction ? <section className="wm-work-section"><h3>{work.introductionKind === 'official' ? '작품 소개' : '어떤 작품인가요?'}</h3><p>{work.introduction}</p></section> : null}
          {work.contentLabels.length ? <div className="wm-work-tags">{work.contentLabels.map(item => <span key={item.key}>{item.label}</span>)}</div> : null}
          {work.appreciationPoints.length ? <section className="wm-work-section wm-work-points"><h3>감상 포인트</h3><ul>{work.appreciationPoints.map(item => <li key={item.key}><WorkFeatureIcon name={item.icon} /><strong>{item.label}</strong></li>)}</ul></section> : null}
        </div> : null}
        {hasInfo ? <section ref={info} className="wm-work-sheet-page wm-work-info" id="wm-work-info" hidden={stage !== 'info'}>
          <h3 tabIndex={-1}>작품 정보</h3>
          <dl className="wm-work-facts">{credits ? <div><dt>제작진</dt><dd>{credits}</dd></div> : null}{work.platform ? <div><dt>플랫폼</dt><dd>{work.platform}</dd></div> : null}{work.statusLabel ? <div><dt>연재 상태</dt><dd>{work.statusLabel}</dd></div> : null}{work.ageRating ? <div><dt>이용등급</dt><dd>{work.ageRating}</dd></div> : null}</dl>
          {work.contentLabels.length ? <section className="wm-work-section"><h3>주요 소재</h3><div className="wm-work-tags">{work.contentLabels.map(item => <span key={item.key}>{item.label}</span>)}</div></section> : null}
          {work.artStyles.length ? <section className="wm-work-section wm-work-style"><h3>작화 스타일</h3><ul>{work.artStyles.map(item => <li key={item.key}><span><WorkFeatureIcon name={item.icon} /></span><div><small>{item.category}</small><strong>{item.label}</strong></div></li>)}</ul></section> : null}
        </section> : null}
      </div>
      </div>
    </section>
    {cta ? <footer ref={footer} className="wm-work-action">{cta}</footer> : null}
  </main>;
}
