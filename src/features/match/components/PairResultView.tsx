"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { trackMatchEvent } from "../analytics/client";
import { pairArchetypeFor } from "../share/shareArchetypes.mjs";
import { readMatchDraft } from "../storage/draft.mjs";

type RecommendedWebtoon = { canonicalWebtoonId: string; title: string; platform: string; officialUrl: string | null; mainGenre: string };
type PairResult = { ownerNickname: string; challengerNickname: string; score: number; band: { label: string; subcopy: string }; sharedGenres: string[]; differentGenres: string[]; ownerRecommendedGenres: string[]; challengerRecommendedGenres: string[]; ownerRecommendations: RecommendedWebtoon[]; challengerRecommendations: RecommendedWebtoon[]; sharedTasteLabels: string[]; trustSentence: string; rank: number; entryCount: number };

export function PairResultView({ challengeCode, resultId, showRankingReturn = false }: { challengeCode: string; resultId: string; showRankingReturn?: boolean }) {
  const [result, setResult] = useState<PairResult | null>(null);
  const [error, setError] = useState("");
  const [personalResultId, setPersonalResultId] = useState<string | null>(null);
  const resultTracked = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPersonalResultId(readMatchDraft(window.localStorage)?.resultPublicId ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch(`/api/v1/challenges/${challengeCode}/results/${resultId}`).then(async (response) => {
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

  if (error) return <main className="match-page"><section className="match-card match-hero"><h1>{error}</h1><a className="match-button" href={`/match/c/${challengeCode}`}>초대 화면으로</a></section></main>;
  if (!result) return <main className="match-page"><section className="match-card match-hero"><p>둘의 궁합을 불러오는 중이에요…</p></section></main>;
  const archetype = pairArchetypeFor(result.score);
  const scoreEffect = result.score >= 85 ? "is-score-peak" : result.score >= 70 ? "is-score-high" : result.score >= 50 ? "is-score-mid" : "is-score-low";
  const scoreStyle = { "--match-score": `${Math.max(0, Math.min(100, result.score))}%` } as CSSProperties;

  return <main className="match-page match-pair-page">{showRankingReturn ? <a className="match-pair-context-back" href={`/match/c/${challengeCode}/ranking`}>← 전체 랭킹</a> : null}<section className={`match-pair-hero is-${archetype.theme} ${scoreEffect}`}><p className="match-eyebrow">{result.ownerNickname} × {result.challengerNickname}</p><h1>웹툰궁합</h1><div className="match-score-ring" style={scoreStyle}><strong>{result.score}</strong><span>%</span></div><strong className="match-pair-type-badge">{result.band.label}</strong><p className="match-pair-type-label">우리의 웹툰 관계 타입</p><h2>{archetype.name}</h2><p className="match-pair-archetype-copy"><SentenceLines text={archetype.description} /></p></section><PairSection title="같이 달릴 장르" items={result.sharedGenres} empty="서로의 새 장르를 개척해 봐요" /><RecommendationSections result={result} /><WebtoonRecommendationSection result={result} /><PairSection title="함께 맞는 취향" items={result.sharedTasteLabels} empty="세부 취향은 각자 다른 매력이 있어요" /><section className="match-result-section match-trust-card"><h2>이 사람 추천, 믿어도 될까?</h2><p>{result.trustSentence}</p></section><section className="match-result-section match-rank-summary"><span>현재 순위</span><strong>{result.rank}위</strong><small>도전자 {result.entryCount}명 중</small></section><p className="match-disclaimer">웹툰궁합은 이 테스트 응답으로 본 취향 비교 결과이며, 사람 사이의 관계나 성격을 평가하지 않아요.</p><div className="match-result-actions"><a className="match-button" href={`/match/share/pair?challengeCode=${challengeCode}&resultId=${resultId}`}>궁합 결과 공유하기</a><a className="match-button match-button--secondary" href={`/match/c/${challengeCode}/ranking`}>전체 랭킹 보기</a>{personalResultId !== null ? personalResultId ? <a className="match-button match-button--secondary" href={`/match/result/${personalResultId}?from=pair`}>내 취향 결과 보기</a> : <a className="match-button match-button--secondary" href={`/match/c/${challengeCode}`}>나도 테스트하기</a> : null}</div></main>;
}

function SentenceLines({ text }: { text: string }) {
  const sentences = text.split(/(?<=[.!?])\s+/u).filter(Boolean);
  return <>{sentences.map((sentence) => <span className="match-sentence-line" key={sentence}>{sentence}</span>)}</>;
}

function RecommendationSections({ result }: { result: PairResult }) {
  const recommendations = [
    { from: result.ownerNickname, to: result.challengerNickname, genres: result.ownerRecommendedGenres },
    { from: result.challengerNickname, to: result.ownerNickname, genres: result.challengerRecommendedGenres },
  ].filter((item) => item.genres.length > 0);

  if (!recommendations.length) return null;

  return <section className="match-result-section match-recommendations"><h2>각자 영업할 장르</h2><div>
    {recommendations.map((item) => <RecommendationRow {...item} key={`${item.from}-${item.to}`} />)}
  </div></section>;
}

function RecommendationRow({ from, to, genres }: { from: string; to: string; genres: string[] }) {
  return <div><strong>{from} → {to}</strong><span>{genres.join(" · ")}</span></div>;
}

function WebtoonRecommendationSection({ result }: { result: PairResult }) {
  const groups = [
    { nickname: result.ownerNickname, items: result.ownerRecommendations },
    { nickname: result.challengerNickname, items: result.challengerRecommendations },
  ];
  if (groups.every((group) => group.items.length === 0)) return null;
  return <section className="match-result-section match-pair-webtoons"><h2>서로의 추천작</h2><div>{groups.map((group) => <RecommendationCarousel {...group} key={group.nickname} />)}</div></section>;
}

function RecommendationCarousel({ nickname, items }: { nickname: string; items: RecommendedWebtoon[] }) {
  const listRef = useRef<HTMLOListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () => {
      setCanScrollLeft(list.scrollLeft > 2);
      setCanScrollRight(list.scrollLeft + list.clientWidth < list.scrollWidth - 2);
    };
    update();
    list.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => {
      list.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [items.length]);

  function scroll(direction: -1 | 1) {
    const list = listRef.current;
    const firstCard = list?.querySelector<HTMLElement>("li");
    if (!list || !firstCard) return;
    const gap = Number.parseFloat(window.getComputedStyle(list).columnGap) || 0;
    list.scrollBy({ left: direction * (firstCard.offsetWidth + gap), behavior: "smooth" });
  }

  return <div><h3>{nickname} 추천</h3>{items.length ? <div className="match-recommendation-carousel">
    {canScrollLeft ? <button className="match-carousel-arrow is-left" type="button" onClick={() => scroll(-1)} aria-label={`${nickname}님의 이전 추천작 보기`}>‹</button> : null}
    <ol ref={listRef}>{items.map((item) => <li key={item.canonicalWebtoonId}>{item.officialUrl ? <a href={item.officialUrl} target="_blank" rel="noreferrer"><strong>{item.title}</strong><span>{item.platform}</span></a> : <div><strong>{item.title}</strong><span>{item.platform}</span></div>}</li>)}</ol>
    {canScrollRight ? <button className="match-carousel-arrow is-right" type="button" onClick={() => scroll(1)} aria-label={`${nickname}님의 다음 추천작 보기`}>›</button> : null}
  </div> : <p>아직 등록한 추천작이 없어요.</p>}</div>;
}

function PairSection({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <section className="match-result-section"><h2>{title}</h2>{items.length ? <div className="match-labels">{items.map((item) => <span key={item}>{item}</span>)}</div> : <p className="match-empty-label">{empty}</p>}</section>;
}
