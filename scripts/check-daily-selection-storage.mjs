// Explicit opt-in. --check rolls back ALL schema/test changes; --apply adds the
// reviewed private cache schema only. Never logs identities or connection URLs.
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import ts from 'typescript';

const mode = process.argv[2];
if (!['--check', '--apply'].includes(mode)) throw Error('Use --check (rollback test) or --apply (schema migration).');
if (!process.env.WEBTOON_MATCH_DATABASE_URL) throw Error('Administrative database connection is required.');
const name = '202611050001_daily_selection_cache', version = name.split('_')[0];
const source = await fs.readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8');
const sql = postgres(process.env.WEBTOON_MATCH_DATABASE_URL, { max: 1, prepare: false, ssl: 'require', connect_timeout: 5, onnotice: () => {} });
const rollback = Error('INTENTIONAL_CHECK_ROLLBACK');
let stage = 'connect';
try {
  await sql.begin(async tx => {
    stage = 'migration';
    await tx`set local lock_timeout='2s'`;
    await tx`set local statement_timeout='8s'`;
    await tx`select pg_advisory_xact_lock(2026110501)`;
    const applied = await tx`select 1 from supabase_migrations.schema_migrations where version=${version}`;
    if (!applied.length) {
      await tx.unsafe(source.replace(/^begin;\s*/i, '').replace(/commit;\s*$/i, '')).simple();
      await tx`insert into supabase_migrations.schema_migrations(version,statements,name)
        values(${version},${[source]},'daily_selection_cache')`;
    }
    if (mode === '--apply') {
      console.log(JSON.stringify({ migration: name, status: applied.length ? 'already_applied' : 'applied' }));
      return;
    }
    const profile = randomUUID(), key = 'a'.repeat(64), nextKey = 'b'.repeat(64);
    stage = 'test_profile';
    await tx`insert into public.match_profiles(profile_id,anonymous_id) values(${profile}::uuid,${randomUUID()}::uuid)`;
    const [revision] = await tx`select revision::text as value from public.match_daily_catalog_revision`;
    stage = 'catalog_trigger';
    // Zero rows change, but the statement trigger must still conservatively bump.
    await tx`update public.webtoons set title=title where false`;
    const [changed] = await tx`select revision::text as value from public.match_daily_catalog_revision`;
    assert.equal(BigInt(changed.value), BigInt(revision.value) + 1n);
    const [permissions] = await tx`select
      has_table_privilege('anon','public.match_daily_selections','select') as anon,
      has_table_privilege('authenticated','public.match_daily_selections','select') as authenticated,
      has_table_privilege('webtoon_runtime','public.match_daily_catalog_revision','update') as revision_write`;
    assert.deepEqual(permissions, { anon: false, authenticated: false, revision_write: false });
    stage = 'runtime_role';
    // The managed admin login is not a member of this no-login group. This
    // temporary membership is rolled back with the entire --check transaction.
    await tx`grant webtoon_runtime to current_user`;
    await tx`set local role webtoon_runtime`;
    const compiledModule = { exports: {} };
    const repositorySource = await fs.readFile(new URL('../src/features/match/server/dailySelectionRepository.ts', import.meta.url), 'utf8');
    const compiled = ts.transpileModule(repositorySource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports, require: name => {
      if (name === 'server-only') return {};
      if (name === 'node:crypto') return { randomUUID };
      if (name === './database') return { getMatchDatabase: () => tx };
      throw Error('UNEXPECTED_DEPENDENCY');
    } });
    const repository = compiledModule.exports.dailySelectionRepository(tx);
    stage = 'repository';
    const expiry = new Date(Date.now() + 3600000).toISOString();
    assert.equal(await repository.read(profile, key), null);
    const token = await repository.claim(profile, key, expiry);
    assert.ok(token); assert.equal(await repository.claim(profile, key, expiry), null);
    const selection = { items: [{ canonicalWebtoonId: 'test-only', title: '롤백 검증', platform: 'test' }] };
    assert.equal(await repository.complete(profile, key, token, selection), true);
    await repository.release(profile, key, token);
    assert.deepEqual(JSON.parse(JSON.stringify(await repository.read(profile, key))), selection);
    assert.equal(await repository.claim(profile, key, expiry), null);
    const latest = await repository.claim(profile, nextKey, expiry);
    assert.ok(latest); assert.equal(await repository.read(profile, key), null);
    assert.equal(await repository.complete(profile, key, token, selection), false);
    await repository.release(profile, key, token);
    assert.equal(await repository.claim(profile, nextKey, expiry), null);
    await repository.release(profile, nextKey, latest);
    assert.ok(await repository.claim(profile, nextKey, expiry));
    console.log(JSON.stringify({ ok: true, checks: ['schema', 'catalog revision trigger', 'private permissions', 'runtime-role repository SQL', 'persisted cache hit', 'single lease', 'changed key', 'late worker fencing', 'failed lease recovery'], rolledBack: true }));
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) { console.error(JSON.stringify({ ok: false, stage, code: error.code || error.name })); process.exitCode = 1; }
} finally { await sql.end({ timeout: 2 }); }
