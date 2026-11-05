/* Compare real components using isolated fixtures; delivered images use only real API data. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
  const {buildReaderExplanation}=await import('../../src/features/match/engine/readerExplanationEngine.mjs');
  const {buildPairReading}=await import('../../src/features/match/engine/pairReadingEngine.mjs');
  const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000',output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-insight-style-'));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  const genres=[{genreKey:'murim',displayLabel:'무협',stars:8},{genreKey:'fantasy',displayLabel:'판타지',stars:3}];
  const snapshot={displayGenres:genres,answers:{appeal:['appeal_growth_training'],characterRelationship:['relationship_bond','character_effortful_protagonist']}};
  const personal={publicProfileId:'insight-style',nickname:'취향친구',canManage:false,topGenres:genres,displayGenres:genres,wellMatchedLabels:['성장','동료·가족','노력형'],lessMatchedLabels:['반복 전개'],readerExplanation:buildReaderExplanation(snapshot)};
  const pair={ownerNickname:'취향친구',challengerNickname:'감상친구',ownerGenreKey:'murim',challengerGenreKey:'murim',ownerTopGenres:genres,challengerTopGenres:genres,score:75,band:{label:'꽤 잘 맞음',subcopy:''},sharedGenres:['무협','판타지'],sharedTasteLabels:['성장','동료·가족','노력형'],differentGenres:[],ownerRecommendedGenres:[],challengerRecommendedGenres:[],ownerRecommendations:[],challengerRecommendations:[],recommendationTasteApplied:false,trustSentence:'옛 문구',pairReading:buildPairReading({ownerSnapshot:snapshot,challengerSnapshot:snapshot,score:75}),rank:1,entryCount:1};
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await context.route('**/api/v1/**',route=>{
      const p=new URL(route.request().url()).pathname;
      return route.fulfill({json:p==='/api/v1/results/insight-style'?personal:p.endsWith('/results/insight-pair')?pair:p.endsWith('/recommendations')?{items:[]}:{active:false}});
    });
    async function summaryStyle(){
      return page.locator('.wm-taste-summary').evaluate(el=>{
        const css=getComputedStyle(el),row=getComputedStyle(el.querySelector('.wm-taste-summary-row')),label=getComputedStyle(el.querySelector('.wm-taste-summary-label')),chip=getComputedStyle(el.querySelector('.wm-taste-chips li')),value=getComputedStyle(el.querySelector('.wm-taste-chips strong'));
        return {card:{padding:css.padding,radius:css.borderRadius,border:css.borderColor,background:css.backgroundColor},row:{display:row.display,columns:row.gridTemplateColumns.split(' ').length},label:{font:label.fontFamily,size:label.fontSize,weight:label.fontWeight,color:label.color},chip:{radius:chip.borderRadius,background:chip.backgroundColor,padding:chip.padding,size:value.fontSize,weight:value.fontWeight,color:value.color}};
      });
    }
    async function storyStyle(){
      return page.locator('.wm-story-card').evaluate(el=>{
        const style=selector=>{const s=getComputedStyle(el.querySelector(selector));return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,color:s.color,borderLeft:s.borderLeftWidth,borderColor:s.borderLeftColor,paddingLeft:s.paddingLeft};};
        const card=getComputedStyle(el),scene=getComputedStyle(el.querySelector('.wm-story-scene'));
        return {card:{padding:card.padding,radius:card.borderRadius,border:card.borderColor},eyebrow:style('.wm-story-eyebrow'),title:style('.wm-story-title'),body:style('.wm-story-copy'),subtitle:style('.wm-story-subtitle'),scene:{padding:scene.padding,radius:scene.borderRadius,background:scene.backgroundColor}};
      });
    }
    async function fits(selector){
      assert.ok(await page.locator(selector).evaluate(el=>{
        const box=el.getBoundingClientRect();
        return document.documentElement.scrollWidth<=innerWidth&&[...el.querySelectorAll('h2,h3,p,li,blockquote')].every(child=>{const r=child.getBoundingClientRect();return child.scrollWidth<=child.clientWidth+1&&r.left>=box.left-.5&&r.right<=box.right+.5;});
      }),selector);
    }
    async function labelsAboveValues(){
      assert.ok(await page.locator('.wm-taste-summary-row').evaluateAll(rows=>rows.every(row=>{
        const heading=row.firstElementChild.getBoundingClientRect(),values=row.lastElementChild.getBoundingClientRect();
        return values.top>=heading.bottom+7&&Math.abs(values.left-heading.left)<1;
      })),'all personal/pair labels sit above their full-width values');
    }
    for(const width of[320,375,390,435,540,900]){
      await page.setViewportSize({width,height:844});await page.goto(base+'/match/result/insight-style');await page.locator('.wm-story-card').waitFor();await page.evaluate(()=>document.fonts.ready);
      const summary=await summaryStyle(),story=await storyStyle();await fits('.wm-taste-summary');await fits('.wm-story-card');
      assert.equal(summary.label.size,'15px');assert.equal(summary.chip.size,'14px');assert.equal(summary.row.display,'grid');assert.equal(summary.row.columns,1);await labelsAboveValues();
      assert.equal(story.title.size,'19px');assert.equal(story.eyebrow.size,'13px');assert.equal(story.subtitle.size,'13px');assert.equal(story.body.size,'15px');
      assert.equal(story.subtitle.borderLeft,'3px');assert.equal(story.subtitle.borderColor,'rgb(0, 191, 220)');assert.equal(story.subtitle.paddingLeft,'9px');
      assert.equal(story.card.padding,'18px 16px');assert.equal(story.scene.padding,'14px');
      assert.deepEqual(await page.locator('.wm-avoidance li').evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color})),{background:'rgb(238, 240, 242)',color:'rgb(75, 80, 87)'});
      await page.goto(base+'/match/c/insight-test/match/insight-pair');await page.locator('.wm-pair-common').waitFor();await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.getByText('우리의 취향 접점',{exact:true}).count(),0,'redundant section title is removed');
      assert.equal(await page.locator('.wm-pair-common').getByRole('heading',{level:2}).count(),2,'genre and taste remain the visible section headings');
      assert.deepEqual(await summaryStyle(),summary,`same summary family at ${width}px`);await fits('.wm-taste-summary');await labelsAboveValues();
      assert.equal(await page.locator('.wm-pair-row-icon').count(),0,'oversized boxed icons removed');
      assert.equal(await page.locator('.wm-pair-labels .wm-taste-icon').count(),3,'real taste values reuse personal pictograms');
      await page.getByRole('tab',{name:'비교 상세',exact:true}).click();
      assert.deepEqual(await storyStyle(),story,`same editorial hierarchy at ${width}px`);await fits('.wm-story-card');await fits('.wm-pair-comparison-card');
      assert.equal(await page.getByRole('heading',{name:'서로 다른 장르',exact:true}).count(),0);
    }
    assert.deepEqual(errors,[]);await context.close();

    // Tall capture viewport keeps fixed action bars outside the actual card images; no content is altered.
    const liveContext=await browser.newContext({viewport:{width:390,height:2400},deviceScaleFactor:2,reducedMotion:'reduce'}),live=await liveContext.newPage();
    await liveContext.route('**/api/v1/**',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.fulfill({status:202,json:{ok:true}}));
    await live.goto(base+'/match/result/xys7o3_7JlgZl91b');await live.locator('.wm-reader-explanation').waitFor();await live.evaluate(()=>document.fonts.ready);await live.addStyleTag({content:'nextjs-portal{display:none!important}'});
    const clip=await live.evaluate(()=>{const top=document.querySelector('.wm-interpretation').getBoundingClientRect(),bottom=document.querySelector('.wm-reader-explanation').getBoundingClientRect();return {x:top.x,y:top.y+scrollY,width:top.width,height:bottom.bottom-top.top};});
    await live.screenshot({path:path.join(output,'personal_insights_live.png'),clip});
    await live.locator('.wm-interpretation').screenshot({path:path.join(output,'personal_taste_stacked_live.png')});
    const rankingResponse=await live.request.get(base+'/api/v1/challenges/mKOdmiLcE0JU/ranking?limit=20');assert.equal(rankingResponse.status(),200);
    const ranking=await rankingResponse.json();
    let pairId='VIbseuqFQuk6RRDr';
    // Prefer an existing pair with shared genres for visual evidence, never invent missing values.
    const entry=(ranking.top20??[]).find(entry=>entry.resultId&&entry.sharedGenres?.length);
    if(entry)pairId=entry.resultId;
    await live.goto(base+`/match/c/mKOdmiLcE0JU/match/${encodeURIComponent(pairId)}`);await live.locator('.wm-pair-common').waitFor();await live.evaluate(()=>document.fonts.ready);await live.addStyleTag({content:'nextjs-portal{display:none!important}'});
    await live.locator('.wm-pair-common').screenshot({path:path.join(output,'pair_taste_summary_live.png')});
    await live.getByRole('tab',{name:'비교 상세',exact:true}).click();await live.locator('.wm-pair-reading').screenshot({path:path.join(output,'pair_story_unified_live.png')});
    await liveContext.close();
    console.log(JSON.stringify({ok:true,output,checks:['same summary labels/chips across both pages','same title/eyebrow/body/subtitle/card styling','320/375/390/435/540/900px','labels above full-width values at every viewport','neutral grey avoidance retained','shared taste pictograms','no clipping','no extra difference card','real-data captures only','all data writes blocked']}));
  }finally{await browser.close();}
})().catch(error=>{console.error({name:error.name,message:error.message});process.exitCode=1;});
