/* Held result requests prove footer geometry before and after fresh ownership. No DB writes. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000';
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  for(const width of [320,390,540])for(const canManage of [true,false])for(const code of ['active-map',null]){
   const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'}),page=await context.newPage();
   const profile='footer-loading',genres=[{genreKey:'murim',displayLabel:'무협',stars:8}];
   const result={publicProfileId:profile,nickname:'웹툰핏',canManage,activeChallengeCode:canManage?code:null,displayGenres:genres,topGenres:genres,wellMatchedLabels:[],lessMatchedLabels:[]};
   await context.addInitScript(result=>localStorage.setItem('webtoon-match:public-result:v1:'+result.publicProfileId,JSON.stringify(result)),result);
   let release,challengeReads=0;
   await context.route('**/api/v1/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname===`/api/v1/results/${profile}`){await new Promise(resolve=>{release=resolve;});return route.fulfill({json:result});}
    if(url.pathname==='/api/v1/challenges')challengeReads++;
    return route.fulfill({json:{items:[]}});
   });
   await page.goto(base+'/match/result/'+profile);await page.locator('.wm-result-title-mark').waitFor();await page.evaluate(()=>document.fonts.ready);
   const footer=page.locator('.wm-result-actions');
   const geometry=()=>footer.locator('.match-button').evaluateAll(items=>items.map(el=>{
    const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {text:el.textContent,x:r.x,y:r.y,width:r.width,height:r.height,background:s.backgroundColor,opacity:s.opacity,font:s.fontSize};
   }));
   const before=await geometry();assert.equal(before.length,canManage?3:2);
   assert.equal(await footer.locator('a[href*="/ranking"]').count(),0,'cached authority never creates a live owner link');
   assert.ok(before.every(item=>!item.text.includes('확인 중')),'no intermediate loading labels');
   release();
   if(canManage)await page.locator('.wm-nickname-edit').waitFor();
   else await page.waitForFunction(()=>!document.querySelector('.wm-result-action-preview'));
   assert.deepEqual(await geometry(),before,'same count, labels, geometry, font, colors and opacity across refresh');
   if(canManage)assert.equal(await footer.locator('a').first().getAttribute('href'),code?'/match/c/active-map/ranking':'/match/challenge/new');
   assert.equal(challengeReads,0,'result does not issue a separate active-challenge lookup');
   await context.close();
  }
  console.log(JSON.stringify({ok:true,checks:['12 cached-owner/visitor cases at 320/390/540px','active map and no map','same footer from first cached frame','verified owner links only','no extra challenge requests']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
