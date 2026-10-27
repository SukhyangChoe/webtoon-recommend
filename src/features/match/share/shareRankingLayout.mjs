export const SHARE_RANKING_OWNER = Object.freeze({ x: 175, y: 95, radius: 43 });

/** Equal scores have equal radial distance, independently of their fan position. */
export function shareRankingNodes(participants) {
  const entries = participants.slice(0, 3);
  const directions = entries.length === 1 ? [0] : entries.length === 2 ? [-1, 1] : [-1, 0, 1];
  return entries.map((entry, index) => {
    const score = Number.isFinite(entry.score) ? Math.max(0, Math.min(100, entry.score)) : 0;
    // Give the common 50–100% band enough space to communicate meaningful differences.
    // Lower scores continue moving outward without clipping the fixed-size share card.
    const distance = score >= 50 ? 96 + (100 - score) * .9 : 141 + (50 - score) * .08;
    // Close side nodes spread sideways to clear the owner's nickname; distant ones fan down.
    const angle = directions[index] * (77 - (distance - 96) / 49 * 22) * Math.PI / 180;
    return {
      x: SHARE_RANKING_OWNER.x + Math.sin(angle) * distance,
      y: SHARE_RANKING_OWNER.y + Math.cos(angle) * distance,
      radius: 32,
    };
  });
}
