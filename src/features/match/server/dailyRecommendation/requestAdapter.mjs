import { getPrimarySelectionWeights, getSettingWeights } from '../../engine/selectionPolicy.mjs';
import { DAILY_INPUT_VERSION } from './policy.mjs';
import { readerAvoidanceKeys } from '../../engine/avoidanceEngine.mjs';
import { buildTasteSnapshot } from '../../engine/resultEngine.mjs';
import { applyRecommendationTaste } from '../../engine/recommendationTasteEngine.mjs';

/**
 * Structured UI evidence, NOT fabricated user speech. Use original answers and
 * explicit '내 추천작' registrations, never blend an already-blended vector,
 * clicks, exposure, likes on someone else's recommendation, or sample histories.
 * Compatibility mappings come from the existing question seed. Non-direct
 * mappings remain partial/related; a quiz hesitation is never a mandatory floor.
 */
export function buildDailyRequest(input, questionSeed, context) {
  if (!input?.snapshotId || !input.profileId || !input.completedAt || !input.answers) throw Error('DAILY_ORIGINAL_INPUT_REQUIRED');
  if (input.questionSetVersion !== questionSeed.questionSetVersion) throw Error('DAILY_QUESTION_VERSION_REVIEW_REQUIRED');
  const known = Object.fromEntries(['story', 'content', 'type', 'visual'].map(axis => [axis, new Set()]));
  const fields = { story: 'tagScores', content: 'contentAxisScores', type: 'typeScores', visual: 'artStyleScores' };
  for (const row of context.rows) for (const [axis, field] of Object.entries(fields)) {
    const value = row.recommendation?.[field] || {};
    for (const key of axis === 'type' ? Object.values(value).flatMap(scores => Object.keys(scores)) : Object.keys(value)) known[axis].add(key);
  }
  const lines = ['웹툰핏 실제 선택 기록 (구조화된 UI 입력; 자유 발화나 감상 이력으로 위장하지 않음)'];
  const requirements = [], unmapped = [], provenance = [];
  const groups = [
    ['setting', input.answers.setting?.indifferent ? {} : getSettingWeights(input.answers.setting || {})],
    ['appeal', getPrimarySelectionWeights(input.answers.appeal)],
    ['character_relationship', getPrimarySelectionWeights(input.answers.characterRelationship)],
  ];
  for (const [group, weights] of groups) for (const [featureKey, weight] of Object.entries(weights)) {
    const feature = questionSeed.positiveFeatureCatalog.find(item => item.featureKey === featureKey && item.group === group);
    if (!feature) throw Error('DAILY_UNKNOWN_TEST_CHOICE');
    const compatibility = feature.webtoonFitCompatibility || {};
    const primary = weight === Math.max(...Object.values(weights));
    const quote = `테스트 선택: ${feature.displayLabel}${primary ? ' [우선 선택]' : ''}`;
    lines.push(quote);
    const mappings = [];
    for (const [property, axis] of [['positiveTagKeys', 'story'], ['contentAxisKeys', 'content'], ['typeHints', 'type']]) {
      for (const key of compatibility[property] || []) {
        if (!known[axis].has(key)) { unmapped.push({ featureKey, axis, key }); continue; }
        // Only mappings explicitly marked direct in the seed are exact.
        const relation = compatibility.mappingType === 'direct' && property !== 'typeHints' ? 'exact' : 'related';
        mappings.push({ axis, key, score: 3, relation, ...(relation === 'exact' ? {} : { limitation: '질문 seed의 복합·부분·힌트 매핑. 선택 문구 전체의 충족을 뜻하지 않음.' }) });
      }
    }
    requirements.push({ id: featureKey, canonicalKey: featureKey, quote, importance: primary ? 'HIGH' : 'NORMAL', mappings });
    provenance.push({ featureKey, mappingType: compatibility.mappingType, primary, origin: 'TEST_SELECTION' });
  }
  const registrations = [...input.recommendations || []].sort((a, b) => a.canonicalWebtoonId.localeCompare(b.canonicalWebtoonId));
  if (new Set(registrations.map(item => item.canonicalWebtoonId)).size !== registrations.length) throw Error('DAILY_DUPLICATE_REGISTRATION');
  const events = registrations.map(item => {
    const row = context.byId.get(item.canonicalWebtoonId);
    if (!row || row.title !== item.title || row.platform !== item.platform) throw Error('DAILY_REFERENCE_IDENTITY_REVIEW_REQUIRED');
    if (!Number.isFinite(Date.parse(item.createdAt))) throw Error('DAILY_REGISTRATION_TIME_REQUIRED');
    const quote = `내 추천작 등록: ${item.title} [${item.canonicalWebtoonId}]`;
    lines.push(quote);
    return { eventId: `registration:${item.canonicalWebtoonId}:${item.createdAt}`, workId: item.canonicalWebtoonId,
      at: item.createdAt, reaction: 'positive', quote, contentForm: 'webtoon', evidenceOrigin: 'EXPLICIT_RECOMMENDATION_REGISTRATION' };
  });
  // Reuse the result page's exact nine-genre projection and 20:80 test/work
  // blend, once. Rounded display stars are not numeric recommendation input.
  const original = input.snapshotData || buildTasteSnapshot({ seed: questionSeed, answers: input.answers,
    profileId: input.profileId, snapshotId: input.snapshotId, completedAt: input.completedAt });
  const vectors = registrations.filter(item => item.affectsTaste !== false)
    .map(item => item.recommendation || context.byId.get(item.canonicalWebtoonId)?.recommendation).filter(Boolean);
  const current = applyRecommendationTaste(original, vectors, questionSeed);
  const genrePreference = current.tasteVector.genreScores;
  if (Object.values(genrePreference).some(value => value > 0)) {
    const quote = '현재 취향 결과의 9개 장르 선호 (원본 테스트·대결 답변 및 현재 내 추천작 반영)';
    lines.push(quote);
    // One preference group, not nine independent votes or a hard genre gate.
    requirements.push({ id: 'webtoonfit_current_genres', canonicalKey: 'webtoonfit_current_genres', quote,
      importance: 'HIGH', mappings: [], serviceGenrePreference: genrePreference });
  }
  const sourceText = lines.join('\n');
  const req = {
    schemaVersion: 'webtoon_fit_request_v1', userId: input.profileId, sourceText,
    priorHistoryStatus: 'UNKNOWN', outputLanguage: 'ko', targetMarket: 'KR', ageEligibility: 'UNKNOWN',
    referenceWorkIds: events.map(event => event.workId), reactionEvents: events,
    directPreferences: [], directAvoidances: [], knownExcludedWorkIds: events.map(event => event.workId),
    relationEnabled: true, applyQualityShadow: false,
  };
  // Do not turn broad genre cards/duels into every example content tag, or turn
  // '망설이는 요소' into burden=3 hard rejection. It is handled by the approved
  // daily avoidance-first selector policy, with a strong warning on fallback.
  if (requirements.length) req.currentIntent = { scope: 'current_request', quote: sourceText, requirements };
  else if (events.length > 1) {
    req.activeModeResolution = 'all_supported_modes';
    req.activeModeEvidence = { quote: lines[0] };
  }
  return { request: req, audit: { status: 'ACTIVE', version: DAILY_INPUT_VERSION, provenance, unmapped, genrePreference,
    avoidanceKeys: readerAvoidanceKeys({ answers: input.answers }, questionSeed),
    limitations: ['Genre is a soft preference group, not a hard genre quota; avoidance is selection preference, not a display-score penalty.',
      'Registered recommendations supply ordinary positive evidence, not strong-positive or a claim that a work was read.'] } };
}
