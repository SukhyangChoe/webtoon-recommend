"use client";

import { useEffect, useRef, useState } from "react";
import { trackMatchEvent } from "../analytics/client";
import { MATCH_ROUTES } from "../config/routes";
import { readMatchDraft, resetMatchDraft } from "../storage/draft.mjs";
import { readOwnerManageToken, writePendingChallenge } from "../storage/challengeStorage.mjs";

type ChallengeInfo = { ownerNickname: string; entryCount: number; topScore: number | null; questionSetVersion: string; status: string };

export function ChallengeLanding({ challengeCode }: { challengeCode: string }) {
  const [challenge, setChallenge] = useState<ChallengeInfo | null>(null);
  const [existingResultId, setExistingResultId] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState("");
  const landingTracked = useRef(false);

  useEffect(() => {
    let active = true;
    const ownerToken = readOwnerManageToken(window.localStorage, challengeCode);
    void fetch(`/api/v1/challenges/${challengeCode}`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "CHALLENGE_NOT_FOUND");
      if (!active) return;
      setChallenge(body);
      setIsOwner(Boolean(ownerToken));
      if (!landingTracked.current) {
        landingTracked.current = true;
        let referrerHost = "";
        try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ""; } catch {}
        trackMatchEvent("wm_challenge_landing_view", { challengeCode, referrerHost });
      }
      const draft = readMatchDraft(window.localStorage);
      if (draft?.resultPublicId && draft.questionSetVersion === body.questionSetVersion) setExistingResultId(draft.resultPublicId);
    }).catch(() => active && setError("이 궁합 링크를 찾지 못했어요."));
    return () => { active = false; };
  }, [challengeCode]);

  function useExisting() {
    writePendingChallenge(window.localStorage, challengeCode);
    window.location.assign(MATCH_ROUTES.result(existingResultId));
  }

  function startFresh() {
    writePendingChallenge(window.localStorage, challengeCode);
    resetMatchDraft(window.localStorage);
    window.location.assign(MATCH_ROUTES.intro);
  }

  if (error) return <section className="match-card match-hero"><p className="match-eyebrow">링크 확인</p><h1>{error}</h1><a className="match-button" href="/match">내 취향 테스트하기</a></section>;
  if (!challenge) return <section className="match-card match-hero"><p>초대 링크를 불러오는 중이에요…</p></section>;
  if (challenge.status !== "active") return <section className="match-card match-hero"><p className="match-eyebrow">초대 종료</p><h1>이 궁합 링크는 지금 닫혀 있어요</h1>{isOwner ? <a className="match-button" href={`/match/c/${challengeCode}/ranking`}>랭킹 관리에서 다시 열기</a> : <a className="match-button" href="/match">내 취향 테스트하기</a>}</section>;

  return <section className="match-card match-invite-card"><p className="match-eyebrow">웹툰궁합 초대</p><div className="match-invite-stars" aria-hidden="true">✦ ✦<br />✦</div><h1><strong>{challenge.ownerNickname}</strong>님이<br />웹툰궁합을 보자고 했어요</h1><div className="match-invite-stats"><span>현재 도전자 <strong>{challenge.entryCount}명</strong></span>{challenge.topScore !== null ? <span>현재 1위 <strong>{challenge.topScore}%</strong></span> : null}</div><p>{isOwner ? "내가 만든 링크의 참여 현황과 랭킹을 관리할 수 있어요." : "테스트하면 바로 둘의 궁합과 내 순위가 나와요."}</p>{isOwner ? <div className="match-actions"><a className="match-button" href={`/match/c/${challengeCode}/ranking`}>랭킹 관리하기</a>{existingResultId ? <a className="match-button match-button--secondary" href={`/match/result/${existingResultId}`}>내 취향 결과 보기</a> : null}</div> : existingResultId ? <div className="match-actions"><button className="match-button" type="button" onClick={useExisting}>바로 궁합 보기</button><button className="match-button match-button--secondary" type="button" onClick={startFresh}>다시 테스트하기</button></div> : <button className="match-button" type="button" onClick={startFresh}>궁합 보러 가기</button>}</section>;
}
