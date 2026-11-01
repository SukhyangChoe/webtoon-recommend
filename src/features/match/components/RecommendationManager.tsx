"use client";

import { useEffect, useRef, useState } from "react";
import { RECOMMENDATION_COMMENT_MAX_LENGTH, RECOMMENDATION_SEARCH_POLICY_VERSION, RECOMMENDATION_AGE_RESTRICTION_MESSAGE, isRecommendationRegistrationBlocked } from "../config/recommendationPolicy.mjs";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackIcon } from '@/components/layout/BackIcon';
import { WorkCover } from "./RecommendationWork";
import { WorkDetailLink } from './WorkDetailLink';
import { appendRecommendationReason, recommendationGenreLabel, reorderRecommendation } from "../config/recommendationPresentation.mjs";
import { recommendationManagerHref, recommendationReturnLabel, recommendationReturnPath } from '../config/recommendationOnboarding.mjs';

type Webtoon = {
  canonicalWebtoonId: string;
  title: string;
  platform: string;
  officialUrl: string | null;
  mainGenre: string;
  coverUrl?: string | null;
  introduction?: string | null;
  recommendationComment?: string | null;
  likeCount?: number;
  likedByViewer?: boolean;
  recommendationRegistrationBlocked?: boolean;
};

const quickReasons = ["작화가 좋아요", "전개가 빨라요", "케미가 좋아요"];

