/* Node browser-test runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {chromium} = require('playwright');

(async()=>{
  const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000';
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-work-detail-'));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
    const page=await context.newPage();
    page.setDefaultTimeout(25000);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/v1/analytics/**',route=>route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
    await page.route('**/api/v1/match-events',route=>route.fulfill({status:202,contentType:'application/json',body:'{"accepted":true}'}));
    const pairPath='/match/c/mKOdmiLcE0JU/match/VIbseuqFQuk6RRDr?from=ranking';
    const pairResponse=await page.request.get(`${base}/api/v1/challenges/mKOdmiLcE0JU/results/VIbseuqFQuk6RRDr`);
    assert.equal(pairResponse.status(),200);
    const pair=await pairResponse.json();
    const primaryRecommendations=pair.ownerRecommendations.length?pair.ownerRecommendations:pair.challengerRecommendations;
    const first=primaryRecommendations[0];
    const profile=pair.challengerRecommendations[0].fitTargetPublicProfileId;
    assert.ok(first.fitTargetPublicProfileId);
    for(const item of [...pair.ownerRecommendations,...pair.challengerRecommendations]){
      const response=await page.request.get(`${base}/api/v1/webtoons/${item.canonicalWebtoonId}?profile=${item.fitTargetPublicProfileId}`);
      assert.equal(response.status(),200);
      assert.match(response.headers()['cache-control'],/private, no-store/);
      const detail=await response.json();
      assert.equal(detail.fit?.highlighted??false,item.tasteFitHighlighted,'detail and pair highlights use the same recipient and fit calculation');
      for(const secret of ['recommendationVector','raw_data','anonymousId','source_refs','tasteVector'])assert.equal(secret in detail,false);
    }
    const anonymous=await (await page.request.get(`${base}/api/v1/webtoons/wt_romance_ropan_016`)).json();
    assert.equal(anonymous.fit,null,'an anonymous viewer is not shown a fabricated fit score');
    assert.equal(anonymous.statusLabel,'휴재','current seed status overrides the old demo');
    assert.ok(anonymous.creators.length===2&&(/^\/match\/covers\//.test(anonymous.coverUrl)||/^https:\/\/[a-z0-9]{20}\.supabase\.co\/storage\/v1\/object\/public\/webtoon-covers\//.test(anonymous.coverUrl)));
    assert.equal((await page.request.get(`${base}/api/v1/webtoons/does-not-exist`)).status(),404);

    await page.goto(base+pairPath);
    await page.getByRole('tab',{name:'궁합 요약',exact:true}).waitFor();
    await page.getByRole('link',{name:first.title,exact:true}).first().click();
    await page.waitForURL(/\/match\/work\//);
    await page.getByRole('heading',{name:first.title,exact:true,level:1}).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('profile'),first.fitTargetPublicProfileId);
    await page.getByRole('button',{name:'이전 화면으로 돌아가기',exact:true}).click();
    await page.waitForURL(base+pairPath);
    await page.getByRole('tab',{name:'궁합 요약',exact:true}).waitFor();
    const pairTrack=page.locator('.wm-pair-work-track').first();
    if(await pairTrack.locator(':scope > li').count()>1){
      await pairTrack.focus();await page.keyboard.press('ArrowRight');
      await page.waitForFunction(()=>document.querySelector('.wm-pair-carousel-controls>span')?.textContent.startsWith('2 /'));
      const item=primaryRecommendations[1];
      await page.getByRole('link',{name:`${item.title} 작품 상세 보기`,exact:true}).first().click();
      await page.waitForURL(/\/match\/work\//);
      await page.getByRole('heading',{name:item.title,level:1,exact:true}).waitFor();
      await page.getByRole('button',{name:'이전 화면으로 돌아가기'}).click();
      await page.waitForURL(base+pairPath);
      await page.waitForFunction(()=>document.querySelector('.wm-pair-carousel-controls>span')?.textContent.startsWith('2 /'));
    }
    const detailPath=`/match/work/wt_romance_ropan_016?profile=${profile}&returnTo=${encodeURIComponent(pairPath)}`;
    await page.goto(base+detailPath);
    await page.getByRole('heading',{name:'작전명 순정',level:1,exact:true}).waitFor();
    await page.locator('.wm-work-hero img').evaluate(img=>img.decode());
    await page.addStyleTag({content:'nextjs-portal { display:none !important; }'});
    await page.screenshot({path:path.join(output,'work_detail_live_start.png'),fullPage:true});
    const stage=()=>page.locator('.wm-work-page').getAttribute('data-stage');
    const settled=()=>page.waitForFunction(()=>!document.querySelector('.wm-work-page')?.hasAttribute('data-settling'));
    for(const width of [320,390,435,768]){
      await page.setViewportSize({width,height:844});
      await page.waitForFunction(value=>innerWidth===value,width);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      if(width===390){
        assert.equal(await page.locator('.wm-work-summary').evaluate(el=>getComputedStyle(el).paddingBottom),'10px');
        assert.equal(await page.locator('.wm-work-fit').evaluate(el=>getComputedStyle(el).marginTop),'0px');
        assert.equal(await page.locator('.wm-work-fit').evaluate(el=>getComputedStyle(el).paddingTop),'8px');
        assert.ok(await page.locator('.wm-work-summary-heading').evaluate(el=>{
          const title=el.querySelector('.wm-work-summary-title').getBoundingClientRect(),fit=el.querySelector('.wm-work-fit').getBoundingClientRect();
          return title.right+10<=fit.left&&Math.abs((title.top+title.bottom)/2-(fit.top+fit.bottom)/2)<1;
        }),'title and score share a compact row');
        assert.ok(await page.locator('.wm-work-sheet').evaluate(el=>el.getBoundingClientRect().height<=300),'initial sheet leaves most of the cover visible');
        assert.equal(await page.locator('.wm-work-open').evaluate(el=>getComputedStyle(el).paddingTop),'8px');
        assert.equal(await page.locator('.wm-work-summary h1').evaluate(el=>getComputedStyle(el).fontSize),'28px');
        assert.ok(await page.locator('.wm-work-open').evaluate(el=>el.getBoundingClientRect().height>=48));
        assert.ok(await page.locator('.wm-work-dialog-body').evaluate(el=>el.scrollHeight<=el.clientHeight+2),'compact summary still fits without hidden content');
      }
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no page overflow ${width}`);
      assert.equal(await page.locator('.wm-work-hero').evaluate(el=>el.getBoundingClientRect().top),0,'cover starts behind the home logo at the top edge');
      assert.equal(await page.locator('.wm-work-info-open').count(),0,'no extra info links in the summary or reading flow');
      assert.ok(await page.locator('.wm-work-hero img').evaluate(img=>getComputedStyle(img).objectFit==='cover'&&Math.abs(img.getBoundingClientRect().width-img.parentElement.getBoundingClientRect().width)<1),'cover fills the full available width');
      await page.locator('.wm-work-open').click();
      const dialog=page.getByRole('dialog');
      await dialog.waitFor({state:'visible'});
      assert.equal(await dialog.getByRole('tab',{name:'궁합 · 소개'}).getAttribute('aria-selected'),'true');
      let expandedHeight;
      for(const tab of ['궁합 · 소개','작품 정보']){
        await dialog.getByRole('tab',{name:tab,exact:true}).click();
        await settled();
        const tabHeight=await dialog.evaluate(el=>el.getBoundingClientRect().height);
        if(expandedHeight===undefined)expandedHeight=tabHeight;
        else assert.equal(tabHeight,expandedHeight,`tabs share the same sheet height ${width}`);
        assert.equal(await page.locator('#wm-work-reasons').isVisible(),tab==='궁합 · 소개','only the selected tab content is shown');
        assert.equal(await page.locator('#wm-work-info').isVisible(),tab==='작품 정보');
        assert.ok(await dialog.evaluate(el=>{
          const rect=el.getBoundingClientRect();const footer=el.querySelector('footer')?.getBoundingClientRect();
          return rect.left>=-1&&rect.right<=innerWidth+1&&rect.bottom<=innerHeight+1&&el.scrollWidth<=el.clientWidth+1&&(!footer||footer.bottom<=innerHeight+1);
        }),`sheet and CTA fit ${width} ${tab}`);
        assert.ok(await dialog.locator('.wm-work-reading').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`panel text fits ${width} ${tab}`);
      }
      assert.ok(await dialog.getByText('휴재',{exact:true}).isVisible());
      assert.equal(await dialog.getByText(/설명 예시|기존 시안의 작품 정보 기준|네이버웹툰에서 보기/).count(),0);
      if(width===390){
        await page.screenshot({path:path.join(output,'work_detail_live_info.png')});
        await dialog.getByRole('tab',{name:'궁합 · 소개'}).click();
        await page.screenshot({path:path.join(output,'work_detail_live_reasons.png')});
      }
      await page.keyboard.press('Escape');
      await dialog.waitFor({state:'hidden'});
      await settled();
    }
    // The demo expands only through the handle/buttons, not ordinary body scrolling.
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.mouse.move(190,410);
    await page.mouse.wheel(0,160);
    assert.equal(await stage(),'collapsed','wheel must not unexpectedly open the sheet');
    const grip=page.locator('.wm-work-grab');
    const height=()=>page.locator('.wm-work-sheet').evaluate(el=>el.getBoundingClientRect().height);
    const heroHeight=await page.locator('.wm-work-hero').evaluate(el=>el.clientHeight);
    const footerTop=await page.locator('.wm-work-action').evaluate(el=>el.getBoundingClientRect().top);
    const drag=async(dx,dy,release=true)=>{
      const box=await grip.boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
      await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});
      if(release)await page.mouse.up();
    };
    const closedHeight=await height();
    await drag(0,0);assert.equal(await height(),closedHeight,'press/click alone must be inert');
    await drag(90,-12);assert.equal(await stage(),'collapsed','horizontal gesture stays inert');
    await drag(0,-32,false);
    assert.ok(Math.abs(await height()-closedHeight-32)<=2,'panel follows actual finger travel');
    const morph=await page.locator('.wm-work-page').evaluate(el=>({summary:Number(el.style.getPropertyValue('--summary-opacity')),reading:Number(el.style.getPropertyValue('--reading-opacity'))}));
    assert.ok(morph.summary>0&&morph.summary<1&&morph.reading>0&&morph.reading<1,'both layers progressively crossfade');
    await page.mouse.up();await settled();
    assert.equal(await stage(),'collapsed','under 64px springs back');
    assert.equal(await height(),closedHeight);
    await drag(0,-63);await settled();assert.equal(await stage(),'collapsed','63px does not commit');
    await drag(0,-65);await settled();assert.equal(await stage(),'reasons','64px upward commits');
    const sheet=page.getByRole('dialog');
    await sheet.waitFor({state:'visible'});
    assert.equal(await sheet.getByRole('tab',{name:'궁합 · 소개'}).getAttribute('aria-selected'),'true');
    const scrollBody=sheet.locator('.wm-work-dialog-body');
    await scrollBody.hover();
    await page.mouse.wheel(0,650);
    await page.waitForTimeout(180);
    assert.equal(await stage(),'reasons','scrolling content never opens the info stage');
    await drag(0,-85);await settled();assert.equal(await stage(),'reasons','upward handle drag on reading does not open info');
    await scrollBody.evaluate(el=>el.scrollTop=80);
    const savedScroll=await scrollBody.evaluate(el=>el.scrollTop);
    await sheet.getByRole('tab',{name:'작품 정보',exact:true}).click();await settled();
    await page.waitForFunction(()=>document.activeElement?.textContent==='작품 정보');
    assert.equal(await stage(),'info');
    assert.ok(await height()>=closedHeight);
    assert.equal(await page.locator('.wm-work-hero').evaluate(el=>el.clientHeight),heroHeight,'cover never jumps between stages');
    assert.equal(await page.locator('.wm-work-action').evaluate(el=>el.getBoundingClientRect().top),footerTop,'one stationary CTA');
    assert.equal(await page.locator('.wm-work-watch').count(),1);
    await scrollBody.evaluate(el=>el.scrollTop=120);
    const savedInfoScroll=await scrollBody.evaluate(el=>el.scrollTop);
    await sheet.getByRole('tab',{name:'궁합 · 소개',exact:true}).click();
    await page.waitForFunction(saved=>Math.abs(document.querySelector('.wm-work-dialog-body').scrollTop-saved)<=2,savedScroll);
    await sheet.getByRole('tab',{name:'작품 정보',exact:true}).click();
    await page.waitForFunction(saved=>Math.abs(document.querySelector('.wm-work-dialog-body').scrollTop-saved)<=2,savedInfoScroll);
    await drag(0,65);await settled();assert.equal(await stage(),'collapsed','down from info collapses in one gesture');
    await grip.focus();await page.keyboard.press('ArrowUp');await settled();
    assert.equal(await stage(),'reasons');
    assert.ok(Math.abs(await scrollBody.evaluate(el=>el.scrollTop)-savedScroll)<=2,'reopening preserves reading position');
    await page.locator('.wm-work-cover-close').click({position:{x:195,y:64}});await settled();
    assert.equal(await stage(),'collapsed','exposed cover tap closes');
    await grip.focus();await page.keyboard.press('Enter');await settled();assert.equal(await stage(),'reasons');
    await grip.focus();await page.keyboard.press('ArrowDown');await settled();assert.equal(await stage(),'collapsed');
    await drag(0,-30,false);await page.keyboard.press('Escape');await page.mouse.up();await settled();
    assert.equal(await stage(),'collapsed','Escape cancels a drag without committing');
    for(const size of [{width:844,height:390},{width:320,height:568}]){
      await page.setViewportSize(size);await page.locator('.wm-work-open').click();await settled();
      assert.ok(await scrollBody.evaluate(el=>el.clientHeight>=64),'short viewport retains a readable body');
      const before=await height();
      await sheet.getByRole('tab',{name:'작품 정보',exact:true}).click();
      assert.equal(await height(),before,'tabs remain visible and keep one height on short screens');
      assert.ok(await page.locator('.wm-work-action').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+1));
      await sheet.getByRole('button',{name:'작품 정보 접기',exact:true}).click();await settled();
    }
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('heading',{name:'작전명 순정',level:1,exact:true}).waitFor({state:'visible'});

    // A real touch-enabled mobile context, separate from the desktop wheel session.
    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const phone=await mobile.newPage();
    await phone.route('**/api/v1/match-events',route=>route.fulfill({status:202,contentType:'application/json',body:'{"accepted":true}'}));
    await phone.goto(base+detailPath);
    await phone.getByRole('heading',{level:1}).waitFor();
    await phone.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    const phoneSheet=phone.getByRole('dialog');
    const cdp=await mobile.newCDPSession(phone);
    async function swipe(from,to){
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:from}]});
      for(let step=1;step<=8;step++){
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y:from+(to-from)*step/8}]});
        await phone.waitForTimeout(25);
      }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await phone.waitForTimeout(850);
    }
    await swipe(250,150);
    assert.equal(await phone.locator('.wm-work-page').getAttribute('data-stage'),'collapsed','cover swipe does not expand');
    let gripBox=await phone.locator('.wm-work-grab').boundingBox();
    await swipe(gripBox.y+22,gripBox.y-60);
    await phoneSheet.waitFor({state:'visible'});
    await swipe(600,250);
    assert.equal(await phone.locator('.wm-work-page').getAttribute('data-stage'),'reasons','touch reading keeps the current stage');
    await phoneSheet.getByRole('tab',{name:'작품 정보',exact:true}).click();
    await phone.waitForFunction(()=>document.querySelector('#wm-work-info-tab')?.getAttribute('aria-selected')==='true');
    gripBox=await phone.locator('.wm-work-grab').boundingBox();
    await swipe(gripBox.y+22,gripBox.y+110);
    await phoneSheet.waitFor({state:'hidden'});
    await cdp.detach();
    await mobile.close();
    await page.setViewportSize({width:390,height:844});
    // Final capture uses a real saved recommendation, without changing user data.
    await page.goto(`${base}/match/work/${first.canonicalWebtoonId}?profile=${profile}`);
    await page.getByRole('heading',{name:first.title,level:1,exact:true}).waitFor();
    await page.locator('.wm-work-hero img').evaluate(img=>img.decode());
    await page.addStyleTag({content:'nextjs-portal { display:none !important; }'});
    await page.screenshot({path:path.join(output,'work_detail_compact_summary.png')});
    await page.goto(`${base}/match/work/does-not-exist`);
    await page.getByRole('heading',{name:'작품을 찾지 못했어요.'}).waitFor();
    assert.equal(await page.locator('.wm-work-fit').count(),0);

    // Missing fields and long title are isolated UI tests, never user-facing artifacts.
    await page.route('**/api/v1/webtoons/ui-test',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...anonymous,title:'제목이 아무리 길어도 잘리지 않고 화면 너비에 맞게 여러 줄로 자연스럽게 배치되는 작품 상세 화면',coverUrl:null,introduction:null,creators:[],contentLabels:[],appreciationPoints:[],artStyles:[],statusLabel:null,ageRating:null,officialUrl:null,fit:null})}));
    await page.goto(`${base}/match/work/ui-test`);
    await page.getByRole('heading',{level:1}).waitFor();
    for(const width of [320,390]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      assert.equal(await page.locator('.wm-work-fit,.wm-work-open,.wm-work-action').count(),0);
      assert.ok(await page.getByRole('img',{name:'작품 커버 미등록'}).isVisible());
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,widths:[320,390,435,768],liveRecommendations:[...pair.ownerRecommendations,...pair.challengerRecommendations].length,checks:['same fit','no private vector leak','anonymous fallback','live status','internal navigation','carousel restoration','full-width cover','no duplicate info links','equal-height tabs','tab-specific content and reading position','persistent staged sheet','64px threshold','live drag morph','short/horizontal/cancelled gestures','body scroll isolation','stationary CTA and cover','keyboard and touch','visible short-viewport tabs','missing data','long title','404'],artifacts:output},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
