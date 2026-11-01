'use client';

import { useState } from 'react';
import { beginWorkTasteTest } from '../storage/workTestContinuation.mjs';
import { MatchIcon } from './MatchIcon';

export function WorkTasteTestButton({ workId, returnTo }: { workId: string; returnTo: string }) {
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  function start() {
    if (starting) return;
    setStarting(true);
    try {
      const href = beginWorkTasteTest({ storage: localStorage, session: sessionStorage, workId, returnTo });
      window.location.assign(href);
    } catch {
      setError('테스트를 준비하지 못했어요. 브라우저의 저장 공간 설정을 확인하고 다시 시도해 주세요.');
      setStarting(false);
    }
  }
  return <div className="wm-work-test-invitation"><p>이 작품, 내 취향에도 맞을까?</p><button type="button" className="wm-work-fit-prompt" onClick={start} disabled={starting}>{starting ? '테스트 준비 중…' : '취향 테스트로 핏점수 확인하기'}<MatchIcon name="chevron" /></button>{error ? <p role="alert">{error}</p> : null}</div>;
}
