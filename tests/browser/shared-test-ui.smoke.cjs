/* Read-only browser layout regression runner. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium}=require('playwright');

(async()=>{
  const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000';
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-shared-test-ui-'));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
    // Never submit answers, create links or change any existing user data.
    await context.route('**/api/v1/**',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.fulfill({status:202,contentType:'application/json',body:'{"ok":true}'}));
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const pair=await (await page.request.get(`${base}/api/v1/challenges/mKOdmiLcE0JU/results/VIbseuqFQuk6RRDr`)).json();
    const profile=pair.challengerRecommendations[0].fitTargetPublicProfileId;
    const cases=[
      ...['intro','genre-shelf/1','genre-shelf/2','taste/setting','taste/appeal','taste/character-relationship','avoidance','recovery'].map(step=>({url:`/match/test/${step}`,href:'/match',label:'시작'})),
      {url:'/match/challenge/new',href:'/match',label:'시작'},
      {url:'/match/c/mKOdmiLcE0JU',href:'/match',label:'시작'},
      {url:`/match/share/personal?profilePublicId=${profile}`,href:`/match/result/${profile}`,label:'내 취향 결과'},
      {url:'/match/share/pair?challengeCode=mKOdmiLcE0JU&resultId=VIbseuqFQuk6RRDr',href:'/match/c/mKOdmiLcE0JU/match/VIbseuqFQuk6RRDr',label:'둘의 궁합'},
      {url:'/match/share/ranking?challengeCode=mKOdmiLcE0JU',href:'/match/c/mKOdmiLcE0JU/ranking',label:'전체 랭킹'},
    ];
    async function resize(width){
      await page.setViewportSize({width,height:844});
      await page.waitForFunction(value=>innerWidth===value,width);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    }
    async function header(expected){
      const nav=page.getByRole('navigation',{name:'화면 이동'});
      const link=nav.getByRole('link',{name:expected.label,exact:true});
      await link.waitFor();
      assert.equal(await link.getAttribute('href'),expected.href);
      assert.ok(await nav.evaluate(el=>{
        const link=el.querySelector('a'),icon=link.querySelector('svg').getBoundingClientRect(),label=link.querySelector('.match-screen-header-label').getBoundingClientRect();
        const logo=document.querySelector('.brand-bar__logo').getBoundingClientRect(),box=el.getBoundingClientRect(),center=rect=>(rect.top+rect.bottom)/2;
        return Math.abs((logo.left+logo.right)/2-innerWidth/2)<1&&Math.abs(center(logo)-center(box))<1&&Math.abs(center(icon)-center(box)-2)<1&&Math.abs(center(icon)-center(label))<1&&link.getBoundingClientRect().right<=logo.left-7&&icon.width===32&&getComputedStyle(link.querySelector('.match-screen-header-label')).fontSize==='16px'&&link.getBoundingClientRect().height>=44;
      }),`shared centered logo and non-overlapping optical alignment: ${expected.url}`);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow');
      const main=page.locator('.match-page:not(.wm-screen)').first();
      if(await main.count())assert.equal(await main.evaluate(el=>getComputedStyle(el).paddingTop),'12px','consistent compact header-to-content gap');
    }
    for(const item of cases){
      await page.goto(base+item.url);
      for(const width of [320,390,435]){await resize(width);await header(item);}
      if(item.url==='/match/test/genre-shelf/1'){
        await resize(390);await page.evaluate(()=>document.fonts.ready);
        await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
        await page.screenshot({path:path.join(output,'shared_test_header.png')});
      }
    }
    for(let index=1;index<=6;index++){
      const item={url:`/match/test/duel/${index}`,href:'/match',label:'시작'};
      await page.goto(base+item.url);
      await page.locator('.match-duel-card').first().waitFor();
      for(const width of [320,390,435]){
        await resize(width);await header(item);
        assert.ok(await page.locator('.match-duel-card').evaluateAll(cards=>cards.length===2&&cards.every(card=>{
          const image=card.querySelector('.match-duel-image').getBoundingClientRect(),genre=card.querySelector('.match-duel-genre'),g=genre.getBoundingClientRect(),title=card.querySelector('h2'),t=title.getBoundingClientRect();
          return genre.parentElement.classList.contains('match-duel-image')&&g.top>=image.top&&g.bottom<=image.bottom-9&&g.left>=image.left+9&&g.right<=image.right-9&&g.bottom<t.top&&parseFloat(getComputedStyle(genre).fontSize)>=14&&getComputedStyle(genre).color==='rgb(255, 255, 255)'&&getComputedStyle(genre).backgroundColor!=='rgba(0, 0, 0, 0)'&&title.scrollHeight<=title.clientHeight+1;
        })),`readable genre badges never overlap wrapped descriptions: duel ${index}, ${width}px`);
        assert.ok(await page.locator('.match-duel-caption').evaluate(el=>el.getBoundingClientRect().top-document.querySelector('.match-duel-grid').getBoundingClientRect().bottom>=15),'every duel has 16px spacing before the guide');
      }
      if(index===1){
        await resize(390);await page.evaluate(()=>document.fonts.ready);
        await page.locator('.match-duel-image img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
        await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
        await page.screenshot({path:path.join(output,'duel_genre_caption_fixed.png'),fullPage:true});
      }
    }
    for(const url of [`/match/result/${profile}`,'/match/c/mKOdmiLcE0JU/ranking','/match/c/mKOdmiLcE0JU/match/VIbseuqFQuk6RRDr','/match/work/wt_romance_ropan_016']){
      await page.goto(base+url);
      assert.equal(await page.locator('.match-screen-header.has-navigation').count(),0,'pages with dedicated headers do not gain a duplicate arrow');
    }
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(JSON.stringify({ok:true,commonRoutes:cases.length+6,widths:[320,390,435],checks:['shared centered header','home label and existing return targets','32px arrow and 16px label','2px optical correction','12px content gap','long labels do not overlap the logo','six duel genre labels contained inside images','wrapped descriptions remain unobstructed','16px guide spacing','dedicated headers preserved','no server mutations'],artifacts:output},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
