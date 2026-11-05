/* Real public catalog reads; every save is intercepted, never written to the DB. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium}=require('playwright');

(async()=>{
  const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000';
  const profile='xys7o3_7JlgZl91b';
  const resultPath=`/match/result/${profile}`;
  const managerPath=`${resultPath}/recommendations`;
  const apiPath=`/api/v1/results/${profile}/recommendations`;
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-manager-ui-'));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const original=await(await page.request.get(base+apiPath)).json();
    assert.ok(original.items.length>0,'existing public recommendations are available');
    let expected=original.items,returnedItems=null,mode='fail',saves=0,finishSave;
    let saveStarted;
    await context.route('**/api/v1/**',async route=>{
      const request=route.request(),url=new URL(request.url());
      const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
      if(url.pathname.includes('match-events')||url.pathname.includes('analytics'))return reply({accepted:true},202);
      if(request.method()==='GET'){
        if(url.pathname===`/api/v1/results/${profile}`){
          const response=await route.fetch();return route.fulfill({response,json:{...await response.json(),canManage:true}});
        }
        if(url.pathname===apiPath&&returnedItems)return reply({items:returnedItems});
        return route.continue();
      }
      assert.equal(url.pathname,apiPath,'no other mutations');assert.equal(request.method(),'PUT');
      saves++;
      assert.deepEqual(request.postDataJSON().recommendations,expected.map(item=>({canonicalWebtoonId:item.canonicalWebtoonId,recommendationComment:item.recommendationComment??null})));
      if(mode==='fail')return reply({error:'RECOMMENDATIONS_SAVE_FAILED'},503);
      if(mode==='hold')return new Promise(resolve=>{
        finishSave=async()=>{returnedItems=expected;await reply({items:expected});resolve();};saveStarted();
      });
      returnedItems=expected;return reply({items:expected});
    });
    await page.goto(base+resultPath);
    await page.getByRole('link',{name:'내 추천작 관리',exact:true}).click();
    await page.waitForURL(base+managerPath);
    assert.match(await page.locator('.wm-manager-hero h1').innerText(),/친구에게 추천할 작품을\s*골라 주세요/);
    assert.equal(await page.locator('.wm-manager-hero .wm-note').innerText(),'최대 10개까지 등록할 수 있어요.');
    for(const width of [320,390,435]){
      await page.setViewportSize({width,height:844});await page.waitForFunction(value=>innerWidth===value,width);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.ok(await page.locator('.wm-local-nav').evaluate(nav=>{
        const icon=nav.querySelector('svg').getBoundingClientRect(),link=nav.querySelector('a').getBoundingClientRect();
        return Math.abs((icon.top+icon.bottom-link.top-link.bottom)/2)<1&&link.width>=44&&link.height>=44&&nav.querySelector('a').textContent.trim()===''&&Boolean(nav.querySelector('a').getAttribute('aria-label'));
      }),'arrow-only back control stays centered with an accessible name and 44px touch target');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>innerWidth===390);
    await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
    await page.screenshot({path:path.join(output,'manager_header_live.png')});
    const edited='저장 실패 후에도 유지되는 추천 이유';
    expected=original.items.map((item,index)=>index===0?{...item,recommendationComment:edited}:item);
    await page.locator('.wm-comment-field textarea').first().fill(edited);
    await page.getByRole('button',{name:'추천작 저장',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'추천작을 저장하지 못했어요.'}).waitFor();
    assert.equal(page.url(),base+managerPath);
    assert.equal(await page.locator('.wm-comment-field textarea').first().inputValue(),edited);
    mode='hold';const started=new Promise(resolve=>{saveStarted=resolve;});
    await page.getByRole('button',{name:'추천작 저장',exact:true}).click();await started;
    assert.ok(await page.getByRole('button',{name:'저장 중…',exact:true}).isDisabled());
    assert.equal(page.url(),base+managerPath,'wait for a successful response before leaving');
    await finishSave();await page.waitForURL(base+resultPath);
    await page.locator('.wm-result-screen blockquote').filter({hasText:edited}).waitFor();
    assert.equal(await page.locator('.wm-floating-toast[role=status]').count(),0);
    assert.equal(saves,2);
    // Also cover saving an empty recommendation list from a direct manager URL.
    await page.goto(base+managerPath);await page.locator('.wm-selected-list').waitFor();
    while(await page.getByRole('button',{name:/추천작에서 삭제$/}).count())await page.getByRole('button',{name:/추천작에서 삭제$/}).first().click();
    expected=[];mode='success';
    await page.getByRole('button',{name:'추천작 저장',exact:true}).click();await page.waitForURL(base+resultPath);
    await page.locator('.wm-result-screen .wm-recommendation-empty').waitFor();
    assert.equal(await page.locator('.wm-result-screen .wm-recommendation-card').count(),0);
    assert.equal(saves,3);assert.deepEqual(errors,[]);
    const after=await(await page.request.get(base+apiPath)).json();
    assert.deepEqual(after.items,original.items,'actual saved recommendations are unchanged');
    console.log(JSON.stringify({ok:true,output,checks:['320/390/435px arrow/title alignment','updated wording','failure preserves edits','saving stays disabled until response','success returns without a toast','result reloads the updated list','empty save and direct entry','no database writes']},null,2));
    await context.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
