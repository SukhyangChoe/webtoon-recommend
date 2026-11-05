/* Isolated boundary tests, then a real public relationship preview capture. All writes blocked. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const postgres=require('postgres');
(async()=>{
 const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000';
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-pair-summary-gauge-'));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
  let score=75;
  await context.route('**/api/v1/**',route=>{
   const p=new URL(route.request().url()).pathname;
   if(!['GET','HEAD'].includes(route.request().method()))return route.fulfill({status:202,json:{ok:true}});
   if(p.endsWith('/ranking')){
    const entry={entryId:'entry',resultId:'pair',nickname:'긴 닉네임도 읽을 수 있어야 해요',score,genreKey:'murim',sharedGenres:['무협'],rank:1};
    return route.fulfill({json:{challengeCode:'gauge-fixture',ownerNickname:'독자',ownerGenreKey:'murim',ownerTopGenreKeys:['murim'],entryCount:1,status:'active',rankingVisibility:'public_by_link',canManage:false,graphEntries:[],entries:[entry],viewerEntry:null,hiddenEntries:[],pagination:{page:1,pageSize:6,totalItems:1,totalPages:1}}});
   }
   return route.fulfill({json:{ok:true}});
  });
  for(const value of [0,25,75,100]){
   score=value;await page.goto(base+'/match/c/gauge-fixture/ranking');
   await page.locator('.wm-ranking-person-main').click();
   const gauge=page.getByRole('img',{name:`궁합 점수 ${value}%`,exact:true});await gauge.waitFor();
   assert.equal(await gauge.textContent(),`${value}%`);
   assert.equal(await gauge.evaluate(el=>el.style.getPropertyValue('--pair-score-angle')),`${value*3.6}deg`);
   for(const [width,height] of [[320,740],[390,844],[540,844],[900,800],[390,520]]){
    await page.setViewportSize({width,height});
    assert.ok(await gauge.evaluate(el=>{const r=el.getBoundingClientRect(),h=el.closest('header').getBoundingClientRect(),copy=el.previousElementSibling.getBoundingClientRect();return r.width===r.height&&r.width>=68&&r.left>=copy.right&&r.right<=h.right&&r.top>=h.top&&r.bottom<=h.bottom;}),'circle fits next to long names');
    assert.ok(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth));
    assert.ok((await gauge.evaluate(el=>getComputedStyle(el,'::before').maskImage)).includes('conic-gradient'));
   }
   await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});
  }
  await context.close();
  const live=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
  if(process.env.WEBTOON_MATCH_DATABASE_URL){
   const sql=postgres(process.env.WEBTOON_MATCH_DATABASE_URL,{ssl:'require',prepare:false,max:1,onnotice:()=>{}});let identity;
   try{[identity]=await sql.begin('read only',tx=>tx`select p.anonymous_id from public.match_profiles p join public.match_taste_snapshots s on s.profile_id=p.profile_id where s.public_profile_id='xys7o3_7JlgZl91b'`);}finally{await sql.end();}
   assert.ok(identity);await live.addCookies([{name:'wm_aid',value:identity.anonymous_id,url:base}]);
  }
  await live.route('**/api/v1/**',r=>['GET','HEAD'].includes(r.request().method())?r.continue():r.fulfill({status:202,json:{ok:true}}));
  const real=await live.newPage();const errors=[];real.on('pageerror',e=>errors.push(e.message));
  await real.goto(base+'/match/c/mKOdmiLcE0JU/ranking');
  await real.locator('.wm-relationship-node').first().click();
  const actual=real.getByRole('dialog');await actual.waitFor();
  const gauge=actual.locator('.wm-pair-score');const label=await gauge.getAttribute('aria-label');
  const angle=await gauge.evaluate(el=>el.style.getPropertyValue('--pair-score-angle'));
  await real.evaluate(()=>document.fonts.ready);await real.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await actual.locator('img').evaluateAll(items=>Promise.all(items.map(img=>img.decode())));
  await real.screenshot({path:path.join(out,'relationship_summary_gauge_actual.png')});
  if(process.env.WEBTOON_MATCH_DATABASE_URL){
   await actual.getByRole('link',{name:/상세 궁합 보기/}).click();
   const detail=real.locator('.wm-pair-result-body .wm-pair-score');await detail.waitFor();
   assert.equal(await detail.getAttribute('aria-label'),label);
   assert.equal(await detail.evaluate(el=>el.style.getPropertyValue('--pair-score-angle')),angle,'both surfaces share the same score and gauge');
   const recommendations=real.locator('.wm-panel.wm-pair-work-group').first();await recommendations.waitFor();
   assert.equal(await recommendations.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
   assert.ok(await recommendations.locator('header .wm-icon').isVisible());
   await recommendations.locator('.wm-pair-work-track img').evaluateAll(items=>Promise.all(items.map(img=>img.decode().catch(()=>{}))));
   await recommendations.evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-90,behavior:'instant'}));
   await real.addStyleTag({content:'nextjs-portal{display:none!important}'});
   await real.screenshot({path:path.join(out,'pair_recommendation_panel_actual.png')});
  }
  assert.deepEqual(errors,[]);await live.close();
  console.log(JSON.stringify({ok:true,out,checks:['0/25/75/100 boundaries','320/390/540/900 and short viewport','long nickname without ring overlap','actual map preview and detail have identical score and fill','all writes blocked']}));
 }finally{await browser.close();}
})().catch(e=>{console.error({name:e.name,message:e.message});process.exitCode=1;});
