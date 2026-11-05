'use strict';
// Numerical equivalence against the pinned private engine. Optional stdin is
// private real input for a read-only replay; never persisted or printed.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { verify } = require('./runtime-contract.cjs');
const root = process.cwd(), runtime = path.join(root, '.private-daily-recommendations/runtime');
const load = file => import(pathToFileURL(path.join(root, file)).href);
async function check(payload) {
  verify(runtime);
  const engine = path.join(runtime, 'recommendation_engine');
  const context = require(path.join(engine, 'contracts.cjs')).load();
  const questionSeed = JSON.parse(fs.readFileSync(path.join(root, 'src/features/match/data/questionSeed.v0.4.json'), 'utf8'));
  const input = payload?.input || { snapshotId: 'verification-only', profileId: 'verification-only', completedAt: '2026-11-05T00:00:00Z', questionSetVersion: questionSeed.questionSetVersion,
    answers: { genre: { fantasy: 'high', murim: 'high' }, setting: { selected: ['setting_system_dungeon'], primary: 'setting_system_dungeon' }, appeal: ['appeal_growth_training','appeal_action_catharsis'], characterRelationship: ['character_effortful_protagonist'], avoidance: ['avoid_repetition'] },
    recommendations: context.rows.filter(row => row.sourceDb === 'precision' && row.recommendationEligible).slice(0, 8).map(row => ({ canonicalWebtoonId: row.canonicalWebtoonId, title: row.title, platform: row.platform, createdAt: '2026-11-04T00:00:00Z' })) };
  const { buildDailyRequest } = await load('src/features/match/server/dailyRecommendation/requestAdapter.mjs');
  const { withDailyGenrePreference } = await load('src/features/match/server/dailyRecommendation/genrePreference.mjs');
  const { withDailyAvoidancePreference } = await load('src/features/match/server/dailyRecommendation/avoidancePreference.mjs');
  const { withDailyRelationIndex } = await load('src/features/match/server/dailyRecommendation/performance.mjs');
  const req = buildDailyRequest(input, questionSeed, context).request;
  if (input.liveCatalog) {
    const live = new Map(input.liveCatalog.map(row => [row.canonicalWebtoonId, row]));
    req.review = { candidates: Object.fromEntries(context.rows.flatMap(row => {
      const current = live.get(row.canonicalWebtoonId);
      return current && current.title === row.title && current.platform === row.platform ? [] :
        [[row.canonicalWebtoonId, { public: 'REJECT', source: 'live-service-catalog', evidence: 'Current canonical identity unavailable' }]];
    })) };
  }
  const semantic = require(path.join(engine, 'vendor/reference_relation_v021/build/content_relations_v01/semantic.cjs'));
  const relations = require(path.join(engine, 'vendor/reference_relation_v021/build/score_relations_v021/engine.cjs'));
  const run = () => withDailyGenrePreference(require(path.join(engine, 'explicit_requirements.cjs')), questionSeed,
    () => withDailyAvoidancePreference(require(path.join(engine, 'selection.cjs')), context, { answers: input.answers }, questionSeed,
      () => require(path.join(engine, 'pipeline.cjs')).run(req, context, [])));
  const start = performance.now(), before = run(), baselineMs = performance.now() - start;
  const signature = result => ({ status: result.status, sets: result.sets, gates: result.gates, coreTrace: result.coreTrace,
    utility: Object.fromEntries(Object.entries(result.selection).map(([key, value]) => [key, value?.setUtility])),
    candidates: result.candidates.map(c => ({ id: c.canonicalWebtoonId, fit: c.candidateOverallFit, modes: c.perModePersonalFit,
      axisFilter: c.axisFilter, requirements: c.jointIntentTrace?.unifiedRequirementContributions })) });
  const expected = signature(before), cases = [];
  for (const axis of ['story','content','type','visual']) for (const enabled of [false, true]) for (const scale of [0,1,1.5]) {
    const catalog = relations.catalog.axes[axis], keys = catalog.nodes.slice(0, 8);
    const a = Object.fromEntries(keys.map((key,i) => [key, i % 4]));
    const b = Object.fromEntries(keys.toReversed ? keys.toReversed().map((key,i) => [key, i % 4]) : [...keys].reverse().map((key,i) => [key, i % 4]));
    cases.push({ a, b, options: { enabled, scale, relations: catalog }, expected: semantic.fit(a, b, { enabled, scale, relations: catalog }) });
  }
  const fastStart = performance.now();
  const after = withDailyRelationIndex(semantic, Object.values(relations.catalog.axes), () => {
    for (const item of cases) assert.deepEqual(semantic.fit(item.a,item.b,item.options),item.expected);
    assert.throws(() => semantic.fit({ broken:4 },{}),/Invalid centrality/);
    assert.throws(() => semantic.fit({}, {}, { scale:-1 }),/Invalid scale/);
    return run();
  });
  assert.deepEqual(signature(after), expected);
  assert.deepEqual(after.recommendations.map(c => c.canonicalWebtoonId), before.recommendations.map(c => c.canonicalWebtoonId));
  console.log(JSON.stringify({ items: after.recommendations.map(c => ({ canonicalWebtoonId:c.canonicalWebtoonId,title:c.work.title,platform:c.work.platform })),
    report: { ok:true, check:'runtime-performance-equivalence', registeredWorks:input.recommendations.length, candidateCount:after.candidates.length,
      vectorCases:cases.length, allCandidateScoresAndGatesIdentical:true, allSelectionSetsIdentical:true,
      baselineMs:Math.round(baselineMs), optimizedMs:Math.round(performance.now()-fastStart), writes:0 } }));
}
if(process.argv.includes('--stdin')) {
  let bytes='';process.stdin.on('data',chunk=>{bytes+=chunk;if(Buffer.byteLength(bytes)>1024*1024)process.exit(2);});
  process.stdin.on('end',()=>check(JSON.parse(bytes)).catch(()=>{console.error('PERFORMANCE_EQUIVALENCE_FAILED');process.exitCode=1;}));
} else check().catch(()=>{console.error('PERFORMANCE_EQUIVALENCE_FAILED');process.exitCode=1;});
