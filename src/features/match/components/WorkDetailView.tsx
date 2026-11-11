"use client";

import { MatchLoading } from './MatchLoading';

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
import { recommendationFitDisplayScore } from '../config/recommendationFitDisplay.mjs';
import { TasteAvoidanceWarning } from './TasteAvoidanceWarning';
import { FitScoreGuide } from './FitScoreGuide';

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
  const hasInfo = Boolean(work && (work.creators.length || work.mainGenreLabel || work.platform || work.statusLabel || work.ageRating));
  const hasReading = Boolean(work && (hasInfo || work.introduction || work.fit?.reasons.length || work.avoidanceWarnings?.length));
  const { stage, root, sheet, summary, header, body, info, footer, handle, openPanel } = useWorkDetailSheet(!loading && Boolean(work), 'reasons');
  const expanded = stage !== 'collapsed';
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
  if (loading) return <main className="wm-work-page wm-work-state">{backControl}<MatchLoading message={slow ? '작품 정보를 불러오는 데 시간이 걸리고 있어요. 연결을 다시 확인하고 있어요.' : '작품을 불러오는 중…'} /><Link href={back}>이전 화면으로 돌아가기</Link></main>;
  if (error || !work) return <main className="wm-work-page wm-work-state">{backControl}<h1>{error || '작품을 찾지 못했어요.'}</h1><button type="button" onClick={() => { setLoading(true); setSlow(false); setFitLoading(true); setFitError(''); setFitSlow(false); setRetry(value => value + 1); }}>다시 시도</button><Link href={back}>이전 화면으로 돌아가기</Link></main>;

  const credits = work.creators.map(creator => `${creator.roles.join('·')}${creator.roles.length ? ' ' : ''}${creator.name}`).join(' · ');
  // Re-derive from raw data, never from legacy percent or a previously corrected score.
  const displayFitScore = recommendationFitDisplayScore(work.fit?.rawScore);
  const cta = work.officialUrl ? <a className="wm-work-watch" href={work.officialUrl} target="_blank" rel="noopener noreferrer">지금 바로 감상하기 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg></a> : null;

  return <main ref={root} className="wm-work-page" data-stage={stage}>
    {backControl}
    <div className="wm-work-hero">
      <div className="wm-work-cover-backdrop" aria-hidden="true"><WorkCover item={work} eager decorative /></div>
      <div className="wm-work-cover-foreground"><WorkCover item={work} eager /></div>
    </div>
    <button className="wm-work-cover-close" type="button" aria-label="표지를 눌러 작품 정보 접기" hidden={!expanded} />
    <section ref={sheet} className="wm-work-sheet" role={expanded ? 'dialog' : undefined} aria-modal={expanded ? false : undefined} aria-labelledby={expanded ? 'wm-work-detail-title' : undefined}>
      <button ref={handle} type="button" className="wm-work-grab" disabled={!hasReading && !hasInfo} aria-controls="wm-work-reading" aria-expanded={expanded} aria-label={expanded ? '누르거나 아래로 드래그하여 작품 정보 접기' : '누르거나 위로 드래그하여 작품 소개 열기'}><span /></button>
      <div className="wm-work-header-clip" aria-hidden={!expanded} inert={!expanded}><div ref={header}>
        <header className="wm-work-sheet-header"><div><WorkTitleMeta work={work} /><h2 id="wm-work-detail-title" tabIndex={-1}>{work.title}</h2></div>{displayFitScore !== null ? <WorkFitBadge score={displayFitScore} /> : null}</header>
      </div></div>
      <div ref={body} className="wm-work-dialog-body" tabIndex={expanded ? 0 : -1} aria-label="작품 상세 세로 스크롤">
    <div ref={summary} className="wm-work-summary" aria-hidden={expanded} inert={expanded}>
      <div className="wm-work-summary-heading"><div className="wm-work-summary-title"><WorkTitleMeta work={work} /><h1>{work.title}</h1></div>
        {displayFitScore !== null ? <WorkFitBadge score={displayFitScore} /> : fitLoading ? <div className="wm-work-fit wm-work-fit-pending" ><MatchLoading compact message="핏점수 확인 중…" /></div> : null}
      </div>
      <TasteAvoidanceWarning warnings={work.avoidanceWarnings ?? []} compact />
      {fitLoading && fitSlow ? <p className="wm-work-fit-note" role="status">핏점수 확인에 시간이 걸리고 있어요. 작품 정보는 먼저 볼 수 있어요.</p> : null}
      {fitError ? <div className="wm-work-fit-error" role="alert"><p>{fitError}</p><button type="button" onClick={() => { setFitLoading(true); setFitSlow(false); setFitError(''); setFitRetry(value => value + 1); }}>핏점수 다시 불러오기</button></div> : !fitLoading && displayFitScore === null ? work.fitStatus === 'test_required' ? <WorkTasteTestButton workId={id} returnTo={back} /> : <p className="wm-work-fit-note">비교할 취향 정보가 부족해 핏점수를 표시하지 않아요.</p> : null}
      {hasReading ? <button className="wm-work-open" type="button" onClick={() => openPanel('reasons')} aria-controls="wm-work-reading" aria-expanded={expanded}><strong>{work.fit?.reasons.length ? '잘 맞는 이유 보기' : '작품 소개 보기'}</strong><MatchIcon name="chevron" /></button> : null}
    </div>
    <div className="wm-work-reading" id="wm-work-reading" role="region" aria-labelledby="wm-work-detail-title" aria-hidden={!expanded} inert={!expanded}>
        <TasteAvoidanceWarning warnings={work.avoidanceWarnings ?? []} />
        {hasReading ? <div className="wm-work-sheet-page" id="wm-work-reasons">
          {work.introduction ? <section className="wm-work-section"><h3>{work.introductionKind === 'official' ? '작품 소개' : '어떤 작품인가요?'}</h3><p>{work.introduction}</p></section> : null}
          {work.fit ? <section className="wm-work-reasons"><h3>이런 점이 잘 맞아요</h3>
            {work.fit.axes?.length ? <div className="wm-work-axis-fits">{work.fit.axes.map(axis=><div key={axis.key} className={axis.score===null?'is-unavailable':undefined}><div><span>{axis.label}</span><strong>{axis.score===null?'비교 정보 부족':`${axis.score}점`}</strong></div>{axis.score===null?null:<div className="wm-work-axis-track" role="meter" aria-label={`${axis.label} 핏점수`} aria-valuenow={axis.score} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${axis.score}%`}} /></div>}</div>)}</div> : null}
            {work.fit.reasons.slice(0,3).map(item => <div className="wm-work-reason" key={item.key}><span><WorkFeatureIcon name={item.icon} /></span><div><strong>{item.label}</strong>{item.description ? <p>{item.description}</p> : null}</div></div>)}
          </section> : null}
          {hasInfo ? <section ref={info} className="wm-work-info wm-work-section" id="wm-work-info">
            <h3 tabIndex={-1}>작품 정보</h3><dl className="wm-work-facts">{work.mainGenreLabel?<div><dt>장르</dt><dd>{work.mainGenreLabel}</dd></div>:null}{credits ? <div><dt>제작진</dt><dd>{credits}</dd></div> : null}{work.statusLabel ? <div><dt>연재 상태</dt><dd>{work.statusLabel}</dd></div> : null}{work.ageRating ? <div><dt>이용등급</dt><dd>{work.ageRating}</dd></div> : null}</dl>
          </section> : null}
        </div> : null}
      </div>
      </div>
    </section>
    {cta ? <footer ref={footer} className="wm-work-action">{cta}</footer> : null}
  </main>;
}

function WorkTitleMeta({work}:{work:WorkDetail}) {
  const score=recommendationFitDisplayScore(work.fit?.rawScore);
  return <div className="wm-work-title-meta"><span className="wm-work-eyebrow">{work.platform}</span>{score!==null&&score>=70?<span className="wm-work-badge wm-work-badge--taste">취향</span>:null}{work.wellMade?<span className="wm-work-badge wm-work-badge--quality">웰메이드</span>:null}</div>;
}

function WorkFitBadge({score}:{score:number}) {
  return <div className="wm-work-fit"><div><div className="wm-fit-label-row"><span>핏점수</span><FitScoreGuide /></div><strong>{score}<small>점</small></strong></div><div className="wm-work-fit-track" role="meter" aria-label="핏점수" aria-valuenow={score} aria-valuetext={`${score}점 / 100점`} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${score}%`}} /></div></div>;
}
