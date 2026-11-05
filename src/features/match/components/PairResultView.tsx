"use client";

import { MatchLoading } from './MatchLoading';
import { loadWorkResource } from '../api/loadWorkResource.mjs';

import { BackIcon } from '@/components/layout/BackIcon';

import { useEffect, useRef, useState } from "react";
import { PairScoreGauge } from './PairScoreGauge';
import { trackMatchEvent } from "../analytics/client";
import { pairArchetypeFor } from "../share/shareArchetypes.mjs";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import { readMatchDraft } from "../storage/draft.mjs";
import Link from "next/link";
import { PersonaAvatar } from "./PersonaAvatar";
import { MatchIcon } from "./MatchIcon";
import { TastePointRow } from './TastePointRow';
import { TasteFeatureIcon } from './TasteFeatureIcon';
import { MatchActionBar } from "./MatchActionBar";
import { MatchCopyLinkButton } from "./MatchCopyLinkButton";
import { RecommendationCard, useRecommendationCarousel } from "./RecommendationWork";
import { useHorizontalScrollIndicator } from "./useHorizontalScrollIndicator";

type RecommendedWebtoon = {
  commentId: string | null;
  canonicalWebtoonId: string;
  title: string;
  platform: string;
  officialUrl: string | null;
  mainGenre: string;
  mainGenreLabel: string;
  recommendationComment: string | null;
  likeCount: number;
  likedByViewer: boolean;
  recommenderPublicProfileId: string | null;
  canViewerLike: boolean;
  tasteFitHighlighted: boolean;
  coverUrl?: string | null;
  fitTargetPublicProfileId?: string | null;
};
type PairGenre = { genreKey: string; displayLabel: string; stars: number };
type RelationshipDestination = { state: 'ready' | 'create' | 'private' | 'unavailable'; href: string | null };
type PairReading = { version: string; sceneKey: string; intro: string; dialogue: string[]; scene: string; punchline: string };
type PairResult = { ownerNickname: string; challengerNickname: string; viewerRole?: 'owner' | 'challenger' | null; ownerRelationship?: RelationshipDestination; challengerRelationship?: RelationshipDestination; viewerPublicProfileId?: string | null; ownerGenreKey?: string | null; challengerGenreKey?: string | null; ownerTopGenres?: PairGenre[]; challengerTopGenres?: PairGenre[]; score: number; band: { label: string; subcopy: string }; sharedGenres: string[]; differentGenres: string[]; ownerRecommendedGenres: string[]; challengerRecommendedGenres: string[]; ownerRecommendations: RecommendedWebtoon[]; challengerRecommendations: RecommendedWebtoon[]; recommendationTasteApplied: boolean; sharedTasteLabels: string[]; trustSentence: string; pairReading?: PairReading; rank: number; entryCount: number };

