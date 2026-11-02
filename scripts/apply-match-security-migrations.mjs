// Administrative, explicit opt-in only. Never prints connection strings or SQL data.
import fs from 'node:fs/promises';
import postgres from 'postgres';
if (!process.argv.includes('--apply')) throw new Error('Run with --apply to apply the reviewed security migrations.');
const sql=postgres(process.env.WEBTOON_MATCH_DATABASE_URL,{max:1,prepare:false,ssl:'require',connect_timeout:5,onnotice:()=>{}});
try {
  for(const name of ['202611020001_public_catalog_access','202611020002_runtime_security','202611020003_catalog_validation_lock','202611020004_verified_age_only','202611020005_is_adult_only_access']) {
    const version=name.split('_')[0];
    const source=await fs.readFile(new URL(`../supabase/migrations/${name}.sql`,import.meta.url),'utf8');
    await sql.begin(async tx=>{
      await tx`select pg_advisory_xact_lock(20261102)`;
      const applied=await tx`select 1 from supabase_migrations.schema_migrations where version=${version}`;
      if(applied.length){console.log(`${name}: already applied`);return;}
      await tx.unsafe(source.replace(/^begin;\s*/i,'').replace(/commit;\s*$/i,'')).simple();
      await tx`insert into supabase_migrations.schema_migrations(version,statements,name) values(${version},${[source]},${name.slice(version.length+1)})`;
      console.log(`${name}: applied`);
    });
  }
} catch(error) { console.error('Security migration failed:',error.code||error.name);process.exitCode=1; }
finally { await sql.end({timeout:2}); }
