export type ActiveChallengeInfo = {
  challengeCode: string;
  challengeUrl: string;
  ownerNickname: string;
  entryCount: number;
  ownerPublicProfileId: string | null;
};

import { loadWorkResource } from './loadWorkResource.mjs';

export async function requestActiveChallenge(anonymousId: string) {
  const query = new URLSearchParams({ anonymousId });
  try {
    const body = await loadWorkResource(`/api/v1/challenges?${query}`, { timeoutMs: 8000 });
    return body.active ? body as ActiveChallengeInfo & { active: true } : null;
  } catch { return null; }
}

/** Footer needs one owned code, not a ranking/owner-taste refresh. */
export async function requestInvitationCode(anonymousId: string) {
  try {
    const body = await loadWorkResource(`/api/v1/challenges?${new URLSearchParams({ anonymousId, view: 'invitation' })}`, { timeoutMs:8000 });
    return body.active && typeof body.challengeCode === 'string' ? body.challengeCode : null;
  } catch { return null; }
}