export function PairResultView({ challengeCode, resultId, showRankingReturn = false }: { challengeCode: string; resultId: string; showRankingReturn?: boolean }) {
  const [result, setResult] = useState<PairResult | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [personalResultId, setPersonalResultId] = useState<string | null>(null);
  const [likeSavingKey, setLikeSavingKey] = useState<ReadonlySet<string>>(new Set());
  const inFlightLikes = useRef(new Set<string>());
  const [likeMessage, setLikeMessage] = useState("");
  const [tab, setTab] = useState<"summary" | "comparison">("summary");
  const summaryTab = useRef<HTMLButtonElement>(null);
  const comparisonTab = useRef<HTMLButtonElement>(null);
  const resultTracked = useRef(false);

  useEffect(() => {
    let active = true;
    const controller=new AbortController();
    const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
    void loadWorkResource(`/api/v1/challenges/${challengeCode}/results/${resultId}`, {
      headers: { "x-match-anonymous-id": identity.anonymousId },
      signal:controller.signal,timeoutMs:8000,notFoundMessage:'이 궁합 결과를 찾지 못했어요.',
    }).then((body) => {
      if (active) {
        setResult(body);
        setPersonalResultId(body.viewerPublicProfileId ?? readMatchDraft(window.localStorage)?.resultPublicId ?? '');
        if (!resultTracked.current) {
          resultTracked.current = true;
          trackMatchEvent("wm_pair_result_view", { challengeCode, scoreBand: body.band?.label ?? "", rank: body.rank ?? 0 });
        }
      }
    }).catch(error => active && !controller.signal.aborted && setError(error instanceof Error ? error.message : '이 궁합 결과를 불러오지 못했어요.'));
    return () => { active = false; controller.abort(); };
  }, [challengeCode, resultId,retry]);

  async function toggleRecommendationLike(item: RecommendedWebtoon) {
    if (!result || !item.canViewerLike || !item.commentId || !item.recommendationComment?.trim()) return;
    const key = item.commentId;
    if (inFlightLikes.current.has(key)) return;
    inFlightLikes.current.add(key);
    const nextLiked = !item.likedByViewer;
    const optimisticCount = Math.max(0, item.likeCount + (nextLiked ? 1 : -1));
    const update = (source: PairResult, likedByViewer: boolean, likeCount: number): PairResult => ({
      ...source,
      ownerRecommendations: source.ownerRecommendations.map((candidate) => (
        candidate.commentId === key
          ? { ...candidate, likedByViewer, likeCount }
          : candidate
      )),
      challengerRecommendations: source.challengerRecommendations.map((candidate) => (
        candidate.commentId === key
          ? { ...candidate, likedByViewer, likeCount }
          : candidate
      )),
    });

    setLikeSavingKey(keys => new Set([...keys, key]));
    setLikeMessage("");
    setResult((current) => current ? update(current, nextLiked, optimisticCount) : current);
    try {
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      const response = await fetch(
        `/api/v1/recommendation-comments/${encodeURIComponent(key)}/like`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ anonymousId: identity.anonymousId, liked: nextLiked }),
        },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "RECOMMENDATION_LIKE_SAVE_FAILED");
      setResult((current) => current
        ? update(current, Boolean(body.likedByViewer), Number(body.likeCount) || 0)
        : current);
    } catch {
      setResult((current) => current ? update(current, item.likedByViewer, item.likeCount) : current);
      setLikeMessage("좋아요를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      inFlightLikes.current.delete(key);
      setLikeSavingKey(keys => { const next=new Set(keys);next.delete(key);return next; });
    }
  }

  if (error) return <main className="match-page wm-pair-page"><section className="wm-pair-panel"><h1>{error}</h1><button className="match-button" onClick={()=>{setError('');setResult(null);setRetry(value=>value+1);}}>다시 불러오기</button><Link href={`/match/c/${challengeCode}`}>초대 화면으로</Link></section></main>;
  if (!result) return <main className="match-page wm-pair-page"><section className="wm-pair-panel" role="status"><MatchLoading message="둘의 궁합을 불러오는 중이에요…" /></section></main>;
  const archetype = pairArchetypeFor(result.score);
  const [badgeLead, ...badgeRest] = archetype.badge.split(" ");

  function switchTab(next: "summary" | "comparison") {
    setTab(next);
    (next === "summary" ? summaryTab : comparisonTab).current?.focus();
  }

  return <main className="match-page wm-pair-page">
    <h1 className="wm-sr-only">상세 궁합</h1>
    <Link className="site-back-control wm-pair-back" href={`/match/c/${challengeCode}/ranking`} aria-label={`${result.ownerNickname}님의 취향 관계도로 돌아가기${showRankingReturn ? ", 이전 화면" : ""}`}><BackIcon /></Link>
    <section className="wm-pair-cover" aria-label={`${result.ownerNickname}님과 ${result.challengerNickname}님의 웹툰 취향 궁합: ${archetype.name}, ${result.score}%`}>
      <div className="wm-pair-comic"><div className="wm-pair-character"><div className="wm-pair-profile"><PairProfileLink nickname={result.ownerNickname} destination={result.ownerRelationship} /></div><PersonaAvatar genreKey={result.ownerGenreKey} sizes="(max-width: 360px) 200px, 224px" priority /></div><div className="wm-pair-character"><div className="wm-pair-profile"><PairProfileLink nickname={result.challengerNickname} destination={result.challengerRelationship} /></div><PersonaAvatar genreKey={result.challengerGenreKey} sizes="(max-width: 360px) 200px, 224px" priority /></div><span className="wm-pair-bubble"><span className="wm-pair-bubble-words">{badgeLead}<br />{badgeRest.join(" ")}</span><span className="wm-pair-bubble-tail" aria-hidden="true" /><span className="wm-pair-bubble-tail is-right" aria-hidden="true" /></span></div>
      <div className="wm-pair-cover-caption" role="group" aria-labelledby="pair-compatibility-heading">
        <header className="wm-pair-result-heading"><h2 id="pair-compatibility-heading">웹툰 취향 궁합</h2></header>
        <div className="wm-pair-result-body"><div className="wm-pair-result-copy"><h3 className="wm-pair-result-name">{archetype.name}</h3><span className="wm-pair-result-band">{result.band.label}</span></div><PairScoreGauge score={result.score} /></div>
      </div>
    </section>
    <div className="wm-pair-tabs" role="tablist" aria-label="궁합 정보" onKeyDown={(event) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); switchTab(event.key === "Home" ? "summary" : event.key === "End" ? "comparison" : tab === "summary" ? "comparison" : "summary"); } }}>
      <button ref={summaryTab} id="pair-summary-tab" role="tab" type="button" aria-selected={tab === "summary"} aria-controls="pair-summary-panel" tabIndex={tab === "summary" ? 0 : -1} onClick={() => setTab("summary")}>궁합 요약</button><button ref={comparisonTab} id="pair-comparison-tab" role="tab" type="button" aria-selected={tab === "comparison"} aria-controls="pair-comparison-panel" tabIndex={tab === "comparison" ? 0 : -1} onClick={() => setTab("comparison")}>비교 상세</button>
    </div>
    <div id="pair-summary-panel" role="tabpanel" aria-labelledby="pair-summary-tab" hidden={tab !== "summary"} tabIndex={0}>
      <section className="wm-pair-panel wm-pair-common wm-taste-summary" aria-label="함께 맞는 장르와 취향"><TastePointRow title="같이 달릴 장르" icon="♡" headingLevel="h2"><PairLabels items={result.sharedGenres} empty="서로 다른 장르를 좋아해요" /></TastePointRow><TastePointRow title="함께 맞는 취향" icon="✦" headingLevel="h2"><PairLabels items={result.sharedTasteLabels} empty="세부 취향은 각자의 매력" featureIcons /></TastePointRow></section>
    </div>
    <div id="pair-comparison-panel" role="tabpanel" aria-labelledby="pair-comparison-tab" hidden={tab !== "comparison"} tabIndex={0}>
      <section className="wm-pair-panel wm-insight-card wm-pair-comparison-card"><h2>각자의 취향 TOP 3</h2><div className="wm-pair-profiles">{[{ nickname: result.ownerNickname, destination: result.ownerRelationship, genreKey: result.ownerGenreKey, genres: result.ownerTopGenres }, { nickname: result.challengerNickname, destination: result.challengerRelationship, genreKey: result.challengerGenreKey, genres: result.challengerTopGenres }].map((person, index) => <div key={index}><header><PersonaAvatar genreKey={person.genreKey} /><PairProfileLink nickname={person.nickname} destination={person.destination} /></header>{person.genres?.length ? <ol>{person.genres.map((genre, rank) => <li key={genre.genreKey}><small>{rank + 1}</small><span>{genre.displayLabel}</span><b aria-label={`별 ${genre.stars}개`}>★ {genre.stars}</b></li>)}</ol> : <p className="wm-pair-muted">취향 정보 없음</p>}</div>)}</div></section>
      <section className="wm-pair-panel wm-pair-reading wm-insight-card wm-story-card" aria-labelledby="pair-reading-heading"><header><p className="wm-story-eyebrow">우리의 취향 사용설명서</p><h2 id="pair-reading-heading" className="wm-story-title">{archetype.name}</h2></header><p className="wm-story-copy">{result.pairReading?.intro ?? '취향이 만나는 장면부터, 서로 다른 재미까지 같이 이야기해보세요.'}</p><div className="wm-story-scene"><h3 className="wm-story-subtitle">둘이 같이 보면</h3>{result.pairReading ? <><blockquote className="wm-pair-reading-dialogue">{result.pairReading.dialogue.map((line,index)=><p className="wm-story-copy" key={index}>“{line}”</p>)}</blockquote><p className="wm-story-copy">{result.pairReading.scene}</p><p className="wm-pair-reading-punchline wm-story-copy wm-story-punchline">{result.pairReading.punchline}</p></> : <p className="wm-story-copy">“어디가 좋았어?” 한마디로 감상회를 열어보세요. 같은 장면을 봤는데 발표 주제가 두 개 나올지도요.</p>}</div></section>
    </div>
    <WebtoonRecommendationSection result={result} likeSavingKey={likeSavingKey} likeMessage={likeMessage} onToggleLike={toggleRecommendationLike} />
    <div className="wm-pair-rank"><span>{result.ownerNickname}님의 관계도</span><strong>{result.rank}위 <small>/ {result.entryCount}명</small></strong></div>
    <details className="wm-pair-about"><summary>궁합 결과 안내</summary><p>웹툰궁합은 {result.recommendationTasteApplied ? "테스트 응답과 등록한 추천작" : "테스트 응답"}으로 본 취향 비교 결과이며, 사람 사이의 관계나 성격을 평가하지 않아요.</p></details>
    <MatchActionBar label="상세 궁합 바로가기">{personalResultId !== null ? <Link className="match-button match-button--secondary" href={personalResultId ? `/match/result/${personalResultId}?from=pair` : `/match/c/${challengeCode}`}>{personalResultId ? "내 결과" : "테스트하기"}</Link> : <button className="match-button match-button--secondary" type="button" disabled>확인 중…</button>}<Link className="match-button match-button--secondary" href={`/match/share/pair?challengeCode=${challengeCode}&resultId=${resultId}`} aria-label="궁합 결과를 Threads에 공유"><MatchIcon name="share" />공유</Link><MatchCopyLinkButton /></MatchActionBar>
  </main>;
}

