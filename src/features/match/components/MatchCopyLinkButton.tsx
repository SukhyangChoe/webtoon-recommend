"use client";

import { useEffect, useRef, useState } from 'react';
import { MatchIcon } from './MatchIcon';

/** Copy only the public route, never viewer IDs, management tokens or return parameters. */
export function MatchCopyLinkButton({ path, successMessage = '초대 링크를 복사했어요.' }: { path: string; successMessage?: string }) {
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
    if (pending.current) return;
    pending.current = true;
    setCopying(true);
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      if (active.current) setMessage(successMessage);
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
    <button className="match-button match-button--secondary wm-invite-button" type="button" disabled={copying} onClick={() => void copyLink()}><MatchIcon name="invite" />초대하기</button>
    {message ? <div className="wm-action-toast" role="status">{message}</div> : null}
  </>;
}
