import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildReaderExplanation } from '../../src/features/match/engine/readerExplanationEngine.mjs';
import { READER_SCENES } from '../../src/features/match/config/readerSceneCopy.mjs';
import { READER_FEATURE_COPY, READER_BOUNDARY_COPY, READER_SCENE_RULES, READER_EXPLANATION_VERSION } from '../../src/features/match/config/readerExplanationCopy.mjs';
import { buildTasteSnapshot, toPublicTasteResult } from '../../src/features/match/engine/resultEngine.mjs';
import { applyRecommendationTaste } from '../../src/features/match/engine/recommendationTasteEngine.mjs';

const seed = JSON.parse(readFileSync(new URL('../../src/features/match/data/questionSeed.v0.4.json', import.meta.url), 'utf8'));
const genres = seed.publicGenrePolicy.publicGenres.map(genre => genre.genreKey);
function snapshot(genreKey = 'murim', positive = [], avoidance = []) {
  const setting = positive.filter(key => key.startsWith('setting_'));
  return {
    displayGenres: [{ genreKey, displayLabel: genreKey, stars: 18 }],
    answers: {
      setting: { selected: setting, primary: setting[0] ?? null, indifferent: !setting.length },
      appeal: positive.filter(key => key.startsWith('appeal_')),
      characterRelationship: positive.filter(key => key.startsWith('character_') || key.startsWith('relationship_')),
      avoidance,
    },
  };
}
const ruleInputs = {
  growth: [['appeal_growth_training', 'character_effortful_protagonist'], []],
  strategy: [['appeal_strategy_powerplay', 'character_hidden_power'], []],
  slow_chemistry: [['relationship_slow_build'], ['avoid_relationship_conflict']],
  mystery_clear: [['appeal_world_mystery'], ['avoid_complexity']],
  payoff: [['appeal_revenge_justice'], ['avoid_frustrating_protagonist']],
  reveal: [['appeal_twist_reveal'], []],
  bond: [['relationship_bond'], []],
  chemistry: [['relationship_direct_chemistry'], []],
  world: [['setting_system_dungeon'], []],
  comedy: [['appeal_humor_banter'], []],
  visual: [[], ['avoid_visual_style_barrier']],
  fallback: [[], []],
};

test('nine genres each have twelve complete, distinct scenes and every scene is reachable', () => {
  assert.deepEqual(Object.keys(READER_SCENES).sort(), [...genres].sort());
  const all = [];
  for (const genre of genres) {
    assert.deepEqual(Object.keys(READER_SCENES[genre]).sort(), [...READER_SCENE_RULES.map(rule => rule.key), 'fallback'].sort());
    for (const [rule, [positive, avoidance]] of Object.entries(ruleInputs)) {
      const result = buildReaderExplanation(snapshot(genre, positive, avoidance));
      assert.equal(result.sceneKey, `${genre}.${rule}`);
      assert.equal(result.scene, READER_SCENES[genre][rule]);
      assert.ok(result.scene.length >= 60 && result.scene.length <= 190, `${result.sceneKey}: intentional full-sentence copy`);
      all.push(result.scene);
    }
  }
  assert.equal(all.length, 108);
  assert.equal(new Set(all).size, 108, 'no genre-prefix swapping or duplicated complete scenes');
});

test('copy metadata only names real test features and never treats avoid_none as a negative', () => {
  assert.deepEqual(Object.keys(READER_FEATURE_COPY).sort(), seed.positiveFeatureCatalog.map(item => item.featureKey).sort());
  assert.deepEqual(Object.keys(READER_BOUNDARY_COPY).sort(), seed.avoidanceFeatureCatalog.filter(item => item.featureKey !== 'avoid_none').map(item => item.featureKey).sort());
  for (const [key, [label]] of Object.entries(READER_FEATURE_COPY)) assert.equal(label, seed.positiveFeatureCatalog.find(item => item.featureKey === key).publicShortLabel);
  for (const [key, [label]] of Object.entries(READER_BOUNDARY_COPY)) assert.equal(label, seed.avoidanceFeatureCatalog.find(item => item.featureKey === key).publicShortLabel);
  assert.equal(buildReaderExplanation(snapshot('murim', [], ['avoid_none'])).boundary, null);
});

test('all 2,970 single-feature / avoidance / genre combinations produce a complete deterministic result', () => {
  let count = 0;
  for (const genre of genres) for (const positive of Object.keys(READER_FEATURE_COPY)) for (const negative of [null, ...Object.keys(READER_BOUNDARY_COPY)]) {
    const input = snapshot(genre, [positive], negative ? [negative] : []);
    const result = buildReaderExplanation(input);
    assert.equal(result.version, READER_EXPLANATION_VERSION);
    assert.equal(result.genreKey, genre);
    assert.notEqual(result.sceneKey, `${genre}.fallback`, 'every known positive choice has an eligible motif, even without avoidance');
    assert.ok(result.scene && result.headline && result.introduction && result.disclaimer);
    assert.ok(!JSON.stringify(result).includes('undefined'));
    assert.deepEqual(result, buildReaderExplanation(structuredClone(input)));
    count++;
  }
  assert.equal(count, 2970);
});