function PairProfileLink({ nickname, destination }: { nickname: string; destination?: RelationshipDestination }) {
  const label = destination?.state === 'create' ? '관계도 만들기' : destination?.state === 'private' ? '비공개 관계도' : destination?.state === 'ready' ? '관계도 보기' : '아직 관계도 없음';
  const content = <><span className="wm-pair-profile-name" title={nickname}>{nickname}</span>{destination?.href ? <MatchIcon name="chevron" /> : null}</>;
  return destination?.href ? <Link className="wm-pair-profile-link" href={destination.href} aria-label={`${nickname}님의 취향 ${label}`}>{content}</Link> : <div className="wm-pair-profile-static" aria-label={`${nickname} · ${label}`} title={label}>{content}</div>;
}

function WebtoonRecommendationSection({ result, likeSavingKey, likeMessage, onToggleLike }: {
  result: PairResult;
  likeSavingKey: ReadonlySet<string>;
  likeMessage: string;
  onToggleLike: (item: RecommendedWebtoon) => Promise<void>;
}) {
  const groups = [
    { role: 'owner', nickname: result.ownerNickname, items: result.ownerRecommendations },
    { role: 'challenger', nickname: result.challengerNickname, items: result.challengerRecommendations },
  ].filter(group => group.role !== result.viewerRole);
  const isParticipant = result.viewerRole === 'owner' || result.viewerRole === 'challenger';
  if (!isParticipant && groups.every((group) => group.items.length === 0)) return null;
  return <section className="wm-pair-recommendations">{!isParticipant ? <h2>서로의 추천작</h2> : null}{groups.map(group => <RecommendationCarousel {...group} mainHeading={isParticipant} likeSavingKey={likeSavingKey} onToggleLike={onToggleLike} key={group.role} />)}{likeMessage ? <p className="wm-pair-like-error" role="alert">{likeMessage}</p> : null}</section>;
}

