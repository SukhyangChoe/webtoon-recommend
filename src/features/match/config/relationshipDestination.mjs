/** Stable server profile IDs also work after a participant retakes the test. */
export function pairViewerRole(viewerProfileId, ownerProfileId, challengerProfileId) {
  if (!viewerProfileId) return null;
  return viewerProfileId === ownerProfileId ? 'owner' : viewerProfileId === challengerProfileId ? 'challenger' : null;
}

/** Never expose the code of another person's private relationship map. */
export function relationshipDestination(challenge, personProfileId, viewerProfileId) {
  const isSelf = Boolean(viewerProfileId && personProfileId === viewerProfileId);
  if (!challenge) return isSelf ? { state: 'create', href: '/match/challenge/new' } : { state: 'unavailable', href: null };
  if (challenge.rankingVisibility === 'private' && !isSelf) return { state: 'private', href: null };
  return { state: 'ready', href: `/match/c/${encodeURIComponent(challenge.challengeCode)}/ranking` };
}
