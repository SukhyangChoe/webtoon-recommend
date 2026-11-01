/* Audit every page family without submitting answers or writing service data. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
  const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000';
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-site-brand-'));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
    await context.route('**/api/v1/**',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.fulfill({status:202,contentType:'application/json',body:'{"ok":true}'}));
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    const profile='xys7o3_7JlgZl91b',challenge='mKOdmiLcE0JU',result='VIbseuqFQuk6RRDr';
    const routes=[
      '/','/find','/find/results','/genre-preference','/tests',
      ...['fantasy','murim','romance-ropan','thriller-horror','drama-daily'].map(key=>'/tests/'+key),
      '/match','/match/test/intro',...['1','2'].map(key=>'/match/test/genre-shelf/'+key),
      ...Array.from({length:6},(_,index)=>'/match/test/duel/'+(index+1)),
      ...['setting','appeal','character-relationship'].map(key=>'/match/test/taste/'+key),
      '/match/test/avoidance','/match/test/recovery','/match/result/building','/match/challenge/new',
      `/match/c/${challenge}`,`/match/result/${profile}`,`/match/result/${profile}/recommendations`,
      `/match/c/${challenge}/ranking`,`/match/c/${challenge}/match/${result}`,
      '/match/search','/match/work/wt_romance_ropan_016','/match/work/not-a-real-work',
      `/match/share/personal?profilePublicId=${profile}`,
      `/match/share/pair?challengeCode=${challenge}&resultId=${result}`,
      `/match/share/ranking?challengeCode=${challenge}`,'/not-a-real-page',
    ];
    let signature=null,controls=0;
    const redirects=[];
    async function audit(label){
      await page.evaluate(()=>document.fonts.ready);
      const state=await page.evaluate(()=>{
        const logo=document.querySelector('.brand-logo'),box=logo.getBoundingClientRect(),text=logo.querySelector('text'),style=getComputedStyle(text);
        return {count:document.querySelectorAll('.brand-bar .brand-logo').length,width:box.width,height:box.height,center:(box.left+box.right)/2,viewBox:logo.getAttribute('viewBox'),drawing:logo.innerHTML,font:style.fontFamily,fontSize:style.fontSize,weight:style.fontWeight,home:logo.closest('a').getAttribute('href'),controls:[...document.querySelectorAll('.site-back-control')].filter(el=>el.getClientRects().length).map(el=>{
          const icon=el.querySelector('.site-back-icon'),b=el.getBoundingClientRect(),i=icon.getBoundingClientRect(),css=getComputedStyle(icon);
          return {width:i.width,height:i.height,stroke:css.strokeWidth,path:icon.querySelector('path').getAttribute('d'),transform:css.transform,hitWidth:b.width,hitHeight:b.height,color:getComputedStyle(el).color,text:el.textContent.trim(),accessibleName:el.getAttribute('aria-label'),aligned:Math.abs((i.top+i.bottom-b.top-b.bottom)/2)<1&&Math.abs((i.left+i.right-b.left-b.right)/2)<1,overlapsLogo:i.left<box.right&&i.right>box.left&&i.top<box.bottom&&i.bottom>box.top};
        })};
      });
      assert.equal(state.count,1,label+': one brand logo');assert.equal(state.width,110);assert.equal(state.height,32);assert.ok(Math.abs(state.center-await page.evaluate(()=>innerWidth/2))<1,label+': centered logo');
      assert.equal(state.fontSize,'20px');assert.equal(state.weight,'700');assert.ok(state.font.includes('WebtoonFit Brand'));assert.equal(state.home,'/match');
      signature??=state.drawing;assert.equal(state.drawing,signature,label+': identical logo artwork');
      for(const control of state.controls){
        assert.equal(control.width,32,label);assert.equal(control.height,32,label);assert.equal(control.stroke,'2.8px',label);assert.equal(control.path,'m15 5-7 7 7 7',label);assert.equal(control.transform,'none',label);
        assert.ok(control.hitWidth>=44&&control.hitHeight>=44,label+': accessible back target');assert.equal(control.color,'rgb(0, 105, 127)',label);
        assert.equal(control.text,'',label+': back control contains only an arrow');assert.ok(control.accessibleName,label+': screen reader name preserved');
        assert.ok(control.aligned,label+': arrow centered in its touch target');assert.ok(!control.overlapsLogo,label+': back arrow does not overlap logo');controls++;
      }
    }
    for(const route of routes){
      await page.goto(base+route);await page.locator('.brand-logo').waitFor();await page.locator('main').first().waitFor();
      const actualPath=new URL(page.url()).pathname;
      if(actualPath!==new URL(route,base).pathname){assert.equal(actualPath,'/match','old and unknown paths keep their configured home redirect');redirects.push(route);}
      if(route===`/match/c/${challenge}/match/${result}`)await page.locator('.wm-pair-heading').waitFor();
      if(route===`/match/result/${profile}`)await page.locator('.wm-result-hero').waitFor();
      for(const width of [320,390,900]){
        await page.setViewportSize({width,height:844});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await audit(route+' at '+width);
      }
      if(route===`/match/c/${challenge}/match/${result}`||route===`/match/result/${profile}/recommendations`){
        await page.setViewportSize({width:390,height:844});await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
        await page.screenshot({path:path.join(output,route.includes('recommendations')?'manager_shared_navigation.png':'pair_shared_navigation.png')});
      }
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,routes:routes.length,homeRedirects:redirects.length,widths:[320,390,900],backControlsChecked:controls,checks:['identical SVG and font everywhere','arrow-only back controls with accessible names','bold centered 32px arrows and 44px touch targets','no duplicate logos or back/logo overlap','home destinations preserved','legacy redirects and work error state','all server writes blocked'],output},null,2));
    await context.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
