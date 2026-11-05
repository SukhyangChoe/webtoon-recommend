'use strict';
// No run.cjs/execute(): they can load native sample/user histories and Python.
// Only the approved numerical pipeline, supplied structured evidence, and pinned
// contracts are used here. No writes, public-copy generation, or CGE exposure.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { verify, VERSION } = require('./runtime-contract.cjs');
let bytes = 0, chunks = [];
process.stdin.on('data', chunk => {
  bytes += chunk.length;
  if (bytes > 512 * 1024) process.exit(2);
  chunks.push(chunk);
});
process.stdin.on('end', async () => {
  try {
    const runtime = path.resolve(process.argv[2]);
    verify(runtime);
    const engine = path.join(runtime, 'recommendation_engine');
    const context = require(path.join(engine, 'contracts.cjs')).load();
    const adapterUrl = pathToFileURL(path.resolve(process.argv[3]));
    const { buildDailyRequest } = await import(adapterUrl.href);
    const { withDailyAvoidancePreference } = await import(new URL('avoidancePreference.mjs', adapterUrl).href);
    const { withDailyGenrePreference } = await import(new URL('genrePreference.mjs', adapterUrl).href);
    const { input, questionSeed } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    chunks = [];
    const { request, audit } = buildDailyRequest(input, questionSeed, context);
    const prepared = require(path.join(engine, 'current_intent.cjs')).prepare(request);
    // Live catalog availability is an additional gate BEFORE retrieval/selection,
    // so removed works don't consume the three slots and suppress alternatives.
    if (input.liveCatalog) {
      const live = new Map(input.liveCatalog.map(item => [item.canonicalWebtoonId, item]));
      prepared.review = { candidates: Object.fromEntries(context.rows.flatMap(row => {
        const current = live.get(row.canonicalWebtoonId);
        return current && current.title === row.title && current.platform === row.platform ? [] :
          [[row.canonicalWebtoonId, { public: 'REJECT', source: 'live-service-catalog',
            evidence: 'Not available with verified canonical identity in current service catalog' }]];
      })) };
    }
    const selector = require(path.join(engine, 'selection.cjs'));
    const result = withDailyGenrePreference(require(path.join(engine, 'explicit_requirements.cjs')), questionSeed,
      () => withDailyAvoidancePreference(selector, context, { answers: input.answers }, questionSeed,
        () => require(path.join(engine, 'pipeline.cjs')).run(prepared, context, [])));
    const jointReview = require(path.join(engine, 'joint_intent.cjs')).review(result, prepared);
    if (jointReview?.status === 'NEEDS_SEMANTIC_EVIDENCE_REVIEW') throw Error('DAILY_SEMANTIC_REVIEW_REQUIRED');
    const selected = result.recommendations || [];
    if (selected.length > 3 || new Set(selected.map(item => item.canonicalWebtoonId)).size !== selected.length) throw Error('DAILY_INVALID_SELECTION');
    for (const item of selected) if (!result.gates[item.canonicalWebtoonId]?.eligible || !result.sets.C.includes(item.canonicalWebtoonId)) throw Error('DAILY_UNVERIFIED_SELECTION');
    // Do not emit PersonalFit, set utility, vectors, raw DB rows, full source text,
    // people's identities, histories, or Threads copies across this boundary.
    process.stdout.write(JSON.stringify({ version: VERSION, status: result.status, seedSha256: context.seed.sha256,
      items: selected.map(item => ({ canonicalWebtoonId: item.canonicalWebtoonId, title: item.work.title, platform: item.work.platform })),
      diagnostics: { unmappedCount: audit.unmapped.length, deferredInputMapping: false,
        avoidancePreferenceApplied: true, warnings: result.warnings || [] } }));
  } catch (error) {
    // An upstream error can contain private source text or local paths.
    process.stderr.write(/^[A-Z_]+$/.test(error.message) ? error.message : 'DAILY_RUNTIME_SELECTION_FAILED');
    process.exitCode = 1;
  }
});
