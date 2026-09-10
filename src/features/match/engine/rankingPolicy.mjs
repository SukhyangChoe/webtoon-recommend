export function denseRankEntries(entries) {
  const visible = entries
    .filter((entry) => !entry.hiddenByOwner)
    .sort((a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt));

  let rank = 0;
  let previousScore = null;
  return visible.map((entry) => {
    if (entry.score !== previousScore) rank += 1;
    previousScore = entry.score;
    return { ...entry, rank };
  });
}

export function selectRankingWindow(rankedEntries, viewerProfileId, limit = 20) {
  const safeLimit = Math.max(1, Math.min(20, Number.isFinite(limit) ? Math.floor(limit) : 20));
  const top20 = rankedEntries.slice(0, safeLimit);
  const viewer = viewerProfileId
    ? rankedEntries.find((entry) => entry.challengerProfileId === viewerProfileId) ?? null
    : null;
  const viewerEntry = viewer && !top20.some((entry) => entry.entryId === viewer.entryId) ? viewer : null;
  return { top20, viewerEntry };
}
