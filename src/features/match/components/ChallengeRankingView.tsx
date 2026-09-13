"use client";

import { useEffect, useRef, useState } from "react";
import { trackMatchEvent } from "../analytics/client";
import { readMatchDraft } from "../storage/draft.mjs";
import { readOwnerManageToken } from "../storage/challengeStorage.mjs";

type RankingEntry = {
  entryId: string;
  nickname: string;
  score: number;
  rank: number | null;
  sharedGenres: string[];
  isViewer: boolean;
  updatedAt: string;
};

type RankingData = {
  challengeCode: string;
  ownerNickname: string;
  entryCount: number;
  status: "active" | "closed" | "deleted";
  rankingVisibility: "public_by_link" | "private";
  canManage: boolean;
  top20: RankingEntry[];
  viewerEntry: RankingEntry | null;
  hiddenEntries: RankingEntry[];
};

const ACTIVE_CHALLENGE_MESSAGE = "다른 궁합 링크가 이미 열려 있어요. 그 링크를 닫은 뒤 다시 열어 주세요.";

async function requestRanking(challengeCode: string, ownerToken: string, viewerProfileId: string) {
  const query = new URLSearchParams({ limit: "20" });
  if (viewerProfileId) query.set("viewerProfileId", viewerProfileId);
  const response = await fetch(`/api/v1/challenges/${challengeCode}/ranking?${query}`, {
    headers: ownerToken ? { authorization: `Bearer ${ownerToken}` } : undefined,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "RANKING_LOAD_FAILED");
  return body as RankingData;
}

export function ChallengeRankingView({ challengeCode }: { challengeCode: string }) {
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [ownerToken, setOwnerToken] = useState("");
  const [viewerProfileId, setViewerProfileId] = useState("");
  const [message, setMessage] = useState("");
  const [mutating, setMutating] = useState("");
  const [confirming, setConfirming] = useState("");
  const rankingTracked = useRef(false);

  useEffect(() => {
    let active = true;
    const token = readOwnerManageToken(window.localStorage, challengeCode) ?? "";
    const viewer = readMatchDraft(window.localStorage)?.resultPublicId ?? "";
    void requestRanking(challengeCode, token, viewer).then((body) => {
      if (!active) return;
      setOwnerToken(token);
      setViewerProfileId(viewer);
      setRanking(body);
      if (!rankingTracked.current) {
        rankingTracked.current = true;
        trackMatchEvent("wm_ranking_view", {
          challengeCode,
          entryCount: body.entryCount,
          viewerRank: body.viewerEntry?.rank ?? 0,
          canManage: body.canManage,
        });
      }
    }).catch(() => active && setMessage("랭킹을 불러오지 못했어요."));
    return () => { active = false; };
  }, [challengeCode]);

  async function refresh() {
    setRanking(await requestRanking(challengeCode, ownerToken, viewerProfileId));
  }

  async function setEntryHidden(entry: RankingEntry, hiddenByOwner: boolean) {
    const confirmationKey = `entry:${entry.entryId}`;
    if (hiddenByOwner && confirming !== confirmationKey) {
      setConfirming(confirmationKey);
      setMessage(`${entry.nickname}님의 항목을 숨기려면 버튼을 한 번 더 눌러 주세요.`);
      return;
    }
    setConfirming("");
    setMutating(entry.entryId);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/challenges/${challengeCode}/entries/${entry.entryId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({ hiddenByOwner }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      trackMatchEvent("wm_owner_hide_entry", { challengeCode, hidden: hiddenByOwner });
      await refresh();
      setMessage(hiddenByOwner ? "랭킹에서 숨겼어요." : "랭킹에 다시 표시했어요.");
    } catch {
      setMessage("항목 표시를 변경하지 못했어요.");
    } finally {
      setMutating("");
    }
  }

  async function updateChallenge(body: { status?: "active" | "closed"; rankingVisibility?: boolean }) {
    if (body.status === "closed" && confirming !== "challenge") {
      setConfirming("challenge");
      setMessage("새 참여를 닫으려면 버튼을 한 번 더 눌러 주세요.");
      return;
    }
    setConfirming("");
    setMutating("challenge");
    setMessage("");
    try {
      const response = await fetch(`/api/v1/challenges/${challengeCode}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.error === "ACTIVE_CHALLENGE_EXISTS") throw new Error(ACTIVE_CHALLENGE_MESSAGE);
        throw new Error(result.error);
      }
      await refresh();
      setMessage(body.status === "closed" ? "새 참여를 닫았어요." : body.status === "active" ? "새 참여를 다시 열었어요." : body.rankingVisibility ? "링크 랭킹을 공개했어요." : "링크 랭킹을 비공개로 바꿨어요.");
    } catch (error) {
      setMessage(error instanceof Error && error.message === ACTIVE_CHALLENGE_MESSAGE ? ACTIVE_CHALLENGE_MESSAGE : "링크 설정을 변경하지 못했어요.");
    } finally {
      setMutating("");
    }
  }

  async function copyInvitationLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/match/c/${challengeCode}`);
      setMessage("초대 링크를 복사했어요.");
    } catch {
      setMessage("초대 화면을 연 뒤 주소창의 링크를 복사해 주세요.");
    }
  }

  if (!ranking && message) return <main className="match-page"><section className="match-card match-hero"><h1>{message}</h1><a className="match-button" href={`/match/c/${challengeCode}`}>초대 화면으로</a></section></main>;
  if (!ranking) return <main className="match-page"><section className="match-card match-hero"><p>궁합 랭킹을 불러오는 중이에요…</p></section></main>;

  const rankingIsPrivate = ranking.rankingVisibility === "private" && !ranking.canManage;
  return <main className="match-page match-ranking-page">
    <section className="match-ranking-hero">
      <p className="match-eyebrow">웹툰궁합 랭킹</p>
      <h1><strong>{ranking.ownerNickname}</strong>님과<br />누가 가장 잘 맞을까?</h1>
      <div className="match-ranking-count"><strong>{ranking.entryCount}</strong><span>명의 도전자</span></div>
      {ranking.status === "closed" ? <span className="match-status-badge">새 참여 마감</span> : null}
    </section>

    {rankingIsPrivate ? <section className="match-result-section match-ranking-empty"><h2>랭킹을 공개하지 않은 링크예요</h2><p>링크 주인만 이 기기에서 전체 랭킹을 볼 수 있어요.</p></section> : <RankingList entries={ranking.top20} canManage={ranking.canManage} mutating={mutating} confirming={confirming} onHide={setEntryHidden} />}

    {!rankingIsPrivate && ranking.viewerEntry ? <section className="match-result-section match-viewer-rank"><p>내 현재 위치</p><RankingRow entry={ranking.viewerEntry} /></section> : null}

    {ranking.canManage ? <section className="match-result-section match-owner-panel">
      <p className="match-eyebrow">링크 주인 관리</p>
      <h2>랭킹과 참여 설정</h2>
      <label className="match-owner-toggle"><input type="checkbox" checked={ranking.rankingVisibility === "public_by_link"} disabled={mutating === "challenge"} onChange={(event) => void updateChallenge({ rankingVisibility: event.target.checked })} /><span><strong>링크 랭킹 공개</strong><small>끄면 링크를 아는 사람도 전체 순위를 볼 수 없어요.</small></span></label>
      <button className={`match-button ${ranking.status === "closed" ? "" : "match-danger-button"}`} type="button" disabled={mutating === "challenge"} onClick={() => void updateChallenge({ status: ranking.status === "closed" ? "active" : "closed" })}>{ranking.status === "closed" ? "새 참여 다시 열기" : confirming === "challenge" ? "한 번 더 눌러 닫기" : "새 참여 닫기"}</button>
      {ranking.hiddenEntries.length ? <details className="match-hidden-entries"><summary>숨긴 도전자 {ranking.hiddenEntries.length}명</summary>{ranking.hiddenEntries.map((entry) => <div key={entry.entryId}><span>{entry.nickname} · {entry.score}%</span><button type="button" disabled={mutating === entry.entryId} onClick={() => void setEntryHidden(entry, false)}>복원</button></div>)}</details> : null}
    </section> : null}

    {message ? <p className="match-notice" role="status">{message}</p> : null}
    <div className="match-result-actions"><a className="match-button" href={`/match/share/ranking?challengeCode=${challengeCode}`}>현재 랭킹 Threads에 공유</a><button className="match-button match-button--secondary" type="button" onClick={() => void copyInvitationLink()}>초대 링크 복사</button><a className="match-button match-button--secondary" href={`/match/c/${challengeCode}`}>초대 화면으로</a></div>
  </main>;
}

function RankingList({ entries, canManage, mutating, confirming, onHide }: { entries: RankingEntry[]; canManage: boolean; mutating: string; confirming: string; onHide: (entry: RankingEntry, hidden: boolean) => void }) {
  if (!entries.length) return <section className="match-result-section match-ranking-empty"><div aria-hidden="true">✦</div><h2>아직 도전자가 없어요</h2><p>첫 번째 궁합을 기다리는 중이에요.</p></section>;
  return <section className="match-result-section match-ranking-list"><h2>현재 랭킹</h2><p className="match-section-note">같은 점수는 공동 순위로 표시해요.</p><div>{entries.map((entry) => <RankingRow key={entry.entryId} entry={entry} canManage={canManage} mutating={mutating} confirming={confirming} onHide={onHide} />)}</div></section>;
}

function RankingRow({ entry, canManage = false, mutating = "", confirming = "", onHide }: { entry: RankingEntry; canManage?: boolean; mutating?: string; confirming?: string; onHide?: (entry: RankingEntry, hidden: boolean) => void }) {
  return <article className={`match-ranking-row ${entry.rank && entry.rank <= 3 ? `is-top-${entry.rank}` : ""} ${entry.isViewer ? "is-viewer" : ""}`}>
    <span className="match-ranking-position">{entry.rank}</span>
    <div><strong>{entry.nickname}{entry.isViewer ? <small> 나</small> : null}</strong><p>{entry.sharedGenres.length ? entry.sharedGenres.join(" · ") : "겹치는 장르를 찾는 중"}</p></div>
    <strong className="match-ranking-score">{entry.score}%</strong>
    {canManage && onHide ? <button className="match-ranking-hide" type="button" disabled={mutating === entry.entryId} onClick={() => onHide(entry, true)}>{confirming === `entry:${entry.entryId}` ? "한 번 더" : "숨김"}</button> : null}
  </article>;
}
