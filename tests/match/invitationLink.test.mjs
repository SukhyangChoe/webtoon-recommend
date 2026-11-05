import test from 'node:test';
import assert from 'node:assert/strict';
import { invitationPath } from '../../src/features/match/config/invitationLink.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

test('invite destination accepts an active code only, never a page URL or return parameters',()=>{
 assert.equal(invitationPath('my-invite_01'),'/match/c/my-invite_01');
 for(const value of [null,undefined,'','/match/result/me','/match/c/other/ranking','https://evil.example','code?ownerToken=x','../secret','a'.repeat(101)])assert.equal(invitationPath(value),null);
});

test('footer invitation lookup validates ownership identity and uses only the lightweight code read',async()=>{
 const require=createRequire(import.meta.url),ts=require('typescript'),module={exports:{}};
 let lightweight=0,full=0,code='my-invite';
 const dependencies={
  '@/features/match/server/requestBody':{},
  '@/features/match/server/apiResponse':{matchJson:(_request,body,init)=>({body,status:init?.status??200})},
  '@/features/match/storage/anonymousIdentity.mjs':{isAnonymousId:id=>id==='owner-id'},
  '@/features/match/server/challengeStore':{getActiveInvitationCodeForOwner:async id=>{assert.equal(id,'owner-id');lightweight++;return code;},getActiveChallengeForOwner:async()=>{full++;return null;}},
  '@/features/match/server/apiErrors':{toMatchApiFailure:()=>({error:'FAILED',status:500})},
 };
 const source=ts.transpileModule(fs.readFileSync(new URL('../../src/app/api/v1/challenges/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,URL,require:name=>dependencies[name]});
 const call=identity=>module.exports.GET({url:`https://site.invalid/api/v1/challenges?view=invitation&anonymousId=${identity}`});
 assert.equal((await call('invalid')).status,400);assert.equal(lightweight,0);
 const active=await call('owner-id');assert.equal(active.body.active,true);assert.equal(active.body.challengeCode,'my-invite');
 code=null;const absent=await call('owner-id');assert.equal(absent.body.active,false);assert.equal(absent.body.challengeCode,null);
 assert.equal(lightweight,2);assert.equal(full,0,'no participant counts or taste recomputation for a copy button');
});
