/* Delayed GET fixtures only: never grant cached edit authority and never write to the DB. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000';
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  for(const width of [320,390,540])for(const canManage of [true,false])for(const nickname of ['웹툰핏','긴닉네임'.repeat(5)]){
   const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'}),page=await context.newPage();
   const profile='nickname-loading',genres=[{genreKey:'murim',displayLabel:'무협',stars:8}];
   const result={publicProfileId:profile,nickname,canManage:true,activeChallengeCode:null,displayGenres:genres,topGenres:genres,wellMatchedLabels:[],lessMatchedLabels:[]};
   await context.addInitScript(({profile,result})=>localStorage.setItem('webtoon-match:public-result:v1:'+profile,JSON.stringify(result)),{profile,result});
   let release;
   await context.route('**/api/v1/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname===`/api/v1/results/${profile}`){await new Promise(resolve=>{release=resolve;});return route.fulfill({json:{...result,canManage}});}
    if(url.pathname.endsWith('/recommendations'))return route.fulfill({json:{items:[]}});
    return route.fulfill({json:{active:null},status:200});
   });
   await page.goto(base+'/match/result/'+profile);const chip=page.locator('.wm-nickname-chip');await chip.waitFor();
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('.wm-nickname-edit').count(),0,'cached canManage never enables editing');
   const read=()=>chip.evaluate(el=>{
    const r=el.getBoundingClientRect(),label=el.querySelector('button > span,.wm-result-nickname > span'),l=label.getBoundingClientRect();
    return {x:r.x,y:r.y,width:r.width,height:r.height,labelX:l.x,labelWidth:l.width,background:getComputedStyle(el,'::before').backgroundColor,font:getComputedStyle(label).fontSize};
   });
   const before=await read();assert.equal(before.background,'rgb(189, 243, 248)');
   assert.ok(release);release();
   if(canManage)await page.locator('.wm-nickname-edit').waitFor();
   else await page.waitForFunction(()=>JSON.parse(localStorage.getItem('webtoon-match:public-result:v1:nickname-loading')).canManage===false);
   assert.deepEqual(await read(),before,'chip background, position, text width and font survive authorization refresh');
   if(canManage){await page.locator('.wm-nickname-edit').click();await page.getByRole('dialog').waitFor();}
   else assert.equal(await page.locator('.wm-nickname-edit').count(),0,'visitor remains read-only');
   await context.close();
  }
  console.log(JSON.stringify({ok:true,checks:['12 delayed-cache refresh cases','320/390/540px','short and maximum-length nicknames','background visible before fresh GET','no authority from cached canManage','owner-only editor after verification','identical chip/text geometry before and after']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
