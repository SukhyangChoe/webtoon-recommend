/* Read-only integration checks. No application data is created or updated. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('typescript');
const moduleObject={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/match/server/workReadDeadline.ts','utf8'),{compilerOptions:{module:1,target:9}}).outputText,{module:moduleObject,exports:moduleObject.exports,require,AbortController,setTimeout,clearTimeout});
const {createWorkReadContext,markWorkQueryStarted}=moduleObject.exports;
const databaseModule={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/match/server/workReadDatabase.ts','utf8'),{compilerOptions:{module:1,target:9,esModuleInterop:true}}).outputText,{module:databaseModule,exports:databaseModule.exports,require:name=>name==='./workReadDeadline'?{markWorkQueryStarted}:require(name),queueMicrotask});
(async()=>{
 const sql=databaseModule.exports.createWorkReadDatabase(process.env.WEBTOON_MATCH_DATABASE_URL,{statementTimeoutMs:600,lockTimeoutMs:100});
 try{
  const settings=await sql.unsafe("select current_setting('transaction_read_only') as read_only,current_setting('statement_timeout') as timeout",[]);
  assert.equal(settings[0].read_only,'on');assert.equal(settings[0].timeout,'600ms');
  const read=createWorkReadContext({getSql:()=>sql,kind:'integration',workId:'read-only',budgetMs:100,log:()=>{}});
  const start=Date.now();await assert.rejects(read.query('active','select pg_sleep(2)',[]),/WORK_DETAIL_TIMEOUT/);read.finish(504);
  assert.ok(Date.now()-start<1000,'request deadline bounds active queries');
  await sql.unsafe('select 1',[]);
  let began;const blocker=sql.unsafe('select pg_sleep(0.3)',[]);const running=blocker.then(()=>{});
  await new Promise(resolve=>setTimeout(resolve,30));
  const queued=createWorkReadContext({getSql:()=>sql,kind:'integration',workId:'read-only',budgetMs:40,log:value=>{began=value.steps[0];}});
  await assert.rejects(queued.query('queued','select pg_sleep(0.5)',[]),/WORK_DETAIL_TIMEOUT/);queued.finish(504);
  assert.equal(began.queryMs,0,'queued work is removed before executing');await running;await sql.unsafe('select 1',[]);
  const dbStart=Date.now();await assert.rejects(sql.unsafe('select pg_sleep(2)',[]),error=>error.code==='57014');assert.ok(Date.now()-dbStart<2000,'database has its own statement deadline');
  assert.equal((await sql.unsafe('select 1 as value',[]))[0].value,1,'connection remains usable after cancellation');
  console.log(JSON.stringify({ok:true,checks:['read-only connection','active query cancellation','queued query removal','database statement timeout','pool recovery']}));
 }finally{await sql.end({timeout:2});}
})().catch(error=>{console.error({name:error.name,code:error.code,message:/assert/i.test(error.name)?error.message:'Read-only deadline integration failed'});process.exitCode=1;});
