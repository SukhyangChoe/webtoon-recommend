import { projectRecommendationGenreScores } from '../../engine/tasteVectorEngine.mjs';

// Service input adapter only. Leave the verified 02 assets, hard gates, exact
// set optimizer and UI work-fit formula untouched. Feed the existing nine-genre
// vector into 02's bounded requirement-support channel without inventing tags.
export function genreSupport(preference, recommendation, seed) {
  const peak = Math.max(0, ...Object.values(preference));
  const candidate = projectRecommendationGenreScores(recommendation, seed);
  const mass = Object.values(candidate).reduce((sum, value) => sum + value, 0);
  if (!peak || !mass) return 0;
  return Object.entries(candidate).reduce((sum, [key, value]) => sum + value / mass * (preference[key] || 0) / peak, 0);
}

export function withDailyGenrePreference(requirements, seed, run) {
  const original = requirements.evaluate;
  requirements.evaluate = (row, request, options = {}) => {
    const result = original(row, request, options);
    const source = request.currentIntent?.requirements.find(item => item.id === 'webtoonfit_current_genres');
    if (!source) return result;
    const disabled = options.disabledRequirementKeys?.includes(source.id);
    const support = disabled ? 0 : genreSupport(source.serviceGenrePreference, row.recommendation, seed);
    const groups = result.requirements.map(item => item.canonicalKey !== source.id ? item : {
      ...item, support, mass: support * item.importance, status: disabled ? 'disabled' : support > 0 ? 'direct' : 'unknown',
      evidence: [{ source: 'webtoonfit-nine-genre-projection', strength: support }],
    });
    const mass = groups.reduce((sum, item) => sum + item.mass, 0);
    return { ...result, requirements: groups, mass, utility: mass / (result.scale + mass),
      directCount: groups.filter(item => item.status === 'direct').length,
      partialCount: groups.filter(item => item.status === 'partial').length,
      unknownCount: groups.filter(item => item.status === 'unknown').length };
  };
  try { return run(); } finally { requirements.evaluate = original; }
}
