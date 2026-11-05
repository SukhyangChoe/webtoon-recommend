/* Synthetic inputs test rendering only. Delivered screenshot uses an existing real pair, with writes blocked. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
  const {buildPairReading}=await import('../../src/features/match/engine/pairReadingEngine.mjs');
  const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000';
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-pair-reading-'));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  const snapshot=(genre,appeal=[],characterRelationship=[])=>({displayGenres:[{genreKey:genre,stars:8}],answers:{appeal,characterRelationship}});
  const cases=[
    [snapshot('murim',['appeal_growth_training']),snapshot('murim',['appeal_growth_training']),75,'murim_growth'],
    [snapshot('romance',[],['relationship_slow_build']),snapshot('romance',[],['relationship_slow_build']),85,'romance_slow'],
    [snapshot('action',[],['relationship_bond']),snapshot('romance',[],['relationship_bond']),45,'shared_bond'],
    [snapshot('action',[],['relationship_direct_chemistry']),snapshot('romance',[],['relationship_slow_build']),45,'contrast_slow_direct'],
    [null,null,0,'fallback_unknown'],
  ];
  const common={ownerNickname:'취향친구',challengerNickname:'감상친구',ownerGenreKey:'murim',challengerGenreKey:'romance',band:{label:'꽤 잘 맞음',subcopy:''},sharedGenres:[],differentGenres:[],ownerRecommendedGenres:[],challengerRecommendedGenres:[],ownerRecommendations:[],challengerRecommendations:[],sharedTasteLabels:[],recommendationTasteApplied:false,trustSentence:'이전 성공 확률 문구',rank:1,entryCount:1};
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    let pair;
    await context.route('**/api/v1/**',route=>route.fulfill({json:route.request().url().includes('/results/reading-fixture')?pair:{ok:true}}));
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    for(const [ownerSnapshot,challengerSnapshot,score,key]of cases){
      const pairReading=buildPairReading({ownerSnapshot,challengerSnapshot,score});assert.equal(pairReading.sceneKey,key);
      pair={...common,score,pairReading};
      await page.goto(base+'/match/c/reading-test/match/reading-fixture');
      await page.getByRole('tab',{name:'비교 상세',exact:true}).click();
      const reading=page.locator('.wm-pair-reading');
      assert.equal(await page.getByRole('heading',{name:'서로 다른 장르',exact:true}).count(),0,'redundant genre differences card is removed without changing TOP 3 or the reading');
      assert.equal(await reading.locator('h3').innerText(),'둘이 같이 보면');
      assert.equal(await reading.locator('blockquote p').count(),2);
      assert.equal(await reading.locator('.wm-pair-reading-punchline').innerText(),pairReading.punchline);
      assert.equal(await reading.getByText('이전 성공 확률 문구',{exact:true}).count(),0);
      for(const width of[320,390,540]){
        await page.setViewportSize({width,height:844});await page.evaluate(()=>document.fonts.ready);
        assert.ok(await reading.evaluate(el=>{
          const box=el.getBoundingClientRect();
          return document.documentElement.scrollWidth<=innerWidth&&[...el.querySelectorAll('h2,h3,p,blockquote')].every(item=>{
            const r=item.getBoundingClientRect();return r.left>=box.left&&r.right<=box.right&&item.scrollWidth<=item.clientWidth+1;
          });
        }),key+'/'+width);
      }
      await page.getByRole('tab',{name:'궁합 요약',exact:true}).click();
      assert.equal(await reading.isVisible(),false,'reading stays in comparison details, not duplicated in summary');
    }
    pair={...common,score:75};await page.goto(base+'/match/c/reading-test/match/reading-fixture');
    await page.getByRole('tab',{name:'비교 상세',exact:true}).click();
    assert.ok(await page.locator('.wm-pair-reading').getByText('“어디가 좋았어?”',{exact:false}).isVisible(),'older API shape has a safe neutral fallback, not old probability language');
    assert.deepEqual(errors,[]);await context.close();

    const liveContext=await browser.newContext({viewport:{width:390,height:1000},deviceScaleFactor:2,reducedMotion:'reduce'});
    await liveContext.route('**/api/v1/**',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.fulfill({status:202,json:{ok:true}}));
    const live=await liveContext.newPage();live.on('pageerror',error=>errors.push(error.message));
    const responsePromise=live.waitForResponse(response=>response.url().includes('/api/v1/challenges/mKOdmiLcE0JU/results/VIbseuqFQuk6RRDr'));
    await live.goto(base+'/match/c/mKOdmiLcE0JU/match/VIbseuqFQuk6RRDr?from=ranking');
    const response=await responsePromise;assert.equal(response.status(),200);
    const real=await response.json();assert.equal(real.pairReading.version,'pair_reading_v1');
    assert.match(response.headers()['cache-control'],/no-store/);
    assert.deepEqual(Object.keys(real.pairReading).sort(),['version','sceneKey','intro','dialogue','scene','punchline'].sort(),'API exposes copy only, no private comparison vectors or answers');
    await live.getByRole('tab',{name:'비교 상세',exact:true}).click();
    const reading=live.locator('.wm-pair-reading');
    assert.equal(await reading.locator('.wm-pair-reading-punchline').innerText(),real.pairReading.punchline);
    assert.equal(await reading.locator('blockquote p').count(),2);
    assert.doesNotMatch(await reading.innerText(),/성공 확률|실패 확률/);
    await live.evaluate(()=>document.fonts.ready);await live.addStyleTag({content:'nextjs-portal{display:none!important}'});
    await reading.scrollIntoViewIfNeeded();await reading.screenshot({path:path.join(output,'pair_reading_live.png')});
    await live.setViewportSize({width:390,height:1400});
    const comparison=live.locator('#pair-comparison-panel');
    assert.equal(await comparison.getByRole('heading',{name:'서로 다른 장르',exact:true}).count(),0);
    assert.ok(await comparison.getByRole('heading',{name:'각자의 취향 TOP 3',exact:true}).isVisible());
    await comparison.screenshot({path:path.join(output,'pair_comparison_without_genre_difference_live.png')});
    assert.deepEqual(errors,[]);await liveContext.close();
    console.log(JSON.stringify({ok:true,output,liveSceneKey:real.pairReading.sceneKey,checks:['five actual engine scenarios at 320/390/540px','two-line dialogue and final punchline','no overflow or probability language','legacy API fallback','tabs preserved','actual live API/render agree','no-store','no raw private answers exposed','all UI writes blocked']}));
  }finally{await browser.close();}
})().catch(error=>{console.error({name:error.name,message:error.message});process.exitCode=1;});
