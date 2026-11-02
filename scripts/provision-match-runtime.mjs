// Explicit administrative setup; generated credentials stay in ignored .env.local.
import postgres from 'postgres';
import {randomBytes} from 'node:crypto';
import {readFileSync,chmodSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
if(!process.argv.includes('--apply'))throw new Error('Explicit --apply required');
const adminUrl=process.env.WEBTOON_MATCH_DATABASE_URL;
if(!adminUrl)throw new Error('DATABASE_NOT_CONFIGURED');
const admin=postgres(adminUrl,{max:1,prepare:false,ssl:'require',connect_timeout:5,onnotice:()=>{}});
let runtime;
try{
  const name='webtoon_app_runtime';
  let connection=process.env.WEBTOON_MATCH_RUNTIME_DATABASE_URL;
  if(!connection){
    const exists=await admin`select 1 from pg_roles where rolname=${name}`;
    if(exists.length)throw Object.assign(new Error('Existing login must not be rotated implicitly'),{code:'EXISTING_LOGIN_REQUIRES_ITS_SAVED_SECRET'});
    const password=randomBytes(36).toString('base64url');
    await admin.unsafe(`create role ${name} login password '${password}' inherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls`);
    await admin.unsafe(`grant webtoon_runtime to ${name}`);
    const url=new URL(adminUrl),user=decodeURIComponent(url.username);
    url.username=name+(user.includes('.')?user.slice(user.indexOf('.')):'');url.password=password;connection=url.toString();
    // apply_patch performs the local edit; neither the patch nor credentials are printed.
    const env=readFileSync('.env.local','utf8'),line=`WEBTOON_MATCH_RUNTIME_DATABASE_URL=${connection}`;
    const anchor=env.trimEnd().split('\n').at(-1);
    const patch=`*** Begin Patch\n*** Update File: .env.local\n@@\n ${anchor}\n+${line}\n*** End Patch`;
    const result=spawnSync('apply_patch',[],{input:patch,encoding:'utf8'});
    if(result.status!==0)throw Object.assign(new Error('Local credential save failed'),{code:'LOCAL_SECRET_SAVE_FAILED'});
    chmodSync('.env.local',0o600);
  }
  await admin.unsafe(`alter role ${name} set statement_timeout='8s'`);
  await admin.unsafe(`alter role ${name} set lock_timeout='1s'`);
  runtime=postgres(connection,{max:1,prepare:false,ssl:'require',connect_timeout:5,onnotice:()=>{}});
  const rows=await runtime`select r.rolsuper,r.rolbypassrls,r.rolcreatedb,r.rolcreaterole,
    has_table_privilege(current_user,'public.webtoons','SELECT') as catalog_read,
    has_table_privilege(current_user,'public.webtoons','UPDATE') as catalog_write,
    has_table_privilege(current_user,'public.webtoons','DELETE') as catalog_delete,
    has_schema_privilege(current_user,'public','CREATE') as schema_create,
    has_table_privilege(current_user,'public.match_profiles','UPDATE') as profile_write
    from pg_roles r where r.rolname=current_user`;
  const r=rows[0];
  if(r.rolsuper||r.rolbypassrls||r.rolcreatedb||r.rolcreaterole||r.catalog_write||r.catalog_delete||r.schema_create||!r.catalog_read||!r.profile_write)throw Object.assign(new Error('Unsafe runtime privileges'),{code:'RUNTIME_PRIVILEGE_CHECK_FAILED'});
  await runtime`select canonical_webtoon_id from public.webtoons where public.webtoon_is_public_safe(raw_data) limit 1`;
  console.log('Runtime connection verified: catalog read-only, RLS enforced, no DDL or role administration. Local secret saved; production environment is unchanged.');
}catch(error){console.error('Runtime provisioning:',error.code||error.name);process.exitCode=1;}
finally{await runtime?.end({timeout:2});await admin.end({timeout:2});}
