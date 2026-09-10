"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import { readMatchDraft, writeMatchDraft } from "../storage/draft.mjs";
import { readPublicResult, writePublicResult } from "../storage/resultStorage.mjs";

export function MatchResultBuilder() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const run = async () => {
      try {
        const draft = readMatchDraft(window.localStorage);
        if (!draft?.answers) throw new Error("저장된 테스트 응답을 찾지 못했어요.");
        if (draft.resultPublicId && readPublicResult(window.localStorage, draft.resultPublicId)) {
          router.replace(`/match/result/${draft.resultPublicId}`);
          return;
        }
        const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
        const response = await fetch("/api/v1/taste-snapshots", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ anonymousId: identity.anonymousId, answers: draft.answers }),
        });
        const created = await response.json();
        if (!response.ok || !created.publicProfileId) throw new Error(created.error ?? "결과를 만들지 못했어요.");
        let publicResult = created.result;
        if (!publicResult) {
          const resultResponse = await fetch(`/api/v1/results/${created.publicProfileId}`);
          publicResult = await resultResponse.json();
          if (!resultResponse.ok) throw new Error("완성된 결과를 불러오지 못했어요.");
        }
        writePublicResult(window.localStorage, publicResult);
        writeMatchDraft(window.localStorage, { ...draft, resultPublicId: created.publicProfileId, snapshotId: created.snapshotId, currentPath: `/match/result/${created.publicProfileId}` });
        router.replace(`/match/result/${created.publicProfileId}`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "결과를 만들지 못했어요.");
      }
    };
    void run();
  }, [attempt, router]);

  function retry() {
    started.current = false;
    setError("");
    setAttempt((value) => value + 1);
  }

  return <main className="match-page"><section className="match-card match-hero"><div className="match-building-stars" aria-hidden="true"><span>✦</span><span>✦</span><span>✦</span><span>✦</span><span>✦</span></div><p className="match-eyebrow">내 웹툰 취향</p><h1>{error ? "결과를 만들지 못했어요" : "취향별을 모으는 중"}</h1><p>{error || "9개 장르 사이에 18개의 별을 나누고 있어요."}</p>{error ? <div className="match-actions"><button className="match-button" type="button" onClick={retry}>다시 시도</button><a className="match-button match-button--secondary" href="/match/test/avoidance">마지막 응답 확인</a></div> : <div className="match-loading-bar" aria-label="결과 계산 중"><span /></div>}</section></main>;
}
