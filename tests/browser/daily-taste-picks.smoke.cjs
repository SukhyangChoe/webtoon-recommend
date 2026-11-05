/* Isolated interactions; optional live captures block source-data HTTP writes.
 * An owner daily GET may populate the derived daily cache when live mode is used. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const postgres=require('postgres');
(async()=>{
 const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000';
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-daily-picks-'));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let owner=true,mode='hold',release,calls=0;
  const picks={publicProfileId:'daily-fixture',mode:'personalized',selectionVersion:'fixture-personalized',items:[{canonicalWebtoonId:'daily-work',title:'임시 선정 작품',mainGenreLabel:'판타지',platform:'플랫폼',coverUrl:null},{canonicalWebtoonId:'daily-work-2',title:'작품명 '.repeat(25),mainGenreLabel:'로맨스·로판',platform:'플랫폼',coverUrl:null},{canonicalWebtoonId:'daily-work-3',title:'세 번째 작품',mainGenreLabel:'드라마·일상',platform:'플랫폼',coverUrl:null}]};
  await context.route('**/api/v1/**',async route=>{
   const req=route.request(),p=new URL(req.url()).pathname;
   assert.ok(['GET','HEAD'].includes(req.method())||p.includes('match-events'),'no user-data mutations');
   if(p==='/api/v1/results/daily-fixture')return route.fulfill({json:{publicProfileId:'daily-fixture',nickname:'독자',canManage:owner,activeChallengeCode:null,topGenres:[],displayGenres:[],wellMatchedLabels:[],lessMatchedLabels:[],readerExplanation:{headline:'취향 설명',introduction:'취향 설명 본문',scene:'장면을 상상해요.'}}});
   if(p.endsWith('/daily-picks')){
    calls++;assert.ok(req.headers()['x-match-anonymous-id']);
    if(mode==='hold')await new Promise(resolve=>{release=resolve;});
    if(mode==='fail')return route.fulfill({status:503,json:{error:'TEMPORARY_FAILURE'}});
    if(mode==='preparing')return route.fulfill({status:202,json:{...picks,mode:'preparing',retryAfterMs:1000,items:[]}});
    return route.fulfill({json:{...picks,items:mode==='empty'?[]:picks.items}});
   }
   if(p==='/api/v1/webtoons/daily-work')return route.fulfill({json:{canonicalWebtoonId:'daily-work',title:'임시 선정 작품',mainGenreLabel:'판타지',platform:'플랫폼',coverUrl:null,officialUrl:null,creators:[],contentLabels:[],appreciationPoints:[],artStyles:[],fit:null,fitStatus:'pending'}});
   if(p==='/api/v1/webtoons/daily-work/fit')return route.fulfill({json:{fit:null,fitStatus:'test_required'}});
   return route.fulfill({json:{items:[],ok:true}});
  });
  await page.goto(base+'/match/result/daily-fixture');const preview=page.locator('.wm-daily-preview'),sheet=page.getByRole('dialog',{name:'오늘의 취향작',exact:true});await preview.waitFor();
  await page.locator('.wm-action-bar .wm-invite-button').waitFor();assert.equal(await page.locator('.wm-result-title-mark').count(),1,'result/footer do not wait for daily picks');
  assert.ok(await page.locator('.wm-result-body').evaluate(el=>{const children=[...el.children];return children.findIndex(e=>e.classList.contains('wm-reader-explanation'))<children.findIndex(e=>e.classList.contains('wm-daily-picks'))&&children.findIndex(e=>e.classList.contains('wm-daily-picks'))<children.findIndex(e=>e.querySelector('.wm-recommendations-heading'));}));
  const before=await preview.boundingBox();await preview.click();await sheet.waitFor();await sheet.getByText('세 편을 불러오는 중이에요…').waitFor();
  assert.ok(await sheet.evaluate(el=>{const r=document.querySelector('.wm-floating-search').getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('dialog')===el;}),'global search remains under the native modal layer');
  mode='ok';release();await sheet.locator('.wm-daily-list > li').nth(2).waitFor();
  const loadedCalls=calls;
  assert.ok(await sheet.getByText(/매일 자정, 한국시간/).isVisible());assert.equal(await sheet.locator('[role="meter"]').count(),0);
  for(const [width,height] of [[320,740],[390,844],[540,844],[900,800],[390,520]]){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const bounds=await sheet.evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,left:r.left,right:r.right,top:r.top,bottom:r.bottom,viewport:innerHeight,horizontalFit:el.scrollWidth<=el.clientWidth+1};});
   assert.ok(bounds.width<=540&&bounds.left>=0&&bounds.right<=width+1&&bounds.top>=0&&bounds.bottom<=height+1&&bounds.horizontalFit,JSON.stringify(bounds));
   await sheet.getByRole('button',{name:'내 결과로 돌아가기'}).click();await sheet.waitFor({state:'hidden'});
   await preview.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
   const coverVisibility=await page.locator('.wm-daily-preview-covers').evaluate(el=>{const cards=[...el.children],rects=cards.map(c=>c.getBoundingClientRect());return {middle:getComputedStyle(cards[1]).zIndex,centers:rects.map((r,i)=>({x:r.x,y:r.y,visible:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.wm-daily-preview-covers > span')===cards[i],hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.className}))};});
   assert.ok(coverVisibility.middle==='3'&&coverVisibility.centers.every(c=>c.visible),`all three fan covers remain visible at ${width}: ${JSON.stringify(coverVisibility)}`);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'preview does not overflow');
   assert.ok(await preview.evaluate(el=>document.activeElement===el),'focus returns to preview');
   await preview.click();await sheet.waitFor();assert.ok(await sheet.locator('.wm-daily-close').evaluate(el=>document.activeElement===el));
   await page.keyboard.press('Shift+Tab');assert.ok(await sheet.getByRole('button',{name:'내 결과로 돌아가기'}).evaluate(el=>document.activeElement===el),'native modal traps keyboard focus');
  }
  await page.setViewportSize({width:390,height:844});await page.keyboard.press('Escape');await sheet.waitFor({state:'hidden'});
  const after=await preview.boundingBox();assert.equal(after.width,before.width);assert.equal(after.height,before.height,'loaded covers do not change preview height');
  await preview.click();await sheet.waitFor();await page.mouse.click(3,3);await sheet.waitFor({state:'hidden'});
  await preview.click();await sheet.waitFor();await page.goBack();await sheet.waitFor({state:'hidden'});
  assert.equal(calls,loadedCalls,'opening and closing loaded daily picks does not request selection again');
  await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(700);assert.equal(calls,loadedCalls+1,'focus/visibility are coalesced into one cache recheck');
  await preview.click();await sheet.waitFor();const pageY=await page.evaluate(()=>scrollY);
  await sheet.getByRole('link',{name:'임시 선정 작품 작품 상세 보기',exact:true}).click();await page.waitForURL('**/match/work/daily-work?*');
  await page.getByRole('heading',{name:'임시 선정 작품',level:1,exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  await page.goBack();await sheet.waitFor();await sheet.locator('.wm-daily-list > li').nth(2).waitFor();await page.waitForFunction(y=>Math.abs(scrollY-y)<2,pageY);
  await sheet.getByRole('button',{name:'내 결과로 돌아가기'}).click();await sheet.waitFor({state:'hidden'});
  mode='fail';await page.reload();await preview.click();await sheet.getByRole('button',{name:'다시 불러오기'}).waitFor();
  mode='ok';await sheet.getByRole('button',{name:'다시 불러오기'}).click();await sheet.locator('.wm-daily-list > li').nth(2).waitFor();
  mode='empty';await page.reload();await sheet.getByText('현재 보여드릴 수 있는 작품을 준비 중이에요.').waitFor();assert.equal(await sheet.locator('.wm-daily-list > li').count(),0);
  mode='preparing';await page.reload();await sheet.getByText('새 취향에 맞춰 세 편을 고르고 있어요…').waitFor();
  assert.equal(await sheet.locator('.wm-daily-list > li').count(),0,'no previous-taste picks while the new batch is preparing');
  mode='ok';await sheet.locator('.wm-daily-list > li').nth(2).waitFor();
  await sheet.getByRole('button',{name:'내 결과로 돌아가기'}).click();await sheet.waitFor({state:'hidden'});
  owner=false;const beforeVisitor=calls;await page.reload();await page.locator('.wm-result-title-mark').waitFor();assert.equal(await preview.count(),0);assert.equal(calls,beforeVisitor,'shared visitors never request owner-only picks');
  assert.deepEqual(errors,[]);await context.close();

  if(process.env.WEBTOON_MATCH_DATABASE_URL){
   const sql=postgres(process.env.WEBTOON_MATCH_DATABASE_URL,{ssl:'require',prepare:false,max:1,onnotice:()=>{}});let identity;
   try{[identity]=await sql.begin('read only',tx=>tx`select p.anonymous_id from public.match_profiles p join public.match_taste_snapshots s on s.profile_id=p.profile_id where s.public_profile_id='xys7o3_7JlgZl91b'`);}finally{await sql.end();}
   assert.ok(identity);
   const live=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
   await live.addCookies([{name:'wm_aid',value:identity.anonymous_id,url:base}]);
   await live.route('**/api/v1/**',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.fulfill({status:202,json:{ok:true}}));
   const real=await live.newPage();await real.goto(base+'/match/result/xys7o3_7JlgZl91b');
   await real.locator('.wm-daily-preview').getByText('3편 만나보기',{exact:true}).waitFor();
   await real.waitForFunction(()=>document.querySelectorAll('.wm-daily-preview-covers img').length===3);
   await real.locator('.wm-daily-preview-covers img').evaluateAll(items=>Promise.all(items.map(img=>img.decode())));await real.evaluate(()=>document.fonts.ready);
   await real.addStyleTag({content:'nextjs-portal{display:none!important}'});
   await real.locator('.wm-daily-preview').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-170,behavior:'instant'}));
   await real.screenshot({path:path.join(out,'daily_picks_actual_preview.png')});
   await real.locator('.wm-daily-preview').click();const actualSheet=real.getByRole('dialog',{name:'오늘의 취향작',exact:true});await actualSheet.waitFor();
   await actualSheet.locator('.wm-daily-work img').evaluateAll(items=>Promise.all(items.map(img=>img.decode())));
   assert.equal(await actualSheet.locator('.wm-daily-list > li').count(),3);await real.screenshot({path:path.join(out,'daily_picks_actual_sheet.png')});
   await live.close();
  }
  console.log(JSON.stringify({ok:true,out,checks:['independent loading','preview after explanation before own recommendations','personalized works without temporary notice','320/390/540/900 and short viewport','keyboard/backdrop/native history closing','detail navigation and sheet/scroll restoration','error retry and empty state','pending polls without stale picks','reopening does not fetch; focus events coalesce','no shared-visitor request','source-data HTTP writes blocked; optional live GET may populate derived cache']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
