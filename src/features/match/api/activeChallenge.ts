export type ActiveChallengeInfo = {
  challengeCode: string;
  challengeUrl: string;
  ownerNickname: string;
  entryCount: number;
  ownerPublicProfileId: string | null;
};

export async function requestActiveChallenge(anonymousId: string) {
  const query = new URLSearchParams({ anonymousId });
  const response = await fetch(`/api/v1/challenges?${query}`);
  if (!response.ok) return null;
  const body = await response.json();
  return body.active ? body as ActiveChallengeInfo & { active: true } : null;
}
