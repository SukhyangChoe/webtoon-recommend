import { matchedAvoidanceTags } from '../../engine/avoidanceEngine.mjs';

export const DAILY_AVOIDANCE_POLICY_VERSION = 'prefer-unmatched-with-warning-v1';

/** Extend the 02 selector's existing static soft tiers, not its fit formula.
 * Hard gates, fixed core representatives, original soft-filter tiers, maximum
 * size and lane constraints remain upstream-owned. Within each existing tier,
 * unmatched candidates precede matches. Shortage can retain matches, never make
 * up a candidate or revive an upstream-rejected work.
 */
export function avoidancePreferredPool(candidates, prefix, context, snapshot, seed) {
  const warnings = candidate => matchedAvoidanceTags(snapshot, context.byId.get(candidate.canonicalWebtoonId)?.recommendation, seed);
  const all = [...candidates, ...prefix];
  if (!all.some(candidate => warnings(candidate).length)) return { candidates, prefix };
  const decorate = candidate => {
    const original = candidate.axisFilter || {};
    const existingTier = original.softActive ? original.softTier || 0 : 0;
    return { ...candidate, axisFilter: { ...original, softActive: true,
      softTier: existingTier * 2 + (warnings(candidate).length ? 1 : 0),
      selectionScore: original.selectionScore ?? candidate.candidateOverallFit,
      avoidancePreferencePolicy: DAILY_AVOIDANCE_POLICY_VERSION } };
  };
  const byId = new Map(all.map(candidate => [candidate.canonicalWebtoonId, decorate(candidate)]));
  return { candidates: candidates.map(candidate => byId.get(candidate.canonicalWebtoonId)),
    prefix: prefix.map(candidate => byId.get(candidate.canonicalWebtoonId)) };
}

/** Scoped to a single isolated child, restored even on error. Original runtime
 * files/hashes stay untouched, and the entire original pipeline still owns gates,
 * core and lane decisions. No numerical PersonalFit or display-score penalty. */
export function withDailyAvoidancePreference(selector, context, snapshot, seed, run) {
  const original = selector.select;
  selector.select = (candidates, evidence, options = {}) => {
    const preferred = avoidancePreferredPool(candidates, options.prefix || [], context, snapshot, seed);
    return original(preferred.candidates, evidence, { ...options, prefix: preferred.prefix });
  };
  try { return run(); } finally { selector.select = original; }
}
