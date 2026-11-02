/* Real read-only catalog/API + real UI. No profile or recommendation writes. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {chromium}=require('playwright');
const postgres=require('postgres');
(async()=>{
 const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3100';
 const output=process.env.MATCH_QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-feedback-'));
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 const sql=postgres(process.env.WEBTOON_MATCH_RUNTIME_DATABASE_URL,{max:1,prepare:false,ssl:'require',connect_timeout:5,onnotice:()=>{}});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/api/v1/match-events',route=>route.fulfill({status:202,json:{accepted:true}}));
  const safe='wt_fantasy_001';
  const [blocked]=await sql`select canonical_webtoon_id,title from public.webtoons where catalog_status='active' and raw_data#>>'{metadata,isAdult}'='true' order by canonical_webtoon_id limit 1`;
  await sql.begin(async tx=>{
   const locked=await tx`select * from public.lock_recommendation_catalog(${[safe]}::text[])`;
   assert.equal(locked.length,1);assert.equal(locked[0].recommendation_registration_blocked,false);
   const privilege=await tx`select has_table_privilege(current_user,'public.webtoons','UPDATE') as can_update`;
   assert.equal(privilege[0].can_update,false,'locking does not need catalog write privilege');
  });
  const denied=await context.request.get(`${base}/api/v1/webtoons/${blocked.canonical_webtoon_id}?view=info`);assert.equal(denied.status(),404);
  const searched=await context.request.get(`${base}/api/v1/webtoons/search?scope=catalog&q=${encodeURIComponent(blocked.title)}`);
  assert.equal(searched.status(),200);assert.ok(!(await searched.json()).items.some(item=>item.canonicalWebtoonId===blocked.canonical_webtoon_id));
  // A missing flag or sexualCore=true alone must not block search or detail.
  for(const kind of ['missing','sexual-only']) {
   const rows=kind==='missing'
    ? await sql`select canonical_webtoon_id,title from public.webtoons where catalog_status='active' and recommendation_eligible and raw_data#>>'{metadata,isAdult}' is null and char_length(title)<90 order by canonical_webtoon_id limit 1`
    : await sql`select canonical_webtoon_id,title from public.webtoons where catalog_status='active' and recommendation_eligible and raw_data#>>'{metadata,isAdult}'='false' and raw_data#>>'{metadata,sexualCore}'='true' and char_length(title)<90 order by canonical_webtoon_id limit 1`;
   assert.equal(rows.length,1);const item=rows[0];
   assert.equal((await context.request.get(`${base}/api/v1/webtoons/${item.canonical_webtoon_id}?view=info`)).status(),200);
   for(const scope of ['catalog','recommendations']) {
    const response=await context.request.get(`${base}/api/v1/webtoons/search?scope=${scope}&q=${encodeURIComponent(item.title)}&accessPolicy=is-adult-only-v2-20261102`);
    assert.equal(response.status(),200);assert.ok((await response.json()).items.some(row=>row.canonicalWebtoonId===item.canonical_webtoon_id));
   }
  }
  const crossOrigin=await context.request.post(`${base}/api/v1/taste-snapshots`,{headers:{Origin:'https://untrusted.example'},data:{}});assert.equal(crossOrigin.status(),403);
  const oversized=await context.request.post(`${base}/api/v1/taste-snapshots`,{data:'x'.repeat(131073)});assert.equal(oversized.status(),413);
  let release;
  await page.route(`**/api/v1/webtoons/${safe}?view=info`,async route=>{
   const response=await route.fetch();await new Promise(resolve=>{release=resolve;});await route.fulfill({response});
  });
  await page.goto(`${base}/match/work/${safe}`);
  await page.getByRole('progressbar').first().waitFor();
  await page.screenshot({path:path.join(output,'work-loading.png')});
  await page.waitForFunction(()=>document.querySelector('.wm-loading-track'));
  while(!release)await new Promise(resolve=>setTimeout(resolve,10));release();
  await page.getByRole('heading',{name:'전지적 독자 시점',level:1}).waitFor();
  await page.waitForFunction(()=>{const img=document.querySelector('.wm-work-hero img');return img?.complete&&img.naturalWidth>0;},{},{timeout:20000});
  const grip=page.locator('.wm-work-grab'),root=page.locator('.wm-work-page');
  const gripBox=await grip.boundingBox(),sheetBox=await page.locator('.wm-work-sheet').boundingBox();
  assert.ok(gripBox.width>sheetBox.width*.9,'whole sheet width is an interactive handle');
  assert.ok(await grip.locator('span').evaluate(el=>el.getBoundingClientRect().width)>=72);
  await page.screenshot({path:path.join(output,'work-collapsed.png')});
  await grip.click();await page.waitForFunction(()=>document.querySelector('.wm-work-page').dataset.stage!=='collapsed');
  await page.screenshot({path:path.join(output,'work-expanded.png')});
  await grip.click();await page.waitForFunction(()=>document.querySelector('.wm-work-page').dataset.stage==='collapsed');
  await grip.focus();await page.keyboard.press('Enter');assert.notEqual(await root.getAttribute('data-stage'),'collapsed');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.wm-work-page').dataset.stage==='collapsed');
  const box=await grip.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y-85,{steps:10});await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('.wm-work-page').dataset.stage!=='collapsed');
  await grip.click();await page.waitForFunction(()=>document.querySelector('.wm-work-page').dataset.stage==='collapsed');
  for(const width of [320,390,900]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const style=await page.getByRole('link',{name:'작품 검색',exact:true}).evaluate(el=>{const s=getComputedStyle(el);return {border:s.borderTopWidth,color:s.borderTopColor,bg:s.backgroundColor};});
   assert.deepEqual(style,{border:'1px',color:'rgb(136, 205, 221)',bg:'rgb(237, 250, 254)'});
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,checks:['real restricted work search/detail blocked','read-only catalog lock','cross-origin and oversize denied','loading progress','wide handle','tap/keyboard/drag','320/390/900 layouts'],output}));
 }finally{await browser.close();await sql.end({timeout:1});}
})().catch(error=>{console.error({name:error.name,message:/assert/i.test(error.name)?error.message:'Feedback UI integration failed'});process.exitCode=1;});
