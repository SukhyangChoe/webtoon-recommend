import { buildTasteSnapshot } from '../../engine/resultEngine.mjs';
import { applyRecommendationTaste } from '../../engine/recommendationTasteEngine.mjs';
import { sharedFitReasons } from '../../config/workDetailPresentation.mjs';
import { recommendationGenreLabel } from '../../config/recommendationPresentation.mjs';
import { recommendationToTasteVector } from '../../engine/tasteVectorEngine.mjs';
import { calculateRecommendationFit } from '../../engine/recommendationFitEngine.mjs';

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
  const referenceWork = closestReferenceWork(input.recommendations, work, seed, tagLabels, contentLabels);
  const summary = referenceWork
    ? `내 추천작 ‘${referenceWork.title}’${referenceWork.labels.length ? `와 ${referenceWork.labels.map(label=>`‘${label}’`).join(' · ')} 요소가 닮았어요.` : '와 이야기·소재·작화의 구성이 가장 가까워요.'}`
    : labels.length
    ? `내 취향과 겹치는 ${labels.map(label => `‘${label}’`).join(' · ')} 요소가 있어요.`
    : genre ? `내가 선호하는 ${genre} 장르에서 고른 작품이에요.`
      : '여러 취향 요소를 함께 비교해 고른 작품이에요.';
  return { version: 2, summary, labels, ...(referenceWork ? { referenceWork } : {}) };
}

function closestReferenceWork(references, work, seed, tagLabels, contentLabels) {
  return (references ?? []).flatMap(reference=>{
    if(reference.affectsTaste===false || !reference.recommendation || typeof reference.canonicalWebtoonId!=='string'
      || reference.canonicalWebtoonId===work.canonicalWebtoonId || typeof reference.title!=='string' || !reference.title.trim() || reference.title.length>240)return [];
    const vector=recommendationToTasteVector(reference.recommendation,seed);
    const fit=calculateRecommendationFit(vector,work.recommendation,seed);
    if(fit.comparableAxes.length<2 || fit.score<=0)return [];
    return [{canonicalWebtoonId:reference.canonicalWebtoonId,title:reference.title,
      labels:sharedFitReasons(vector,work.recommendation,tagLabels,contentLabels).map(item=>item.label),score:fit.score}];
  }).sort((a,b)=>b.score-a.score||a.canonicalWebtoonId.localeCompare(b.canonicalWebtoonId))
    .slice(0,1).map(({canonicalWebtoonId,title,labels})=>({canonicalWebtoonId,title,labels}))[0];
}

/** The persisted/public envelope is deliberately small and score-free. */
export function publicDailyMatchReason(reason) {
  if (reason == null) return undefined;
  if (![1,2].includes(reason.version) || typeof reason.summary !== 'string' || !reason.summary.trim() || reason.summary.length > (reason.version===1?180:360)
    || !Array.isArray(reason.labels) || reason.labels.length > 2
    || reason.labels.some(label => typeof label !== 'string' || !label.trim() || label.length > 40)) throw Error('DAILY_ENGINE_RESPONSE_INVALID');
  let referenceWork;
  if(reason.version===2 && reason.referenceWork!=null){
    const ref=reason.referenceWork;
    if(typeof ref.canonicalWebtoonId!=='string'||!/^[-\w]{1,100}$/.test(ref.canonicalWebtoonId)||typeof ref.title!=='string'||!ref.title.trim()||ref.title.length>240
      ||!Array.isArray(ref.labels)||ref.labels.length>2||ref.labels.some(label=>typeof label!=='string'||!label.trim()||label.length>40))throw Error('DAILY_ENGINE_RESPONSE_INVALID');
    referenceWork={canonicalWebtoonId:ref.canonicalWebtoonId,title:ref.title,labels:[...new Set(ref.labels)]};
  }
  return { version: reason.version, summary: reason.summary, labels: [...new Set(reason.labels)], ...(referenceWork?{referenceWork}:{}) };
}
