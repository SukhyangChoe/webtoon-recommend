"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { trackMatchEvent } from "../analytics/client";
import { readMatchDraft } from "../storage/draft.mjs";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import { readOwnerManageToken } from "../storage/challengeStorage.mjs";
import { recommendationGenreLabel } from "../config/recommendationPresentation.mjs";
import { pairArchetypeFor } from "../share/shareArchetypes.mjs";
import { RELATIONSHIP_MIN_SCORE, RELATIONSHIP_MAX_PEOPLE } from "../engine/relationshipPolicy.mjs";
import { MatchDialog } from "./MatchDialog";
import { MatchIcon } from "./MatchIcon";
import { MatchActionBar } from "./MatchActionBar";
import { PersonaAvatar } from "./PersonaAvatar";
import { RelationshipMap, type RelationshipPerson } from "./RelationshipMap";

type RankingData = {
  challengeCode: string; ownerNickname: string; ownerGenreKey: string | null; ownerTopGenreKeys: string[]; ownerPublicProfileId?: string | null; entryCount: number;
  status: "active" | "closed" | "deleted"; rankingVisibility: "public_by_link" | "private"; canManage: boolean;
  graphEntries: RelationshipPerson[]; entries: RelationshipPerson[]; viewerEntry: RelationshipPerson | null;
  hiddenEntries: RelationshipPerson[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
};
type Identity = { ownerToken: string; anonymousId: string; viewerProfileId: string };
const ACTIVE_CHALLENGE_MESSAGE = "다른 궁합 링크가 이미 열려 있어요. 그 링크를 닫은 뒤 다시 열어 주세요.";

function ownerHeaders(identity: Identity, json = false) {
  return {
    ...(json ? { "content-type": "application/json" } : {}),
    ...(identity.ownerToken ? { authorization: `Bearer ${identity.ownerToken}` } : {}),
    "x-match-owner-id": identity.anonymousId,
  };
}

async function requestRanking(challengeCode: string, identity: Identity, page: number, genre: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ limit: "20", page: String(page), genre });
  if (identity.viewerProfileId) query.set("viewerProfileId", identity.viewerProfileId);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(abort, 20000);
  try {
    const response = await fetch(`/api/v1/challenges/${challengeCode}/ranking?${query}`, { headers: ownerHeaders(identity), signal: controller.signal });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "RANKING_LOAD_FAILED");
    return body as RankingData;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export function ChallengeRankingView({ challengeCode }: { challengeCode: string }) {
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [genre, setGenre] = useState("all");
  const [listOpen, setListOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);
  const [viewerProfileId, setViewerProfileId] = useState("");
  const [message, setMessage] = useState("");
  const [mutating, setMutating] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [hideCandidate, setHideCandidate] = useState<RelationshipPerson | null>(null);
  const [selected, setSelected] = useState<RelationshipPerson | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const identity = useRef<Identity>({ ownerToken: "", anonymousId: "", viewerProfileId: "" });
  const rankingTracked = useRef("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const menuActionRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDetailsElement>(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const version = ++requestVersion.current;
    async function load() {
      const anonymous = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      const viewer = readMatchDraft(window.localStorage)?.resultPublicId ?? "";
      identity.current = { ownerToken: readOwnerManageToken(window.localStorage, challengeCode) ?? "", anonymousId: anonymous.anonymousId, viewerProfileId: viewer };
      setLoading(true);
      setMessage("");
      setViewerProfileId(viewer);
      setReplaceMode(new URLSearchParams(window.location.search).get("replace") === "1");
      try {
        const body = await requestRanking(challengeCode, identity.current, page, genre, controller.signal);
        if (!active || version !== requestVersion.current) return;
        if (genre !== "all" && !body.ownerTopGenreKeys?.includes(genre)) { setGenre("all"); setPage(1); return; }
        setRanking(body);
        if (body.entryCount > 0 && !body.graphEntries.length) setListOpen(true);
        if (rankingTracked.current !== challengeCode) {
          rankingTracked.current = challengeCode;
          trackMatchEvent("wm_ranking_view", { challengeCode, entryCount: body.entryCount, viewerRank: body.viewerEntry?.rank ?? 0, canManage: body.canManage });
        }
      } catch {
        if (active && version === requestVersion.current) setMessage("관계도를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      } finally {
        if (active && version === requestVersion.current) setLoading(false);
      }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [challengeCode, page, genre]);

  useEffect(() => {
    if (!menuId) return;
    menuActionRef.current?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".wm-ranking-menu")) setMenuId(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuId(null); menuButtonRefs.current.get(menuId)?.focus(); }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [menuId]);

  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

  function notify(text: string) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setMessage(text);
    noticeTimer.current = setTimeout(() => setMessage(""), 4500);
  }

  async function refresh() {
    const version = ++requestVersion.current;
    const body = await requestRanking(challengeCode, identity.current, ranking?.pagination.page ?? page, genre);
    if (version === requestVersion.current) {
      setRanking(body);
      if (body.entryCount > 0 && !body.graphEntries.length) setListOpen(true);
    }
  }

  async function setEntryHidden(entry: RelationshipPerson, hiddenByOwner: boolean) {
    if (!ranking?.canManage || mutating) return;
    setMutating(entry.entryId);
    try {
      const response = await fetch(`/api/v1/challenges/${challengeCode}/entries/${entry.entryId}`, { method: "PATCH", headers: ownerHeaders(identity.current, true), body: JSON.stringify({ hiddenByOwner }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      trackMatchEvent("wm_owner_hide_entry", { challengeCode, hidden: hiddenByOwner });
      await refresh();
      setHideCandidate(null);
      setSelected(null);
      notify(hiddenByOwner ? "랭킹에서 숨겼어요." : "랭킹에 다시 표시했어요.");
    } catch { notify("항목 표시를 변경하지 못했어요. 다시 시도해 주세요."); }
    finally { setMutating(""); }
  }

  async function updateChallenge(body: { status?: "active" | "closed"; rankingVisibility?: boolean }) {
    if (!ranking?.canManage || mutating) return;
    if (body.status === "closed" && !confirming) { setConfirming(true); notify("한 번 더 누르면 새 참여를 닫아요."); return; }
    setConfirming(false);
    setMutating("challenge");
    try {
      const response = await fetch(`/api/v1/challenges/${challengeCode}`, { method: "PATCH", headers: ownerHeaders(identity.current, true), body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error === "ACTIVE_CHALLENGE_EXISTS" ? ACTIVE_CHALLENGE_MESSAGE : result.error);
      await refresh();
      notify(body.status === "closed" ? "새 참여를 닫았어요." : body.status === "active" ? "새 참여를 다시 열었어요." : body.rankingVisibility ? "랭킹을 공개했어요." : "랭킹을 비공개로 바꿨어요.");
    } catch (error) { notify(error instanceof Error && error.message === ACTIVE_CHALLENGE_MESSAGE ? error.message : "링크 설정을 변경하지 못했어요."); }
    finally { setMutating(""); }
  }

  async function copyInvitationLink() {
    try { await navigator.clipboard.writeText(`${window.location.origin}/match/c/${challengeCode}`); notify("초대 링크를 복사했어요."); }
    catch { notify("링크를 복사하지 못했어요. 다시 시도해 주세요."); }
  }

  function openSummary(entry: RelationshipPerson) { setMenuId(null); setSelected(entry); }
  function changePage(next: number) {
    setMenuId(null); setPage(next);
    listRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }

  if (!ranking) return <main className="match-page wm-relationship-page"><section className="wm-ranking-empty"><h1>{loading ? "관계도를 불러오는 중이에요…" : "관계도를 불러오지 못했어요"}</h1>{!loading ? <><p>{message}</p><button className="match-button" type="button" onClick={() => window.location.reload()}>다시 시도</button><Link href="/match">웹툰핏 홈으로</Link></> : null}</section></main>;

  const rankingIsPrivate = ranking.rankingVisibility === "private" && !ranking.canManage;
  const personalResultId = viewerProfileId || (ranking.canManage ? ranking.ownerPublicProfileId : null);
  const currentPage = ranking.pagination.page;
  const total = ranking.pagination.totalItems;
  const shownGenres = ranking.ownerTopGenreKeys ?? [];
  const displayEntry = (entry: RelationshipPerson, key = entry.entryId) => <div className={`wm-ranking-person${entry.isViewer ? " is-viewer" : ""}`} key={key}>
    <button type="button" className="wm-ranking-person-main" onClick={() => openSummary(entry)} aria-label={`${entry.nickname}님과의 궁합 ${entry.score}%, 요약 보기`}>
      <span className="wm-list-rank">{entry.rank ?? "–"}</span><PersonaAvatar genreKey={entry.genreKey} />
      <span className="wm-ranking-person-copy"><strong>{entry.nickname}{entry.isViewer ? <small> 나</small> : null}</strong><span>{entry.genreKey ? recommendationGenreLabel(entry.genreKey) : "웹툰 취향"}</span>{entry.isReciprocal ? <small>이전에 본 궁합</small> : null}</span>
      <b>{entry.score}%</b>
    </button>
    {ranking.canManage ? <div className="wm-ranking-menu"><button ref={(element) => { if (element) menuButtonRefs.current.set(entry.entryId, element); else menuButtonRefs.current.delete(entry.entryId); }} type="button" className="wm-ranking-more" aria-label={`${entry.nickname}님 관리 메뉴`} aria-haspopup="menu" aria-expanded={menuId === entry.entryId} disabled={loading || Boolean(mutating)} onClick={() => setMenuId(menuId === entry.entryId ? null : entry.entryId)}><MatchIcon name="more" /></button>
      {menuId === entry.entryId ? <div className="wm-ranking-popover" role="menu" aria-label={`${entry.nickname}님 관리`}><span>{entry.nickname}</span><button ref={menuActionRef} type="button" role="menuitem" onBlur={(event) => { if (!event.currentTarget.closest(".wm-ranking-menu")?.contains(event.relatedTarget as Node | null)) setMenuId(null); }} onClick={() => { menuButtonRefs.current.get(entry.entryId)?.focus(); setMenuId(null); setHideCandidate(entry); }}><MatchIcon name="eyeOff" />랭킹에서 숨기기</button></div> : null}
    </div> : <MatchIcon name="chevron" className="wm-row-chevron" />}
  </div>;

  return <main className="match-page wm-relationship-page" aria-busy={loading || Boolean(mutating)}>
    <header className="wm-relationship-heading"><h1>{ranking.ownerNickname}님의 취향 관계도</h1><p>{ranking.entryCount}명 참여 · {RELATIONSHIP_MIN_SCORE}% 이상 상위 {RELATIONSHIP_MAX_PEOPLE}명{ranking.status === "closed" ? <span className="wm-closed-badge">참여 마감</span> : null}</p></header>
    {rankingIsPrivate ? <section className="wm-ranking-empty"><h2>비공개 관계도예요</h2><p>주인장만 전체 순위를 볼 수 있어요.</p></section> : <>
      <nav className="wm-relationship-filters" aria-label={`${ranking.ownerNickname}님의 상위 취향 장르 필터`}><button type="button" aria-pressed={genre === "all"} disabled={loading || Boolean(mutating)} onClick={() => { setGenre("all"); setPage(1); setMenuId(null); }}>전체</button>{shownGenres.map((key, index) => <button key={key} type="button" aria-label={`${index + 1}위 ${recommendationGenreLabel(key)}`} aria-pressed={genre === key} disabled={loading || Boolean(mutating)} onClick={() => { setGenre(key); setPage(1); setMenuId(null); }}><small aria-hidden="true">{index + 1}위</small><span>{recommendationGenreLabel(key)}</span></button>)}</nav>
      <RelationshipMap ownerNickname={ranking.ownerNickname} ownerGenreKey={ranking.ownerGenreKey} entries={ranking.graphEntries} selectedId={selected?.entryId} onSelect={openSummary} />
      {!ranking.graphEntries.length ? <p className="wm-map-empty">{ranking.entryCount ? <>아직 궁합 80% 이상인 참여자가 없어요.<br />전체 목록에서 확인해 보세요.</> : "첫 번째 궁합을 기다리고 있어요."}</p> : null}
      <details ref={listRef} className="wm-participants-panel" open={listOpen} onToggle={(event) => { setListOpen(event.currentTarget.open); if (!event.currentTarget.open) setMenuId(null); }}>
        <summary><MatchIcon name="users" /><strong>{genre === "all" ? "전체 참여자" : `${recommendationGenreLabel(genre)} 참여자`} <span>{total}명</span></strong>{ranking.canManage ? <small>주인장</small> : null}<MatchIcon name="down" /></summary>
        <div className="wm-participants-content"><span className="wm-list-sort">궁합순{loading ? " · 불러오는 중…" : ""}</span>
          {ranking.entries.length ? ranking.entries.map((entry) => displayEntry(entry)) : <p className="wm-ranking-empty-copy">아직 참여자가 없어요.</p>}
          <nav className="wm-ranking-pagination" aria-label="참여자 목록 페이지"><span>{total ? `${(currentPage - 1) * 6 + 1}–${Math.min(currentPage * 6, total)}` : "0"} / {total}명</span><div><button type="button" aria-label="이전 참여자 페이지" disabled={currentPage <= 1 || loading || Boolean(mutating)} onClick={() => changePage(currentPage - 1)}><MatchIcon name="chevron" className="is-back" /></button><span>{currentPage} / {ranking.pagination.totalPages}</span><button type="button" aria-label="다음 참여자 페이지" disabled={currentPage >= ranking.pagination.totalPages || loading || Boolean(mutating)} onClick={() => changePage(currentPage + 1)}><MatchIcon name="chevron" /></button></div></nav>
        </div>
      </details>
      {ranking.viewerEntry && !ranking.entries.some((entry) => entry.entryId === ranking.viewerEntry?.entryId) ? <section className="wm-viewer-position"><h2>내 현재 위치</h2>{displayEntry(ranking.viewerEntry, "viewer-position")}</section> : null}
    </>}

    {ranking.canManage ? <details className="wm-link-management" open={managementOpen || replaceMode} onToggle={(event) => setManagementOpen(event.currentTarget.open)}><summary><MatchIcon name="settings" /><strong>링크 관리</strong><MatchIcon name="down" /></summary><div className="wm-management-content">
      {replaceMode ? <div className="wm-replace-guide"><strong>새 결과로 링크 바꾸기</strong><p>{ranking.status === "closed" ? "이제 최신 취향 결과로 새 링크를 만들 수 있어요." : "기존 링크를 먼저 닫아 주세요. 이전 랭킹은 보관됩니다."}</p></div> : null}
      <label className="wm-visibility-switch"><span><strong>링크 랭킹 공개</strong><small>끄면 주인장만 볼 수 있어요.</small></span><input type="checkbox" checked={ranking.rankingVisibility === "public_by_link"} disabled={Boolean(mutating) || loading} onChange={(event) => void updateChallenge({ rankingVisibility: event.target.checked })} /><span className="wm-switch-track" aria-hidden="true" /></label>
      {replaceMode && ranking.status === "closed" ? <Link className="match-button" href="/match/challenge/new">새 결과로 초대 링크 만들기</Link> : null}
      <button className="match-button match-button--secondary" type="button" disabled={Boolean(mutating) || loading} onClick={() => void updateChallenge({ status: ranking.status === "closed" ? "active" : "closed" })}>{mutating === "challenge" ? "변경 중…" : ranking.status === "closed" ? "새 참여 다시 열기" : confirming ? "한 번 더 눌러 닫기" : "새 참여 닫기"}</button>
      <details className="wm-hidden-participants"><summary>숨긴 참여자 {ranking.hiddenEntries.length}명 <MatchIcon name="down" /></summary>{ranking.hiddenEntries.map((entry) => <div key={entry.entryId}><span>{entry.nickname} · {entry.score}%</span><button type="button" disabled={Boolean(mutating) || loading} onClick={() => void setEntryHidden(entry, false)}>{mutating === entry.entryId ? "복원 중…" : "복원"}</button></div>)}{!ranking.hiddenEntries.length ? <p>숨긴 참여자가 없어요.</p> : null}</details>
    </div></details> : null}

    <MatchActionBar className="wm-ranking-actions" label="관계도 바로가기">
      <Link className="match-button" href={personalResultId ? `/match/result/${personalResultId}` : "/match/test/intro"}>{personalResultId ? "내 결과" : "테스트하기"}</Link>
      {ranking.canManage ? <Link className="match-button match-button--secondary" href={`/match/share/ranking?challengeCode=${challengeCode}`} aria-label="현재 랭킹을 Threads에 공유"><MatchIcon name="share" />공유</Link> : null}
      <button className="match-button match-button--secondary" type="button" onClick={() => void copyInvitationLink()}><MatchIcon name="link" />링크 복사</button>
    </MatchActionBar>

    {selected ? <MatchDialog sheet titleId="wm-pair-summary-title" onClose={() => setSelected(null)}><div className="wm-pair-summary"><header><PersonaAvatar genreKey={selected.genreKey} /><div><h2 id="wm-pair-summary-title">{selected.nickname}님과의 궁합</h2><p>{pairArchetypeFor(selected.score).name}</p></div><strong>{selected.score}<small>%</small></strong></header><div className="wm-pair-summary-genres"><span>함께 맞는 장르</span>{selected.sharedGenres.length ? selected.sharedGenres.slice(0, 2).map((label) => <b key={label}>{label}</b>) : <p>서로 다른 장르의 매력</p>}</div>
      {ranking.canManage || selected.isViewer ? <Link className="match-button" href={`/match/c/${challengeCode}/match/${selected.resultId}?from=ranking`}>{selected.nickname}님과의 상세 궁합 보기 <MatchIcon name="chevron" /></Link> : <p className="wm-private-pair-note">상세 궁합은 당사자와 주인장만 볼 수 있어요.</p>}
    </div></MatchDialog> : null}
    {hideCandidate ? <MatchDialog titleId="wm-hide-title" busy={Boolean(mutating)} onClose={() => setHideCandidate(null)}><div className="wm-hide-confirm"><h2 id="wm-hide-title">{hideCandidate.nickname}님을 숨길까요?</h2><p>관계도와 랭킹에서 숨겨져요.<br />링크 관리에서 다시 복원할 수 있어요.</p><div><button type="button" className="match-button match-button--secondary" disabled={Boolean(mutating)} onClick={() => setHideCandidate(null)}>취소</button><button type="button" className="match-button" disabled={Boolean(mutating)} onClick={() => void setEntryHidden(hideCandidate, true)}>{mutating ? "숨기는 중…" : "숨기기"}</button></div></div></MatchDialog> : null}
    {message ? <div className="wm-ranking-toast" role="status">{message}<button type="button" aria-label="알림 닫기" onClick={() => setMessage("")}><MatchIcon name="close" /></button></div> : null}
  </main>;
}
