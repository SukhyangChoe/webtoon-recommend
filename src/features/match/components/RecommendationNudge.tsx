'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MatchIcon } from './MatchIcon';
import { readMatchDraft } from '../storage/draft.mjs';
import { ensureAnonymousId } from '../storage/anonymousIdentity.mjs';
import { loadWorkResource } from '../api/loadWorkResource.mjs';
import { dismissRecommendationPrompt, readRecommendationPrompt, recommendationManagerHref, showRecommendationNudge } from '../config/recommendationOnboarding.mjs';

/** Nonblocking and route-scoped. Check real membership, not whether the reader
 * dismissed a previous notice or how many positive vectors their works contain. */
export function RecommendationNudge({ currentPath }: { currentPath: string }) {
  const [profileId, setProfileId] = useState<string | null>(null);
  useEffect(() => {
    if (!showRecommendationNudge(currentPath)) return;
    const controller = new AbortController();
    let showTimer = 0, hideTimer = 0, changed = false;
    const membershipChanged = () => { changed = true; setProfileId(null); };
    window.addEventListener('match-recommendations-changed', membershipChanged);
    async function check() {
      try {
        const pending = readRecommendationPrompt(sessionStorage, currentPath);
        const id = readMatchDraft(localStorage)?.resultPublicId ?? pending?.profileId;
        dismissRecommendationPrompt(sessionStorage);
        if (!id || !/^[\w-]{1,100}$/.test(id)) return;
        const identity = ensureAnonymousId({ cookieText: document.cookie, storage: localStorage });
        const body = await loadWorkResource(`/api/v1/results/${encodeURIComponent(id)}/recommendations`, {
          headers: { 'x-match-anonymous-id': identity.anonymousId }, signal: controller.signal, timeoutMs:8000,
        });
        if (controller.signal.aborted || changed || !Array.isArray(body.items) || body.items.length) return;
        showTimer = window.setTimeout(() => {
          if (changed || controller.signal.aborted) return;
          setProfileId(id);
          hideTimer = window.setTimeout(() => setProfileId(null), 6500);
        }, 450);
      } catch { /* A failed read must never be presented as an empty list. */ }
    }
    void check();
    return () => {
      controller.abort(); window.clearTimeout(showTimer); window.clearTimeout(hideTimer);
      window.removeEventListener('match-recommendations-changed', membershipChanged);
    };
  }, [currentPath]);
  if (!profileId) return null;
  return <aside className="wm-recommendation-nudge" aria-label="추천작 등록 안내">
    <MatchIcon name="book" /><div><p role="status">추천작을 등록하면<br />결과와 추천에 내 취향이 더 잘 반영돼요.</p><Link className="wm-recommendation-register-button" href={recommendationManagerHref(profileId, currentPath)}>추천작 등록하기</Link></div>
    <button type="button" aria-label="추천작 등록 안내 닫기" onClick={() => setProfileId(null)}><MatchIcon name="close" /></button>
  </aside>;
}
