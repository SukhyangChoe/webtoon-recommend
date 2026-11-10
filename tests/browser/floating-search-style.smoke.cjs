/* Actual local pages, with all data writes blocked. Captures use real result/work UI. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
  const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000';
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-search-style-'));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
    await context.route('**/api/v1/**',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.fulfill({status:202,json:{ok:true}}));
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const routes=['/match','/match/result/xys7o3_7JlgZl91b','/match/c/mKOdmiLcE0JU/ranking','/match/c/mKOdmiLcE0JU/match/VIbseuqFQuk6RRDr?from=ranking','/match/share/personal?profilePublicId=xys7o3_7JlgZl91b','/match/challenge/new','/match/work/wt_romance_ropan_019'];
    for(const route of routes){
      await page.goto(base+route);
      const search=page.getByRole('link',{name:'작품 검색',exact:true});await search.waitFor();
      if(route==='/match/result/xys7o3_7JlgZl91b')await page.locator('.wm-result-title-mark').waitFor();
      if(route.includes('/ranking'))await page.locator('.wm-relationship-heading').waitFor();
      if(route.includes('/match/VI'))await page.locator('.wm-pair-details').waitFor();
      if(route.includes('/work/')){await page.locator('.wm-work-action').waitFor();await page.getByRole('button',{name:'취향 테스트로 핏점수 확인하기',exact:true}).waitFor();}
      for(const width of [320,390,900]){
        await page.setViewportSize({width,height:844});await page.mouse.move(0,843);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await page.waitForFunction(()=>{
          const button=document.querySelector('.wm-floating-search').getBoundingClientRect();
          const footers=[...document.querySelectorAll('.wm-action-bar,.wm-save-tray,.wm-work-action')].map(el=>el.getBoundingClientRect()).filter(r=>r.height&&r.top>=0&&r.bottom>=innerHeight-2);
          return Math.abs((footers.length?Math.min(...footers.map(r=>r.top)):innerHeight)-button.bottom-(footers.length?12:16))<1;
        });
        const style=await search.evaluate(el=>{
          const css=getComputedStyle(el),r=el.getBoundingClientRect(),icon=getComputedStyle(el.querySelector('svg'));
          const footers=[...document.querySelectorAll('.wm-action-bar,.wm-save-tray,.wm-work-action')].map(e=>e.getBoundingClientRect()).filter(r=>r.height&&r.top>=0&&r.bottom>=innerHeight-2);
          const footerTop=footers.length?Math.min(...footers.map(r=>r.top)):innerHeight;
          return {width:r.width,height:r.height,border:css.borderTopWidth,radius:css.borderRadius,background:css.backgroundColor,stroke:icon.strokeWidth,inside:r.top>=0&&r.right<=innerWidth,
            gap:footerTop-r.bottom,right:innerWidth>540?(innerWidth+540)/2-r.right:innerWidth-r.right,hasFooter:footers.length>0,
            offset:el.closest('.match-module').style.getPropertyValue('--wm-search-bottom'),cssBottom:css.bottom,variable:css.getPropertyValue('--wm-search-bottom'),position:css.position,footerRects:footers.map(r=>({top:r.top,bottom:r.bottom,height:r.height})),
            clickable:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('a')===el};
        });
        assert.ok(style.width>=100&&style.width<=150&&style.height===44&&style.inside&&style.clickable,route+'/'+width+': '+JSON.stringify(style));
        assert.equal(style.border,'0px');assert.equal(style.radius,'999px');assert.equal(style.stroke,'2px');
        assert.equal(style.background,'rgb(255, 240, 179)');assert.ok(Math.abs(style.right-16)<1);
        assert.ok(Math.abs(style.gap-(style.hasFooter?12:16))<1,route+': footer gap '+style.gap);
        assert.equal(await search.innerText(),'작품 검색');
        const beforeScroll=await search.boundingBox();await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
        const afterScroll=await search.boundingBox();assert.ok(Math.abs(afterScroll.y-beforeScroll.y)<1&&Math.abs(afterScroll.x-beforeScroll.x)<1);
        await page.evaluate(()=>scrollTo(0,0));
      }
      await search.focus();
      assert.equal(await search.evaluate(el=>getComputedStyle(el).outlineWidth),'3px','keyboard focus remains visible');
      if(route==='/match/result/xys7o3_7JlgZl91b'||route.includes('/work/')){
        await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.fonts.ready);
        if(route.includes('/work/'))await page.locator('.wm-work-cover-foreground img').evaluate(img=>img.decode());
        else await page.locator('.wm-persona-image').evaluate(img=>img.decode());
        await page.addStyleTag({content:'nextjs-portal{display:none!important}'});await page.mouse.move(0,0);await search.evaluate(el=>el.blur());
        await page.screenshot({path:path.join(output,route.includes('/work/')?'floating_search_live_work.png':'floating_search_live_result.png')});
      }
    }
    await page.setViewportSize({width:390,height:844});await page.goto(base+'/match');
    // Isolated footer lifecycle/resize check, never used as screenshot evidence.
    await page.evaluate(()=>{const footer=document.createElement('div');footer.className='wm-save-tray';footer.id='qa-footer';footer.style.height='90px';document.querySelector('.match-module').append(footer);});
    for(const height of [90,128]){
      await page.evaluate(height=>document.querySelector('#qa-footer').style.height=height+'px',height);
      await page.waitForFunction(height=>Math.abs(innerHeight-document.querySelector('.wm-floating-search').getBoundingClientRect().bottom-height-12)<1,height);
    }
    await page.evaluate(()=>document.querySelector('#qa-footer').remove());
    await page.waitForFunction(()=>Math.abs(innerHeight-document.querySelector('.wm-floating-search').getBoundingClientRect().bottom-16)<1);
    await page.getByRole('link',{name:'작품 검색',exact:true}).click();await page.waitForURL('**/match/search');
    assert.equal(await page.locator('.wm-floating-search').count(),0,'no duplicate search action on search page');
    await page.goto(base+'/match/result/xys7o3_7JlgZl91b');await page.locator('.wm-result-title-mark').waitFor();
    await page.locator('.wm-floating-search').click();await page.waitForURL('**/match/search?*');
    assert.equal(new URL(page.url()).searchParams.get('from'),'/match/result/xys7o3_7JlgZl91b');
    for(const route of ['/match/test/intro','/match/test/genre-shelf/1','/match/test/duel/1','/match/test/avoidance']){
      await page.goto(base+route);assert.equal(await page.locator('.wm-floating-search').count(),0,route);
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,output,checks:['eight routes at 320/390/900px','warm extended 44px search action','12px measured footer gap / 16px without footer','fixed across page scroll','keyboard focus','navigation preserves return route','search/test screens excluded','all data writes blocked']}));
    await context.close();
  }finally{await browser.close();}
})().catch(error=>{console.error({name:error.name,message:error.message});process.exitCode=1;});
