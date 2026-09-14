"use client";

import { useEffect, useState } from "react";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import { clearPendingChallenge, readPendingChallenge, writeChallengeResult } from "../storage/challengeStorage.mjs";
import { validateMatchNickname } from "../server/nickname.mjs";

export function ChallengeEntryPrompt({ publicProfileId }: { publicProfileId: string }) {
  const [challengeCode, setChallengeCode] = useState("");
  const [ownerNickname, setOwnerNickname] = useState("");
  const [nickname, setNickname] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const nicknameValidation = validateMatchNickname(nickname);

  useEffect(() => {
    const pending = readPendingChallenge(window.localStorage);
    if (!pending?.challengeCode) return;
    void fetch(`/api/v1/challenges/${pending.challengeCode}`).then(async (response) => {
      const body = await response.json();
      if (!response.ok || body.status !== "active") throw new Error();
      setChallengeCode(pending.challengeCode);
      setOwnerNickname(body.ownerNickname);
    }).catch(() => {
      clearPendingChallenge(window.localStorage);
      setChallengeCode("");
    });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      const response = await fetch(`/api/v1/challenges/${challengeCode}/entries`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ anonymousId: identity.anonymousId, challengerPublicProfileId: publicProfileId, challengerNickname: nickname }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (body.error === "QUESTION_VERSION_MISMATCH") throw new Error("이 링크와 같은 기준으로 비교하려면 다시 테스트해 주세요.");
        if (body.error === "NICKNAME_REJECTED") throw new Error("닉네임은 개인정보 없이 2~20자로 적어 주세요.");
        throw new Error("궁합 결과를 만들지 못했어요.");
      }
      writeChallengeResult(window.localStorage, challengeCode, body.resultId);
      clearPendingChallenge(window.localStorage);
      window.location.assign(body.pairResultUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "궁합 결과를 만들지 못했어요.");
      setSubmitting(false);
    }
  }

  if (!challengeCode || !ownerNickname) return null;
  return <section className="match-result-section match-entry-prompt"><p className="match-eyebrow">초대 참여</p><h2>{ownerNickname}님과의 궁합을 확인할게요</h2><p>테스트가 끝났어요. 결과와 랭킹에 표시할 닉네임만 정해 주세요.</p><form className="match-challenge-form" onSubmit={submit}><label><span>닉네임</span><input type="text" value={nickname} onChange={(event) => setNickname(event.target.value)} minLength={2} maxLength={20} placeholder="2~20자" aria-invalid={nickname.length > 0 && !nicknameValidation.valid} aria-describedby="challenger-nickname-guide" /><small id="challenger-nickname-guide" className={`match-field-guide${nickname.length > 0 && !nicknameValidation.valid ? " is-error" : ""}`}>{nicknameValidation.message}</small></label><label className="match-check-row"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span><strong>공개 범위를 확인했어요</strong><small>이 링크를 아는 사람에게 닉네임·궁합 점수·순위가 보일 수 있어요.</small></span></label>{message ? <p className="match-notice" role="alert">{message}</p> : null}<button className="match-button" type="submit" disabled={!agreed || !nicknameValidation.valid || submitting}>{submitting ? "궁합 계산 중…" : "우리 궁합 확인하기"}</button></form></section>;
}
