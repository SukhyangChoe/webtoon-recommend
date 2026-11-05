// Shared by viewer warnings and today's selection. A tag is a personal mismatch,
// not a universal quality judgement about the work.
export const AVOIDANCE_WARNING_VERSION = 'personal-avoidance-warning-v1';
const LABELS = Object.freeze({
  progression_fatigue: '반복·늘어지는 전개', weak_immersion: '몰입감 부족',
  character_frustration: '답답한 주인공', complexity_fatigue: '복잡한 설정·관계',
  entry_barrier: '높은 진입 장벽', relationship_stress: '오해·감정싸움',
  graphic_intensity: '잔혹한 장면', heavy_tone: '무거운 분위기',
  visual_barrier: '그림체 장벽', tone_mismatch: '분위기·톤 불일치',
  short_episode_volume: '짧은 회차', art_tone_mismatch: '작화·톤 불일치',
  legacy_presentation_barrier: '오래된 연출·표현 방식',
});
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;

/** Original choices take precedence, including 'none'. Only fall back to vector
 * evidence for older snapshots without original avoidance answers. Never infer
 * dislikes from a work the reader recommended, clicked, or was shown. */
export function readerAvoidanceKeys(snapshot, seed) {
  if (Array.isArray(snapshot?.answers?.avoidance)) {
    const selected = new Set(snapshot.answers.avoidance);
    if (selected.has('avoid_none')) return [];
    return [...new Set((seed?.avoidanceFeatureCatalog || []).filter(item => selected.has(item.featureKey))
      .flatMap(item => item.webtoonFitCompatibility?.avoidanceTagKeys || []))];
  }
  return Object.entries(snapshot?.tasteVector?.avoidanceTagScores || {})
    .filter(([, value]) => positive(value)).map(([key]) => key);
}

/** Any observed positive burden on an explicitly avoided tag warns. Missing,
 * zero or invalid values are not invented into danger OR a claim of safety.
 * Public output has labels only, never the underlying vector scores. */
export function matchedAvoidanceWarnings(snapshot, recommendation, seed) {
  const candidate = recommendation?.avoidanceTagScores || {};
  return readerAvoidanceKeys(snapshot, seed).filter(key => LABELS[key] && positive(candidate[key]))
    .sort((a, b) => candidate[b] - candidate[a] || a.localeCompare(b))
    .map(key => ({ key, label: LABELS[key] }));
}
