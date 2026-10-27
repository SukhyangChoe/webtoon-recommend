"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { WorkDetail } from '../server/workDetailStore';
import { ensureAnonymousId } from '../storage/anonymousIdentity.mjs';
import { safeWorkReturnPath } from '../config/workDetailPresentation.mjs';
import { WorkCover } from './RecommendationWork';
import { WorkFeatureIcon } from './WorkFeatureIcon';
import { MatchIcon } from './MatchIcon';
import { useWorkDetailSheet } from './useWorkDetailSheet';

export function WorkDetailView({ id, profileId, returnTo }: { id: string; profileId?: string; returnTo?: string }) {
  const router = useRouter();
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const hasInfo = Boolean(work && (work.creators.length || work.platform || work.statusLabel || work.ageRating || work.artStyles.length || work.contentLabels.length));
  const hasReading = Boolean(work && (work.introduction || work.fit?.reasons.length || work.appreciationPoints.length || work.contentLabels.length));
  const { stage, compact, root, sheet, summary, header, body, info, footer, handle, openPanel, closePanel } = useWorkDetailSheet(!loading && Boolean(work), hasReading ? 'reasons' : 'info');
  const expanded = stage !== 'collapsed';
  const reasonTab = useRef<HTMLButtonElement>(null);
  const infoTab = useRef<HTMLButtonElement>(null);
  const back = safeWorkReturnPath(returnTo);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    let active = true;
    let anonymousId: string | undefined;
    try { anonymousId = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage }).anonymousId; } catch { /* Browsing without storage still works, without a private fit score. */ }
    const query = profileId ? `?profile=${encodeURIComponent(profileId)}` : '';
    void fetch(`/api/v1/webtoons/${encodeURIComponent(id)}${query}`, { signal: controller.signal, cache: 'no-store', headers: anonymousId ? { 'x-match-anonymous-id': anonymousId } : {} })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 404 ? '작품을 찾지 못했어요.' : '작품 정보를 불러오지 못했어요.');
        return response.json() as Promise<WorkDetail>;
      })
      .then(item => { if (active) { setWork(item); setError(''); } })
      .catch(cause => { if (active) setError(cause instanceof Error && cause.name !== 'AbortError' ? cause.message : '응답이 지연되고 있어요. 다시 시도해 주세요.'); })
      .finally(() => { window.clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [id, profileId, retry]);

  function goBack() {
    try {
      const entry = JSON.parse(sessionStorage.getItem('wm-work-entry') ?? 'null');
      if (entry?.href === location.pathname + location.search && Date.now() - entry.at < 30 * 60 * 1000 && history.length > 1) {
        sessionStorage.removeItem('wm-work-entry'); router.back(); return;
      }
    } catch { /* Use the safe in-app fallback. */ }
    router.push(back);
  }

  if (loading) return <main className="wm-work-page wm-work-state" role="status"><p>작품을 불러오는 중…</p></main>;
  if (error || !work) return <main className="wm-work-page wm-work-state"><h1>{error || '작품을 찾지 못했어요.'}</h1><button type="button" onClick={() => { setLoading(true); setRetry(value => value + 1); }}>다시 시도</button><Link href={back}>돌아가기</Link></main>;

  const credits = work.creators.map(creator => `${creator.roles.join('·')}${creator.roles.length ? ' ' : ''}${creator.name}`).join(' · ');
  const fitLabel = work.fit?.nickname ? `${work.fit.nickname}님의 핏점수` : '내 취향 핏점수';
  const cta = work.officialUrl ? <a className="wm-work-watch" href={work.officialUrl} target="_blank" rel="noopener noreferrer">지금 바로 감상하기 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg></a> : null;

  return <main ref={root} className="wm-work-page" data-stage={stage}>
    <button className="wm-work-back" type="button" onClick={goBack} aria-label="이전 화면으로 돌아가기"><MatchIcon name="chevron" className="is-back" /></button>
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
        {work.fit ? <div className="wm-work-fit"><div><span><WorkFeatureIcon name="spark" />핏점수</span><strong>{work.fit.percent}<small>%</small></strong></div><div className="wm-work-fit-track" role="meter" aria-label={fitLabel} aria-valuenow={work.fit.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${work.fit.percent}%` }} /></div></div> : null}
      </div>
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
