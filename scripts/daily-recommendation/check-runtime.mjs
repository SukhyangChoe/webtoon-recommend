import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { runRuntime02, runtime02Available } from '../../src/features/match/server/dailyRecommendation/runtime02.mjs';
if (!await runtime02Available()) throw Error('Install the verified 02 runtime before running this check.');
const questionSeed = JSON.parse(await fs.readFile(new URL('../../src/features/match/data/questionSeed.v0.4.json', import.meta.url), 'utf8'));
// Synthetic UI evidence, not an actual user's history. Never persisted/exposed.
const input = { snapshotId: 'test-only-snapshot', profileId: 'test-only-profile', completedAt: '2026-11-05T00:00:00Z',
  questionSetVersion: questionSeed.questionSetVersion,
  answers: { genre: { fantasy: 'high' }, setting: { selected: ['setting_system_dungeon'], primary: 'setting_system_dungeon', indifferent: false },
    appeal: ['appeal_growth_training'], characterRelationship: ['character_effortful_protagonist'], avoidance: ['avoid_none'] }, recommendations: [] };
const started = performance.now();
const result = await runRuntime02(input, questionSeed);
const repeated = await runRuntime02(input, questionSeed);
assert.deepEqual(result, repeated);
assert.ok(result.items.length > 0 && result.items.length <= 3);
for (const item of result.items) assert.deepEqual(Object.keys(item).sort(), ['canonicalWebtoonId', 'platform', 'title']);
assert.equal(result.seedSha256, 'c9fae8e8db2dcab3ebb7c58a866bee208332946d8096c0cbe3e35881c0ee4992');
console.log(JSON.stringify({ ok: true, version: result.version, items: result.items.length,
  deterministic: true, totalElapsedMs: Math.round(performance.now() - started),
  scope: 'Pinned 02 numerical pipeline + active current-taste input adapter; no DB writes or deployment' }));
