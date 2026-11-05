'use client';

import { useRef, useState } from 'react';
import { MatchDialog } from './MatchDialog';
import { WorkCover, type RecommendationWorkItem } from './RecommendationWork';
import { WorkDetailLink } from './WorkDetailLink';
import { ensureAnonymousId } from '../storage/anonymousIdentity.mjs';
import { RECOMMENDATION_COMMENT_MAX_LENGTH } from '../config/recommendationPolicy.mjs';

export function RecommendationEditor({ item, publicProfileId, onClose, onSaved }: {
  item: RecommendationWorkItem; publicProfileId: string; onClose: () => void;
  onSaved: (items: RecommendationWorkItem[]) => void;
}) {
  const [comment, setComment] = useState(item.recommendationComment ?? '');
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function save(remove = false) {
    if (pending.current) return;
    if (remove && !confirmRemove) { setConfirmRemove(true); return; }
    pending.current = true;
    setBusy(true); setError('');
    try {
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      const response = await fetch(`/api/v1/results/${encodeURIComponent(publicProfileId)}/recommendations/${encodeURIComponent(item.canonicalWebtoonId)}`, {
        method: remove ? 'DELETE' : 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ anonymousId: identity.anonymousId, ...(!remove ? { recommendationComment: comment } : {}) }),
      });
      const body = await response.json();
      if (!response.ok || !Array.isArray(body.items)) throw Error(body.error === 'RESULT_OWNER_MISMATCH' ? '내 추천작만 수정할 수 있어요.' : '저장하지 못했어요. 다시 시도해 주세요.');
      window.dispatchEvent(new CustomEvent('match-recommendations-changed', { detail: { profileId: publicProfileId, count: body.items.length } }));
      onSaved(body.items); onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장하지 못했어요.');
    } finally { pending.current = false; setBusy(false); }
  }
  return <MatchDialog sheet titleId="wm-recommendation-edit-title" onClose={onClose} busy={busy}>
    <form className="wm-recommendation-editor" onSubmit={event => { event.preventDefault(); void save(); }}>
      <p className="wm-editor-eyebrow">내 추천작</p><h2 id="wm-recommendation-edit-title">추천 한마디 수정</h2>
      <div className="wm-editor-work"><WorkCover item={item} /><div><strong>{item.title}</strong><WorkDetailLink id={item.canonicalWebtoonId} returnTo={`/match/result/${publicProfileId}`}>작품 상세 보기</WorkDetailLink></div></div>
      <label htmlFor="wm-edit-comment">추천 이유 <small>선택</small></label>
      <textarea id="wm-edit-comment" value={comment} maxLength={RECOMMENDATION_COMMENT_MAX_LENGTH} disabled={busy} placeholder="이 작품을 추천하는 이유를 남겨 주세요." onChange={event => { setComment(event.target.value); setConfirmRemove(false); }} />
      <p className="wm-editor-count">{[...comment].length} / {RECOMMENDATION_COMMENT_MAX_LENGTH}</p>
      {error ? <p className="wm-editor-error" role="alert">{error}</p> : null}
      {confirmRemove ? <p className="wm-editor-remove-note" role="status">추천 목록에서 뺄까요? 한 번 더 누르면 삭제돼요.<br />작성한 코멘트는 보관되며 다시 추가하면 불러올 수 있어요.</p> : null}
      <div className="wm-editor-actions"><button type="button" className="match-button match-button--secondary wm-editor-remove" disabled={busy} onClick={() => void save(true)}>{confirmRemove ? '추천 목록에서 삭제' : '추천작 삭제'}</button><button className="match-button" type="submit" disabled={busy}>{busy ? '저장 중…' : '저장'}</button></div>
    </form>
  </MatchDialog>;
}
