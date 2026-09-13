"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { trackMatchEvent } from "../analytics/client";
import { requestActiveChallenge, type ActiveChallengeInfo } from "../api/activeChallenge";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import { readPublicResult, writePublicResult } from "../storage/resultStorage.mjs";
import { personalArchetypeFor } from "../share/shareArchetypes.mjs";
import { ChallengeEntryPrompt } from "./ChallengeEntryPrompt";

type DisplayGenre = { genreKey: string; displayLabel: string; stars: number };
type PublicResult = { publicProfileId: string; displayGenres: DisplayGenre[]; topGenres: DisplayGenre[]; wellMatchedLabels: string[]; lessMatchedLabels: string[] };
type Feedback = "almost_exact" | "mostly_right" | "slightly_off" | "very_off";

const feedbackOptions: Array<{ key: Feedback; label: string }> = [
  { key: "almost_exact", label: "거의 맞아" }, { key: "mostly_right", label: "대체로 맞아" },
  { key: "slightly_off", label: "조금 달라" }, { key: "very_off", label: "많이 달라" },
];

export function MatchResultView({ publicProfileId }: { publicProfileId: string }) {
  const [result, setResult] = useState<PublicResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallengeInfo | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const resultTracked = useRef(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const cached = readPublicResult(window.localStorage, publicProfileId) as PublicResult | null;
      try {
        const response = await fetch(`/api/v1/results/${publicProfileId}`);
        if (!response.ok) throw new Error("not found");
        const fresh = await response.json() as PublicResult;
        writePublicResult(window.localStorage, fresh);
        if (active) setResult(fresh);
      } catch { if (active) setResult(cached); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [publicProfileId]);

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

  async function submitFeedback(next: Feedback) {
    setFeedback(next);
    const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
    const response = await fetch(`/api/v1/results/${publicProfileId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ anonymousId: identity.anonymousId, feedback: next }) });
    if (response.ok) trackMatchEvent("wm_accuracy_feedback", { rating: next });
  }

  if (loading) return <main className="match-page"><section className="match-card match-hero"><p>결과를 불러오는 중이에요…</p></section></main>;
  if (!result) return <main className="match-page"><section className="match-card match-hero"><p className="match-eyebrow">결과 없음</p><h1>이 결과를 찾지 못했어요</h1><p>같은 브라우저에서 테스트를 다시 완료해 주세요.</p><a className="match-button" href="/match">처음부터 시작</a></section></main>;
  const leadGenre = result.topGenres[0];
  const persona = personalArchetypeFor(leadGenre?.genreKey);

  return <main className="match-page match-result-page"><section className="match-result-hero"><p className="match-eyebrow">나의 웹툰 본캐</p><div className="match-result-persona"><div><span>취향 1위 · {leadGenre?.displayLabel ?? "웹툰"}</span><h1>{persona.name}</h1><p>{persona.description}</p></div><Image src={persona.imageSrc} alt={persona.imageAlt} width={360} height={540} priority /></div><div className="match-top-genres">{result.topGenres.map((genre, index) => <article key={genre.genreKey} className={index === 0 ? "is-primary" : ""}><span className="match-top-rank">{index + 1}</span><div><strong>{genre.displayLabel}</strong><TopStarRow count={genre.stars} /></div></article>)}</div></section>
    <ChallengeEntryPrompt publicProfileId={publicProfileId} />
    <section className="match-result-section"><h2>장르별 취향</h2><p className="match-section-note">내 취향이 장르 사이에 어떻게 나뉘었는지 보여드려요.</p><div className="match-star-list">{result.displayGenres.map((genre) => <div className={genre.stars === 0 ? "is-zero" : ""} key={genre.genreKey}><strong>{genre.displayLabel}</strong><StarRow count={genre.stars} /><span>{genre.stars}개</span></div>)}</div></section>
    <section className="match-result-section match-taste-sections"><TasteLabels title="잘 보는 쪽" labels={result.wellMatchedLabels} empty="선택한 취향을 찾지 못했어요" /><TasteLabels title="덜 맞는 쪽" labels={result.lessMatchedLabels} empty="딱히 크게 가리는 쪽 없음" /></section>
    <section className="match-result-section"><h2>결과가 얼마나 나 같아?</h2><div className="match-feedback-grid">{feedbackOptions.map((option) => <button type="button" className={feedback === option.key ? "is-selected" : ""} key={option.key} onClick={() => void submitFeedback(option.key)}>{option.label}</button>)}</div>{feedback ? <p className="match-feedback-thanks">알려줘서 고마워요.</p> : null}</section>
    <section className="match-result-actions">{challengeLoading ? <button className="match-button" type="button" disabled>초대 링크 확인 중…</button> : activeChallenge ? <><a className="match-button" href={`/match/c/${activeChallenge.challengeCode}/ranking`}>내 초대 링크 관리</a><a className="match-button match-button--secondary" href={`/match/share/personal?profilePublicId=${publicProfileId}&challengeCode=${activeChallenge.challengeCode}`}>Threads에 내 결과 공유</a></> : <><a className="match-button" href="/match/challenge/new">친구에게 보낼 초대 링크 만들기</a><button className="match-button match-button--secondary" type="button" disabled>초대 링크를 만들면 공유할 수 있어요</button></>}</section>
  </main>;
}

function StarRow({ count }: { count: number }) {
  if (count === 0) return <span className="match-stars match-stars--empty" aria-label="별 0개">별 없음</span>;
  return <span className="match-stars" aria-label={`별 ${count}개`}>{Array.from({ length: count }, (_, index) => <i aria-hidden="true" key={index}>★</i>)}</span>;
}

function TopStarRow({ count }: { count: number }) {
  const density = count > 12 ? "is-ultra-dense" : count > 8 ? "is-very-dense" : count > 5 ? "is-dense" : "";
  if (count === 0) return <span className="match-top-stars is-empty" aria-label="별 0개">☆</span>;
  return <span className={`match-top-stars ${density}`} aria-label={`별 ${count}개`}>{Array.from({ length: count }, (_, index) => <i aria-hidden="true" key={index}>★</i>)}</span>;
}

function TasteLabels({ title, labels, empty }: { title: string; labels: string[]; empty: string }) {
  return <div><h2>{title}</h2>{labels.length ? <div className="match-labels">{labels.map((label) => <span key={label}>{label}</span>)}</div> : <p className="match-empty-label">{empty}</p>}</div>;
}