test('representative choices win otherwise broad ties; pair and positive/avoidance conditions are meaningful', () => {
  const primary = snapshot('comedy', ['appeal_humor_banter', 'appeal_twist_reveal']);
  assert.equal(buildReaderExplanation(primary).sceneKey, 'comedy.comedy');
  const pair = snapshot('murim', ['appeal_strategy_powerplay', 'character_hidden_power']);
  assert.equal(buildReaderExplanation(pair).sceneKey, 'murim.strategy');
  assert.equal(buildReaderExplanation(snapshot('action', ['character_overpowered'])).sceneKey, 'action.payoff', 'clear payoff does not require inventing an avoidance response');
  assert.equal(buildReaderExplanation(snapshot('romance', ['relationship_slow_build'])).sceneKey, 'romance.chemistry');
  assert.equal(buildReaderExplanation(snapshot('romance', ['relationship_slow_build'], ['avoid_relationship_conflict'])).sceneKey, 'romance.slow_chemistry');
  assert.equal(buildReaderExplanation(snapshot('fantasy', ['appeal_world_mystery'])).sceneKey, 'fantasy.world');
  const clear = buildReaderExplanation(snapshot('fantasy', ['appeal_world_mystery'], ['avoid_complexity']));
  assert.equal(clear.sceneKey, 'fantasy.mystery_clear');
  assert.match(clear.boundary, /자연스럽게 이해/);
});

test('no invented opposites, hidden-positive inference or unavailable-setting inference', () => {
  const input = snapshot('murim');
  input.positiveTasteScores = { appeal: { appeal_strategy_powerplay: 99 } };
  input.tasteVector = { tagScores: { strategy: 99 } };
  input.wellMatchedLabels = ['전략'];
  input.answers.setting = { selected: ['setting_regression_rebirth'], primary: 'setting_regression_rebirth', indifferent: true };
  const result = buildReaderExplanation(input);
  assert.equal(result.sceneKey, 'murim.fallback');
  assert.equal(result.boundary, null);
  assert.equal(result.basis.filter(item => item.includes('직접 고른')).length, 0);
  assert.equal(result.recommendationNote, null);
});

test('legacy public labels work without interpreting blended scores; unknown genres stay neutral', () => {
  const legacy = { displayGenres: [{ genreKey: 'romance', stars: 6 }], wellMatchedLabels: ['감정선', '쌓이는 관계'], lessMatchedLabels: ['감정 소모'] };
  assert.equal(buildReaderExplanation(legacy).sceneKey, 'romance.slow_chemistry');
  for (const input of [undefined, null, {}, { displayGenres: [{ genreKey: 'unknown', stars: 18 }] }, { displayGenres: [{ genreKey: 'murim', stars: 0 }] }]) {
    const result = buildReaderExplanation(input);
    assert.equal(result.genreKey, 'other');
    assert.equal(result.sceneKey, 'other.fallback');
    assert.ok(result.scene);
  }
});

test('copy is independent of identity/time, input is not mutated, and no private fields escape', () => {
  const input = snapshot('murim', ['appeal_growth_training', 'character_effortful_protagonist'], ['avoid_slow_without_payoff']);
  const before = structuredClone(input);
  const result = buildReaderExplanation({ ...input, anonymousId: 'secret-viewer', profileId: 'secret-profile', completedAt: 'old', nickname: '<script>never</script>' });
  assert.deepEqual(result, buildReaderExplanation({ ...input, anonymousId: 'different', completedAt: 'new' }));
  assert.deepEqual(input, before);
  for (const value of ['secret-viewer', 'secret-profile', '<script>', 'tasteVector', 'positiveTasteScores', 'anonymousId', 'answers']) assert.ok(!JSON.stringify(result).includes(value));
});

test('recommendation note needs at least two strong mapped works and only confirms direct choices', () => {
  const input = snapshot('murim', ['appeal_growth_training']);
  const tag = seed.positiveFeatureCatalog.find(item => item.featureKey === 'appeal_growth_training').webtoonFitCompatibility.positiveTagKeys[0];
  const work = value => ({ tagScores: { [tag]: value } });
  assert.equal(buildReaderExplanation(input, { recommendations: [work(3)], seed }).recommendationNote, null);
  assert.equal(buildReaderExplanation(input, { recommendations: [work(3), work(.5)], seed }).recommendationNote, null);
  const confirmed = buildReaderExplanation(input, { recommendations: [work(3), work(2.5)], seed });
  assert.match(confirmed.recommendationNote, /성장/);
  assert.equal(confirmed.scene, buildReaderExplanation(input).scene, 'catalog inference does not override the direct scene evidence');
  assert.equal(buildReaderExplanation(snapshot('murim'), { recommendations: [work(3), work(3)], seed }).recommendationNote, null);
  assert.equal(buildReaderExplanation(input, { recommendations: [work(NaN), work(Infinity)], seed }).recommendationNote, null);
});

test('public results include fresh explanation; scoring, stars and source snapshot are unchanged', () => {
  const input = snapshot('murim', ['appeal_growth_training', 'character_effortful_protagonist'], ['avoid_frustrating_protagonist']);
  const original = buildTasteSnapshot({ seed, answers: { ...input.answers, genre: { murim: 'high' } }, profileId: 'private', publicProfileId: 'public', anonymousId: 'secret' });
  const recommendations = [{ genreScores: { romance: 3 } }];
  const blended = applyRecommendationTaste(original, recommendations, seed);
  const before = structuredClone(blended);
  const result = toPublicTasteResult(blended, { recommendations, seed });
  assert.equal(result.readerExplanation.genreKey, result.topGenres[0].genreKey, 'genre reflects the already-blended displayed result');
  assert.equal(result.readerExplanation.sceneKey, 'romance.growth', 'direct growth/effort choices are retained across the genre change');
  assert.equal(Object.values(result.genreStars).reduce((a, b) => a + b, 0), 18);
  assert.deepEqual(blended, before);
  for (const key of ['answers', 'positiveTasteScores', 'tasteVector', 'anonymousId', 'rawGenreAffinity']) assert.equal(key in result, false);
});
