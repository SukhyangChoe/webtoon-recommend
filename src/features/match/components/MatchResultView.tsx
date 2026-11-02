"use client";

import { MatchLoading } from './MatchLoading';

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { trackMatchEvent } from "../analytics/client";
import { requestActiveChallenge, type ActiveChallengeInfo } from "../api/activeChallenge";
import { loadWorkResource } from '../api/loadWorkResource.mjs';
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import { readPublicResult, writePublicResult } from "../storage/resultStorage.mjs";
import { readMatchDraft, writeMatchDraft } from "../storage/draft.mjs";
import { personalArchetypeFor } from "../share/shareArchetypes.mjs";
import { MatchActionBar } from "./MatchActionBar";
import { MatchIcon } from "./MatchIcon";
import { validateMatchNickname } from "../server/nickname.mjs";
import { PersonalRecommendationCarousel } from "./RecommendationWork";
import { useHorizontalScrollIndicator } from "./useHorizontalScrollIndicator";
import { TasteFeatureIcon } from "./TasteFeatureIcon";
import { resultTitlePhrases } from "../config/tasteFeatureIcons.mjs";

type DisplayGenre = { genreKey: string; displayLabel: string; stars: number };
type TasteDetail = { category: string; value: string };
type PublicResult = { publicProfileId: string; nickname?: string | null; canManage?: boolean; recommendationInfluence?: { workCount: number; recommendationPercent: number; testPercent: number }; displayGenres: DisplayGenre[]; topGenres: DisplayGenre[]; wellMatchedDetails?: TasteDetail[]; wellMatchedLabels: string[]; lessMatchedLabels: string[] };
type RecommendedWebtoon = {
  canonicalWebtoonId: string;
  title: string;
  platform: string;
  officialUrl: string | null;
  mainGenre: string;
  recommendationComment: string | null;
  likeCount: number;
  likedByViewer: boolean;
  coverUrl?: string | null;
};
export function MatchResultView({ publicProfileId }: { publicProfileId: string }) {
  const [result, setResult] = useState<PublicResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallengeInfo | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<RecommendedWebtoon[]>([]);
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameMessage, setNicknameMessage] = useState("");
  const resultTracked = useRef(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoadError('');
    const load = async () => {
      const cached = readPublicResult(window.localStorage, publicProfileId) as PublicResult | null;
      if (cached) { setResult({ ...cached, canManage: false }); setLoading(false); }
      try {
        const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
        const fresh = await loadWorkResource(`/api/v1/results/${publicProfileId}?anonymousId=${encodeURIComponent(identity.anonymousId)}`, {signal:controller.signal,timeoutMs:8000,notFoundMessage:'이 결과를 찾지 못했어요.'}) as PublicResult;
        writePublicResult(window.localStorage, fresh);
        if (active) {
          setResult(fresh);
        }
      } catch(error) {
        if (active && error && typeof error==='object' && 'status' in error && [403,404].includes(Number(error.status))) setResult(null);
        if (active && !controller.signal.aborted) setLoadError(error instanceof Error ? error.message : '결과를 불러오지 못했어요.');
      }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; controller.abort(); };
  }, [publicProfileId,retry]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
    void loadWorkResource(`/api/v1/results/${publicProfileId}/recommendations`, {
      headers: { "x-match-anonymous-id": identity.anonymousId },
      signal:controller.signal,timeoutMs:8000,
    })
      .then((body) => { if (active) setRecommendations(Array.isArray(body.items) ? body.items : []); })
      .catch(() => undefined);
    return () => { active = false; controller.abort(); };
  }, [publicProfileId,retry]);

  useEffect(() => {
    if (!result || resultTracked.current) return;
    resultTracked.current = true;
    trackMatchEvent("wm_result_view", {
      topGenre: result.topGenres[0]?.genreKey ?? "",
      starConcentration: result.topGenres[0]?.stars ?? 0,
    });
  }, [result]);

  useEffect(() => {
    let active = true;
    const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
    void requestActiveChallenge(identity.anonymousId)
      .then((challenge) => { if (active) setActiveChallenge(challenge); })
      .finally(() => { if (active) setChallengeLoading(false); });
    return () => { active = false; };
  }, [publicProfileId]);

  function openNicknameEditor() {
    setNicknameInput(result?.nickname ?? readMatchDraft(window.localStorage)?.nickname ?? "");
    setNicknameMessage("");
    setNicknameOpen(true);
  }

  async function saveNickname(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateMatchNickname(nicknameInput);
    if (!validation.valid || nicknameSaving || !result) return;
    setNicknameSaving(true);
    setNicknameMessage("");
    try {
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      const response = await fetch(`/api/v1/results/${publicProfileId}/nickname`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ anonymousId: identity.anonymousId, nickname: validation.nickname }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error("닉네임을 변경하지 못했어요.");
      }
      const nextResult = { ...result, nickname: body.nickname };
      setResult(nextResult);
      writePublicResult(window.localStorage, nextResult);
      const draft = readMatchDraft(window.localStorage);
      if (draft) writeMatchDraft(window.localStorage, { ...draft, nickname: body.nickname });
      setNicknameOpen(false);
    } catch (error) {
      setNicknameMessage(error instanceof Error ? error.message : "닉네임을 변경하지 못했어요.");
    } finally {
      setNicknameSaving(false);
    }
  }

  if (loading) return <main className="match-page wm-screen wm-result-screen wm-result-loading"><section className="match-card match-hero"><MatchLoading message="결과를 불러오는 중이에요…" /></section></main>;
  if (!result) return <main className="match-page wm-screen wm-result-screen wm-result-loading"><section className="match-card match-hero"><h1>{loadError || '이 결과를 찾지 못했어요'}</h1><button className="match-button" onClick={() => {setLoading(true);setRetry(value=>value+1);}}>다시 불러오기</button><Link href="/match">홈으로</Link></section></main>;
  const leadGenre = result.topGenres[0];
  const persona = personalArchetypeFor(leadGenre?.genreKey);
  return <main className="match-page match-result-page wm-screen wm-result-screen">
    {loadError ? <p role="status" className="wm-load-error">저장된 결과를 표시하고 있어요. <button onClick={()=>setRetry(value=>value+1)}>최신 결과 다시 불러오기</button></p> : null}
    <section className="wm-result-hero">
      <div className="wm-result-intro">
        <div className="wm-hero-copy">
          <p className="wm-result-identity wm-eyebrow">{result.canManage ? <><button className="wm-nickname-edit" type="button" aria-label={`${result.nickname ?? '내'} 닉네임 변경`} aria-haspopup="dialog" aria-expanded={nicknameOpen} onClick={openNicknameEditor}><span>{result.nickname ?? '닉네임'}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 16 11-11 4 4L8 20l-5 1 1-5ZM13 7l4 4" /></svg></button><span>님의 웹툰 취향</span></> : result.nickname ? <><span className="wm-result-nickname">{result.nickname}</span><span>님의 웹툰 취향</span></> : '나의 웹툰 취향'}</p>
          <h1>{resultTitlePhrases(persona.name).map((phrase: string, index: number) => <span key={phrase}>{index > 0 ? ' ' : ''}<span className="wm-result-title-phrase">{phrase}</span></span>)}</h1>
        </div>
        <div className="wm-persona-frame"><Image className="wm-persona-image" src={persona.imageSrc} alt={persona.imageAlt} width={360} height={540} priority /></div>
      </div>
      <GenreRanking genres={result.displayGenres ?? result.topGenres} />
    </section>
    <div className="wm-result-body">
      <TasteProfile details={result.wellMatchedDetails ?? result.wellMatchedLabels.map((value) => ({ category: "취향", value }))} lessMatchedLabels={result.lessMatchedLabels} />
      <section className="wm-panel"><div className="wm-panel-heading wm-recommendations-heading"><h2><MatchIcon name="book" />{result.canManage ? "내 추천작" : `${result.nickname ?? "이 사용자"}님의 추천작`}</h2>{result.canManage ? <Link href={`/match/result/${publicProfileId}/recommendations`} aria-label="내 추천작 관리"><span>관리</span><MatchIcon name="settings" /></Link> : null}</div><PersonalRecommendationCarousel items={recommendations} publicProfileId={publicProfileId} /></section>
    </div>
    <MatchActionBar label="취향 결과 바로가기" className="wm-result-actions">
      {result.canManage ? challengeLoading ? <button className="match-button" type="button" disabled>확인 중…</button> : activeChallenge ? <Link className="match-button" href={`/match/c/${activeChallenge.challengeCode}/ranking`}><span className="wm-action-label">내 취향 관계도</span><MatchIcon name="chevron" /></Link> : <Link className="match-button" href="/match/challenge/new"><span className="wm-action-label">관계도 만들기</span><MatchIcon name="chevron" /></Link> : null}
      <Link className="match-button match-button--secondary" href={`/match/share/personal?profilePublicId=${publicProfileId}`} aria-label="내 취향 결과를 Threads에 공유"><MatchIcon name="share" />공유</Link>
    </MatchActionBar>
    {result.canManage && nicknameOpen ? <div className="match-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !nicknameSaving) setNicknameOpen(false); }}><form className="match-confirm-dialog match-nickname-dialog" role="dialog" aria-modal="true" aria-labelledby="match-nickname-title" onSubmit={saveNickname}><p className="match-eyebrow">내 프로필</p><h2 id="match-nickname-title">닉네임 변경</h2><label><span>새 닉네임</span><input autoFocus type="text" minLength={2} maxLength={20} value={nicknameInput} onChange={(event) => { setNicknameInput(event.target.value); setNicknameMessage(""); }} /></label><small className={`match-field-guide${nicknameMessage ? " is-error" : ""}`}>{nicknameMessage || validateMatchNickname(nicknameInput).message}</small><div className="match-confirm-actions"><button className="match-button match-button--secondary" type="button" disabled={nicknameSaving} onClick={() => setNicknameOpen(false)}>취소</button><button className="match-button" type="submit" disabled={nicknameSaving || !validateMatchNickname(nicknameInput).valid}>{nicknameSaving ? "변경 중…" : "저장"}</button></div></form></div> : null}
  </main>;
}

function GenreRanking({ genres }: { genres: DisplayGenre[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rankedGenres = genres.filter(genre => genre.stars > 0);
  const hasMore = rankedGenres.length > 3;
  const { containerRef, barRef, thumbRef } = useHorizontalScrollIndicator(trackRef, rankedGenres.length);
  if (!rankedGenres.length) return null;
  return <div className="wm-genre-ranking" ref={containerRef}><div ref={trackRef} className={`wm-top-genres${hasMore ? ' has-more' : ''}`} role="region" aria-label={hasMore ? '장르 취향 순위, 좌우로 넘겨 보기' : '장르 취향 순위'} tabIndex={hasMore ? 0 : undefined} onKeyDown={event => {
    if (!hasMore || event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const track = event.currentTarget;
    const step = (track.firstElementChild?.getBoundingClientRect().width ?? 0) + 8;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    if (event.key === 'Home' || event.key === 'End') track.scrollTo({ left: event.key === 'Home' ? 0 : track.scrollWidth, behavior });
    else track.scrollBy({ left: event.key === 'ArrowRight' ? step : -step, behavior });
  }}>{rankedGenres.map((genre, index) => <article key={genre.genreKey} className={index === 0 ? 'is-primary' : ''}><span>{index === 0 ? '♛ ' : ''}{index + 1}위</span><strong>{genre.displayLabel}</strong><TopStarRow count={genre.stars} /></article>)}</div>{hasMore ? <div ref={barRef} className="wm-rail-scrollbar wm-genre-scrollbar" aria-hidden="true"><span ref={thumbRef} style={{ width: `${300 / rankedGenres.length}%` }} /></div> : null}</div>;
}

function TopStarRow({ count }: { count: number }) {
  if (count === 0) return <span className="match-top-stars is-empty" aria-label="별 0개">☆</span>;
  return <span className="match-top-stars" aria-label={`별 ${count}개`}>{Array.from({ length: count }, (_, index) => <i aria-hidden="true" key={index}>★</i>)}</span>;
}

function TasteProfile({ details, lessMatchedLabels }: { details: TasteDetail[]; lessMatchedLabels: string[] }) {
  return <section className="wm-panel wm-interpretation" aria-label="취향 포인트">
    <div className="wm-taste-group"><h2><span aria-hidden="true">♡</span> 끌리는 요소</h2>{details.length ? <ul className="wm-taste-tiles">{details.map(item => <li key={`${item.category}-${item.value}`}><TasteFeatureIcon value={item.value} category={item.category} /><div><span>{item.category}</span><strong>{item.value}</strong></div></li>)}</ul> : <p className="wm-taste-empty">선택한 요소 없음</p>}</div>
    <div className="wm-taste-group"><h2><span aria-hidden="true">⊖</span> 망설이는 요소</h2>{lessMatchedLabels.length ? <ul className="wm-avoidance">{lessMatchedLabels.map(label => <li key={label}>{label}</li>)}</ul> : <p className="wm-taste-empty">없음</p>}</div>
  </section>;
}
