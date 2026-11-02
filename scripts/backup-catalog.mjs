// Catalog only: no profiles, anonymous IDs, comments, or user activity.
// Keep .env.backup.local separately from the encrypted archive for off-site recovery.
import postgres from 'postgres';
import {randomBytes,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
import {createReadStream,createWriteStream,existsSync,chmodSync} from 'node:fs';
import {mkdir,appendFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createGzip,createGunzip} from 'node:zlib';
import {spawnSync} from 'node:child_process';
if(!process.argv.includes('--create'))throw new Error('Explicit --create required');
let key=process.env.CATALOG_BACKUP_KEY;
if(!key){
  if(existsSync('.env.backup.local'))throw new Error('Load .env.backup.local rather than replacing its key');
  key=randomBytes(32).toString('hex');
  const patch=`*** Begin Patch\n*** Add File: .env.backup.local\n+CATALOG_BACKUP_KEY=${key}\n*** End Patch`;
  if(spawnSync('apply_patch',[],{input:patch,encoding:'utf8'}).status!==0)throw new Error('BACKUP_KEY_SAVE_FAILED');
  chmodSync('.env.backup.local',0o600);
}
if(!/^[a-f0-9]{64}$/i.test(key))throw new Error('INVALID_BACKUP_KEY');
await mkdir('.private-backups',{recursive:true,mode:0o700});
const path=`.private-backups/catalog-${new Date().toISOString().replace(/[:.]/g,'-')}.wmb`;
const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);
const digest=createHash('sha256');let sourceRows=0;
const sql=postgres(process.env.WEBTOON_MATCH_DATABASE_URL,{max:1,prepare:false,ssl:'require',connect_timeout:5,onnotice:()=>{}});
try{
  await sql.begin('isolation level repeatable read read only',async tx=>{
    await tx.unsafe("set local statement_timeout='30000ms'");
    async function* records(){
      const emit=value=>{const buffer=Buffer.from(JSON.stringify(value)+'\n');digest.update(buffer);return buffer;};
      yield emit({format:'webtoon-catalog-backup',version:1,createdAt:new Date().toISOString()});
      for(const table of ['webtoons','webtoon_details']) {
        for await(const rows of tx.unsafe(`select * from public.${table} order by canonical_webtoon_id`).cursor(100)){
          for(const row of rows){sourceRows++;yield emit({table,row});}
        }
      }
    }
    const out=createWriteStream(path,{mode:0o600});out.write(Buffer.concat([Buffer.from('WMB1'),iv]));
    await pipeline(Readable.from(records()),createGzip(),cipher,out);
  });
  await appendFile(path,cipher.getAuthTag());
  const {size}=await (await import('node:fs/promises')).stat(path);
  const tag=Buffer.alloc(16),handle=await (await import('node:fs/promises')).open(path,'r');
  await handle.read(tag,0,16,size-16);await handle.close();
  const decipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);decipher.setAuthTag(tag);
  const decoded=createReadStream(path,{start:16,end:size-17}).pipe(decipher).pipe(createGunzip());
  const verified=createHash('sha256');for await(const chunk of decoded)verified.update(chunk);
  if(digest.digest('hex')!==verified.digest('hex'))throw new Error('BACKUP_ROUNDTRIP_FAILED');
  console.log(JSON.stringify({file:path,catalogRows:sourceRows,encrypted:true,decryptChecksumVerified:true,databaseRestoreTested:false}));
}catch(error){console.error('Catalog backup failed:',error.code||error.name);process.exitCode=1;}
finally{await sql.end({timeout:2});}
