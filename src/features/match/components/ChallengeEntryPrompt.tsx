"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import { clearChallengeResult, clearPairResultPrompt, clearPendingChallenge, readLatestChallengeResult, readPairResultPrompt, readPendingChallenge, writeChallengeResult, writePairResultPrompt } from "../storage/challengeStorage.mjs";
import { validateMatchNickname } from "../server/nickname.mjs";

export function ChallengeEntryPrompt({ publicProfileId }: { publicProfileId: string }) {
  const [challengeCode, setChallengeCode] = useState("");
  const [ownerNickname, setOwnerNickname] = useState("");
  const [nickname, setNickname] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [pairResultId, setPairResultId] = useState("");
  const submissionStarted = useRef(false);
  const nicknameValidation = validateMatchNickname(nickname);

  const completeEntry = useCallback(async (code: string, challengerNickname: string) => {
    setSubmitting(true);
    setMessage("");
    try {
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      const response = await fetch(`/api/v1/challenges/${code}/entries`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          anonymousId: identity.anonymousId,
          challengerPublicProfileId: publicProfileId,
          challengerNickname,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (body.error === "QUESTION_VERSION_MISMATCH") throw new Error("이 링크와 같은 기준으로 비교하려면 다시 테스트해 주세요.");
        if (body.error === "NICKNAME_REJECTED") throw new Error("닉네임은 개인정보 없이 2~20자로 적어 주세요.");
        if (body.error === "SELF_CHALLENGE_NOT_ALLOWED") throw new Error("내가 만든 링크에는 직접 참여할 수 없어요.");
        throw new Error("궁합 결과를 만들지 못했어요.");
      }
      writeChallengeResult(window.localStorage, code, body.resultId, publicProfileId);
      writePairResultPrompt(window.localStorage, code, body.resultId, publicProfileId);
      clearPendingChallenge(window.localStorage);
      setChallengeCode(code);
      setPairResultId(body.resultId);
      setSubmitting(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "궁합 결과를 만들지 못했어요.");
      setSubmitting(false);
      submissionStarted.current = false;
    }
  }, [publicProfileId]);

  useEffect(() => {
    let active = true;
    const pending = readPendingChallenge(window.localStorage);
    const savedPairPrompt = readPairResultPrompt(window.localStorage);
    const matchingPairPrompt = savedPairPrompt?.publicProfileId === publicProfileId ? savedPairPrompt : null;
    const savedChallengeResult = !pending?.challengeCode && !matchingPairPrompt ? readLatestChallengeResult(window.localStorage, publicProfileId) : null;
    const recoverablePair = matchingPairPrompt ?? savedChallengeResult;
    if (!pending?.challengeCode && recoverablePair) {
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      void Promise.all([
        fetch(`/api/v1/challenges/${recoverablePair.challengeCode}`),
        fetch(`/api/v1/challenges/${recoverablePair.challengeCode}/entries`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ anonymousId: identity.anonymousId, challengerPublicProfileId: publicProfileId, lookupOnly: true }),
        }),
      ]).then(async ([challengeResponse, entryResponse]) => {
        const [body, entry] = await Promise.all([challengeResponse.json(), entryResponse.json()]);
        if (!active) return;
        const stalePair = challengeResponse.status === 404
          || entry.error === "SELF_CHALLENGE_NOT_ALLOWED"
          || entry.error === "CHALLENGE_NOT_FOUND"
          || (entryResponse.ok && entry.resultId !== recoverablePair.resultId);
        if (stalePair) {
          clearPairResultPrompt(window.localStorage);
          clearChallengeResult(window.localStorage, recoverablePair.challengeCode);
          return;
        }
        if (!challengeResponse.ok || !entryResponse.ok) return;
        writePairResultPrompt(window.localStorage, recoverablePair.challengeCode, recoverablePair.resultId, publicProfileId);
        setChallengeCode(recoverablePair.challengeCode);
        setPairResultId(recoverablePair.resultId);
        setOwnerNickname(body.ownerNickname);
      }).catch(() => {});
      return () => { active = false; };
    }
    if (!pending?.challengeCode) return;

    void fetch(`/api/v1/challenges/${pending.challengeCode}`).then(async (response) => {
      const body = await response.json();
      if (!response.ok || body.status !== "active") throw new Error();
      if (!active) return;

      const savedNickname = typeof pending.challengerNickname === "string" ? pending.challengerNickname : "";
      const savedValidation = validateMatchNickname(savedNickname);
      const hasPreTestConsent = Boolean(pending.agreedAt && savedValidation.valid);
      setChallengeCode(pending.challengeCode);
      setOwnerNickname(body.ownerNickname);
      setNickname(savedNickname);
      setAgreed(hasPreTestConsent);

      if (hasPreTestConsent && !submissionStarted.current) {
        submissionStarted.current = true;
        await completeEntry(pending.challengeCode, savedValidation.nickname);
      }
    }).catch(() => {
      if (!active) return;
      clearPendingChallenge(window.localStorage);
      setChallengeCode("");
    });

    return () => { active = false; };
  }, [completeEntry, publicProfileId]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!agreed || !nicknameValidation.valid || submissionStarted.current) return;
    submissionStarted.current = true;
    void completeEntry(challengeCode, nicknameValidation.nickname);
  }

  if (!challengeCode || !ownerNickname) return null;
  if (pairResultId) return <section className="match-result-section match-entry-prompt"><p className="match-eyebrow">웹툰궁합</p><p>{ownerNickname}님과의 궁합 결과도 준비됐어요</p><a className="match-button" href={`/match/c/${challengeCode}/ranking`}>궁합 보기</a></section>;
  if (submitting) return <section className="match-result-section match-entry-prompt"><p className="match-eyebrow">궁합 계산 중</p><h2>{ownerNickname}님과의 결과를 만들고 있어요</h2><div className="match-loading-bar" aria-label="궁합 결과 계산 중"><span /></div></section>;

  return <section className="match-result-section match-entry-prompt"><p className="match-eyebrow">초대 참여</p><h2>{ownerNickname}님과의 궁합을 확인할게요</h2><p>{message || "이전 화면에서 입력한 닉네임을 확인한 뒤 다시 진행해 주세요."}</p><form className="match-challenge-form" onSubmit={submit}><label><span>닉네임</span><input type="text" value={nickname} onChange={(event) => setNickname(event.target.value)} minLength={2} maxLength={20} placeholder="2~20자" autoComplete="nickname" aria-invalid={nickname.length > 0 && !nicknameValidation.valid} aria-describedby="challenger-nickname-guide" /><small id="challenger-nickname-guide" className={`match-field-guide${nickname.length > 0 && !nicknameValidation.valid ? " is-error" : ""}`}>{nicknameValidation.message}</small></label><label className="match-check-row"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span><strong>공개 범위를 확인했어요</strong><small>닉네임·궁합 점수·순위가 공개되며, 이 결과는 서로의 궁합 랭킹에 표시될 수 있어요.</small></span></label><button className="match-button" type="submit" disabled={!agreed || !nicknameValidation.valid}>궁합 결과 다시 만들기</button></form></section>;
}
