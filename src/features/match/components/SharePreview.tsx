"use client";

import { useEffect, useState } from "react";
import { recordMatchEvent } from "../analytics/events.mjs";
import { readOwnerManageToken } from "../storage/challengeStorage.mjs";
import { downloadBlob, renderShareCardPng, type ShareCardModel } from "../share/shareCardImage";
import { pairShareCopy, personalShareCopy, rankingShareCopy, threadsIntentUrl } from "../share/sharePolicy.mjs";

type ShareType = "personal" | "pair" | "ranking";
type SharePayload = { card: ShareCardModel; shareText: string; shareUrl: string; templateKey: string };

type PersonalResult = {
  topGenres: Array<{ displayLabel: string; stars: number }>;
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
        const copy = personalShareCopy({ ...result, challengeUrl });
        next = {
          card: {
            eyebrow: "내 웹툰 취향",
            title: `${result.topGenres[0]?.displayLabel ?? "웹툰"}에 별이 가장 많이 모였어요`,
            subtitle: "9개 장르에 나뉜 나의 취향별 18개",
            rows: result.topGenres.slice(0, 3).map((genre, index) => ({ label: `${index + 1}. ${genre.displayLabel}`, value: `별 ${genre.stars}개` })),
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
        const copy = pairShareCopy({ ...result, bandLabel: result.band.label, pairUrl });
        next = {
          card: {
            eyebrow: "웹툰궁합 결과",
            title: copy.cardTitle,
            subtitle: result.band.label,
            metric: `${result.score}%`,
            rows: [
              { label: "둘 다 잘 보는 장르", value: result.sharedGenres.slice(0, 2).join(" · ") || "조금 다름" },
              { label: "여기서 갈림", value: result.differentGenres.slice(0, 2).join(" · ") || "거의 비슷" },
            ],
            footer: "웹툰 취향으로 확인한 우리 둘의 궁합",
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
            eyebrow: "웹툰궁합 랭킹",
            title: `${result.ownerNickname}님과 누가 가장 잘 맞을까?`,
            subtitle: `현재 도전자 ${result.entryCount}명`,
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
    <article className="match-share-card" aria-label={`${payload.card.eyebrow} 공유 카드 미리보기`}>
      <div className="match-share-brand"><strong>웹툰궁합</strong><span aria-hidden="true">✦ ✦</span></div>
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
