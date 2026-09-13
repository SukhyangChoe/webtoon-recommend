"use client";

import { useEffect, useRef, useState } from "react";
import { trackMatchEvent } from "../analytics/client";
import { MATCH_ROUTES } from "../config/routes";
import { ensureAnonymousId, persistAnonymousCookie } from "../storage/anonymousIdentity.mjs";
import { getMatchHomeState, readMatchDraft, resetMatchDraft } from "../storage/draft.mjs";

type BootstrapState =
  | { status: "not_started" }
  | { status: "in_progress"; resumePath: string }
  | { status: "completed"; resultPublicId: string };

export function MatchBootstrap() {
  const [state, setState] = useState<BootstrapState | null>(null);
  const landingTracked = useRef(false);

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

  function startFresh() {
    resetMatchDraft(window.localStorage);
    window.location.assign(MATCH_ROUTES.intro);
  }

  if (!state) {
    return <div className="match-actions"><button className="match-button" type="button" disabled>브라우저 준비 중…</button></div>;
  }

  if (state.status === "completed") {
    return (
      <div className="match-actions">
        <a className="match-button" href={MATCH_ROUTES.result(state.resultPublicId)}>내 웹툰 취향 결과 보기</a>
        <button className="match-button match-button--secondary" type="button" onClick={startFresh}>다시 테스트하기</button>
        <p className="match-identity-note">완료한 결과를 이 브라우저에 보관하고 있어요.</p>
      </div>
    );
  }

  if (state.status === "in_progress") {
    return (
      <div className="match-actions">
        <a className="match-button" href={state.resumePath}>이어 하기</a>
        <button className="match-button match-button--secondary" type="button" onClick={startFresh}>처음부터 다시 하기</button>
        <p className="match-identity-note">이 브라우저에 진행 중인 응답이 저장되어 있어요.</p>
      </div>
    );
  }

  return (
    <div className="match-actions">
      <button className="match-button" type="button" onClick={startFresh}>내 웹툰 취향 찾기</button>
      <p className="match-identity-note">로그인 없이 이 브라우저에 진행 상황을 안전하게 보관해요.</p>
    </div>
  );
}
