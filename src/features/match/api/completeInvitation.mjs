import { readPendingChallenge, clearPendingChallenge, clearPairResultPrompt, writeChallengeResult } from '../storage/challengeStorage.mjs';
import { validateMatchNickname } from '../server/nickname.mjs';

const errors = {
  CHALLENGE_NOT_FOUND: '초대 링크를 찾지 못했어요. 내 취향 결과는 저장되어 있어요.',
  CHALLENGE_CLOSED: '참여가 종료된 초대 링크예요. 내 취향 결과는 저장되어 있어요.',
  SELF_CHALLENGE_NOT_ALLOWED: '내가 만든 링크에는 직접 참여할 수 없어요.',
  QUESTION_VERSION_MISMATCH: '초대 링크와 테스트 기준이 달라요. 초대 화면에서 다시 시작해 주세요.',
  COMPATIBILITY_VERSION_MISMATCH: '이 초대 링크의 비교 기준이 변경됐어요. 초대 화면에서 확인해 주세요.',
};

/** Finish the invitation before showing any result; retries reuse the saved taste snapshot. */
export async function completePendingInvitation({ storage, anonymousId, publicProfileId, fetcher = globalThis.fetch }) {
  const pending = readPendingChallenge(storage);
  if (!pending?.challengeCode) return null;
  const nickname = validateMatchNickname(pending.challengerNickname ?? '');
  if (!nickname.valid || !pending.agreedAt) throw new Error('초대 화면에서 닉네임과 공개 범위를 먼저 확인해 주세요.');
  const code = encodeURIComponent(pending.challengeCode);
  const response = await fetcher(`/api/v1/challenges/${code}/entries`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ anonymousId, challengerPublicProfileId: publicProfileId, challengerNickname: nickname.nickname }),
  });
  const body = await response.json();
  if (!response.ok || typeof body.resultId !== 'string' || !body.resultId) {
    throw new Error(errors[body.error] ?? '궁합을 만들지 못했어요. 내 취향 결과는 저장되어 있으니 다시 시도해 주세요.');
  }
  writeChallengeResult(storage, pending.challengeCode, body.resultId, publicProfileId);
  clearPairResultPrompt(storage);
  clearPendingChallenge(storage);
  return `/match/c/${code}/match/${encodeURIComponent(body.resultId)}`;
}
