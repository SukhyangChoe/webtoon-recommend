"use client";

import { useEffect, useRef, useState } from "react";
import { trackMatchEvent } from "../analytics/client";
import { MATCH_ROUTES } from "../config/routes";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import { readMatchDraft, resetMatchDraft } from "../storage/draft.mjs";
import { clearPendingChallenge, readChallengeResult, readOwnerManageToken, readPendingChallenge, writeChallengeResult, writePendingChallenge } from "../storage/challengeStorage.mjs";
import { validateMatchNickname } from "../server/nickname.mjs";

type ChallengeInfo = { ownerNickname: string; entryCount: number; topScore: number | null; questionSetVersion: string; status: string };

export function ChallengeLanding({ challengeCode }: { challengeCode: string }) {
  const [challenge, setChallenge] = useState<ChallengeInfo | null>(null);
  const [existingResultId, setExistingResultId] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [nickname, setNickname] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [error, setError] = useState("");
  const landingTracked = useRef(false);
  const nicknameValidation = validateMatchNickname(nickname);

  useEffect(() => {
    let active = true;
    const ownerToken = readOwnerManageToken(window.localStorage, challengeCode);
    const savedResult = readChallengeResult(window.localStorage, challengeCode);
    const pending = readPendingChallenge(window.localStorage);
    if (!ownerToken && savedResult?.resultId) {
      clearPendingChallenge(window.localStorage);
      window.location.replace(`/match/c/${challengeCode}/match/${savedResult.resultId}`);
      return () => { active = false; };
    }
    void fetch(`/api/v1/challenges/${challengeCode}`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "CHALLENGE_NOT_FOUND");
      if (!active) return;
      if (pending?.challengeCode === challengeCode && pending.challengerNickname) {
        setNickname(pending.challengerNickname);
        setAgreed(Boolean(pending.agreedAt));
      }
      if (!landingTracked.current) {
        landingTracked.current = true;
        let referrerHost = "";
        try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ""; } catch {}
        trackMatchEvent("wm_challenge_landing_view", { challengeCode, referrerHost });
      }
      const draft = readMatchDraft(window.localStorage);
      if (!(pending?.challengeCode === challengeCode && pending.challengerNickname) && draft?.nickname) {
        setNickname(draft.nickname);
      }
      if (!ownerToken && draft?.resultPublicId && draft.questionSetVersion === body.questionSetVersion) {
        const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
        const existingResponse = await fetch(`/api/v1/challenges/${challengeCode}/entries`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ anonymousId: identity.anonymousId, challengerPublicProfileId: draft.resultPublicId, lookupOnly: true }),
        });
        const existing = await existingResponse.json();
        if (!active) return;
        if (existingResponse.ok && existing.resultId) {
          writeChallengeResult(window.localStorage, challengeCode, existing.resultId, draft.resultPublicId);
          clearPendingChallenge(window.localStorage);
          window.location.replace(`/match/c/${challengeCode}/match/${existing.resultId}`);
          return;
        }
        setExistingResultId(draft.resultPublicId);
      } else if (draft?.resultPublicId && draft.questionSetVersion === body.questionSetVersion) {
        setExistingResultId(draft.resultPublicId);
      }
      setChallenge(body);
      setIsOwner(Boolean(ownerToken));
    }).catch(() => active && setError("이 궁합 링크를 찾지 못했어요."));
    return () => { active = false; };
  }, [challengeCode]);

  async function continueWithExisting() {
    if (!nicknameValidation.valid || !agreed || checkingNickname) return;
    setCheckingNickname(true);
    setError("");
    try {
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      const response = await fetch(`/api/v1/challenges/${challengeCode}/nickname-check`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: nicknameValidation.nickname, anonymousId: identity.anonymousId }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (body.error === "SELF_CHALLENGE_NOT_ALLOWED") throw new Error("내가 만든 링크에는 직접 참여할 수 없어요. 랭킹 관리에서 참여 현황을 확인해 주세요.");
        throw new Error();
      }
      if (!body.available) {
        setError("이 링크에서 이미 사용 중인 닉네임이에요. 다른 이름을 골라 주세요.");
        return;
      }
      writePendingChallenge(window.localStorage, challengeCode, nicknameValidation.nickname);
      window.location.assign(MATCH_ROUTES.result(existingResultId));
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : "닉네임을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setCheckingNickname(false);
    }
  }

  function startFresh() {
    const preparedNickname = nicknameValidation.valid && agreed ? nicknameValidation.nickname : "";
    writePendingChallenge(window.localStorage, challengeCode, preparedNickname);
    resetMatchDraft(window.localStorage);
    window.location.assign(MATCH_ROUTES.intro);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (existingResultId) void continueWithExisting();
    else startFresh();
  }

  if (error && !challenge) return <section className="match-card match-hero"><p className="match-eyebrow">링크 확인</p><h1>{error}</h1><a className="match-button" href="/match">내 취향 테스트하기</a></section>;
  if (!challenge) return <section className="match-card match-hero"><p>초대 링크를 불러오는 중이에요…</p></section>;
  if (challenge.status !== "active") return <section className="match-card match-hero"><p className="match-eyebrow">초대 종료</p><h1>이 궁합 링크는 지금 닫혀 있어요</h1>{isOwner ? <a className="match-button" href={`/match/c/${challengeCode}/ranking`}>랭킹 관리에서 다시 열기</a> : <a className="match-button" href="/match">내 취향 테스트하기</a>}</section>;

  return <section className="match-card match-invite-card"><p className="match-eyebrow">웹툰궁합 초대</p><div className="match-invite-stars" aria-hidden="true">✦ ✦<br />✦</div><h1><strong>{challenge.ownerNickname}</strong>님이<br />웹툰궁합을 보자고 했어요</h1><div className="match-invite-stats"><span>현재 도전자 <strong>{challenge.entryCount}명</strong></span>{challenge.topScore !== null ? <span>현재 1위 <strong>{challenge.topScore}%</strong></span> : null}</div>{isOwner ? <><p>내가 만든 링크의 참여 현황과 랭킹을 관리할 수 있어요.</p><div className="match-actions"><a className="match-button" href={`/match/c/${challengeCode}/ranking`}>랭킹 관리하기</a>{existingResultId ? <a className="match-button match-button--secondary" href={`/match/result/${existingResultId}`}>내 취향 결과 보기</a> : null}</div></> : existingResultId ? <><p>저장된 취향으로 바로 비교하거나, 새로 테스트할 수 있어요.</p><form className="match-challenge-form match-invite-entry-form" onSubmit={submit}><label><span>닉네임</span><input type="text" value={nickname} onChange={(event) => { setNickname(event.target.value); setError(""); }} minLength={2} maxLength={20} placeholder="2~20자" autoComplete="nickname" aria-invalid={nickname.length > 0 && !nicknameValidation.valid} aria-describedby="challenger-nickname-guide" /><small id="challenger-nickname-guide" className={`match-field-guide${nickname.length > 0 && !nicknameValidation.valid ? " is-error" : ""}`}>{nicknameValidation.message}</small></label><label className="match-check-row"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span><strong>공개 범위를 확인했어요</strong><small>이 링크를 아는 사람에게 닉네임·궁합 점수·순위가 보일 수 있어요.</small></span></label>{error ? <p className="match-notice is-error" role="alert">{error}</p> : null}<button className="match-button" type="submit" disabled={checkingNickname || !agreed || !nicknameValidation.valid}>{checkingNickname ? "닉네임 확인 중…" : "저장된 취향으로 바로 궁합 보기"}</button><button className="match-button match-button--secondary" type="button" onClick={startFresh}>새로 테스트하기</button></form></> : <button className="match-button" type="button" onClick={startFresh}>테스트 시작</button>}</section>;
}
