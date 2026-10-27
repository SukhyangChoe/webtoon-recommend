"use client";

import { useEffect, useState } from 'react';
import { trackMatchEvent } from '../analytics/client';
import { readOwnerManageToken } from '../storage/challengeStorage.mjs';
import { ensureAnonymousId } from '../storage/anonymousIdentity.mjs';
import { downloadBlob, renderShareCardPng, renderShareCardSvg, type ShareCardModel } from '../share/shareCardImage';
import { createPairShareCard, createPersonalShareCard, createRankingShareCard, SHARE_PAGE_TITLES, shareCardDescription } from '../share/shareCardPresentation.mjs';
import { pairShareCopy, personalShareCopy, rankingShareCopy, threadsIntentUrl } from '../share/sharePolicy.mjs';
import { MatchIcon } from './MatchIcon';

type ShareType = 'personal' | 'pair' | 'ranking';
type Payload = { card: ShareCardModel; shareText: string; shareUrl: string; templateKey: string; svg: string; previewUrl: string };
type Genre = { genreKey: string; displayLabel: string; stars: number };
type PersonalResult = { nickname?: string; topGenres: Genre[]; wellMatchedLabels: string[]; lessMatchedLabels: string[] };
type PairResult = { ownerNickname: string; challengerNickname: string; ownerGenreKey?: string; challengerGenreKey?: string; score: number; band: { label: string }; sharedGenres: string[]; differentGenres: string[]; ownerRecommendedGenres: string[]; challengerRecommendedGenres: string[]; trustSentence: string };
type RankingResult = { ownerNickname: string; ownerGenreKey?: string; entryCount: number; rankingVisibility?: string; canManage?: boolean; top20: Array<{ rank: number; nickname: string; score: number; genreKey?: string; sharedGenres: string[] }> };

async function responseJson<T>(url: string, headers?: HeadersInit): Promise<T> {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error('공유할 결과를 불러오지 못했어요.');
  return response.json();
}
async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* Try the selection-based fallback next. */ }
  }
  const field = document.createElement('textarea');
  const previousFocus = document.activeElement as HTMLElement | null;
  field.value = text; field.style.position = 'fixed'; field.style.opacity = '0';
  document.body.appendChild(field); field.select();
  try { if (!document.execCommand('copy')) throw new Error('COPY_FAILED'); }
  finally { field.remove(); previousFocus?.focus({ preventScroll: true }); }
}