function RecommendationCarousel({ nickname, items, mainHeading = false, likeSavingKey, onToggleLike }: {
  nickname: string;
  items: RecommendedWebtoon[];
  mainHeading?: boolean;
  likeSavingKey: ReadonlySet<string>;
  onToggleLike: (item: RecommendedWebtoon) => Promise<void>;
}) {
  const { listRef, railKey, prepareNavigation, onKeyDown } = useRecommendationCarousel(items.length, `pair:${items[0]?.recommenderPublicProfileId ?? nickname}:${items[0]?.fitTargetPublicProfileId ?? ''}`);
  const { containerRef, barRef, thumbRef } = useHorizontalScrollIndicator(listRef, items.length);
  const highlightedCount = items.filter((item) => item.tasteFitHighlighted).length;
  const Heading = mainHeading ? 'h2' : 'h3';

  return <div ref={containerRef} className="wm-panel wm-pair-work-group"><header><div><Heading><MatchIcon name="book" /><span>{nickname}님의 추천</span><small>{items.length}</small></Heading>{highlightedCount ? <span className="wm-pair-fit-note">상대 취향에 맞는 작품 {highlightedCount}</span> : null}</div></header>{items.length ? <ol ref={listRef} data-recommendation-rail={railKey} className={`wm-pair-work-track${items.length === 1 ? " is-single" : ""}`} tabIndex={items.length > 1 ? 0 : undefined} aria-label={`${nickname}님의 추천작 목록`} onKeyDown={onKeyDown}>{items.map((item, itemIndex) => {
      return <li className="wm-pair-work-slide" key={item.canonicalWebtoonId} aria-label={`추천작 ${itemIndex + 1} / ${items.length}`}><RecommendationCard item={item} returnTo={typeof window === 'undefined' ? '/match' : window.location.pathname + window.location.search} onOpen={prepareNavigation} likeAction={item.canViewerLike && item.commentId ? { liked: item.likedByViewer, saving: likeSavingKey.has(item.commentId), onToggle: () => void onToggleLike(item) } : undefined} /></li>;
    })}</ol> : <div className="wm-pair-work-empty"><p className="wm-pair-muted">등록한 추천작이 없어요.</p></div>}{items.length > 1 ? <div ref={barRef} className="wm-rail-scrollbar wm-pair-scrollbar" aria-hidden="true"><span ref={thumbRef} /></div> : null}</div>;
}

function PairLabels({ items, empty, featureIcons = false }: { items: string[]; empty: string; featureIcons?: boolean }) {
  return items.length ? <ul className="wm-pair-labels wm-taste-chips">{items.map((item) => <li key={item}>{featureIcons ? <TasteFeatureIcon value={item} category="취향" /> : null}<strong>{item}</strong></li>)}</ul> : <p className="wm-pair-muted">{empty}</p>;
}
