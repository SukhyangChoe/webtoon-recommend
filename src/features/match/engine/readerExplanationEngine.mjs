import { READER_EXPLANATION_VERSION, READER_FEATURE_COPY, READER_BOUNDARY_COPY, READER_SCENE_RULES } from '../config/readerExplanationCopy.mjs';
import { READER_SCENES } from '../config/readerSceneCopy.mjs';

const genreLabels = { fantasy: '판타지', murim: '무협', romance: '로맨스', ropan: '로판', action: '액션', thriller_horror: '스릴러·공포', drama_daily: '드라마·일상', comedy: '코미디', sports: '스포츠' };
const unique = values => [...new Set(values)];
const strings = values => Array.isArray(values) ? values.filter(value => typeof value === 'string') : [];
const knownPositive = values => unique(strings(values).filter(key => Object.hasOwn(READER_FEATURE_COPY, key)));
const knownAvoidance = values => unique(strings(values).filter(key => Object.hasOwn(READER_BOUNDARY_COPY, key)));

/** Never reconstruct direct preferences from recommendation-blended scores. */
function directPreferences(snapshot) {
  if (snapshot.answers && typeof snapshot.answers === 'object' && !Array.isArray(snapshot.answers)) {
    const answers = snapshot.answers;
    const setting = answers.setting?.indifferent ? [] : knownPositive([answers.setting?.primary, ...strings(answers.setting?.selected)]).filter(key => key.startsWith('setting_'));
    const appeal = knownPositive(answers.appeal).filter(key => key.startsWith('appeal_'));
    const character = knownPositive(answers.characterRelationship).filter(key => key.startsWith('character_') || key.startsWith('relationship_'));
    return {
      selected: unique([...appeal, ...character, ...setting]),
      primary: [appeal[0], character[0], setting[0]].filter(Boolean),
      avoidance: knownAvoidance(answers.avoidance),
    };
  }
  // Older snapshots can still use their already-public, explicitly selected labels.
  const labels = unique([...strings(snapshot.wellMatchedLabels), ...(snapshot.wellMatchedDetails ?? []).map(item => item?.value).filter(value => typeof value === 'string')]);
  const selected = Object.entries(READER_FEATURE_COPY).filter(([, [label]]) => labels.includes(label)).map(([key]) => key);
  return {
    selected,
    primary: selected,
    avoidance: Object.entries(READER_BOUNDARY_COPY).filter(([, [label]]) => strings(snapshot.lessMatchedLabels).includes(label)).map(([key]) => key),
  };
}

function chooseRule(preferences) {
  const selected = new Set(preferences.selected), avoidance = new Set(preferences.avoidance);
  const candidates = READER_SCENE_RULES.flatMap((rule, order) => {
    const matched = rule.any.filter(key => selected.has(key));
    const matchedAvoidance = (rule.avoidAny ?? rule.preferAvoidAny ?? []).filter(key => avoidance.has(key));
    if (rule.any.length && !matched.length) return [];
    if (rule.avoidAny?.length && !matchedAvoidance.length) return [];
    const pairMatches = rule.preferAll?.every(key => selected.has(key)) ?? false;
    // Qualitative specificity tiers, NOT a new personality or compatibility score.
    const tier = matched.length && matchedAvoidance.length ? 2 : pairMatches ? 1 : 0;
    const keys = pairMatches ? unique([...matched, ...rule.preferAll]) : matched;
    return [{ rule, matched: keys, matchedAvoidance, order, tier, primaryCount: preferences.primary.filter(key => keys.includes(key)).length }];
  });
  candidates.sort((a, b) => b.tier - a.tier || b.primaryCount - a.primaryCount || b.matched.length - a.matched.length || a.order - b.order);
  return candidates[0] ?? { rule: { key: 'fallback', headline: '재미를 찾는 나만의 장면' }, matched: [], matchedAvoidance: [] };
}

