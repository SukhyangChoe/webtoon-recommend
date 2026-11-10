import { buildTasteSnapshot } from '../../engine/resultEngine.mjs';
import { applyRecommendationTaste } from '../../engine/recommendationTasteEngine.mjs';
import { sharedFitReasons } from '../../config/workDetailPresentation.mjs';
import { recommendationGenreLabel } from '../../config/recommendationPresentation.mjs';

/** Public explanation only: does not participate in selection or change fit scores.
 * Use the same once-blended current taste as the result/work detail screens.
 * Never claim that registered reference works were actually read. */
export function dailyMatchReason(input, work, seed, { tagLabels, contentLabels }) {
  const original = input.snapshotData?.tasteVector ? input.snapshotData : buildTasteSnapshot({
    seed, answers: input.answers, profileId: input.profileId, snapshotId: input.snapshotId, completedAt: input.completedAt,
  });
  const vectors = (input.recommendations ?? []).filter(item => item.affectsTaste !== false)
    .map(item => item.recommendation).filter(Boolean);
  const current = applyRecommendationTaste(original, vectors, seed);
  const labels = [...new Set(sharedFitReasons(current.tasteVector, work.recommendation, tagLabels, contentLabels).map(item => item.label))];
  const genre = current.tasteVector?.genreScores?.[work.mainGenre] > 0 ? recommendationGenreLabel(work.mainGenre) : null;
  const summary = labels.length
    ? `내 취향과 겹치는 ${labels.map(label => `‘${label}’`).join(' · ')} 요소가 있어요.`
    : genre ? `내가 선호하는 ${genre} 장르에서 고른 작품이에요.`
      : '여러 취향 요소를 함께 비교해 고른 작품이에요.';
  return { version: 1, summary, labels };
}

/** The persisted/public envelope is deliberately small and score-free. */
export function publicDailyMatchReason(reason) {
  if (reason == null) return undefined;
  if (reason.version !== 1 || typeof reason.summary !== 'string' || !reason.summary.trim() || reason.summary.length > 180
    || !Array.isArray(reason.labels) || reason.labels.length > 2
    || reason.labels.some(label => typeof label !== 'string' || !label.trim() || label.length > 40)) throw Error('DAILY_ENGINE_RESPONSE_INVALID');
  return { version: 1, summary: reason.summary, labels: [...new Set(reason.labels)] };
}