export function RecommendationManager({ publicProfileId, returnTo, initialSelected, initialLoadFailed = false }: { publicProfileId: string; returnTo?: string; initialSelected: Webtoon[]; initialLoadFailed?: boolean }) {
  const router = useRouter();
  const destination = recommendationReturnPath(returnTo, publicProfileId);
  const returnLabel = recommendationReturnLabel(destination);
  const returnLinkLabel = `${returnLabel}${destination.startsWith('/match/c/') ? '으로' : '로'} 돌아가기`;
  const managerHref = recommendationManagerHref(publicProfileId, returnTo);
  const [selected, setSelected] = useState<Webtoon[]>(initialSelected);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Webtoon[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState(initialLoadFailed ? "추천작을 불러오지 못했어요." : "");
  const searchController = useRef<AbortController | null>(null);
  const restoreController = useRef<AbortController | null>(null);
  const commentDrafts = useRef(new Map(initialSelected.map(item => [item.canonicalWebtoonId, item.recommendationComment ?? null])));
  const [addingId, setAddingId] = useState<string | null>(null);
  const [restoredIds, setRestoredIds] = useState<Set<string>>(new Set());
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [reorderId, setReorderId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const hasRestrictedSelection = selected.some(isRecommendationRegistrationBlocked);

  useEffect(() => () => { searchController.current?.abort(); restoreController.current?.abort(); }, []);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearched(false);
    setMessage("");
    try {
      searchController.current?.abort();
      const controller = new AbortController();
      searchController.current = controller;
      const response = await fetch(`/api/v1/webtoons/search?q=${encodeURIComponent(query.trim())}&registrationPolicy=${RECOMMENDATION_SEARCH_POLICY_VERSION}`, { signal: controller.signal, cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error();
      setResults(Array.isArray(body.items) ? body.items.filter((item: Webtoon) => !isRecommendationRegistrationBlocked(item)) : []);
      setSearched(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("작품을 검색하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSearching(false);
    }
  }

  async function add(item: Webtoon) {
    if (saving || restoreController.current) return;
    setMessage("");
    if (isRecommendationRegistrationBlocked(item)) {
      setMessage(RECOMMENDATION_AGE_RESTRICTION_MESSAGE);
      return;
    }
    if (selected.some((selectedItem) => selectedItem.canonicalWebtoonId === item.canonicalWebtoonId)) {
      setMessage("이미 추천 목록에 있는 작품이에요.");
      return;
    }
    if (selected.length >= 10) {
      setMessage("추천작은 최대 10개까지 등록할 수 있어요.");
      return;
    }
    let comment = commentDrafts.current.get(item.canonicalWebtoonId) ?? null;
    if (!commentDrafts.current.has(item.canonicalWebtoonId)) {
      const controller = new AbortController(); restoreController.current = controller; setAddingId(item.canonicalWebtoonId);
      try {
        const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
        const response = await fetch(`/api/v1/results/${publicProfileId}/recommendation-comments/${encodeURIComponent(item.canonicalWebtoonId)}`, { headers: { 'x-match-anonymous-id': identity.anonymousId }, cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) });
        const body = await response.json();
        if (!response.ok || !body || !Object.hasOwn(body, 'recommendationComment') || (body.recommendationComment !== null && typeof body.recommendationComment !== 'string')) throw new Error('COMMENT_RESTORE_FAILED');
        comment = typeof body.recommendationComment === 'string' ? body.recommendationComment : null;
        commentDrafts.current.set(item.canonicalWebtoonId, comment);
        if (comment) setRestoredIds(ids => new Set([...ids, item.canonicalWebtoonId]));
      } catch {
        if (!controller.signal.aborted) setMessage('이전 코멘트를 확인하지 못했어요. 내용을 보호하기 위해 추가하지 않았어요. 다시 시도해 주세요.');
        return;
      } finally {
        restoreController.current = null;
        if (!controller.signal.aborted) setAddingId(null);
      }
      if (controller.signal.aborted) return;
    }
    setSelected(items => items.some(selectedItem => selectedItem.canonicalWebtoonId === item.canonicalWebtoonId) || items.length >= 10 ? items : [...items, { ...item, recommendationComment: comment }]);
  }

  function remove(canonicalWebtoonId: string) {
    setSelected((items) => { const removed=items.find(item=>item.canonicalWebtoonId===canonicalWebtoonId); if(removed)commentDrafts.current.set(canonicalWebtoonId,removed.recommendationComment??null); return items.filter((item) => item.canonicalWebtoonId !== canonicalWebtoonId); });
  }

  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= selected.length) return;
    setSelected((items) => {
      const next = [...items];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  function updateComment(canonicalWebtoonId: string, recommendationComment: string) {
    setMessage("");
    commentDrafts.current.set(canonicalWebtoonId,recommendationComment);
    setSelected((items) => items.map((item) => (
      item.canonicalWebtoonId === canonicalWebtoonId
        ? { ...item, recommendationComment }
        : item
    )));
  }

  async function save() {
    if (saving || initialLoadFailed || addingId) return;
    if (hasRestrictedSelection) { setMessage(RECOMMENDATION_AGE_RESTRICTION_MESSAGE); return; }
    setSaving(true);
    setMessage("");
    try {
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      const response = await fetch(`/api/v1/results/${publicProfileId}/recommendations`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          anonymousId: identity.anonymousId,
          recommendations: selected.map((item) => ({
            canonicalWebtoonId: item.canonicalWebtoonId,
            recommendationComment: item.recommendationComment ?? null,
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (body.error === 'RECOMMENDATION_AGE_VERIFICATION_REQUIRED') throw new Error(RECOMMENDATION_AGE_RESTRICTION_MESSAGE);
        if (body.error === "WEBTOON_NOT_AVAILABLE") throw new Error("현재 등록할 수 없는 작품이 포함되어 있어요.");
        if (body.error === "RESULT_OWNER_MISMATCH") throw new Error("이 추천 목록을 수정할 권한이 없어요.");
        throw new Error("추천작을 저장하지 못했어요.");
      }
      router.replace(destination);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "추천작을 저장하지 못했어요.");
      setSaving(false);
    }
  }

  return <main className="match-page match-recommendation-manager wm-screen wm-manager-screen">
    <nav className="wm-local-nav" aria-label="추천작 관리 화면 이동"><Link className="site-back-control" href={destination} aria-label={returnLinkLabel}><BackIcon /></Link></nav>
    <header className="wm-manager-hero"><div><p className="wm-eyebrow">내 추천작</p><h1>친구에게 추천할 작품을<br />골라 주세요</h1><p className="wm-note">최대 10개까지 등록할 수 있어요.</p></div><div className="wm-hero-book" aria-hidden="true"><span>♛</span><i>GOOD<br />WEBTOON<br />FOR YOU</i></div></header>
    <section className="wm-manager-section"><div className="wm-panel-heading"><h2>선택한 작품</h2><span className="wm-count">{selected.length} / 10</span></div>
      <p className="wm-note wm-comment-retention-note">목록에서 빼도 코멘트는 보관돼요. 다시 추가하면 이전 내용을 불러옵니다.</p>
      {initialLoadFailed ? <p className="wm-load-error" role="alert">추천작을 불러오지 못했어요. 기존 목록을 보호하기 위해 저장을 잠시 막았어요. <button type="button" onClick={() => window.location.reload()}>다시 불러오기</button></p> : null}
      {hasRestrictedSelection ? <p className="wm-load-error" role="alert">{RECOMMENDATION_AGE_RESTRICTION_MESSAGE} 등록할 수 없는 작품을 목록에서 삭제한 뒤 저장해 주세요.</p> : null}
      {selected.length ? <ol className="wm-selected-list">{selected.map((item, index) => <li key={item.canonicalWebtoonId} className={draggedId === item.canonicalWebtoonId ? "is-dragging" : ""} onDragOver={event => { if (!saving && draggedId) event.preventDefault(); }} onDrop={event => { event.preventDefault(); if (saving || !draggedId) return; setSelected(items => reorderRecommendation(items, draggedId, item.canonicalWebtoonId)); setDraggedId(null); }}>
        <div className="wm-selected-header"><div className="wm-numbered-cover"><WorkDetailLink id={item.canonicalWebtoonId} returnTo={managerHref} className="wm-work-card-link" newTab label={`${item.title} 작품 상세 보기 (새 탭)`}><WorkCover item={item} /></WorkDetailLink><span>{index + 1}</span></div><div className="wm-work-copy"><WorkDetailLink id={item.canonicalWebtoonId} returnTo={managerHref} className="wm-work-card-link" newTab><h3>{item.title}</h3></WorkDetailLink><div className="wm-work-meta"><span className="wm-genre-tag">{recommendationGenreLabel(item.mainGenre)}</span></div></div><div className="wm-card-tools">
          <button className="wm-drag-handle" type="button" draggable={!saving} disabled={saving} aria-label={`${item.title} 순서 변경`} aria-expanded={reorderId === item.canonicalWebtoonId} title="드래그하거나 눌러 순서를 변경하세요" onDragStart={event => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.canonicalWebtoonId); setDraggedId(item.canonicalWebtoonId); }} onDragEnd={() => setDraggedId(null)} onClick={() => setReorderId(reorderId === item.canonicalWebtoonId ? null : item.canonicalWebtoonId)}>⠿</button>
          <button type="button" disabled={saving} onClick={() => remove(item.canonicalWebtoonId)} aria-label={`${item.title} 추천작에서 삭제`}><span className="wm-trash-icon" aria-hidden="true" /></button>
        </div></div>
        {reorderId === item.canonicalWebtoonId ? <div className="wm-reorder-actions"><button type="button" disabled={saving || index === 0} onClick={() => move(index, -1)}>↑ 위로 이동</button><button type="button" disabled={saving || index === selected.length - 1} onClick={() => move(index, 1)}>↓ 아래로 이동</button></div> : null}
        {isRecommendationRegistrationBlocked(item) ? <p className="wm-load-error">현재 등록할 수 없는 작품이에요.</p> : null}
        <label className="wm-comment-field"><span className="wm-sr-only">{item.title} 추천 이유 (선택, 최대 80자)</span><textarea disabled={saving} maxLength={RECOMMENDATION_COMMENT_MAX_LENGTH} placeholder="추천 이유를 짧게 남겨 주세요. (선택)" value={item.recommendationComment ?? ""} onFocus={() => setActiveCommentId(item.canonicalWebtoonId)} onChange={event => updateComment(item.canonicalWebtoonId, event.target.value)} /><small>{[...(item.recommendationComment ?? "")].length} / {RECOMMENDATION_COMMENT_MAX_LENGTH}</small></label>
        {restoredIds.has(item.canonicalWebtoonId) ? <p className="wm-note wm-restored-comment">이전 코멘트를 불러왔어요. 그대로 저장하거나 수정할 수 있어요.</p> : null}
        {activeCommentId === item.canonicalWebtoonId ? <div className="wm-quick-reasons"><p>추천 이유를 빠르게 추가해 보세요!</p><div>{quickReasons.map(reason => <button type="button" disabled={saving} key={reason} onClick={() => { const next = appendRecommendationReason(item.recommendationComment ?? "", reason, RECOMMENDATION_COMMENT_MAX_LENGTH); if (next === null) { setMessage("추천 이유는 80자까지 적을 수 있어요."); return; } updateComment(item.canonicalWebtoonId, next); }}>{reason}</button>)}</div></div> : null}
      </li>)}</ol> : !initialLoadFailed ? <p className="wm-empty">검색해서 추천작을 추가해 주세요.</p> : null}
    </section>
    <section className="wm-manager-section wm-search-section"><h2>작품 검색</h2><form className="wm-search-form" onSubmit={search}><div className="wm-search-input"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={event => { setQuery(event.target.value); setSearched(false); }} placeholder="작품명을 입력해 주세요" aria-label="추천할 웹툰 검색" />{query ? <button type="button" aria-label="검색어 지우기" onClick={() => { setQuery(""); setResults([]); setSearched(false); }}>×</button> : null}</div><button className="match-button" type="submit" disabled={searching || !query.trim()}>{searching ? "검색 중" : "검색"}</button></form>
      {results.length ? <ul className="wm-search-results">{results.map(item => { const added = selected.some(selectedItem => selectedItem.canonicalWebtoonId === item.canonicalWebtoonId); return <li key={item.canonicalWebtoonId}><WorkDetailLink id={item.canonicalWebtoonId} returnTo={managerHref} className="wm-work-card-link" newTab label={`${item.title} 작품 상세 보기 (새 탭)`}><WorkCover item={item} /></WorkDetailLink><div className="wm-work-copy"><WorkDetailLink id={item.canonicalWebtoonId} returnTo={managerHref} className="wm-work-card-link" newTab><h3>{item.title}</h3></WorkDetailLink><span className="wm-genre-tag">{recommendationGenreLabel(item.mainGenre)}</span>{item.introduction ? <p className="wm-note">{item.introduction}</p> : null}</div><button type="button" disabled={saving || initialLoadFailed || Boolean(addingId) || added || selected.length >= 10} onClick={() => void add(item)}>{addingId === item.canonicalWebtoonId ? '불러오는 중…' : added ? "추가됨" : "추가"}</button></li>; })}</ul> : searched && !searching ? <p className="wm-empty">검색 결과가 없어요.</p> : null}
      <p className="wm-note wm-registration-policy-note">성인 인증이 필요한 작품은 추천작 등록에서 제외됩니다.</p>
    </section>
    <Link className="wm-return-link" href={destination}>{returnLinkLabel} ›</Link>
    {message && !initialLoadFailed ? <div className="wm-floating-toast is-error" role="alert"><span>{message}</span><button type="button" aria-label="알림 닫기" onClick={() => setMessage("")}>×</button></div> : null}
    <div className="wm-save-tray"><span><strong>{selected.length}개</strong> 선택됨</span><button className="match-button" type="button" disabled={saving || initialLoadFailed || hasRestrictedSelection || Boolean(addingId)} onClick={() => void save()}>{saving ? "저장 중…" : returnTo ? `저장하고 ${returnLabel} 보기` : "추천작 저장"}</button></div>
  </main>;
}
