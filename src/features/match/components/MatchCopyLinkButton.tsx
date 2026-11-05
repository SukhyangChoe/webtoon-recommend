"use client";

import { useEffect, useRef, useState } from 'react';
import { MatchIcon } from './MatchIcon';
import { requestInvitationCode } from '../api/activeChallenge';
import { ensureAnonymousId } from '../storage/anonymousIdentity.mjs';
import { invitationPath } from '../config/invitationLink.mjs';

/** Copy only the public route, never viewer IDs, management tokens or return parameters. */
export function MatchCopyLinkButton({ challengeCode }: { challengeCode?: string | null }) {
  const [resolvedCode, setResolvedCode] = useState<string | null>(null);
  // undefined asks the server for this viewer's link. Explicit null is verified
  // absence. Never fall back to the page being viewed or somebody else's link.
  useEffect(() => {
    if (challengeCode !== undefined) return;
    let active = true;
    const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
    void requestInvitationCode(identity.anonymousId).then(code => {
      if (active) setResolvedCode(code);
    });
    return () => { active = false; };
  }, [challengeCode]);
  const path = invitationPath(challengeCode === undefined ? resolvedCode : challengeCode);
  const [message, setMessage] = useState('');
  const [copying, setCopying] = useState(false);
  const pending = useRef(false);
  const active = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; if (timer.current) clearTimeout(timer.current); };
  }, []);

  async function copyLink() {
    if (pending.current || !path) return;
    pending.current = true;
    setCopying(true);
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      if (active.current) setMessage('초대 링크를 복사했어요.');
    } catch {
      if (active.current) setMessage('링크를 복사하지 못했어요. 다시 눌러 주세요.');
    } finally {
      pending.current = false;
      if (active.current) {
        setCopying(false);
        timer.current = setTimeout(() => setMessage(''), 4500);
      }
    }
  }

  return <>
    <button className="match-button match-button--secondary wm-invite-button" type="button" disabled={copying || !path} title={!path ? '관계도에서 궁합 초대 링크를 먼저 만들어 주세요.' : undefined} onClick={() => void copyLink()}><MatchIcon name="invite" />초대하기</button>
    {message ? <div className="wm-action-toast" role="status">{message}</div> : null}
  </>;
}
