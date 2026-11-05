/** Invite always means the viewer's active compatibility entry, never a page URL. */
export function invitationPath(challengeCode) {
  return typeof challengeCode === 'string' && /^[\w-]{1,100}$/.test(challengeCode)
    ? `/match/c/${encodeURIComponent(challengeCode)}` : null;
}
