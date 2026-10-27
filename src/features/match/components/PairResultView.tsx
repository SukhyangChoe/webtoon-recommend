"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { trackMatchEvent } from "../analytics/client";
import { pairArchetypeFor } from "../share/shareArchetypes.mjs";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import { readMatchDraft } from "../storage/draft.mjs";
import Link from "next/link";
import { PersonaAvatar } from "./PersonaAvatar";
import { MatchIcon } from "./MatchIcon";
import { MatchActionBar } from "./MatchActionBar";
import { RecommendationCard, useRecommendationCarousel } from "./RecommendationWork";
import { useHorizontalScrollIndicator } from "./useHorizontalScrollIndicator";

type RecommendedWebtoon = {
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
type PairResult = { ownerNickname: string; challengerNickname: string; ownerGenreKey?: string | null; challengerGenreKey?: string | null; ownerTopGenres?: PairGenre[]; challengerTopGenres?: PairGenre[]; score: number; band: { label: string; subcopy: string }; sharedGenres: string[]; differentGenres: string[]; ownerRecommendedGenres: string[]; challengerRecommendedGenres: string[]; ownerRecommendations: RecommendedWebtoon[]; challengerRecommendations: RecommendedWebtoon[]; recommendationTasteApplied: boolean; sharedTasteLabels: string[]; trustSentence: string; rank: number; entryCount: number };

export function PairResultView({ challengeCode, resultId, showRankingReturn = false }: { challengeCode: string; resultId: string; showRankingReturn?: boolean }) {
  const [result, setResult] = useState<PairResult | null>(null);
  const [error, setError] = useState("");
  const [personalResultId, setPersonalResultId] = useState<string | null>(null);
  const [likeSavingKey, setLikeSavingKey] = useState<string | null>(null);
  const [likeMessage, setLikeMessage] = useState("");
  const [tab, setTab] = useState<"summary" | "comparison">("summary");
  const summaryTab = useRef<HTMLButtonElement>(null);
  const comparisonTab = useRef<HTMLButtonElement>(null);
  const resultTracked = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPersonalResultId(readMatchDraft(window.localStorage)?.resultPublicId ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
    void fetch(`/api/v1/challenges/${challengeCode}/results/${resultId}`, {
      headers: { "x-match-anonymous-id": identity.anonymousId },
    }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error();
      if (active) {
        setResult(body);
        if (!resultTracked.current) {
          resultTracked.current = true;
          trackMatchEvent("wm_pair_result_view", { challengeCode, scoreBand: body.band?.label ?? "", rank: body.rank ?? 0 });
        }
      }
    }).catch(() => active && setError("이 궁합 결과를 찾지 못했어요."));
    return () => { active = false; };
  }, [challengeCode, resultId]);

  async function toggleRecommendationLike(item: RecommendedWebtoon) {
    if (!result || !item.canViewerLike || !item.recommenderPublicProfileId) return;
    const key = `${item.recommenderPublicProfileId}:${item.canonicalWebtoonId}`;
    if (likeSavingKey === key) return;
    const nextLiked = !item.likedByViewer;
    const optimisticCount = Math.max(0, item.likeCount + (nextLiked ? 1 : -1));
    const update = (source: PairResult, likedByViewer: boolean, likeCount: number): PairResult => ({
      ...source,
      ownerRecommendations: source.ownerRecommendations.map((candidate) => (
        candidate.recommenderPublicProfileId === item.recommenderPublicProfileId
        && candidate.canonicalWebtoonId === item.canonicalWebtoonId
          ? { ...candidate, likedByViewer, likeCount }
          : candidate
      )),
      challengerRecommendations: source.challengerRecommendations.map((candidate) => (
        candidate.recommenderPublicProfileId === item.recommenderPublicProfileId
        && candidate.canonicalWebtoonId === item.canonicalWebtoonId
          ? { ...candidate, likedByViewer, likeCount }
          : candidate
      )),
    });

    setLikeSavingKey(key);
    setLikeMessage("");
    setResult((current) => current ? update(current, nextLiked, optimisticCount) : current);
    try {
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      const response = await fetch(
        `/api/v1/results/${item.recommenderPublicProfileId}/recommendations/${encodeURIComponent(item.canonicalWebtoonId)}/like`,
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
      setLikeSavingKey(null);
    }
  }

  if (error) return <main className="match-page wm-pair-page"><section className="wm-pair-panel"><h1>{error}</h1><a className="match-button" href={`/match/c/${challengeCode}`}>초대 화면으로</a></section></main>;
  if (!result) return <main className="match-page wm-pair-page"><section className="wm-pair-panel" role="status"><p>둘의 궁합을 불러오는 중이에요…</p></section></main>;
  const archetype = pairArchetypeFor(result.score);
  const [badgeLead, ...badgeRest] = archetype.badge.split(" ");
  const scoreStyle = { "--pair-score-angle": `${Math.max(0, Math.min(100, result.score)) * 3.6}deg` } as CSSProperties;

  function switchTab(next: "summary" | "comparison") {
    setTab(next);
    (next === "summary" ? summaryTab : comparisonTab).current?.focus();
  }

  return <main className="match-page wm-pair-page">
    <header className="wm-pair-heading"><Link href={`/match/c/${challengeCode}/ranking`} aria-label={`${result.ownerNickname}님의 취향 관계도로 돌아가기${showRankingReturn ? ", 이전 화면" : ""}`}><MatchIcon name="chevron" className="is-back" />관계도</Link><h1>상세 궁합</h1></header>
    <section className="wm-pair-cover" aria-label={`${result.ownerNickname}님과 ${result.challengerNickname}님의 궁합 ${result.score}%`}>
      <div className="wm-pair-comic"><div className="wm-pair-character"><span title={result.ownerNickname}>{result.ownerNickname}</span><PersonaAvatar genreKey={result.ownerGenreKey} sizes="(max-width: 360px) 200px, 224px" priority /></div><div className="wm-pair-character"><span title={result.challengerNickname}>{result.challengerNickname}</span><PersonaAvatar genreKey={result.challengerGenreKey} sizes="(max-width: 360px) 200px, 224px" priority /></div><span className="wm-pair-bubble"><span className="wm-pair-bubble-words">{badgeLead}<br />{badgeRest.join(" ")}</span><span className="wm-pair-bubble-tail" aria-hidden="true" /><span className="wm-pair-bubble-tail is-right" aria-hidden="true" /></span></div>
      <div className="wm-pair-cover-caption"><div><p>{result.band.label}</p><h2>{archetype.name}</h2>{result.recommendationTasteApplied ? <small>추천작 반영</small> : null}</div><div className="wm-pair-score" style={scoreStyle}><strong>{result.score}<small>%</small></strong><span>웹툰궁합</span></div></div>
    </section>
    <div className="wm-pair-tabs" role="tablist" aria-label="궁합 정보" onKeyDown={(event) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); switchTab(event.key === "Home" ? "summary" : event.key === "End" ? "comparison" : tab === "summary" ? "comparison" : "summary"); } }}>
      <button ref={summaryTab} id="pair-summary-tab" role="tab" type="button" aria-selected={tab === "summary"} aria-controls="pair-summary-panel" tabIndex={tab === "summary" ? 0 : -1} onClick={() => setTab("summary")}>궁합 요약</button><button ref={comparisonTab} id="pair-comparison-tab" role="tab" type="button" aria-selected={tab === "comparison"} aria-controls="pair-comparison-panel" tabIndex={tab === "comparison" ? 0 : -1} onClick={() => setTab("comparison")}>비교 상세</button>
    </div>
    <div id="pair-summary-panel" role="tabpanel" aria-labelledby="pair-summary-tab" hidden={tab !== "summary"} tabIndex={0}>
      <section className="wm-pair-panel wm-pair-common"><h2>우리의 취향 접점</h2><div><span className="wm-pair-row-icon" aria-hidden="true">♡</span><div><h3>같이 달릴 장르</h3><PairLabels items={result.sharedGenres} empty="서로 다른 장르를 좋아해요" /></div></div><div><span className="wm-pair-row-icon" aria-hidden="true">✦</span><div><h3>함께 맞는 취향</h3><PairLabels items={result.sharedTasteLabels} empty="세부 취향은 각자의 매력" /></div></div></section>
      <WebtoonRecommendationSection result={result} likeSavingKey={likeSavingKey} likeMessage={likeMessage} onToggleLike={toggleRecommendationLike} />
    </div>
    <div id="pair-comparison-panel" role="tabpanel" aria-labelledby="pair-comparison-tab" hidden={tab !== "comparison"} tabIndex={0}>
      <section className="wm-pair-panel"><h2>각자의 취향 TOP 3</h2><div className="wm-pair-profiles">{[{ nickname: result.ownerNickname, genreKey: result.ownerGenreKey, genres: result.ownerTopGenres }, { nickname: result.challengerNickname, genreKey: result.challengerGenreKey, genres: result.challengerTopGenres }].map((person, index) => <div key={index}><header><PersonaAvatar genreKey={person.genreKey} /><strong>{person.nickname}</strong></header>{person.genres?.length ? <ol>{person.genres.map((genre, rank) => <li key={genre.genreKey}><small>{rank + 1}</small><span>{genre.displayLabel}</span><b aria-label={`별 ${genre.stars}개`}>★ {genre.stars}</b></li>)}</ol> : <p className="wm-pair-muted">취향 정보 없음</p>}</div>)}</div></section>
      <section className="wm-pair-panel"><h2>서로 다른 장르</h2><PairLabels items={result.differentGenres} empty="주로 좋아하는 장르가 비슷해요" /></section>
      <section className="wm-pair-panel wm-pair-reading"><h2>{archetype.name}</h2><p>{archetype.description}</p><h3>이 사람 추천, 믿어도 될까?</h3><p>{result.trustSentence}</p></section>
    </div>
    <div className="wm-pair-rank"><span>{result.ownerNickname}님의 관계도</span><strong>{result.rank}위 <small>/ {result.entryCount}명</small></strong></div>
    <details className="wm-pair-about"><summary>궁합 결과 안내</summary><p>웹툰궁합은 {result.recommendationTasteApplied ? "테스트 응답과 등록한 추천작" : "테스트 응답"}으로 본 취향 비교 결과이며, 사람 사이의 관계나 성격을 평가하지 않아요.</p></details>
    <MatchActionBar label="상세 궁합 바로가기"><Link className="match-button" href={`/match/c/${challengeCode}/ranking`} aria-label={`${result.ownerNickname}님의 취향 관계도`}>취향 관계도</Link><Link className="match-button match-button--secondary" href={`/match/share/pair?challengeCode=${challengeCode}&resultId=${resultId}`} aria-label="궁합 결과를 Threads에 공유"><MatchIcon name="share" />공유</Link>{personalResultId !== null ? <Link className="match-button match-button--secondary" href={personalResultId ? `/match/result/${personalResultId}?from=pair` : `/match/c/${challengeCode}`}>{personalResultId ? "내 결과" : "테스트하기"}</Link> : null}</MatchActionBar>
  </main>;
}

