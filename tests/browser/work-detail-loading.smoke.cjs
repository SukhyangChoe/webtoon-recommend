/* Failure injection is isolated to browser routes; writes never reach the DB. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000';
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
  page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let infoCalls=0,fitCalls=0,fitMode='fail',baseMode='ok',releaseInfo,releaseFit;
  const info={canonicalWebtoonId:'loading-test',title:'로딩 검증 작품',mainGenreLabel:'무협',mainGenre:'murim',platform:'네이버웹툰',coverUrl:null,officialUrl:null,introduction:'핏점수를 기다리는 중에도 작품 소개를 읽을 수 있습니다.',creators:[{name:'작가',roles:['그림']}],contentLabels:[],appreciationPoints:[],artStyles:[],statusLabel:'연재중',ageRating:null,fit:null,fitStatus:'pending'};
  const fit={fitStatus:'ready',fit:{rawScore:.7744,percent:77,displayScore:88,displayScoreVersion:'sqrt_v1',highlighted:true,reasons:[{key:'revenge',label:'복수',icon:'spark'}]}};
  await context.route('**/api/v1/**',async route=>{
   const url=new URL(route.request().url()),reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(url.pathname==='/api/v1/webtoons/loading-test'){
    infoCalls++;assert.equal(url.searchParams.get('view'),'info');
    if(baseMode==='hold')await new Promise(resolve=>{releaseInfo=resolve;});
    if(baseMode==='missing')return reply({error:'NOT_FOUND'},404);
    if(baseMode==='fail')return reply({error:'WORK_DETAIL_TIMEOUT'},504);
    return reply(info);
   }
   if(url.pathname==='/api/v1/webtoons/loading-test/fit'){
    fitCalls++;assert.ok(route.request().headers()['x-match-anonymous-id']);
    if(fitMode==='hold')await new Promise(resolve=>{releaseFit=resolve;});
    return fitMode==='fail'?reply({error:'WORK_DETAIL_TIMEOUT'},504):reply(fit);
   }
   return reply({ok:true},202);
  });
  await page.goto(base+'/match/work/loading-test?returnTo=%2Fmatch%2Fsearch');
  await page.getByRole('heading',{name:info.title,level:1}).waitFor();
  await page.getByRole('button',{name:'핏점수 다시 불러오기'}).waitFor();
  assert.equal(infoCalls,1);assert.equal(fitCalls,2,'transient fit failures retry only once');
  assert.equal(await page.getByRole('meter').count(),0);assert.equal(await page.getByRole('button',{name:'취향 테스트로 핏점수 확인하기'}).count(),0,'a network error is not mistaken for a missing test');
  await page.locator('.wm-work-open').click();
  assert.ok(await page.getByText('연재중',{exact:true}).isVisible(),'basic work facts remain usable');
  await page.locator('.wm-work-grab').click();
  fitMode='hold';await page.getByRole('button',{name:'핏점수 다시 불러오기'}).click();
  await page.getByText('핏점수 확인에 시간이 걸리고 있어요. 작품 정보는 먼저 볼 수 있어요.',{exact:true}).waitFor();
  assert.equal(infoCalls,1,'manual fit retry does not refetch work info');
  await page.locator('.wm-work-open').click();
  fitMode='ok';releaseFit();
  await page.waitForFunction(()=>document.querySelector('.wm-work-summary .wm-work-fit-track')?.getAttribute('aria-valuenow')==='88');
  assert.equal(await page.locator('.wm-work-page').getAttribute('data-stage'),'reasons','arriving fit does not close or reset the reading sheet');
  const expandedFit=page.locator('.wm-work-sheet-header .wm-work-fit-track');
  assert.ok(await expandedFit.isVisible(),'fit arriving in an expanded panel is visible');
  assert.equal(await expandedFit.getAttribute('aria-valuenow'),'88');
  for(const [width,height] of [[320,844],[390,844],[540,844],[900,844],[390,520]]){
   await page.setViewportSize({width,height});
   await page.locator('.wm-work-dialog-body').evaluate(el=>{el.scrollTop=el.scrollHeight;});
   const bounds=await expandedFit.evaluate(el=>{const r=el.getBoundingClientRect(),head=el.closest('.wm-work-sheet-header').getBoundingClientRect();return {score:el.getAttribute('aria-valuenow'),inside:r.top>=head.top&&r.bottom<=head.bottom,visible:r.top>=0&&r.bottom<=innerHeight};});
   assert.ok(bounds.inside&&bounds.visible&&bounds.score==='88',JSON.stringify({width,height,...bounds}));
  }
  await page.locator('.wm-work-grab').click();
  assert.equal(await page.getByRole('meter').getAttribute('aria-valuenow'),'88');assert.equal(fitCalls,3);
  for(const width of [320,390,900]){
   await page.setViewportSize({width,height:844});
   const search=page.getByRole('link',{name:'작품 검색',exact:true});
   await search.hover();
   const searchStyle=await search.evaluate(el=>{const css=getComputedStyle(el),r=el.getBoundingClientRect();return {width:r.width,height:r.height,background:css.backgroundColor,border:css.borderTopWidth,radius:css.borderRadius,bottom:innerHeight-r.bottom};});
   assert.ok(searchStyle.width>=100&&searchStyle.height>=44&&['rgb(255, 240, 179)','rgb(255, 232, 154)'].includes(searchStyle.background)&&searchStyle.border==='0px'&&searchStyle.radius==='999px'&&searchStyle.bottom===16,`floating search retains a 44px accessible hit area above the safe bottom: ${JSON.stringify(searchStyle)}`);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  baseMode='hold';await page.reload();
  await page.getByText('작품 정보를 불러오는 데 시간이 걸리고 있어요. 연결을 다시 확인하고 있어요.',{exact:true}).waitFor();
  await page.getByRole('link',{name:'이전 화면으로 돌아가기'}).waitFor();
  baseMode='ok';releaseInfo();await page.getByRole('meter').waitFor();
  baseMode='missing';const before=infoCalls;await page.reload();await page.getByRole('heading',{name:'작품을 찾지 못했어요.'}).waitFor();assert.equal(infoCalls,before+1,'404 is not automatically retried');
  baseMode='fail';await page.reload();await page.getByRole('button',{name:'다시 시도',exact:true}).waitFor();assert.equal(infoCalls,before+3,'two failed attempts end in a retry screen');
  baseMode='ok';await page.getByRole('button',{name:'다시 시도',exact:true}).click();await page.getByRole('meter').waitFor();
  fitMode='hold';await page.reload();await page.getByRole('heading',{name:info.title,level:1}).waitFor();
  await page.getByRole('button',{name:'이전 화면으로 돌아가기',exact:true}).click();await page.waitForURL('**/match/search');releaseFit?.();
  assert.deepEqual(errors,[]);await context.close();
  console.log(JSON.stringify({ok:true,checks:['independent basic info and fit','fit-only retry','bounded automatic attempts','slow information messages','404 without automatic retry','basic error recovery','fit arrival preserves expanded reading body','navigation cancellation','icon-only search at 320/390/900 widths']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
