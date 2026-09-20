"use client";

import { useEffect, useRef, useState } from "react";
import { trackMatchEvent } from "../analytics/client";
import { readMatchDraft } from "../storage/draft.mjs";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import { readOwnerManageToken } from "../storage/challengeStorage.mjs";

type RankingEntry = {
  entryId: string;
  resultId: string;
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

function ownerHeaders(ownerToken: string, ownerAnonymousId: string, includeContentType = false) {
  return {
    ...(includeContentType ? { "content-type": "application/json" } : {}),
    ...(ownerToken ? { authorization: `Bearer ${ownerToken}` } : {}),
    ...(ownerAnonymousId ? { "x-match-owner-id": ownerAnonymousId } : {}),
  };
}

async function requestRanking(challengeCode: string, ownerToken: string, ownerAnonymousId: string, viewerProfileId: string) {
  const query = new URLSearchParams({ limit: "20" });
  if (viewerProfileId) query.set("viewerProfileId", viewerProfileId);
  const response = await fetch(`/api/v1/challenges/${challengeCode}/ranking?${query}`, {
    headers: ownerHeaders(ownerToken, ownerAnonymousId),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "RANKING_LOAD_FAILED");
  return body as RankingData;
}

export function ChallengeRankingView({ challengeCode }: { challengeCode: string }) {
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [ownerToken, setOwnerToken] = useState("");
  const [ownerAnonymousId, setOwnerAnonymousId] = useState("");
  const [viewerProfileId, setViewerProfileId] = useState("");
  const [message, setMessage] = useState("");
  const [mutating, setMutating] = useState("");
  const [mutationAction, setMutationAction] = useState<"hide" | "restore" | "">("");
  const [confirming, setConfirming] = useState("");
  const [hideCandidate, setHideCandidate] = useState<RankingEntry | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const rankingTracked = useRef(false);

  useEffect(() => {
    let active = true;
    const token = readOwnerManageToken(window.localStorage, challengeCode) ?? "";
    const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
    const viewer = readMatchDraft(window.localStorage)?.resultPublicId ?? "";
    const wantsReplacement = new URLSearchParams(window.location.search).get("replace") === "1";
    void requestRanking(challengeCode, token, identity.anonymousId, viewer).then((body) => {
      if (!active) return;
      setOwnerToken(token);
      setOwnerAnonymousId(identity.anonymousId);
      setViewerProfileId(viewer);
      setReplaceMode(wantsReplacement);
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
    setRanking(await requestRanking(challengeCode, ownerToken, ownerAnonymousId, viewerProfileId));
  }

  async function setEntryHidden(entry: RankingEntry, hiddenByOwner: boolean) {
    setMutating(entry.entryId);
    setMutationAction(hiddenByOwner ? "hide" : "restore");
    setMessage("");
    try {
      const response = await fetch(`/api/v1/challenges/${challengeCode}/entries/${entry.entryId}`, {
        method: "PATCH",
        headers: ownerHeaders(ownerToken, ownerAnonymousId, true),
        body: JSON.stringify({ hiddenByOwner }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      trackMatchEvent("wm_owner_hide_entry", { challengeCode, hidden: hiddenByOwner });
      await refresh();
      if (hiddenByOwner) setHideCandidate(null);
      setMessage(hiddenByOwner ? "랭킹에서 숨겼어요." : "랭킹에 다시 표시했어요.");
    } catch {
      if (hiddenByOwner) setHideCandidate(null);
      setMessage("항목 표시를 변경하지 못했어요.");
    } finally {
      setMutating("");
      setMutationAction("");
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
        headers: ownerHeaders(ownerToken, ownerAnonymousId, true),
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.error === "ACTIVE_CHALLENGE_EXISTS") throw new Error(ACTIVE_CHALLENGE_MESSAGE);
        throw new Error(result.error);
      }
      await refresh();
      setMessage(body.status === "closed" ? replaceMode ? "기존 링크를 닫았어요. 이제 새 결과로 링크를 만들 수 있어요." : "새 참여를 닫았어요." : body.status === "active" ? "새 참여를 다시 열었어요." : body.rankingVisibility ? "링크 랭킹을 공개했어요." : "링크 랭킹을 비공개로 바꿨어요.");
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
      setMessage("초대 링크를 복사하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  if (!ranking && message) return <main className="match-page"><section className="match-card match-hero"><h1>{message}</h1><a className="match-button" href="/match">웹툰궁합 홈으로</a></section></main>;
  if (!ranking) return <main className="match-page"><section className="match-card match-hero"><p>궁합 랭킹을 불러오는 중이에요…</p></section></main>;

  const rankingIsPrivate = ranking.rankingVisibility === "private" && !ranking.canManage;
  return <main className="match-page match-ranking-page">
    <section className="match-ranking-hero">
      <p className="match-eyebrow">웹툰궁합 랭킹</p>
      <h1><strong>{ranking.ownerNickname}</strong>님과<br />누가 가장 잘 맞을까?</h1>
      <div className="match-ranking-count"><strong>{ranking.entryCount}</strong><span>명의 도전자</span></div>
      {ranking.status === "closed" ? <span className="match-status-badge">새 참여 마감</span> : null}
    </section>

    {mutationAction ? <div className="match-ranking-progress" role="status" aria-live="polite"><strong>{mutationAction === "hide" ? "랭킹에서 숨기는 중이에요…" : "랭킹으로 복원하는 중이에요…"}</strong><div aria-hidden="true"><span /></div></div> : null}

    {rankingIsPrivate ? <section className="match-result-section match-ranking-empty"><h2>랭킹을 공개하지 않은 링크예요</h2><p>링크 주인만 이 기기에서 전체 랭킹을 볼 수 있어요.</p></section> : <RankingList challengeCode={challengeCode} entries={ranking.top20} canManage={ranking.canManage} mutating={mutating} onRequestHide={setHideCandidate} />}

    {!rankingIsPrivate && ranking.viewerEntry ? <section className="match-result-section match-viewer-rank"><p>내 현재 위치</p><RankingRow challengeCode={challengeCode} entry={ranking.viewerEntry} /></section> : null}

    {ranking.canManage ? <section className="match-result-section match-owner-panel">
      <p className="match-eyebrow">링크 주인 관리</p>
      <h2>랭킹과 참여 설정</h2>
      {replaceMode ? <div className="match-replace-guide"><strong>새 결과로 링크 바꾸기</strong><p>{ranking.status === "closed" ? "기존 링크가 닫혔어요. 이제 최신 취향 결과로 새 링크를 만들 수 있어요." : "랭킹 기준이 섞이지 않도록 기존 링크를 먼저 닫아 주세요. 기존 결과와 랭킹은 그대로 보관됩니다."}</p></div> : null}
      <label className="match-owner-toggle"><input type="checkbox" checked={ranking.rankingVisibility === "public_by_link"} disabled={mutating === "challenge"} onChange={(event) => void updateChallenge({ rankingVisibility: event.target.checked })} /><span><strong>링크 랭킹 공개</strong><small>끄면 링크를 아는 사람도 전체 순위를 볼 수 없어요.</small></span></label>
      {replaceMode && ranking.status === "closed" ? <><a className="match-button" href="/match/challenge/new">새 결과로 초대 링크 만들기</a><button className="match-button match-button--secondary" type="button" disabled={mutating === "challenge"} onClick={() => void updateChallenge({ status: "active" })}>기존 링크 다시 열기</button></> : <button className={`match-button ${ranking.status === "closed" ? "" : "match-danger-button"}`} type="button" disabled={mutating === "challenge"} onClick={() => void updateChallenge({ status: ranking.status === "closed" ? "active" : "closed" })}>{ranking.status === "closed" ? "새 참여 다시 열기" : confirming === "challenge" ? "한 번 더 눌러 닫기" : replaceMode ? "기존 링크 닫기" : "새 참여 닫기"}</button>}
      {ranking.hiddenEntries.length ? <details className="match-hidden-entries"><summary>숨긴 도전자 {ranking.hiddenEntries.length}명</summary>{ranking.hiddenEntries.map((entry) => <div key={entry.entryId}><span>{entry.nickname} · {entry.score}%</span><button type="button" disabled={Boolean(mutating)} onClick={() => void setEntryHidden(entry, false)}>{mutating === entry.entryId && mutationAction === "restore" ? "복원 중…" : "복원"}</button></div>)}</details> : null}
    </section> : null}

    {hideCandidate ? <div className="match-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !mutating) setHideCandidate(null); }}>
      <section className="match-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="match-hide-confirm-title">
        <p className="match-eyebrow">랭킹 숨김</p>
        <h2 id="match-hide-confirm-title">{hideCandidate.nickname}님을 정말 숨길까요?</h2>
        <p>숨긴 도전자는 공개 랭킹에서 보이지 않으며, 나중에 관리 화면에서 다시 복원할 수 있어요.</p>
        {mutating === hideCandidate.entryId ? <div className="match-confirm-progress" role="status"><span>숨기는 중…</span><div aria-hidden="true"><span /></div></div> : null}
        <div className="match-confirm-actions"><button type="button" className="match-button match-button--secondary" disabled={Boolean(mutating)} onClick={() => setHideCandidate(null)}>취소</button><button type="button" className="match-button match-danger-button" disabled={Boolean(mutating)} onClick={() => void setEntryHidden(hideCandidate, true)}>{mutating === hideCandidate.entryId ? "처리 중…" : "정말 숨기기"}</button></div>
      </section>
    </div> : null}

    {message ? <p className="match-notice" role="status">{message}</p> : null}
    <div className="match-result-actions"><a className="match-button" href={`/match/share/ranking?challengeCode=${challengeCode}`}>현재 랭킹 Threads에 공유</a><button className="match-button match-button--secondary" type="button" onClick={() => void copyInvitationLink()}>초대 링크 복사</button></div>
  </main>;
}

function RankingList({ challengeCode, entries, canManage, mutating, onRequestHide }: { challengeCode: string; entries: RankingEntry[]; canManage: boolean; mutating: string; onRequestHide: (entry: RankingEntry) => void }) {
  if (!entries.length) return <section className="match-result-section match-ranking-empty"><div aria-hidden="true">✦</div><h2>아직 도전자가 없어요</h2><p>첫 번째 궁합을 기다리는 중이에요.</p></section>;
  return <section className="match-result-section match-ranking-list"><h2>현재 랭킹</h2><p className="match-section-note">상위 20명까지 보여요. 도전자를 누르면 둘의 궁합 결과를 볼 수 있어요.</p><div>{entries.map((entry) => <RankingRow key={entry.entryId} challengeCode={challengeCode} entry={entry} canManage={canManage} mutating={mutating} onRequestHide={onRequestHide} />)}</div></section>;
}

function RankingRow({ challengeCode, entry, canManage = false, mutating = "", onRequestHide }: { challengeCode: string; entry: RankingEntry; canManage?: boolean; mutating?: string; onRequestHide?: (entry: RankingEntry) => void }) {
  const canHide = canManage && onRequestHide;
  return <article className={`match-ranking-row ${canHide ? "has-actions" : ""} ${entry.rank && entry.rank <= 3 ? `is-top-${entry.rank}` : ""} ${entry.isViewer ? "is-viewer" : ""}`}>
    <a className="match-ranking-result-link" href={`/match/c/${challengeCode}/match/${entry.resultId}?from=ranking`} aria-label={`${entry.nickname}님과의 웹툰궁합 결과 보기`}>
      <span className="match-ranking-position">{entry.rank}</span>
      <div><strong>{entry.nickname}{entry.isViewer ? <small> 나</small> : null}</strong><p>{entry.sharedGenres.length ? entry.sharedGenres.join(" · ") : "겹치는 장르를 찾는 중"}</p></div>
      <strong className="match-ranking-score">{entry.score}% <span aria-hidden="true">›</span></strong>
    </a>
    {canHide ? <button className="match-ranking-hide" type="button" disabled={Boolean(mutating)} onClick={() => onRequestHide(entry)}>{mutating === entry.entryId ? "처리 중…" : "숨김"}</button> : null}
  </article>;
}
