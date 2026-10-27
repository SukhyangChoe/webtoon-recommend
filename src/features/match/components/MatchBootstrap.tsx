"use client";

import { useEffect, useRef, useState } from "react";
import { trackMatchEvent } from "../analytics/client";
import { MATCH_ROUTES } from "../config/routes";
import { ensureAnonymousId, persistAnonymousCookie } from "../storage/anonymousIdentity.mjs";
import { getMatchHomeState, readMatchDraft } from "../storage/draft.mjs";
import { restartMatchTest } from '../api/restartTest.mjs';

type BootstrapState =
  | { status: "not_started" }
  | { status: "in_progress"; resumePath: string }
  | { status: "completed"; resultPublicId: string };

export function MatchBootstrap() {
  const [state, setState] = useState<BootstrapState | null>(null);
  const landingTracked = useRef(false);
  const restartPending = useRef(false);
  const [restarting, setRestarting] = useState(false);
  const [restartError, setRestartError] = useState('');

  useEffect(() => {
    const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
    document.cookie = persistAnonymousCookie(identity.anonymousId, window.location.protocol === "https:") ?? "";
    const query = new URLSearchParams(window.location.search);
    let referrerHost = "";
    try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ""; } catch {}
    if (!landingTracked.current) {
      landingTracked.current = true;
      trackMatchEvent("wm_landing_view", {
        entryType: "direct",
        referrerHost,
        utmSource: query.get("utm_source") ?? "",
        utmMedium: query.get("utm_medium") ?? "",
        utmCampaign: query.get("utm_campaign") ?? "",
        utmContent: query.get("utm_content") ?? "",
      });
    }
    const draft = readMatchDraft(window.localStorage);
    const update = window.setTimeout(() => {
      setState(getMatchHomeState(draft) as BootstrapState);
    }, 0);
    return () => window.clearTimeout(update);
  }, []);

  async function startFresh() {
    if (restartPending.current) return;
    restartPending.current = true;
    setRestarting(true);
    setRestartError('');
    try {
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      await restartMatchTest({ anonymousId: identity.anonymousId, storage: window.localStorage });
      window.location.assign(MATCH_ROUTES.intro);
    } catch (error) {
      setRestartError(error instanceof Error ? error.message : '테스트를 다시 시작하지 못했어요.');
      restartPending.current = false;
      setRestarting(false);
    }
  }

  if (!state) {
    return <div className="match-actions"><button className="match-button" type="button" disabled>잠시만 기다려 주세요…</button></div>;
  }

  if (state.status === "completed") {
    return (
      <div className="match-actions">
        <a className="match-button" href={`${MATCH_ROUTES.result(state.resultPublicId)}?from=home`}>내 웹툰 취향 결과 보기</a>
        <button className="match-button match-button--secondary" type="button" disabled={restarting} onClick={() => void startFresh()} title="기존 추천작과 코멘트·좋아요를 삭제하고 다시 시작">{restarting ? '추천작 초기화 중…' : '다시 테스트하기'}</button>
        {restartError ? <p className="match-notice" role="alert">{restartError}</p> : null}
      </div>
    );
  }

  if (state.status === "in_progress") {
    return (
      <div className="match-actions">
        <a className="match-button" href={state.resumePath}>이어 하기</a>
        <button className="match-button match-button--secondary" type="button" disabled={restarting} onClick={() => void startFresh()}>{restarting ? '추천작 초기화 중…' : '처음부터 다시 하기'}</button>
        {restartError ? <p className="match-notice" role="alert">{restartError}</p> : null}
        <p className="match-identity-note">이 브라우저에 진행 중인 응답이 저장되어 있어요.</p>
      </div>
    );
  }

  return (
    <div className="match-actions">
      <button className="match-button" type="button" disabled={restarting} onClick={() => void startFresh()}>{restarting ? '시작 준비 중…' : '내 웹툰 취향 찾기'}</button>
      {restartError ? <p className="match-notice" role="alert">{restartError}</p> : null}
      <p className="match-identity-note">로그인 없이 이 브라우저에 진행 상황을 안전하게 보관해요.</p>
    </div>
  );
}
