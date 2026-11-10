/* Actual stored pages only; all browser writes are blocked and DB access is read-only. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const postgres=require('postgres');
(async()=>{
 const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000';
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-header-fit-'));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
  await context.route('**/api/v1/**',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.fulfill({status:202,json:{ok:true}}));
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/match/search');await page.locator('.wm-work-search').waitFor();
  assert.equal(await page.locator('body > .brand-bar').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(243, 250, 252)');
  for(const width of [320,390,540,900]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.locator('.is-work-search .site-back-control').evaluate(el=>{const b=el.getBoundingClientRect(),h=document.querySelector('body > .brand-bar').getBoundingClientRect(),logo=document.querySelector('.brand-bar__logo').getBoundingClientRect();return Math.abs(b.top+b.height/2-h.top-h.height/2)<1&&b.right<logo.left;}),'search back sits left of the logo at header height');
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await page.screenshot({path:path.join(out,'search_header_actual.png')});
  await page.goto(base+'/match/c/mKOdmiLcE0JU/match/VIbseuqFQuk6RRDr?from=ranking');
  const back=page.locator('.wm-pair-back');await back.waitFor();
  for(const width of [320,390,540,900]){
   await page.setViewportSize({width,height:844});
   const bounds=await back.evaluate(el=>{const b=el.getBoundingClientRect(),h=document.querySelector('body > .brand-bar').getBoundingClientRect();return {aligned:Math.abs((b.top+b.height/2)-(h.top+h.height/2))<1,hit:b.width>=44&&b.height>=44};});
   assert.ok(bounds.aligned&&bounds.hit,JSON.stringify({width,...bounds}));
  }
  assert.match(await back.getAttribute('href'),/\/ranking$/);
  assert.equal(await page.locator('.wm-pair-heading').count(),0);
  assert.equal(await page.locator('h1.wm-sr-only').textContent(),'상세 궁합');
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'});await page.screenshot({path:path.join(out,'pair_header_actual.png')});
  if(process.env.WEBTOON_MATCH_DATABASE_URL){
   const sql=postgres(process.env.WEBTOON_MATCH_DATABASE_URL,{ssl:'require',prepare:false,max:1,onnotice:()=>{}});let identity;
   try{[identity]=await sql.begin('read only',tx=>tx`select p.anonymous_id from public.match_profiles p join public.match_taste_snapshots s on s.profile_id=p.profile_id where s.public_profile_id='xys7o3_7JlgZl91b'`);}finally{await sql.end();}
   assert.ok(identity);await context.addCookies([{name:'wm_aid',value:identity.anonymous_id,url:base}]);
   await page.goto(base+'/match/work/wt_romance_ropan_019');
   await page.getByRole('meter',{name:'핏점수',exact:true}).waitFor();
   const score=await page.getByRole('meter').getAttribute('aria-valuenow');
   for(const [width,height] of [[320,740],[390,844],[540,844],[900,844],[390,520]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.waitForFunction(()=>{const s=document.querySelector('.wm-floating-search').getBoundingClientRect(),f=document.querySelector('.wm-work-action').getBoundingClientRect();return s.bottom<=f.top-11;});
    assert.ok(await page.locator('.wm-work-open').evaluate(el=>{const b=el.getBoundingClientRect(),s=document.querySelector('.wm-floating-search').getBoundingClientRect();return b.right+8<=s.left||b.bottom+8<=s.top||s.bottom+8<=b.top;}),'summary action never hides beneath search');
    assert.ok(await page.locator('.wm-work-open .wm-icon').evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.wm-work-open');}),'up arrow is visible and clickable');
    assert.ok(await page.locator('.wm-work-back').evaluate(el=>{const b=el.getBoundingClientRect(),h=document.querySelector('body > .brand-bar').getBoundingClientRect();return Math.abs(b.top+b.height/2-h.top-h.height/2)<1;}),'work back shares brand header height');
   }
   await page.setViewportSize({width:390,height:844});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.addStyleTag({content:'nextjs-portal{display:none!important}'});await page.screenshot({path:path.join(out,'work_fit_collapsed_actual.png')});
   await page.locator('.wm-work-open').click();const badge=page.locator('.wm-work-reading-fit [role=meter]');await badge.waitFor();
   assert.equal(await badge.getAttribute('aria-valuenow'),score);
   const fonts=await badge.evaluate(el=>{const body=getComputedStyle(document.querySelector('.wm-work-section p')),label=getComputedStyle(el.querySelector('.wm-work-reading-fit-title')),number=getComputedStyle(el.querySelector('strong'));return {body:body.fontFamily,label:label.fontFamily,number:number.fontFamily,labelWeight:label.fontWeight,numberWeight:number.fontWeight,labelSize:label.fontSize,numberSize:number.fontSize,numberTracking:number.letterSpacing};});
   assert.equal(fonts.label,fonts.body);assert.equal(fonts.number,fonts.body);
   assert.equal(fonts.labelWeight,'600');assert.equal(fonts.numberWeight,'600');
   assert.equal(fonts.labelSize,'14px');assert.equal(fonts.numberSize,'28px');
   assert.ok(await badge.evaluate(el=>{const r=el.getBoundingClientRect(),h=el.previousElementSibling.getBoundingClientRect(),t=el.nextElementSibling.getBoundingClientRect();return r.top>=h.bottom&&r.bottom<=t.top&&r.width>h.width*.8;}),'fit is a full-width strip between title and tabs');
   assert.equal(await badge.locator('.wm-work-fit-track > span').evaluate(el=>el.style.width),`${score}%`);
   for(const tab of ['궁합 · 소개','작품 정보']){
    await page.getByRole('tab',{name:tab,exact:true}).click();
    await page.locator('.wm-work-dialog-body').evaluate(el=>{el.scrollTop=el.scrollHeight;});
    assert.ok(await badge.isVisible());assert.equal(await badge.getAttribute('aria-valuenow'),score);
   }
   await page.getByRole('tab',{name:'궁합 · 소개',exact:true}).click();
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.locator('.wm-work-dialog-body').evaluate(el=>{el.scrollTop=0;});
   await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
   await page.screenshot({path:path.join(out,'work_fit_expanded_actual.png')});
  }
  assert.deepEqual(errors,[]);await context.close();
  console.log(JSON.stringify({ok:true,out,checks:['search header matches pale cyan','pair back within brand header at 320/390/540/900','visible duplicate title removed, accessible title kept','actual fit unchanged across collapsed/expanded, tabs and scrolling','all writes blocked']}));
 }finally{await browser.close();}
})().catch(error=>{console.error({name:error.name,message:error.message});process.exitCode=1;});
