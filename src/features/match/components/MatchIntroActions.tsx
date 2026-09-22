"use client";

import { useEffect, useState } from "react";
import { trackMatchEvent } from "../analytics/client";
import { MATCH_ROUTES } from "../config/routes";
import { readPendingChallenge, writePendingChallenge } from "../storage/challengeStorage.mjs";
import { createEmptyMatchDraft, readMatchDraft, writeMatchDraft } from "../storage/draft.mjs";
import { validateMatchNickname } from "../server/nickname.mjs";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";

export function MatchIntroActions() {
  const [nickname, setNickname] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [challengeCode, setChallengeCode] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const nicknameValidation = validateMatchNickname(nickname);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = readMatchDraft(window.localStorage);
      const pending = readPendingChallenge(window.localStorage);
      setNickname(pending?.challengerNickname || draft?.nickname || "");
      setChallengeCode(pending?.challengeCode || "");
      setAgreed(Boolean(pending?.agreedAt));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function begin(event: React.FormEvent) {
    event.preventDefault();
    if (!nicknameValidation.valid || (challengeCode && !agreed) || checking) return;
    setMessage("");
    if (challengeCode) {
      setChecking(true);
      try {
        const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
        const response = await fetch(`/api/v1/challenges/${challengeCode}/nickname-check`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nickname: nicknameValidation.nickname, anonymousId: identity.anonymousId }),
        });
        const body = await response.json();
        if (!response.ok) {
          if (body.error === "SELF_CHALLENGE_NOT_ALLOWED") throw new Error("내가 만든 링크에는 직접 참여할 수 없어요. 궁합 관리에서 참여 현황을 확인해 주세요.");
          throw new Error();
        }
        if (!body.available) {
          setMessage("이 링크에서 이미 사용 중인 닉네임이에요. 다른 이름을 골라 주세요.");
          return;
        }
      } catch (caught) {
        setMessage(caught instanceof Error && caught.message ? caught.message : "닉네임을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      } finally {
        setChecking(false);
      }
    }
    const draft = readMatchDraft(window.localStorage) ?? createEmptyMatchDraft();
    const pending = readPendingChallenge(window.localStorage);
    if (pending?.challengeCode) {
      writePendingChallenge(window.localStorage, pending.challengeCode, nicknameValidation.nickname);
    }
    trackMatchEvent("wm_test_start", {
      entryType: pending?.challengeCode ? "challenge" : "direct",
      challengeCode: pending?.challengeCode ?? "",
    });
    const nextPath = MATCH_ROUTES.genreShelf(1);
    writeMatchDraft(window.localStorage, { ...draft, nickname: nicknameValidation.nickname, currentPath: nextPath });
    window.location.assign(nextPath);
  }

  if (!ready) return <button className="match-button" type="button" disabled>시작 화면을 준비하는 중…</button>;

  return <form className="match-challenge-form match-test-profile-form" onSubmit={begin}><label><span>테스트에서 사용할 닉네임</span><input type="text" value={nickname} onChange={(event) => { setNickname(event.target.value); setMessage(""); }} minLength={2} maxLength={20} placeholder="2~20자" autoComplete="nickname" aria-invalid={nickname.length > 0 && !nicknameValidation.valid} aria-describedby="test-nickname-guide" /><small id="test-nickname-guide" className={`match-field-guide${nickname.length > 0 && !nicknameValidation.valid ? " is-error" : ""}`}>{nicknameValidation.message}</small></label>{challengeCode ? <label className="match-check-row"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span><strong>공개 범위를 확인했어요</strong><small>초대 링크를 아는 사람에게 닉네임·궁합 점수·순위가 보일 수 있어요.</small></span></label> : <p className="match-profile-note">닉네임은 결과와 초대 링크를 만들 때 사용해요. 실명이나 연락처는 피해주세요.</p>}{message ? <p className="match-notice is-error" role="alert">{message}</p> : null}<button className="match-button" type="submit" disabled={checking || !nicknameValidation.valid || Boolean(challengeCode && !agreed)}>{checking ? "닉네임 확인 중…" : "테스트 시작"}</button></form>;
}
