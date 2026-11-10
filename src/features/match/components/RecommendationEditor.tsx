'use client';

import { useEffect, useRef, useState } from 'react';
import { MatchDialog } from './MatchDialog';
import { WorkCover, type RecommendationWorkItem } from './RecommendationWork';
import { WorkDetailLink } from './WorkDetailLink';
import { MatchIcon } from './MatchIcon';
import { ensureAnonymousId } from '../storage/anonymousIdentity.mjs';
import { RECOMMENDATION_COMMENT_MAX_LENGTH } from '../config/recommendationPolicy.mjs';

export function RecommendationEditor({ item, publicProfileId, onClose, onSaved, mode = 'edit', returnTo, confirmUnsaved = false }: {
  item: RecommendationWorkItem; publicProfileId: string; onClose: () => void;
  onSaved: (items: RecommendationWorkItem[]) => void;
  mode?: 'add' | 'edit'; returnTo?: string; confirmUnsaved?: boolean;
}) {
  const [comment, setComment] = useState(item.recommendationComment ?? '');
  const initialComment = useRef(item.recommendationComment ?? '');
  const [loading, setLoading] = useState(mode === 'add');
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  useEffect(() => {
    if (mode !== 'add') return;
    const controller = new AbortController();
    void (async () => {
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      const response = await fetch(`/api/v1/results/${encodeURIComponent(publicProfileId)}/recommendation-comments/${encodeURIComponent(item.canonicalWebtoonId)}`, {
        headers: { 'x-match-anonymous-id': identity.anonymousId }, cache: 'no-store',
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
      });
      const body = await response.json();
      if (!response.ok || !body || !Object.hasOwn(body,'recommendationComment') || body.recommendationComment !== null && typeof body.recommendationComment !== 'string') throw Error('COMMENT_RESTORE_FAILED');
      if (controller.signal.aborted) return;
      initialComment.current = body.recommendationComment ?? '';
      setComment(initialComment.current); setRestoreFailed(false); setError('');
    })().catch(() => {
      if (!controller.signal.aborted) { setRestoreFailed(true); setError('이전 코멘트를 확인하지 못했어요. 내용을 보호하기 위해 다시 불러온 뒤 저장해 주세요.'); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [mode, publicProfileId, item.canonicalWebtoonId, retry]);
  function requestClose() {
    if (busy) return;
    if (confirmUnsaved && comment !== initialComment.current) { setConfirmDiscard(true); return; }
    onClose();
  }
  async function save(remove = false) {
    if (pending.current || loading || restoreFailed) return;
    if (remove && !confirmRemove) { setConfirmRemove(true); return; }
    pending.current = true;
    setBusy(true); setError('');
    try {
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      const response = await fetch(`/api/v1/results/${encodeURIComponent(publicProfileId)}/recommendations/${encodeURIComponent(item.canonicalWebtoonId)}`, {
        method: remove ? 'DELETE' : mode === 'add' ? 'POST' : 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ anonymousId: identity.anonymousId, ...(!remove ? { recommendationComment: comment } : {}) }),
      });
      const body = await response.json();
      if (!response.ok || !Array.isArray(body.items)) {
        const messages: Record<string,string> = {
          RESULT_OWNER_MISMATCH:'내 추천작만 수정할 수 있어요.', RECOMMENDATION_ALREADY_EXISTS:'이미 등록한 작품이에요. 닫은 뒤 목록을 새로 불러와 주세요.',
          RECOMMENDATION_LIMIT_REACHED:'추천작은 최대 10개까지 등록할 수 있어요.', WEBTOON_NOT_AVAILABLE:'지금은 등록할 수 없는 작품이에요.',
          RECOMMENDATION_AGE_VERIFICATION_REQUIRED:'지금은 등록할 수 없는 작품이에요.', RECOMMENDATION_NOT_FOUND:'목록에서 삭제된 작품이에요. 닫은 뒤 목록을 새로 불러와 주세요.',
        };
        throw Error(messages[body.error] ?? '저장하지 못했어요. 다시 시도해 주세요.');
      }
      window.dispatchEvent(new CustomEvent('match-recommendations-changed', { detail: { profileId: publicProfileId, count: body.items.length, membershipChanged: remove || mode === 'add' } }));
      onSaved(body.items); onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장하지 못했어요.');
    } finally { pending.current = false; setBusy(false); }
  }
  return <MatchDialog sheet titleId="wm-recommendation-edit-title" onClose={requestClose} busy={busy}>
    <form className="wm-recommendation-editor" onSubmit={event => { event.preventDefault(); void save(); }}>
      <h2 id="wm-recommendation-edit-title">{mode === 'add' ? '추천작 담기' : '추천 한마디 수정'}</h2>
      <div className="wm-editor-work"><WorkCover item={item} /><WorkDetailLink id={item.canonicalWebtoonId} returnTo={returnTo ?? `/match/result/${publicProfileId}`} className="wm-editor-work-title" label={`${item.title} 작품 상세 보기`}><strong>{item.title}</strong><MatchIcon name="chevron" /></WorkDetailLink></div>
      <label htmlFor="wm-edit-comment">추천 이유 <small>선택</small></label>
      <textarea id="wm-edit-comment" rows={3} value={comment} maxLength={RECOMMENDATION_COMMENT_MAX_LENGTH} disabled={busy || loading || restoreFailed} placeholder="다른 독자에게 이 작품이 어떤지 알려주세요." onChange={event => { setComment(event.target.value); setConfirmRemove(false); setConfirmDiscard(false); }} />
      <p className="wm-editor-count">{[...comment].length} / {RECOMMENDATION_COMMENT_MAX_LENGTH}</p>
      {loading ? <p className="wm-editor-loading" role="status">저장된 코멘트를 확인하고 있어요…</p> : null}
      {error ? <p className="wm-editor-error" role="alert">{error}</p> : null}
      {restoreFailed ? <button type="button" className="wm-editor-retry" onClick={() => { setLoading(true); setRestoreFailed(false); setRetry(value=>value+1); }}>다시 불러오기</button> : null}
      {confirmRemove ? <p className="wm-editor-remove-note" role="status">추천 목록에서 뺄까요? 한 번 더 누르면 삭제돼요.<br />작성한 코멘트는 보관되며 다시 추가하면 불러올 수 있어요.</p> : null}
      {confirmDiscard ? <div className="wm-editor-discard" role="status"><p>아직 저장하지 않은 한마디가 있어요. 닫을까요?</p><div><button type="button" onClick={() => setConfirmDiscard(false)}>계속 작성</button><button type="button" onClick={onClose}>저장하지 않고 닫기</button></div></div> : <div className={`wm-editor-actions${mode === 'add' ? ' is-add' : ''}`}>{mode !== 'add' ? <button type="button" className="match-button match-button--secondary wm-editor-remove" disabled={busy} onClick={() => void save(true)}>{confirmRemove ? '추천 목록에서 삭제' : '추천작 삭제'}</button> : null}<button className="match-button" type="submit" disabled={busy || loading || restoreFailed}>{busy ? '저장 중…' : '저장'}</button></div>}
    </form>
  </MatchDialog>;
}
