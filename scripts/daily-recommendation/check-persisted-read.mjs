// Fresh-process, read-only proof: a stored batch must load without the engine,
// whole-catalog scans, or even permission to perform a cache write.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import ts from 'typescript';
import * as persistence from '../../src/features/match/server/dailyRecommendation/persistentSelection.mjs';
import * as policy from '../../src/features/match/server/dailyRecommendation/policy.mjs';
import * as presentation from '../../src/features/match/config/recommendationPresentation.mjs';
import * as avoidance from '../../src/features/match/engine/avoidanceEngine.mjs';

const sql = postgres(process.env.WEBTOON_MATCH_RUNTIME_DATABASE_URL || process.env.WEBTOON_MATCH_DATABASE_URL,
  { max: 1, prepare: false, ssl: 'require', connect_timeout: 5, onnotice: () => {} });
function load(source, dependencies) {
  const compiledModule = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,
  { module: compiledModule, exports: compiledModule.exports, Map, Error, require: name => {
    if (!(name in dependencies)) throw Error('UNEXPECTED_DEPENDENCY');
    return dependencies[name];
  } });
  return compiledModule.exports;
}
try {
  const seed = JSON.parse(await fs.readFile(new URL('../../src/features/match/data/questionSeed.v0.4.json', import.meta.url), 'utf8'));
  const repositorySource = await fs.readFile(new URL('../../src/features/match/server/dailySelectionRepository.ts', import.meta.url), 'utf8');
  const storeSource = await fs.readFile(new URL('../../src/features/match/server/dailyRecommendationStore.ts', import.meta.url), 'utf8');
  await sql.begin('read only', async tx => {
    const [reader] = await tx`
      select (select s.public_profile_id from public.match_taste_snapshots s where s.profile_id=c.profile_id
        order by s.completed_at desc,s.snapshot_id desc limit 1) as public_profile_id
      from public.match_daily_selections c where selected_items is not null and expires_at>clock_timestamp()
      order by computed_at desc limit 1
    `;
    assert.ok(reader, 'Populate one current daily batch before this read-only probe.');
    let statements = 0;
    const database = new Proxy(tx, { apply(target, thisArg, args) {
      const text = args[0].join('?'); statements++;
      assert.doesNotMatch(text, /\b(insert|update|delete)\b/i);
      assert.doesNotMatch(text, /order by w\.canonical_webtoon_id/i);
      return Reflect.apply(target, thisArg, args);
    } });
    const repository = load(repositorySource, { 'server-only': {}, 'node:crypto': { randomUUID }, './database': { getMatchDatabase: () => database } });
    const store = load(storeSource, { 'server-only': {}, '../data/questionSeed.v0.4.json': seed,
      './database': { getMatchDatabase: () => database }, './dailySelectionRepository': repository,
      './dailyRecommendation/persistentSelection.mjs': persistence, './dailyRecommendation/policy.mjs': policy,
      '../config/recommendationPresentation.mjs': presentation, '../engine/avoidanceEngine.mjs': avoidance,
      './dailyRecommendation/runtime02.mjs': { runtime02Available: async () => { throw Error('ENGINE_MUST_NOT_LOAD'); },
        selectDailyRuntime02: async () => { throw Error('ENGINE_MUST_NOT_RUN'); } } });
    const started = performance.now();
    const picks = await store.getRuntimeDailyTastePicks(reader.public_profile_id);
    assert.equal(picks.mode, 'personalized'); assert.ok(picks.items.length <= 3); assert.equal(statements, 3);
    assert.doesNotMatch(JSON.stringify(picks), /"(?:profileId|answers|personalFit|candidateOverallFit|raw_data|vector)"/i);
    console.log(JSON.stringify({ ok: true, freshProcess: true, engineCalls: 0, wholeCatalogReads: 0,
      writes: 0, statements, items: picks.items.length, elapsedMs: Math.round(performance.now() - started) }));
  });
} catch (error) {
  console.error(JSON.stringify({ ok: false, code: error.code || error.name })); process.exitCode = 1;
} finally { await sql.end({ timeout: 2 }); }
