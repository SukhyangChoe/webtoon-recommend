import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { beginWorkTasteTest, readWorkTestDestination, clearWorkTestDestination, WORK_TEST_CONTINUATION_KEY } from '../../src/features/match/storage/workTestContinuation.mjs';
import { createEmptyMatchDraft, readMatchDraft, writeMatchDraft } from '../../src/features/match/storage/draft.mjs';
import { readPendingChallenge, writePendingChallenge } from '../../src/features/match/storage/challengeStorage.mjs';
import { readWorkSearchState, searchBackPath, workSearchHref, WORK_SEARCH_STATE_KEY } from '../../src/features/match/config/workSearchPresentation.mjs';

const require = createRequire(import.meta.url), ts = require('typescript');
function memory() { const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)}; }
function load(relative,dependencies) {
 const filename=new URL(relative,import.meta.url),localRequire=createRequire(filename),compiledModule={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{module:compiledModule,exports:compiledModule.exports,URL,require:name=>dependencies[name]??localRequire(name)},{filename:filename.pathname});return compiledModule.exports;
}

test('work tests resume unfinished answers and remember a safe tab-local destination without any server writes',()=>{
 const storage=memory(),session=memory(),otherTab=memory();
 const draft={...createEmptyMatchDraft(),currentPath:'/match/test/duel/3',answers:{appeal:['growth']}};writeMatchDraft(storage,draft);
 writePendingChallenge(storage,'old-invite','도전자');
 const back=workSearchHref('북검','/match/result/me');
 session.setItem('wm-work-entry','previous browser-history entry');
 assert.equal(beginWorkTasteTest({storage,session,workId:'work-1',returnTo:back}),draft.currentPath);
 assert.equal(session.getItem('wm-work-entry'),null,'back after the test must return to search, not the final question');
 assert.deepEqual(readMatchDraft(storage).answers,draft.answers);
 assert.equal(readPendingChallenge(storage),null,'work search cannot silently join a previous invitation');
 const destination=new URL(readWorkTestDestination(session,readMatchDraft(storage)),'http://localhost');
 assert.equal(destination.pathname,'/match/work/work-1');assert.equal(destination.searchParams.get('returnTo'),back);
 assert.equal(readWorkTestDestination(otherTab,draft),null,'another tab cannot consume this destination');
 clearWorkTestDestination(session);assert.equal(readWorkTestDestination(session,draft),null);
});

test('new tests cannot reuse an old completed result or inherit another test’s return destination',()=>{
 const storage=memory(),session=memory();
 writeMatchDraft(storage,{...createEmptyMatchDraft('2026-01-01T00:00:00.000Z'),resultPublicId:'old-result',nickname:'기존 이름'});
 assert.equal(beginWorkTasteTest({storage,session,workId:'work-1',returnTo:'https://evil.example',now:100000}),'/match/test/intro');
 const draft=readMatchDraft(storage);assert.equal(draft.resultPublicId,undefined);
 assert.equal(new URL(readWorkTestDestination(session,draft,100001),'http://localhost').searchParams.get('returnTo'),'/match');
 assert.equal(readWorkTestDestination(session,{...draft,startedAt:'different-test'},100001),null);
 assert.equal(readWorkTestDestination(session,draft,100000+25*60*60*1000),null);
 assert.equal(readWorkTestDestination(session,draft,99999),null);
 session.setItem(WORK_TEST_CONTINUATION_KEY,'broken JSON');assert.equal(readWorkTestDestination(session,draft),null);
 assert.throws(()=>beginWorkTasteTest({storage,session,workId:'../evil',returnTo:'/match'}));
});