function introductionFor(preferences) {
  const topics = new Set(), sentences = [];
  const topicFor = key => ['appeal_growth_training', 'character_effortful_protagonist'].includes(key) ? 'growth' : ['appeal_emotional_afterglow', 'relationship_healing'].includes(key) ? 'care' : key;
  for (const key of unique([...preferences.primary, ...preferences.selected])) {
    const topic = topicFor(key);
    if (topics.has(topic)) continue;
    topics.add(topic);
    sentences.push(READER_FEATURE_COPY[key][1]);
    if (sentences.length === 2) break;
  }
  return sentences.join(' ') || '지금 별이 모인 장르를 무대로, 일상 속 캐릭터를 가볍게 상상해봤어요.';
}

/** Caller supplies one current, public-safe catalog vector per registered work. */
function recommendationNoteFor(preferences, recommendations, seed) {
  if (!Array.isArray(recommendations) || recommendations.length < 2 || !seed?.positiveFeatureCatalog) return null;
  for (const key of unique([...preferences.primary, ...preferences.selected])) {
    const mapping = seed.positiveFeatureCatalog.find(feature => feature.featureKey === key)?.webtoonFitCompatibility;
    if (!mapping || mapping.mappingType === 'webtoon_match_only' || !mapping.positiveTagKeys?.length) continue;
    const count = recommendations.filter(work => mapping.positiveTagKeys.some(tag => {
      const value = work?.tagScores?.[tag];
      return typeof value === 'number' && Number.isFinite(value) && value >= 2;
    })).length;
    if (count >= 2) return `등록한 추천작들에서도 ‘${READER_FEATURE_COPY[key][0]}’과 연결되는 특징이 보여요. 직접 고른 취향과 만나는 지점이네요.`;
  }
  return null;
}

/** Pure, deterministic editorial selection. No DB/AI calls, writes, randomness or person identifiers. */
export function buildReaderExplanation(snapshot = {}, { recommendations = [], seed } = {}) {
  snapshot = snapshot ?? {};
  const displayGenres = snapshot.displayGenres ?? snapshot.topGenres ?? [];
  const lead = displayGenres.find(genre => typeof genre.stars === 'number' && genre.stars > 0);
  const genreKey = Object.hasOwn(READER_SCENES, lead?.genreKey ?? '') ? lead.genreKey : 'other';
  const preferences = directPreferences(snapshot);
  const chosen = chooseRule(preferences);
  const avoidanceKey = chosen.matchedAvoidance[0] ?? preferences.avoidance[0];
  const basis = [
    ...(genreLabels[genreKey] ? [`별이 가장 많이 모인 장르: ${genreLabels[genreKey]}`] : []),
    ...(chosen.matched.length ? [`직접 고른 취향: ${chosen.matched.map(key => READER_FEATURE_COPY[key][0]).join(' · ')}`] : []),
    ...(avoidanceKey ? [`망설이는 요소: ${READER_BOUNDARY_COPY[avoidanceKey][0]}`] : []),
  ];
  return {
    version: READER_EXPLANATION_VERSION,
    genreKey,
    sceneKey: `${genreKey}.${chosen.rule.key}`,
    headline: chosen.rule.headline,
    introduction: introductionFor(preferences),
    boundary: avoidanceKey ? READER_BOUNDARY_COPY[avoidanceKey][1] : null,
    scene: READER_SCENES[genreKey]?.[chosen.rule.key] ?? '다음 이야기를 고르다 친구와 눈이 마주치면, 서로 다른 표지를 가리키고 웃을 것 같아요. 취향 이야기를 한 편 더 만들어가는 캐릭터예요.',
    recommendationNote: recommendationNoteFor(preferences, recommendations, seed),
    basis,
    disclaimer: '웹툰 취향으로 상상한 재미용 캐릭터예요. 실제 성격을 진단하는 결과는 아니에요.',
  };
}
