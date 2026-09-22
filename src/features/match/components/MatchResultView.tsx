"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { trackMatchEvent } from "../analytics/client";
import { requestActiveChallenge, type ActiveChallengeInfo } from "../api/activeChallenge";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import { readPublicResult, writePublicResult } from "../storage/resultStorage.mjs";
import { readMatchDraft, writeMatchDraft } from "../storage/draft.mjs";
import { personalArchetypeFor } from "../share/shareArchetypes.mjs";
import { ChallengeEntryPrompt } from "./ChallengeEntryPrompt";
import { validateMatchNickname } from "../server/nickname.mjs";

type DisplayGenre = { genreKey: string; displayLabel: string; stars: number };
type TasteDetail = { category: string; value: string };
type PublicResult = { publicProfileId: string; nickname?: string | null; canManage?: boolean; accuracyFeedback?: Feedback | null; displayGenres: DisplayGenre[]; topGenres: DisplayGenre[]; wellMatchedDetails?: TasteDetail[]; wellMatchedLabels: string[]; lessMatchedLabels: string[] };
type RecommendedWebtoon = { canonicalWebtoonId: string; title: string; platform: string; officialUrl: string | null; mainGenre: string };
type Feedback = "almost_exact" | "mostly_right" | "slightly_off" | "very_off";

const feedbackOptions: Array<{ key: Feedback; label: string }> = [
  { key: "almost_exact", label: "거의 맞아" }, { key: "mostly_right", label: "대체로 맞아" },
  { key: "slightly_off", label: "조금 달라" }, { key: "very_off", label: "많이 달라" },
];