test('search navigation and restored public results reject unsafe or damaged storage',()=>{
 for(const bad of ['https://evil.example','//evil.example','/match/result/building','/match/test/intro','/match/search'])assert.equal(searchBackPath(bad),'/match');
 assert.equal(searchBackPath('/match/result/me'),'/match/result/me');
 const url=new URL(workSearchHref(' 북 검 ','/match/result/me'),'http://localhost');assert.equal(url.searchParams.get('q'),'북 검');
 const storage=memory(),state={query:'북검',items:[{canonicalWebtoonId:'work-1',title:'작품',platform:'네이버',mainGenre:'murim'}],page:2,hasMore:true,scrollY:400,savedAt:100};
 storage.setItem(WORK_SEARCH_STATE_KEY,JSON.stringify(state));assert.deepEqual(readWorkSearchState(storage,'북검',101),state);
 assert.equal(readWorkSearchState(storage,'다른 제목',101),null);assert.equal(readWorkSearchState(storage,'북검',100+25*60*60*1000),null);
 storage.setItem(WORK_SEARCH_STATE_KEY,JSON.stringify({...state,items:[{}]}));assert.equal(readWorkSearchState(storage,'북검',101),null);
});

test('catalog search has independent eligibility/cache/pagination, stable ordering and literal wildcard handling',async()=>{
 const statements=[];
 const database=async(strings,...values)=>{
  const sql=strings.join('?');statements.push({sql,values});
  assert.match(sql,/catalog_status = 'active'/);assert.match(sql,/canonical_webtoon_id asc/);assert.match(sql,/limit \? offset \?/);
  const eligibleOnly=values[0],limit=values.at(-2),offset=values.at(-1);
  const all=Array.from({length:eligibleOnly?3:42},(_,index)=>({canonical_webtoon_id:'work-'+index,title:'작품 '+index,platform:'네이버',main_genre:'murim'}));
  return all.slice(offset,offset+limit);
 };
 const store=load('../../src/features/match/server/webtoonCatalogStore.ts',{'server-only':{},'./database':{getMatchDatabase:()=>database},'./recommendationCommentStore':{}});
 const recommended=await store.searchWebtoons('작품');assert.equal(recommended.length,3);
 const first=await store.searchCatalogWebtoons('작품',1);assert.equal(first.items.length,20);assert.equal(first.hasMore,true);
 const next=await store.searchCatalogWebtoons('작품',2);assert.equal(next.items[0].canonicalWebtoonId,'work-20');
 const last=await store.searchCatalogWebtoons('작품',3);assert.equal(last.items.length,2);assert.equal(last.hasMore,false);
 assert.equal(statements.length,4);await store.searchCatalogWebtoons('작품',1);assert.equal(statements.length,4,'only public catalog metadata is cached');
 await store.searchCatalogWebtoons('%_\\');assert.ok(statements.at(-1).values.includes('%\\%\\_\\\\%'),'wildcards are treated as title characters, not arbitrary all-catalog queries');
 assert.equal((await store.searchCatalogWebtoons('   ')).items.length,0);
 await assert.rejects(store.searchCatalogWebtoons('작품',-1));await assert.rejects(store.searchCatalogWebtoons('a'.repeat(101)));
});

test('search API keeps recommendation management as the default and exposes catalog paging explicitly',async()=>{
 const calls=[];
 const route=load('../../src/app/api/v1/webtoons/search/route.ts',{
  'next/server':{NextResponse:{json:(body,options)=>Response.json(body,options)}},
  '@/features/match/server/webtoonCatalogStore':{searchWebtoons:async q=>{calls.push(['recommendations',q]);return [];},searchCatalogWebtoons:async(q,page)=>{calls.push(['catalog',q,page]);return {items:[],hasMore:false};}},
  '@/features/match/server/apiErrors':{toMatchApiFailure:()=>({error:'FAILED',status:500})},
 });
 const request=query=>route.GET(new Request('http://localhost/api/v1/webtoons/search?'+query));
 const recommendations=await request('q=test');assert.equal(recommendations.status,200);assert.equal(recommendations.headers.get('cache-control'),'no-store');assert.deepEqual(calls.at(-1),['recommendations','test']);
 const page=await request('q=test&scope=catalog&page=2');assert.deepEqual(await page.json(),{items:[],hasMore:false,page:2});assert.deepEqual(calls.at(-1),['catalog','test',2]);
 assert.equal(page.headers.get('cache-control'),'public, s-maxage=600, stale-while-revalidate=3600');
 for(const invalid of ['page=-1','page=1.5','page=0','page=10001','scope=unknown','q='+ 'a'.repeat(101)])assert.equal((await request(invalid)).status,400);
});