export function SharePreview({ type, profilePublicId, challengeCode, resultId }: { type: ShareType; profilePublicId?: string; challengeCode?: string; resultId?: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let previewUrl = '';
    const load = async () => {
      const origin = window.location.origin;
      let card: ShareCardModel;
      let copy: { text: string; shareUrl: string; templateKey: string };
      if (type === 'personal') {
        if (!profilePublicId) throw new Error('공유할 결과를 찾지 못했어요.');
        const result = await responseJson<PersonalResult>(`/api/v1/results/${encodeURIComponent(profilePublicId)}`);
        card = createPersonalShareCard(result) as ShareCardModel;
        copy = personalShareCopy({ ...result, challengeUrl: challengeCode ? `${origin}/match/c/${encodeURIComponent(challengeCode)}` : undefined, resultUrl: `${origin}/match/result/${encodeURIComponent(profilePublicId)}`, archetypeName: card.title });
      } else if (type === 'pair') {
        if (!challengeCode || !resultId) throw new Error('공유할 궁합을 찾지 못했어요.');
        const result = await responseJson<PairResult>(`/api/v1/challenges/${encodeURIComponent(challengeCode)}/results/${encodeURIComponent(resultId)}`);
        card = createPairShareCard(result) as ShareCardModel;
        copy = pairShareCopy({ ...result, archetypeName: card.title, bandLabel: result.band.label, pairUrl: `${origin}/match/c/${encodeURIComponent(challengeCode)}/match/${encodeURIComponent(resultId)}` });
      } else {
        if (!challengeCode) throw new Error('공유할 관계도를 찾지 못했어요.');
        const token = readOwnerManageToken(window.localStorage, challengeCode);
        const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
        const result = await responseJson<RankingResult>(`/api/v1/challenges/${encodeURIComponent(challengeCode)}/ranking?limit=3`, { 'x-match-owner-id': identity.anonymousId, ...(token ? { authorization: `Bearer ${token}` } : {}) });
        if (result.rankingVisibility === 'private' && !result.canManage) throw new Error('비공개 관계도는 공유할 수 없어요.');
        card = createRankingShareCard(result) as ShareCardModel;
        copy = rankingShareCopy({ topEntry: result.top20[0] ?? null, challengeUrl: `${origin}/match/c/${encodeURIComponent(challengeCode)}` });
      }
      const svg = await renderShareCardSvg(card);
      if (!active) return;
      previewUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      setPayload({ card, shareText: copy.text, shareUrl: copy.shareUrl, templateKey: copy.templateKey, svg, previewUrl });
    };
    void load().catch(failure => { if (active) setError(failure instanceof Error ? failure.message : '공유 카드를 만들지 못했어요.'); });
    return () => { active = false; if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [type, profilePublicId, challengeCode, resultId, retry]);
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(''), 4000);
    return () => window.clearTimeout(timeout);
  }, [message]);
  function track(action: string) {
    trackMatchEvent('wm_share_fallback', { shareType: type, action });
  }
  function openThreads() {
    if (!payload) return;
    trackMatchEvent('wm_share_intent_click', { shareType: type, templateKey: payload.templateKey });
    if (type === 'ranking') trackMatchEvent('wm_ranking_share_click', { shareType: type, reason: 'initial' });
    window.open(threadsIntentUrl(payload.shareText), '_blank', 'noopener,noreferrer');
    setMessage('이미지는 저장한 뒤 Threads에서 첨부해 주세요.');
  }
  async function copyLink() {
    if (!payload) return;
    try { await copyToClipboard(payload.shareUrl); track('link'); setMessage('링크를 복사했어요.'); }
    catch { setMessage('복사하지 못했어요. 다시 시도해 주세요.'); }
  }
  async function saveImage() {
    if (!payload || saving) return;
    setSaving(true);
    try { downloadBlob(await renderShareCardPng(payload.svg), payload.card.fileName); track('image'); setMessage('공유 카드를 이미지로 저장했어요.'); }
    catch { setMessage('이미지를 저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { setSaving(false); }
  }
  return <main className="match-page wm-share-page" aria-busy={!payload && !error}>
    <h1>{SHARE_PAGE_TITLES[type]}</h1>
    {error ? <section className="wm-share-state" role="alert"><p>{error}</p><button className="match-button" type="button" onClick={() => { setError(''); setPayload(null); setRetry(value => value + 1); }}>다시 불러오기</button></section> : payload ? <>
      <article className={`wm-share-card is-${type}`} aria-label="공유 카드 미리보기">
        {/* eslint-disable-next-line @next/next/no-img-element -- Self-contained SVG is also the exact PNG export source. */}
        <img src={payload.previewUrl} width={350} height={500} alt={shareCardDescription(payload.card)} />
      </article>
      <section className="wm-share-actions" aria-label="결과 공유">
        <button className="wm-share-primary" type="button" onClick={openThreads}><MatchIcon name="share" />Threads에 공유하기</button>
        <div className="wm-share-secondary"><button type="button" disabled={saving} onClick={() => void saveImage()}><MatchIcon name="download" />{saving ? '저장 중…' : '이미지 저장'}</button><button type="button" onClick={() => void copyLink()}><MatchIcon name="link" />링크 복사</button></div>
      </section>
    </> : <section className="wm-share-state" role="status">공유 카드를 만드는 중이에요…</section>}
    <p className={`wm-share-toast${message ? ' is-visible' : ''}`} role="status" aria-live="polite">{message}</p>
  </main>;
}
