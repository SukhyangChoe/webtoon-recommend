import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
function harness({owner=true,ids=['a','b','c']}={}) {
 const writes=[],reads=[];
 const sql=async(strings,...values)=>{
  const query=strings.join('?');reads.push(query);
  if(query.includes('for update of p'))return owner?[{profile_id:'profile'}]:[];
  if(query.includes('select canonical_webtoon_id'))return ids.map(id=>({canonical_webtoon_id:id}));
  writes.push({query,values});return [];
 };
 const database={begin:async run=>run(sql)},compiled={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(new URL('../../src/features/match/server/recommendationOrderStore.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module:compiled,exports:compiled.exports,Error,Set,require:name=>name==='server-only'?{}:{getMatchDatabase:()=>database}});
 return {...compiled.exports,writes,reads};
}
const input={publicProfileId:'public',anonymousId:'owner',canonicalWebtoonIds:['c','a','b']};
test('reorder serializes membership, writes only order and retains comments, likes and timestamps',async()=>{
 const h=harness();await h.reorderProfileRecommendations(input);
 assert.equal(h.writes.length,1);assert.match(h.reads[0],/for update of p/);
 assert.match(h.writes[0].query,/set sort_order=desired.position/);
 assert.doesNotMatch(h.writes[0].query,/delete|insert|recommendation_comment|updated_at|created_at/i);
 assert.deepEqual(h.writes[0].values[0],input.canonicalWebtoonIds);
});
test('stale membership cannot restore removed works, drop new works or change another owner’s list',async()=>{
 for(const [options,ids,error] of [[{owner:false},['a','b','c'],'RESULT_OWNER_MISMATCH'],[{},['a','b'],'RECOMMENDATION_ORDER_CHANGED'],[{},['a','b','other'],'RECOMMENDATION_ORDER_CHANGED'],[{},['a','a','b'],'INVALID_RECOMMENDATION_LIST']]){
  const h=harness(options);await assert.rejects(()=>h.reorderProfileRecommendations({...input,canonicalWebtoonIds:ids}),new RegExp(error));assert.equal(h.writes.length,0);
 }
 const same=harness();await same.reorderProfileRecommendations({...input,canonicalWebtoonIds:['a','b','c']});assert.equal(same.writes.length,0);
});
