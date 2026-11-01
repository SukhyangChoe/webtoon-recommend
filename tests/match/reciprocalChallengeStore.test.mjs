import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

test('creating my map actually inserts the inviter as a reciprocal entry without any live database', async () => {
  const filename = new URL('../../src/features/match/server/challengeStore.ts', import.meta.url);
  const localRequire = createRequire(filename);
  const version = localRequire('../config/versions.mjs').MATCH_VERSIONS.questions;
  const guest = { profileId:'guest', snapshotId:'guest-snapshot', publicProfileId:'guest-public', anonymousId:'guest-anonymous', questionSetVersion:version, rawGenreAffinity:{murim:8} };
  const inviter = { ...guest, profileId:'inviter', snapshotId:'inviter-snapshot', publicProfileId:'inviter-public' };
  const statements = [], entries = [];
  const database = async (strings, ...values) => {
    const sql = strings.join('?').replace(/\s+/g,' ').trim(); statements.push({sql,values});
    if(sql.includes('select distinct on (previous_challenges.owner_profile_id)')) {
      assert.ok(sql.includes("previous_entries.entry_origin = 'direct'"));
      assert.ok(values.includes(guest.snapshotId));
      return [{counterpart_profile_id:'inviter',counterpart_snapshot_id:'inviter-snapshot',counterpart_nickname:'초대자',source_result_id:'original-pair'}];
    }
    if(sql.startsWith('insert into public.match_challenge_entries')) {
      const [entry_id,challenge_id,challenger_profile_id,challenger_snapshot_id,result_id,challenger_nickname,score,source_result_id,created_at,updated_at] = values;
      assert.ok(sql.includes("false, 'reciprocal'"));
      entries.push({entry_id,challenge_id,challenger_profile_id,challenger_snapshot_id,result_id,challenger_nickname,score,source_result_id,created_at,updated_at,entry_origin:'reciprocal',hidden_by_owner:false,shared_genres:['무협']});
      return [];
    }
    if(sql.includes('from public.match_challenge_entries entries')) return entries;
    if(sql.startsWith('insert into public.match_')||sql.includes('from public.match_challenges'))return [];
    throw new Error('Unexpected mock SQL: '+sql);
  };
  database.begin = callback => callback(database);
  database.json = value => value;
  const dependencies = {
    './database':{getMatchDatabase:()=>database,isPostgresError:()=>false},
    './resultStore':{getTasteSnapshot:async()=>guest,updateProfileNickname:async()=>{},getTasteSnapshotById:async()=>inviter,getTasteSnapshotsByIds:async()=>({[guest.snapshotId]:guest,[inviter.snapshotId]:inviter})},
    './webtoonCatalogStore':{},
    '../engine/compatibilityEngine.mjs':{calculateCompatibility:()=>({score:85,band:{key:'high',label:'취향 잘 맞음',subcopy:''},private:{ownerToChallengerTrust:85,challengerToOwnerTrust:85},explanations:{sharedGenreKeys:['murim'],differentGenreKeys:[],sharedTasteKeys:[]}})},
  };
  const compiledModule = {exports:{}};
  const source = ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(source,{module:compiledModule,exports:compiledModule.exports,require:name=>dependencies[name]??localRequire(name)},{filename:filename.pathname});
  const created = await compiledModule.exports.createChallenge({anonymousId:guest.anonymousId,ownerPublicProfileId:guest.publicProfileId,ownerNickname:'도전자'});
  assert.equal(created.challenge.entryCount,1);
  assert.equal(entries[0].challenger_profile_id,'inviter');
  assert.equal(entries[0].source_result_id,'original-pair');
  assert.equal(entries[0].entry_origin,'reciprocal');
  assert.equal(entries[0].score,85);
  assert.ok(statements.some(({sql})=>sql.startsWith('insert into public.match_compatibility_results')));
});
