/* Isolated denial cases, followed by an actual read-only service screenshot. */
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
  const {RECOMMENDATION_AGE_RESTRICTION_MESSAGE,RECOMMENDATION_SEARCH_POLICY_VERSION}=await import('../../src/features/match/config/recommendationPolicy.mjs');
  const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000',profile='xys7o3_7JlgZl91b';
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-recommendation-age-'));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'}),page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const original=await(await page.request.get(`${base}/api/v1/results/${profile}/recommendations`)).json();
    const liveSearch=await page.request.get(`${base}/api/v1/webtoons/search?q=${encodeURIComponent('북검')}&registrationPolicy=${RECOMMENDATION_SEARCH_POLICY_VERSION}`);
    assert.equal(liveSearch.headers()['cache-control'],'no-store');
    const candidates=(await liveSearch.json()).items;
    assert.ok(candidates.length&&candidates.every(item=>!item.recommendationRegistrationBlocked));
    const safe=candidates.find(item=>!original.items.some(saved=>saved.canonicalWebtoonId===item.canonicalWebtoonId));assert.ok(safe);
    let mode='fixture',saves=0,searches=0;
    await context.route('**/api/v1/**',route=>{
      const request=route.request(),url=new URL(request.url());
      const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
      if(url.pathname.includes('match-events')||url.pathname.includes('analytics'))return reply({accepted:true},202);
      if(request.method()==='PUT'){
        assert.equal(url.pathname,`/api/v1/results/${profile}/recommendations`);saves++;
        return reply({error:'RECOMMENDATION_AGE_VERIFICATION_REQUIRED'},403);
      }
      assert.ok(['GET','HEAD'].includes(request.method()),'all production writes are blocked');
      if(mode==='fixture'&&url.pathname.includes('/recommendation-comments/'))return reply({commentId:null,recommendationComment:null});
      if(mode==='fixture'&&url.pathname==='/api/v1/webtoons/search'){
        searches++;assert.equal(url.searchParams.get('registrationPolicy'),RECOMMENDATION_SEARCH_POLICY_VERSION);
        return reply({items:[{...safe,canonicalWebtoonId:'restricted-test',title:'격리된 등록 제한 검증 항목',recommendationRegistrationBlocked:true},safe]});
      }
      return route.continue();
    });
    const manager=`${base}/match/result/${profile}/recommendations`;
    await page.goto(manager);await page.getByRole('searchbox',{name:'추천할 웹툰 검색'}).fill('검증');await page.getByRole('button',{name:'검색',exact:true}).click();
    await page.locator('.wm-search-results').waitFor();assert.equal(searches,1);
    assert.equal(await page.getByText('격리된 등록 제한 검증 항목').count(),0,'restricted results never become selectable even if a stale response includes them');
    await page.locator('.wm-search-results').getByRole('button',{name:'추가',exact:true}).click();
    await page.locator('.wm-save-tray button').click();
    await page.getByRole('alert').filter({hasText:RECOMMENDATION_AGE_RESTRICTION_MESSAGE}).waitFor();assert.equal(saves,1);assert.equal(page.url(),manager);
    assert.ok((await page.locator('.wm-selected-list').innerText()).includes(safe.title),'a server denial keeps local edits intact');
    assert.equal(await page.locator('.wm-save-tray button').isEnabled(),true,'the user can adjust the list and retry');
    // Only actual current catalog data is used for the delivered screenshot.
    mode='live';await page.goto(manager);await page.getByRole('searchbox',{name:'추천할 웹툰 검색'}).fill('북검');await page.getByRole('button',{name:'검색',exact:true}).click();
    await page.locator('.wm-search-results').waitFor();await page.locator('.wm-registration-policy-note').waitFor();
    for(const width of [320,390,435]){await page.setViewportSize({width,height:844});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'policy note and results fit narrow screens');}
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.fonts.ready);
    await page.locator('.wm-search-section img').evaluateAll(images=>Promise.all(images.map(img=>img.decode().catch(()=>{}))));
    await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
    await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.ok(await page.locator('.wm-registration-policy-note').evaluate(note=>note.getBoundingClientRect().bottom<document.querySelector('.wm-save-tray').getBoundingClientRect().top),'the policy notice can be read above the fixed save tray');
    await page.locator('.wm-search-section').screenshot({path:path.join(output,'recommendation_registration_policy_live.png')});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,checks:['restricted stale results hidden','normal work selectable','403 has a clear age-verification notice','local selection survives denial','fresh policy search URL and no-store response','320/390/435px layout','actual service screenshot','all writes intercepted'],output},null,2));
    await context.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
