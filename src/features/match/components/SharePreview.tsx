"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { recordMatchEvent } from "../analytics/events.mjs";
import { readOwnerManageToken } from "../storage/challengeStorage.mjs";
import { downloadBlob, renderShareCardPng, type ShareCardModel } from "../share/shareCardImage";
import { pairArchetypeFor, personalArchetypeFor } from "../share/shareArchetypes.mjs";
import { pairShareCopy, personalShareCopy, rankingShareCopy, threadsIntentUrl } from "../share/sharePolicy.mjs";

type ShareType = "personal" | "pair" | "ranking";
type SharePayload = { card: ShareCardModel; shareText: string; shareUrl: string; templateKey: string };

type PersonalResult = {
  topGenres: Array<{ genreKey: string; displayLabel: string; stars: number }>;
  wellMatchedLabels: string[];
  lessMatchedLabels: string[];
};

type PairResult = {
  ownerNickname: string;
  challengerNickname: string;
  score: number;
  band: { label: string };
  sharedGenres: string[];
  differentGenres: string[];
  trustSentence: string;
  rank: number;
  entryCount: number;
};

type RankingResult = {
  ownerNickname: string;
  entryCount: number;
  top20: Array<{ rank: number; nickname: string; score: number; sharedGenres: string[] }>;
};

async function responseJson<T>(url: string, headers?: HeadersInit) {
  const response = await fetch(url, { headers });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "SHARE_SOURCE_LOAD_FAILED");
  return body as T;
}

function fallbackCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("COPY_FAILED");
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  fallbackCopy(text);
}