export function MatchResultView({ publicProfileId, showPairResultPrompt = true }: { publicProfileId: string; showPairResultPrompt?: boolean }) {
  const [result, setResult] = useState<PublicResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
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
    const load = async () => {
      const cached = readPublicResult(window.localStorage, publicProfileId) as PublicResult | null;
      try {
        const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
        const response = await fetch(`/api/v1/results/${publicProfileId}?anonymousId=${encodeURIComponent(identity.anonymousId)}`);
        if (!response.ok) throw new Error("not found");
        const fresh = await response.json() as PublicResult;
        writePublicResult(window.localStorage, fresh);
        if (active) {
          setResult(fresh);
          setFeedback(fresh.accuracyFeedback ?? null);
          setFeedbackSubmitted(Boolean(fresh.accuracyFeedback));
        }
      } catch {
        if (active) {
          setResult(cached);
          setFeedback(cached?.accuracyFeedback ?? null);
          setFeedbackSubmitted(Boolean(cached?.accuracyFeedback));
        }
      }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [publicProfileId]);

  useEffect(() => {
    let active = true;
    void fetch(`/api/v1/results/${publicProfileId}/recommendations`)
      .then(async (response) => response.ok ? response.json() : { items: [] })
      .then((body) => { if (active) setRecommendations(Array.isArray(body.items) ? body.items : []); })
      .catch(() => undefined);
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
    setFeedbackSaving(true);
    const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
    try {
      const response = await fetch(`/api/v1/results/${publicProfileId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ anonymousId: identity.anonymousId, feedback: next }) });
      if (!response.ok) throw new Error("FEEDBACK_SAVE_FAILED");
      setFeedbackSubmitted(true);
      trackMatchEvent("wm_accuracy_feedback", { rating: next });
    } catch {
      setFeedback(null);
    } finally {
      setFeedbackSaving(false);
    }
  }

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
        if (body.error === "NICKNAME_ALREADY_USED") throw new Error("참여한 링크 중 이미 같은 닉네임을 쓰는 사람이 있어요.");
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

  if (loading) return <main className="match-page"><section className="match-card match-hero"><p>결과를 불러오는 중이에요…</p></section></main>;
  if (!result) return <main className="match-page"><section className="match-card match-hero"><p className="match-eyebrow">결과 없음</p><h1>이 결과를 찾지 못했어요</h1><p>같은 브라우저에서 테스트를 다시 완료해 주세요.</p><a className="match-button" href="/match">처음부터 시작</a></section></main>;
  const leadGenre = result.topGenres[0];
  const persona = personalArchetypeFor(leadGenre?.genreKey);
  return <main className="match-page match-result-page"><section className="match-result-hero"><div className="match-profile-heading"><p className="match-eyebrow">{result.nickname ? `${result.nickname}님의 웹툰 본캐` : "나의 웹툰 본캐"}</p>{result.canManage ? <button type="button" onClick={openNicknameEditor}>닉네임 변경</button> : null}</div><div className="match-result-persona"><div><span>취향 1위 · {leadGenre?.displayLabel ?? "웹툰"}</span><h1>{persona.name}</h1><p>{persona.description}</p></div><Image src={persona.imageSrc} alt={persona.imageAlt} width={360} height={540} priority /></div><div className="match-top-genres">{result.topGenres.map((genre, index) => <article key={genre.genreKey} className={index === 0 ? "is-primary" : ""}><span className="match-top-rank">{index + 1}</span><div><strong>{genre.displayLabel}</strong><TopStarRow count={genre.stars} /></div></article>)}</div></section>
    {showPairResultPrompt ? <ChallengeEntryPrompt publicProfileId={publicProfileId} /> : null}
    <section className="match-result-section"><h2>장르별 취향</h2><p className="match-section-note">내 취향이 장르 사이에 어떻게 나뉘었는지 보여드려요.</p><div className="match-star-list">{result.displayGenres.map((genre) => <div className={genre.stars === 0 ? "is-zero" : ""} key={genre.genreKey}><strong>{genre.displayLabel}</strong><StarRow count={genre.stars} /><span>{genre.stars}개</span></div>)}</div></section>
    <TasteProfile details={result.wellMatchedDetails ?? result.wellMatchedLabels.map((value) => ({ category: "취향", value }))} lessMatchedLabels={result.lessMatchedLabels} />
    <section className="match-result-section match-my-recommendations"><div className="match-section-heading"><div><h2>{result.canManage ? "내 추천작" : `${result.nickname ?? "이 사용자"}님의 추천작`}</h2><p className="match-section-note">궁합을 본 친구에게 보여줄 작품이에요.</p></div><strong>{recommendations.length}/10</strong></div>{recommendations.length ? <ol>{recommendations.map((item) => <li key={item.canonicalWebtoonId}><div><strong>{item.title}</strong><span>{item.platform}</span></div></li>)}</ol> : <p className="match-empty-label">아직 등록한 추천작이 없어요.</p>}{result.canManage ? <a className="match-button match-button--secondary" href={`/match/result/${publicProfileId}/recommendations`}>추천작 관리</a> : null}</section>
    <section className="match-result-section"><h2>결과가 얼마나 나 같아?</h2><div className="match-feedback-grid">{feedbackOptions.map((option) => <button type="button" disabled={feedbackSaving || feedbackSubmitted} className={feedback === option.key ? "is-selected" : ""} key={option.key} onClick={() => void submitFeedback(option.key)}>{option.label}</button>)}</div>{feedbackSubmitted ? <p className="match-feedback-thanks">알려줘서 고마워요.</p> : null}</section>
    <section className="match-result-actions">{challengeLoading ? <button className="match-button" type="button" disabled>궁합 확인 중…</button> : activeChallenge ? <a className="match-button" href={`/match/c/${activeChallenge.challengeCode}/ranking`}>궁합 관리</a> : <a className="match-button" href="/match/challenge/new">내 궁합 링크 만들기</a>}</section>
    {result.canManage && nicknameOpen ? <div className="match-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !nicknameSaving) setNicknameOpen(false); }}><form className="match-confirm-dialog match-nickname-dialog" role="dialog" aria-modal="true" aria-labelledby="match-nickname-title" onSubmit={saveNickname}><p className="match-eyebrow">내 프로필</p><h2 id="match-nickname-title">닉네임 변경</h2><label><span>새 닉네임</span><input autoFocus type="text" minLength={2} maxLength={20} value={nicknameInput} onChange={(event) => { setNicknameInput(event.target.value); setNicknameMessage(""); }} /></label><small className={`match-field-guide${nicknameMessage ? " is-error" : ""}`}>{nicknameMessage || validateMatchNickname(nicknameInput).message}</small><div className="match-confirm-actions"><button className="match-button match-button--secondary" type="button" disabled={nicknameSaving} onClick={() => setNicknameOpen(false)}>취소</button><button className="match-button" type="submit" disabled={nicknameSaving || !validateMatchNickname(nicknameInput).valid}>{nicknameSaving ? "변경 중…" : "저장"}</button></div></form></div> : null}
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

function TasteProfile({ details, lessMatchedLabels }: { details: TasteDetail[]; lessMatchedLabels: string[] }) {
  return <section className="match-result-section match-taste-profile"><h2>내가 끌리는 요소</h2><p className="match-section-note">장르와 별개로, 이런 설정과 전개에 끌려요.</p>{details.length ? <ul className="match-taste-flow">{details.map((item) => <li key={`${item.category}-${item.value}`}><span>{item.category}</span><strong>{item.value}</strong></li>)}</ul> : <p className="match-taste-empty">선택한 취향을 찾지 못했어요.</p>}<h2 className="match-taste-secondary-title">조금 망설이는 요소</h2><p className="match-section-note">이런 요소에서는 시작하기 전에 한 번 더 고민해요.</p>{lessMatchedLabels.length ? <ul className="match-taste-flow">{lessMatchedLabels.map((label) => <li key={label}><strong>{label}</strong></li>)}</ul> : <p className="match-taste-empty">딱히 망설이는 요소 없음</p>}</section>;
}
