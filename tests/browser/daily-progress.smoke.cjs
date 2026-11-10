/* Public fixture data only; every API request is intercepted. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000';
const out=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-daily-progress-'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--disable-gpu']});
 try {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
  await context.addInitScript(()=>{
   const original=window.fetch.bind(window);window.dailyProgressRequests=[];
   window.fetch=(input,init)=>{
    const url=typeof input==='string'?input:input instanceof Request?input.url:String(input);
    if(!url.includes('/daily-picks'))return original(input,init);
    const encoder=new TextEncoder();
    return Promise.resolve(new Response(new ReadableStream({start(controller){
     const request={send:event=>controller.enqueue(encoder.encode(JSON.stringify(event)+'\n')),finish:data=>{request.send({type:'result',data});controller.close();}};
     window.dailyProgressRequests.push(request);request.send({type:'progress',stage:'loading'});
     init?.signal?.addEventListener('abort',()=>{
      controller.error(new DOMException('Request cancelled','AbortError'));
      const index=window.dailyProgressRequests.indexOf(request);if(index!==-1)window.dailyProgressRequests.splice(index,1);
     },{once:true});
    }}),{headers:{'Content-Type':'application/x-ndjson'}}));
   };
  });
  await context.route('**/api/v1/**',route=>{
   const p=new URL(route.request().url()).pathname;
   assert.ok(['GET','HEAD'].includes(route.request().method())||p.includes('match-events'),'no user-data writes');
   if(p==='/api/v1/results/progress-reader')return route.fulfill({json:{publicProfileId:'progress-reader',nickname:'독자',canManage:true,activeChallengeCode:null,topGenres:[],displayGenres:[],wellMatchedLabels:[],lessMatchedLabels:[]}});
   return route.fulfill({json:{items:[],ok:true}});
  });
  let releaseCovers,releaseCachedCover;
  const covers=new Promise(resolve=>{releaseCovers=resolve;}),cachedCover=new Promise(resolve=>{releaseCachedCover=resolve;});
  await context.route('**/match/covers/**',async route=>{await (route.request().url().includes('wt_murim_017')?cachedCover:covers);await route.continue();});
  await page.goto(base+'/match/result/progress-reader');
  const preview=page.locator('.wm-daily-preview'),status=preview.locator('[role="status"]');
  await preview.waitFor();await preview.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>window.dailyProgressRequests.length===1);
  assert.equal(await preview.getAttribute('aria-busy'),'true');
  assert.equal(await status.count(),0,'a read request alone never displays selection messages');
  assert.equal(await preview.locator('.wm-daily-cover-loading').count(),0);
  await page.evaluate(()=>window.dailyProgressRequests[0].send({type:'progress',stage:'checking'}));
  await page.waitForTimeout(800);assert.equal(await status.count(),0,'even a slow cache verification stays quiet');
  const stages=[['narrowing','추천 범위를 좁히고 있어요…'],['selecting','내 취향에 맞는 작품을 고르고 있어요…']];
  for(const [stage,message] of stages){
   await page.evaluate(stage=>window.dailyProgressRequests[0].send({type:'progress',stage}),stage);
   await page.waitForFunction(message=>document.querySelector('.wm-daily-preview [role="status"]')?.textContent===message,message);
  }
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await preview.screenshot({path:path.join(out,'preview-selecting.png')});
  await preview.click();const sheet=page.getByRole('dialog',{name:'오늘의 취향작',exact:true});await sheet.waitFor();
  assert.equal(await sheet.locator('.wm-loading p').innerText(),await status.innerText());
  await page.evaluate(()=>window.dailyProgressRequests[0].send({type:'progress',stage:'saving'}));
  await page.waitForFunction(()=>document.querySelector('.wm-daily-preview [role="status"]')?.textContent==='오늘의 취향작을 저장하고 있어요…');
  const picks={publicProfileId:'progress-reader',mode:'personalized',selectionVersion:'fixture',items:[{canonicalWebtoonId:'progress-work',title:'선정된 작품',platform:'플랫폼',mainGenreLabel:'무협',coverUrl:'/match/covers/wt_murim_011.webp'}]};
  await page.evaluate(data=>window.dailyProgressRequests[0].finish({...data,expiresAt:new Date(Date.now()+3000).toISOString()}),picks);
  await sheet.locator('.wm-daily-list > li').waitFor();
  assert.equal(await preview.getAttribute('aria-busy'),'true','selection result does not hide loading before its cover loads');
  assert.match(await status.innerText(),/선정한 작품 표지를 불러오고 있어요/);
  releaseCovers();await page.waitForFunction(()=>document.querySelector('.wm-daily-preview').getAttribute('aria-busy')==='false');
  assert.equal(await status.count(),0);
  await sheet.getByRole('button',{name:'내 결과로 돌아가기'}).click();await sheet.waitFor({state:'hidden'});
  await page.waitForFunction(()=>window.dailyProgressRequests.length===2);
  assert.equal(await preview.getAttribute('aria-busy'),'true','expired picks immediately re-enter visible loading');
  assert.equal(await preview.locator('img').count(),0,'expired covers are not presented as today’s picks');
  assert.equal(await status.count(),0,'expiry alone does not presume a cache miss; another device may already have filled it');
  // A cache read can finish immediately: do not force invented selection stages or delay results.
  await page.evaluate(data=>{window.dailyProgressRequests[1].send({type:'progress',stage:'checking'});window.dailyProgressRequests[1].send({type:'progress',stage:'readying'});window.dailyProgressRequests[1].finish({...data,expiresAt:new Date(Date.now()+86400000).toISOString()});},picks);
  await page.waitForFunction(()=>document.querySelector('.wm-daily-preview').getAttribute('aria-busy')==='false');
  await page.waitForTimeout(800);assert.equal(await status.count(),0,'queued milestones cannot reappear after completion');
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(()=>window.dailyProgressRequests.length===3);
  assert.equal(await status.count(),0);assert.equal(await preview.locator('img').count(),1);
  // A catalog change can invalidate an otherwise unexpired selection in the background.
  await page.evaluate(()=>window.dailyProgressRequests[2].send({type:'progress',stage:'narrowing'}));
  await status.waitFor();assert.equal(await preview.locator('img').count(),0);
  await page.evaluate(data=>window.dailyProgressRequests[2].finish({...data,expiresAt:new Date(Date.now()+86400000).toISOString()}),picks);
  await page.waitForFunction(()=>document.querySelector('.wm-daily-preview').getAttribute('aria-busy')==='false');
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(()=>window.dailyProgressRequests.length===4);
  await page.evaluate(data=>{
   window.dailyProgressRequests[3].send({type:'progress',stage:'checking'});
   window.dailyProgressRequests[3].send({type:'progress',stage:'readying'});
   window.dailyProgressRequests[3].finish({...data,items:data.items.map(item=>({...item,coverUrl:'/match/covers/wt_murim_017.webp'})),expiresAt:new Date(Date.now()+86400000).toISOString()});
  },picks);
  await page.waitForFunction(()=>document.querySelector('.wm-daily-preview img')?.getAttribute('src')?.includes('wt_murim_017'));
  await page.waitForTimeout(800);
  assert.equal(await status.count(),0,'loading a stored selection’s uncached image never shows calculation copy');
  assert.equal(await preview.locator('.wm-daily-cover-loading').count(),0);
  releaseCachedCover();await page.waitForFunction(()=>document.querySelector('.wm-daily-preview').getAttribute('aria-busy')==='false');
  for(const width of [320,390,540]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,out,checks:['cache and image reads stay quiet','confirmed recomputation shows real progress','preview and sheet synchronized','expiry clears stale covers','catalog invalidation while old selection is visible','completion cancels queued progress','no user-data writes']}));
  await context.close();
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
