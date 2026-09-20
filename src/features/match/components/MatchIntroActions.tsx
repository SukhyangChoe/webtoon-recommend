"use client";

import { useEffect, useState } from "react";
import { trackMatchEvent } from "../analytics/client";
import { MATCH_ROUTES } from "../config/routes";
import { readPendingChallenge, writePendingChallenge } from "../storage/challengeStorage.mjs";
import { createEmptyMatchDraft, readMatchDraft, writeMatchDraft } from "../storage/draft.mjs";
import { validateMatchNickname } from "../server/nickname.mjs";

export function MatchIntroActions() {
  const [nickname, setNickname] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [challengeCode, setChallengeCode] = useState("");
  const [ready, setReady] = useState(false);
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

  function begin(event: React.FormEvent) {
    event.preventDefault();
    if (!nicknameValidation.valid || (challengeCode && !agreed)) return;
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

  return <form className="match-challenge-form match-test-profile-form" onSubmit={begin}><label><span>테스트에서 사용할 닉네임</span><input type="text" value={nickname} onChange={(event) => setNickname(event.target.value)} minLength={2} maxLength={20} placeholder="2~20자" autoComplete="nickname" aria-invalid={nickname.length > 0 && !nicknameValidation.valid} aria-describedby="test-nickname-guide" /><small id="test-nickname-guide" className={`match-field-guide${nickname.length > 0 && !nicknameValidation.valid ? " is-error" : ""}`}>{nicknameValidation.message}</small></label>{challengeCode ? <label className="match-check-row"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span><strong>공개 범위를 확인했어요</strong><small>초대 링크를 아는 사람에게 닉네임·궁합 점수·순위가 보일 수 있어요.</small></span></label> : <p className="match-profile-note">닉네임은 결과와 초대 링크를 만들 때 사용해요. 실명이나 연락처는 피해주세요.</p>}<button className="match-button" type="submit" disabled={!nicknameValidation.valid || Boolean(challengeCode && !agreed)}>테스트 시작</button></form>;
}
