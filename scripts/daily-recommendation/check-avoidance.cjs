'use strict';
// Actual pinned 02 candidate data. Synthetic UI answers are verification input,
// not persisted user history. The test never imports run.cjs or writes the DB.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { verify } = require('./runtime-contract.cjs');
(async () => {
  const root = process.cwd(), runtime = path.join(root, '.private-daily-recommendations/runtime');
  verify(runtime);
  const engine = path.join(runtime, 'recommendation_engine');
  const context = require(path.join(engine, 'contracts.cjs')).load();
  const seed = JSON.parse(fs.readFileSync(path.join(root, 'src/features/match/data/questionSeed.v0.4.json'), 'utf8'));
  const load = file => import(pathToFileURL(path.join(root, file)).href);
  const { buildDailyRequest } = await load('src/features/match/server/dailyRecommendation/requestAdapter.mjs');
  const { matchedAvoidanceWarnings } = await load('src/features/match/engine/avoidanceEngine.mjs');
  const { withDailyAvoidancePreference } = await load('src/features/match/server/dailyRecommendation/avoidancePreference.mjs');
  const input = { snapshotId: 'verification-only', profileId: 'verification-only', completedAt: '2026-11-05T00:00:00Z', questionSetVersion: seed.questionSetVersion,
    answers: { genre: {fantasy:'high'}, setting: { selected: ['setting_system_dungeon'], primary: 'setting_system_dungeon', indifferent: false }, appeal: ['appeal_growth_training'], characterRelationship: ['character_effortful_protagonist'], avoidance: ['avoid_none'] }, recommendations: [] };
  const req = require(path.join(engine, 'current_intent.cjs')).prepare(buildDailyRequest(input, seed, context).request);
  const pipeline = require(path.join(engine, 'pipeline.cjs')), selector = require(path.join(engine, 'selection.cjs'));
  const baseline = pipeline.run(req, context, []);
  let tested = false;
  for (const feature of seed.avoidanceFeatureCatalog) {
    const reader = { answers: { avoidance: [feature.featureKey] } };
    const matches = candidate => matchedAvoidanceWarnings(reader, context.byId.get(candidate.canonicalWebtoonId).recommendation, seed).length > 0;
    const clean = baseline.candidates.filter(candidate => candidate.axisFilter.hardAllowed && !matches(candidate));
    const avoided = baseline.candidates.filter(candidate => candidate.axisFilter.hardAllowed && matches(candidate));
    if (!baseline.recommendations.some(matches) || clean.length < 3 || !avoided.length) continue;
    const before = JSON.stringify(baseline.candidates.map(candidate => [candidate.canonicalWebtoonId, candidate.candidateOverallFit]));
    const chosen = withDailyAvoidancePreference(selector, context, reader, seed, () => pipeline.run(req, context, []));
    assert.equal(chosen.recommendations.length, 3);
    assert.ok(chosen.recommendations.every(candidate => !matches(candidate)), 'available unmatched alternatives replace matched works');
    assert.ok(chosen.recommendations.every(candidate => chosen.gates[candidate.canonicalWebtoonId].eligible));
    const evidence = baseline.profile.modes.map(mode => mode.evidence);
    const smallPool = [clean[0], clean[1], avoided[0]];
    const scarce = withDailyAvoidancePreference(selector, context, reader, seed, () => selector.select(smallPool, evidence));
    assert.equal(scarce.ids.length, 3);assert.ok(scarce.ids.includes(avoided[0].canonicalWebtoonId), 'scarcity can retain a matched work, for strong warning display');
    const fixed = withDailyAvoidancePreference(selector, context, reader, seed, () => selector.select([...clean.slice(0, 4), avoided[0]], evidence, { prefix: [avoided[0]] }));
    assert.equal(fixed.ids[0], avoided[0].canonicalWebtoonId, 'original mandatory core prefix survives');
    assert.equal(JSON.stringify(baseline.candidates.map(candidate => [candidate.canonicalWebtoonId, candidate.candidateOverallFit])), before);
    tested = true;
    break;
  }
  assert.ok(tested, 'at least one real DB avoidance/alternative case must have been exercised');
  console.log(JSON.stringify({ ok: true, checks: ['actual 02 candidate pool', 'unmatched alternatives first', 'original hard gates', 'scarcity fallback', 'mandatory prefix kept', 'raw scores unchanged'], writes: 0 }));
})().catch(error => { console.error({ name: error.name, message: error.message }); process.exitCode = 1; });