function WebtoonRecommendationSection({ result, likeSavingKey, likeMessage, onToggleLike }: {
  result: PairResult;
  likeSavingKey: string | null;
  likeMessage: string;
  onToggleLike: (item: RecommendedWebtoon) => Promise<void>;
}) {
  const groups = [
    { nickname: result.ownerNickname, items: result.ownerRecommendations },
    { nickname: result.challengerNickname, items: result.challengerRecommendations },
  ];
  if (groups.every((group) => group.items.length === 0)) return null;
  return <section className="wm-pair-recommendations"><h2>서로의 추천작</h2>{groups.map((group, index) => <RecommendationCarousel {...group} likeSavingKey={likeSavingKey} onToggleLike={onToggleLike} key={index} />)}{likeMessage ? <p className="wm-pair-like-error" role="alert">{likeMessage}</p> : null}</section>;
}

function RecommendationCarousel({ nickname, items, likeSavingKey, onToggleLike }: {
  nickname: string;
  items: RecommendedWebtoon[];
  likeSavingKey: string | null;
  onToggleLike: (item: RecommendedWebtoon) => Promise<void>;
}) {
  const { listRef, position, prepareNavigation, onKeyDown } = useRecommendationCarousel(items.length, `pair:${items[0]?.recommenderPublicProfileId ?? nickname}:${items[0]?.fitTargetPublicProfileId ?? ''}:${items.map(item => item.canonicalWebtoonId).join(',')}`);
  const { containerRef, barRef, thumbRef } = useHorizontalScrollIndicator(listRef, items.length);
  const highlightedCount = items.filter((item) => item.tasteFitHighlighted).length;

  return <div ref={containerRef} className="wm-pair-work-group"><header><div><h3>{nickname}님의 추천 <small>{items.length}</small></h3>{highlightedCount ? <span className="wm-pair-fit-note">상대 취향에 맞는 작품 {highlightedCount}</span> : null}</div>{items.length ? <div className="wm-pair-carousel-controls"><span role="status" aria-label={`${nickname}님의 추천작 위치`}>{position.index + 1} / {items.length}</span></div> : null}</header>{items.length ? <ol ref={listRef} className={`wm-pair-work-track${items.length === 1 ? " is-single" : ""}`} tabIndex={items.length > 1 ? 0 : undefined} aria-label={`${nickname}님의 추천작 목록`} onKeyDown={onKeyDown}>{items.map((item, itemIndex) => {
      const itemKey = `${item.recommenderPublicProfileId}:${item.canonicalWebtoonId}`;
      return <li className="wm-pair-work-slide" key={item.canonicalWebtoonId} aria-label={`추천작 ${itemIndex + 1} / ${items.length}`}><RecommendationCard item={item} profileId={item.fitTargetPublicProfileId} returnTo={typeof window === 'undefined' ? '/match' : window.location.pathname + window.location.search} onOpen={() => prepareNavigation(itemIndex)} likeAction={item.canViewerLike ? { liked: item.likedByViewer, saving: likeSavingKey === itemKey, onToggle: () => void onToggleLike(item) } : undefined} /></li>;
    })}</ol> : <p className="wm-pair-muted">등록한 추천작이 없어요.</p>}{items.length > 1 ? <div ref={barRef} className="wm-rail-scrollbar wm-pair-scrollbar" aria-hidden="true"><span ref={thumbRef} /></div> : null}</div>;
}

function PairLabels({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? <div className="wm-pair-labels">{items.map((item) => <span key={item}>{item}</span>)}</div> : <p className="wm-pair-muted">{empty}</p>;
}
