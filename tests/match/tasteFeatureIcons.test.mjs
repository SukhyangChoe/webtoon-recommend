import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TASTE_FEATURE_ICONS, tasteFeatureIconFor, resultTitlePhrases } from '../../src/features/match/config/tasteFeatureIcons.mjs';
import { PERSONA_GENRE_KEYS } from '../../src/features/match/config/personaImages.mjs';
import { personalArchetypeFor } from '../../src/features/match/share/shareArchetypes.mjs';

test('all 30 taste values have distinct, explicitly drawn narrative icons', () => {
  const seed = JSON.parse(readFileSync(new URL('../../src/features/match/data/questionSeed.v0.4.json', import.meta.url), 'utf8'));
  const icons = seed.positiveFeatureCatalog.map(feature => {
    assert.ok(Object.hasOwn(TASTE_FEATURE_ICONS, feature.publicShortLabel), feature.publicShortLabel);
    return tasteFeatureIconFor(feature.publicShortLabel, '취향');
  });
  assert.equal(icons.length, 30);
  assert.equal(new Set(icons.map(icon => icon.key)).size, 30);
  assert.equal(new Set(icons.map(icon => icon.path)).size, 30);
  icons.forEach(icon => assert.match(icon.path, /^M|^m/));
  assert.equal(tasteFeatureIconFor('성장', '전개').key, 'growth_steps');
  assert.equal(tasteFeatureIconFor('노력형', '관계').key, 'training_day');
  assert.equal(tasteFeatureIconFor('회귀', '설정').key, 'returning_time');
});

test('unknown historical labels get a meaningful category illustration', () => {
  assert.equal(tasteFeatureIconFor('이전 설정', '설정').key, 'story_setting');
  assert.equal(tasteFeatureIconFor('이전 전개', '전개').key, 'story_progression');
  assert.equal(tasteFeatureIconFor('이전 관계', '관계').key, 'character_relationship');
});

test('every result title preserves its wording without single-character phrases', () => {
  for (const genre of [...PERSONA_GENRE_KEYS, 'unknown']) {
    const title = personalArchetypeFor(genre).name;
    const phrases = resultTitlePhrases(title);
    assert.equal(phrases.join(' '), title);
    assert.ok(phrases.every(phrase => Array.from(phrase.replace(/\s/g, '')).length > 1), title);
  }
  assert.deepEqual(resultTitlePhrases('회귀 버튼 단골손님'), ['회귀', '버튼', '단골손님']);
  assert.deepEqual(resultTitlePhrases('다음 화 버튼 수호자'), ['다음 화', '버튼', '수호자']);
});
