"use client";

import { useEffect, useState } from "react";
import { trackMatchEvent } from "../analytics/client";
import { requestActiveChallenge } from "../api/activeChallenge";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import { readMatchDraft, resetMatchDraft, writeMatchDraft } from "../storage/draft.mjs";
import { writePublicResult } from "../storage/resultStorage.mjs";
import { writeOwnerManageToken } from "../storage/challengeStorage.mjs";
import { validateMatchNickname } from "../server/nickname.mjs";

type CreatedChallenge = { challengeCode: string; challengeUrl: string; ownerManageToken: string };
type ExistingChallenge = { challengeCode: string; challengeUrl: string };

export function ChallengeCreator() {
  const [ready, setReady] = useState(false);
  const [publicProfileId, setPublicProfileId] = useState("");
  const [nickname, setNickname] = useState("");
  const [rankingVisibility, setRankingVisibility] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedChallenge | null>(null);
  const [existing, setExisting] = useState<ExistingChallenge | null>(null);
  const [message, setMessage] = useState("");
  const nicknameValidation = validateMatchNickname(nickname);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const draft = readMatchDraft(window.localStorage);
      const profileId = draft?.resultPublicId ?? "";
      if (!active) return;
      setPublicProfileId(profileId);
      setNickname(draft?.nickname ?? "");
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      const challenge = await requestActiveChallenge(identity.anonymousId);
      if (active && challenge) setExisting(challenge);
      if (active) setReady(true);
    };
    void load().catch(() => active && setReady(true));
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!nicknameValidation.valid || !agreed) return;
    setMessage("");
    setExisting(null);
    setSubmitting(true);
    try {
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      const requestChallenge = async (ownerPublicProfileId: string) => {
        const response = await fetch("/api/v1/challenges", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ anonymousId: identity.anonymousId, ownerPublicProfileId, ownerNickname: nicknameValidation.nickname, rankingVisibility }),
        });
        return { response, body: await response.json() };
      };

      let { response, body } = await requestChallenge(publicProfileId);
      if (!response.ok && body.error === "OWNER_SNAPSHOT_NOT_FOUND") {
        const draft = readMatchDraft(window.localStorage);
        if (!draft?.answers) throw new Error("저장된 테스트 응답을 찾지 못했어요. 테스트 결과를 다시 만들어 주세요.");

        const snapshotResponse = await fetch("/api/v1/taste-snapshots", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ anonymousId: identity.anonymousId, nickname: draft.nickname, answers: draft.answers }),
        });
        const snapshot = await snapshotResponse.json();
        if (!snapshotResponse.ok || !snapshot.publicProfileId || !snapshot.result) {
          throw new Error("취향 결과를 복구하지 못했어요. 잠시 후 다시 시도해 주세요.");
        }

        writePublicResult(window.localStorage, snapshot.result);
        writeMatchDraft(window.localStorage, {
          ...draft,
          resultPublicId: snapshot.publicProfileId,
          snapshotId: snapshot.snapshotId,
          currentPath: `/match/result/${snapshot.publicProfileId}`,
        });
        setPublicProfileId(snapshot.publicProfileId);
        ({ response, body } = await requestChallenge(snapshot.publicProfileId));
      }
      if (!response.ok && body.error === "ACTIVE_CHALLENGE_EXISTS" && body.challengeCode && body.challengeUrl) {
        setExisting({ challengeCode: body.challengeCode, challengeUrl: body.challengeUrl });
        return;
      }
      if (!response.ok) throw new Error(body.error === "NICKNAME_REJECTED" ? "닉네임은 개인정보 없이 2~20자로 적어 주세요." : "궁합 링크를 만들지 못했어요.");
      writeOwnerManageToken(window.localStorage, body.challengeCode, body.ownerManageToken);
      trackMatchEvent("wm_challenge_create", {
        challengeCode: body.challengeCode,
        rankingVisibility,
      });
      setCreated(body);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "궁합 링크를 만들지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink(challengeUrl: string) {
    try {
      await navigator.clipboard.writeText(challengeUrl);
      setMessage("링크를 복사했어요.");
    } catch {
      setMessage("주소창의 링크를 직접 복사해 주세요.");
    }
  }

  function restartWithNickname() {
    resetMatchDraft(window.localStorage);
    window.location.assign("/match/test/intro");
  }

  if (!ready) return <section className="match-card match-hero"><p>완료한 결과를 확인하는 중이에요…</p></section>;
  if (!publicProfileId && !created && !existing) return <section className="match-card match-hero"><p className="match-eyebrow">결과가 필요해요</p><h1>먼저 내 취향을 확인해 주세요</h1><p>테스트 결과가 있어야 고정된 결과로 궁합 링크를 만들 수 있어요.</p><a className="match-button" href="/match">웹툰 취향 테스트로</a></section>;

  if (existing) return <section className="match-card match-challenge-created"><p className="match-eyebrow">이미 열린 링크가 있어요</p><h1>한 번에 하나의 궁합 링크만 열 수 있어요</h1><p>새 링크가 필요하면 기존 링크의 랭킹 관리 화면에서 먼저 참여를 닫아 주세요.</p><div className="match-link-box"><span>{existing.challengeUrl}</span><button type="button" onClick={() => void copyLink(existing.challengeUrl)}>복사</button></div>{message ? <p className="match-notice" role="status">{message}</p> : null}<div className="match-actions">{publicProfileId ? <a className="match-button" href={`/match/share/personal?profilePublicId=${publicProfileId}&challengeCode=${existing.challengeCode}`}>Threads에 공유하기</a> : null}<a className={`match-button ${publicProfileId ? "match-button--secondary" : ""}`} href={`/match/c/${existing.challengeCode}/ranking`}>기존 링크 관리하기</a><a className="match-button match-button--secondary" href={`/match/c/${existing.challengeCode}`}>기존 초대 화면 보기</a></div></section>;

  if (!nicknameValidation.valid) return <section className="match-card match-hero"><p className="match-eyebrow">닉네임이 필요해요</p><h1>닉네임부터 저장하고 다시 테스트해 주세요</h1><p>이 결과는 닉네임을 받기 전에 만든 이전 결과예요. 새 테스트부터는 시작할 때 정한 닉네임으로 링크가 만들어져요.</p><button className="match-button" type="button" onClick={restartWithNickname}>닉네임 입력하고 다시 테스트</button></section>;

  if (created) return <section className="match-card match-challenge-created"><p className="match-eyebrow">링크 완성</p><h1>궁합 링크가 만들어졌어요</h1><p>이 링크로 들어온 사람은 테스트 후 바로 둘의 궁합을 보게 돼요.</p><div className="match-link-box"><span>{created.challengeUrl}</span><button type="button" onClick={() => void copyLink(created.challengeUrl)}>복사</button></div>{message ? <p className="match-notice" role="status">{message}</p> : null}<div className="match-actions"><a className="match-button" href={`/match/share/personal?profilePublicId=${publicProfileId}&challengeCode=${created.challengeCode}`}>Threads에 공유하기</a><a className="match-button match-button--secondary" href={`/match/c/${created.challengeCode}/ranking`}>랭킹 관리하기</a><a className="match-button match-button--secondary" href={`/match/c/${created.challengeCode}`}>초대 화면 보기</a></div></section>;

  return <section className="match-card"><p className="match-eyebrow">초대 링크 만들기</p><h1><strong>{nicknameValidation.nickname}</strong>님의 초대 링크를 만들게요</h1><p className="match-question-text">테스트를 시작할 때 정한 닉네임을 그대로 사용해요.</p><form className="match-challenge-form" onSubmit={submit}><label className="match-check-row"><input type="checkbox" checked={rankingVisibility} onChange={(event) => setRankingVisibility(event.target.checked)} /><span><strong>링크 랭킹 공개</strong><small>링크를 아는 사람에게 닉네임·궁합 점수·순위가 보여요.</small></span></label><label className="match-check-row"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span><strong>공개 범위를 확인했어요</strong><small>초대 링크는 전달받은 사람이 다시 공유할 수도 있어요.</small></span></label>{message ? <p className="match-notice" role="alert">{message}</p> : null}<button className="match-button" type="submit" disabled={submitting || !agreed}>{submitting ? "초대 링크 만드는 중…" : "초대 링크 만들기"}</button></form></section>;
}