export function SharePreview({ type, profilePublicId, challengeCode, resultId }: { type: ShareType; profilePublicId?: string; challengeCode?: string; resultId?: string }) {
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const origin = window.location.origin;
      let next: SharePayload;

      if (type === "personal") {
        if (!profilePublicId || !challengeCode) throw new Error("SHARE_SOURCE_MISSING");
        const result = await responseJson<PersonalResult>(`/api/v1/results/${profilePublicId}`);
        const challengeUrl = `${origin}/match/c/${challengeCode}`;
        const leadGenre = result.topGenres[0];
        const archetype = personalArchetypeFor(leadGenre?.genreKey);
        const copy = personalShareCopy({ ...result, challengeUrl, archetypeName: archetype.name });
        next = {
          card: {
            eyebrow: "나의 웹툰 본캐",
            title: archetype.name,
            subtitle: archetype.description,
            badge: `취향 1위 · ${leadGenre?.displayLabel ?? "웹툰"}`,
            symbol: archetype.symbol,
            imageSrc: archetype.imageSrc,
            imageAlt: archetype.imageAlt,
            theme: archetype.theme as ShareCardModel["theme"],
            rows: result.topGenres.slice(0, 3).map((genre, index) => ({ label: `${index + 1}위 · ${genre.displayLabel}`, value: "★".repeat(genre.stars) || "별 없음" })),
            footer: "나랑 웹툰궁합 몇 % 나오는지 해볼래?",
            fileName: "webtoon-match-personal.png",
          },
          shareText: copy.text,
          shareUrl: copy.shareUrl,
          templateKey: copy.templateKey,
        };
      } else if (type === "pair") {
        if (!challengeCode || !resultId) throw new Error("SHARE_SOURCE_MISSING");
        const result = await responseJson<PairResult>(`/api/v1/challenges/${challengeCode}/results/${resultId}`);
        const pairUrl = `${origin}/match/c/${challengeCode}/match/${resultId}`;
        const archetype = pairArchetypeFor(result.score);
        const copy = pairShareCopy({ ...result, archetypeName: archetype.name, bandLabel: result.band.label, pairUrl });
        next = {
          card: {
            eyebrow: `${result.ownerNickname} × ${result.challengerNickname}`,
            title: archetype.name,
            subtitle: archetype.description,
            badge: archetype.badge,
            symbol: archetype.symbol,
            theme: archetype.theme as ShareCardModel["theme"],
            metric: `${result.score}%`,
            rows: [
              { label: "같이 달릴 장르", value: result.sharedGenres.slice(0, 2).join(" · ") || "새 장르 개척" },
              { label: "각자 영업할 장르", value: result.differentGenres.slice(0, 2).join(" · ") || "거의 한마음" },
              { label: "현재 랭킹", value: `${result.rank}위 / ${result.entryCount}명` },
            ],
            footer: "웹툰 취향 한정 관계 타입 · 사람 사이를 평가하지 않아요",
            fileName: "webtoon-match-pair.png",
          },
          shareText: copy.text,
          shareUrl: copy.shareUrl,
          templateKey: copy.templateKey,
        };
      } else {
        if (!challengeCode) throw new Error("SHARE_SOURCE_MISSING");
        const ownerToken = readOwnerManageToken(window.localStorage, challengeCode);
        const headers = ownerToken ? { authorization: `Bearer ${ownerToken}` } : undefined;
        const result = await responseJson<RankingResult>(`/api/v1/challenges/${challengeCode}/ranking?limit=3`, headers);
        const challengeUrl = `${origin}/match/c/${challengeCode}`;
        const copy = rankingShareCopy({ topEntry: result.top20[0] ?? null, challengeUrl });
        next = {
          card: {
            eyebrow: `${result.ownerNickname}의 웹툰궁합`,
            title: "취향 왕좌 쟁탈전",
            subtitle: result.entryCount ? "현재 1위를 밀어낼 웹툰 메이트를 찾는 중이에요." : "왕좌가 비었어요. 첫 번째 도전자가 주인공!",
            badge: `현재 도전자 · ${result.entryCount}명`,
            symbol: "♛",
            theme: "gold",
            rows: result.top20.slice(0, 3).map((entry) => ({ label: `${entry.rank}위  ${entry.nickname}`, value: `${entry.score}%` })),
            footer: result.entryCount ? "현재 1위를 넘을 사람을 기다리는 중" : "첫 번째 도전자를 기다리는 중",
            fileName: "webtoon-match-ranking.png",
          },
          shareText: copy.text,
          shareUrl: copy.shareUrl,
          templateKey: copy.templateKey,
        };
      }

      if (active) setPayload(next);
    };
    void load().catch(() => active && setError("공유할 결과를 불러오지 못했어요."));
    return () => { active = false; };
  }, [type, profilePublicId, challengeCode, resultId]);

  function track(eventName: string, properties: Record<string, string>) {
    recordMatchEvent(window.localStorage, eventName, properties);
  }

  function openThreads() {
    if (!payload) return;
    track("wm_share_intent_click", { shareType: type, templateKey: payload.templateKey });
    if (type === "ranking") track("wm_ranking_share_click", { shareType: type, reason: "initial" });
    window.open(threadsIntentUrl(payload.shareText), "_blank", "noopener,noreferrer");
  }

  async function copyText(kind: "text" | "link") {
    if (!payload) return;
    try {
      await copyToClipboard(kind === "text" ? payload.shareText : payload.shareUrl);
      track("wm_share_fallback", { shareType: type, action: kind });
      setMessage(kind === "text" ? "공유 문구를 복사했어요." : "링크를 복사했어요.");
    } catch {
      setMessage("복사하지 못했어요. 아래 내용을 직접 복사해 주세요.");
    }
  }

  async function saveImage() {
    if (!payload) return;
    setSaving(true);
    try {
      const blob = await renderShareCardPng(payload.card);
      downloadBlob(blob, payload.card.fileName);
      track("wm_share_fallback", { shareType: type, action: "image" });
      setMessage("공유 카드를 이미지로 저장했어요.");
    } catch {
      setMessage("이미지를 저장하지 못했어요. 화면을 캡처해 사용해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <main className="match-page"><section className="match-card match-hero"><p className="match-eyebrow">공유 준비</p><h1>{error}</h1><button className="match-button" type="button" onClick={() => history.back()}>이전 화면으로</button></section></main>;
  if (!payload) return <main className="match-page"><section className="match-card match-hero"><p>공유 카드를 만드는 중이에요…</p></section></main>;

  return <main className="match-page match-share-page">
    <section className="match-share-heading"><p className="match-eyebrow">공유 미리보기</p><h1>이 카드로 공유할까요?</h1><p>Threads에서는 이미지가 자동으로 붙지 않을 수 있어요. 이미지를 저장한 뒤 직접 첨부하면 가장 정확해요.</p></section>
    <article className={`match-share-card is-${payload.card.theme ?? "violet"}${payload.card.metric ? " has-metric" : ""}${payload.card.imageSrc ? " has-character" : ""}`} aria-label={`${payload.card.eyebrow} 공유 카드 미리보기`}>
      <div className="match-share-brand"><strong>웹툰궁합</strong><span>WEBTOON FIT</span></div>
      {payload.card.imageSrc ? <span className="match-share-character"><Image src={payload.card.imageSrc} alt={payload.card.imageAlt ?? "웹툰 본캐"} width={360} height={540} priority /></span> : payload.card.symbol ? <span className="match-share-symbol" aria-hidden="true">{payload.card.symbol}</span> : null}
      {payload.card.badge ? <strong className="match-share-badge">{payload.card.badge}</strong> : null}
      <p>{payload.card.eyebrow}</p>
      <h2>{payload.card.title}</h2>
      <h3>{payload.card.subtitle}</h3>
      {payload.card.metric ? <strong className="match-share-metric">{payload.card.metric}</strong> : null}
      <div className="match-share-rows">{payload.card.rows.length ? payload.card.rows.map((row, index) => <div key={`${row.label}-${index}`}><strong>{row.label}</strong>{row.value ? <span>{row.value}</span> : null}</div>) : <div><strong>아직 첫 번째 도전자를 기다리는 중</strong></div>}</div>
      <footer><span>{payload.card.footer}</span><strong>webtoon fit</strong></footer>
    </article>
    <section className="match-share-actions">
      <button className="match-button" type="button" onClick={openThreads}>Threads에 공유하기</button>
      <button className="match-button match-button--secondary" type="button" disabled={saving} onClick={() => void saveImage()}>{saving ? "이미지 만드는 중…" : "이미지 저장"}</button>
      <div><button type="button" onClick={() => void copyText("text")}>문구 복사</button><button type="button" onClick={() => void copyText("link")}>링크 복사</button></div>
    </section>
    <p className="match-topic-guide">Threads 작성 화면에서 ‘웹툰’이나 ‘웹툰추천’ 관련 토픽을 하나 골라 주세요. 자동으로 게시되지는 않아요.</p>
    {message ? <p className="match-notice" role="status">{message}</p> : null}
    <details className="match-share-copy"><summary>공유 문구 미리보기</summary><pre>{payload.shareText}</pre></details>
    <button className="match-text-link" type="button" onClick={() => history.back()}>이전 화면으로</button>
  </main>;
}
