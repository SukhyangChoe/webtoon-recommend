import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {isPublicCatalogWork} from '../../src/features/match/config/catalogAgePolicy.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(file,deps={}){
 const filename=new URL(file,import.meta.url),local=createRequire(filename),module={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const logs=[];
 vm.runInNewContext(source,{module,exports:module.exports,Request,Headers,URL,Error,SyntaxError,TextDecoder,Uint8Array,setTimeout,clearTimeout,Date,process:{env:{WEBTOON_MATCH_RATE_LIMIT_SECRET:'test-only-secret',VERCEL:'1'}},console:{info:message=>logs.push(message)},require:name=>name==='server-only'?{}:deps[name]??local(name)});
 return {...module.exports,logs};
}
test('only isAdult=true restricts access, independently of sexualCore, unknown or conflicting rating text',()=>{
 for(const metadata of [{isAdult:true},{isAdult:true,sexualCore:false,ageRating:'15세'},{isAdult:'true'},{isAdult:' TRUE '}])assert.equal(isPublicCatalogWork({metadata}),false,JSON.stringify(metadata));
 for(const metadata of [{},{sexualCore:true},{isAdult:false},{isAdult:null},{isAdult:false,sexualCore:true},{isAdult:false,ageRating:'19세'},{isAdult:'false'},{isAdult:'unknown'}, {ageRating:'15세 이용가',ageRatingRaw:'성인 표시 없음'},{ageRating:12},{ageRating:'전체 이용가'}])assert.equal(isPublicCatalogWork({metadata}),true,JSON.stringify(metadata));
 assert.equal(isPublicCatalogWork({metadata:{isAdult:false,ageRating:'15세'},platformWorks:[{isAdult:true}]}),true,'representative edition, not an adult sibling');
});
test('actual JSON bytes are limited even when Content-Length lies; empty and slow bodies are bounded',async()=>{
 const {readMatchJson}=load('../../src/features/match/server/requestBody.ts');
 const request=body=>new Request('https://test/api',{method:'POST',body,headers:{'Content-Length':'1'}});
 assert.equal((await readMatchJson(request('{"ok":true}'))).ok,true);
 await assert.rejects(readMatchJson(request('x'.repeat(131073))),/REQUEST_BODY_TOO_LARGE/);
 await assert.rejects(readMatchJson(request('{broken')),error=>error.name==='SyntaxError');
 const slow=new ReadableStream({pull(){return new Promise(()=>{});}});
 await assert.rejects(readMatchJson(new Request('https://test/api',{method:'POST',body:slow,duplex:'half'}),131072,10),/REQUEST_BODY_TIMEOUT/);
});
test('API timing logs redact profile IDs and query strings, and personal responses default to no-store',()=>{
 const api=load('../../src/features/match/server/apiResponse.ts',{'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}}});
 const response=api.matchJson(new Request('https://test/api/v1/results/private-profile?anonymousId=private-identity',{headers:{'x-wm-request-start':String(Date.now()-50)}}),{secret:'not logged'});
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.match(response.headers.get('server-timing'),/api;dur=/);
 assert.ok(response.headers.get('x-request-id'));
 assert.doesNotMatch(api.logs.join(''),/private-profile|private-identity|not logged/);
 assert.equal(JSON.parse(api.logs[0]).route,'/api/v1/results/:id');
});
test('request quotas are shared reservations, cannot reset by changing anonymous ID, and never store IPs',async()=>{
 let consumed=0;const statements=[];
 const sql=async(strings,...values)=>{
  const query=strings.join('?');statements.push({query,values});
  if(query.includes('insert into')){
   if(consumed>=60)return [];
   consumed+=5;return [{granted:5}];
  }
  return [];
 };
 sql.unsafe=()=>({simple:async()=>{}});sql.begin=callback=>callback(sql);
 const {allowMatchRequest}=load('../../src/features/match/server/apiRateLimit.ts',{'./database':{getMatchDatabase:()=>sql}});
 for(let index=0;index<60;index++)assert.equal((await allowMatchRequest(new Request(`https://test/api/v1/webtoons/search?anonymousId=${index}`,{headers:{'x-vercel-forwarded-for':'192.0.2.50'}}))).allowed,true);
 assert.equal((await allowMatchRequest(new Request('https://test/api/v1/webtoons/search',{headers:{'x-vercel-forwarded-for':'192.0.2.50'}}))).allowed,false);
 assert.equal(consumed,60);
 assert.doesNotMatch(JSON.stringify(statements),/192\.0\.2\.50|anonymousId/);
});
test('runtime catalog access is read-only and credentials never enter migration files',()=>{
 const sql=fs.readFileSync(new URL('../../supabase/migrations/202611020002_runtime_security.sql',import.meta.url),'utf8');
 assert.match(sql,/nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls/);
 assert.match(sql,/revoke insert, update, delete, truncate, references, trigger on public.webtoons/);
 assert.match(sql,/enable row level security/);
 assert.doesNotMatch(sql,/password\s+'[^']+'|postgres(?:ql)?:\/\//i);
});
