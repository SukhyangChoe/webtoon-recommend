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
  const fit={fitStatus:'ready',fit:{percent:88,highlighted:true,reasons:[{key:'revenge',label:'복수',icon:'spark'}]}};
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
  await page.locator('.wm-work-open').click();await page.getByRole('tab',{name:'작품 정보',exact:true}).click();
  assert.ok(await page.getByText('연재중',{exact:true}).isVisible(),'basic work facts remain usable');
  await page.getByRole('button',{name:'작품 정보 접기',exact:true}).click();
  fitMode='hold';await page.getByRole('button',{name:'핏점수 다시 불러오기'}).click();
  await page.getByText('핏점수 확인에 시간이 걸리고 있어요. 작품 정보는 먼저 볼 수 있어요.',{exact:true}).waitFor();
  assert.equal(infoCalls,1,'manual fit retry does not refetch work info');
  await page.locator('.wm-work-open').click();await page.getByRole('tab',{name:'작품 정보',exact:true}).click();
  fitMode='ok';releaseFit();
  await page.waitForFunction(()=>document.querySelector('.wm-work-fit-track')?.getAttribute('aria-valuenow')==='88');
  assert.equal(await page.locator('.wm-work-page').getAttribute('data-stage'),'info','arriving fit does not close or reset the reading sheet');
  await page.getByRole('button',{name:'작품 정보 접기',exact:true}).click();
  assert.equal(await page.getByRole('meter').getAttribute('aria-valuenow'),'88');assert.equal(fitCalls,3);
  for(const width of [320,390,900]){
   await page.setViewportSize({width,height:844});
   const search=page.getByRole('link',{name:'작품 검색',exact:true});
   await search.hover();assert.ok(await search.evaluate(el=>{const css=getComputedStyle(el),r=el.getBoundingClientRect();return r.width>=44&&r.height>=44&&css.backgroundColor==='rgba(0, 0, 0, 0)'&&css.borderTopWidth==='0px'&&css.boxShadow==='none';}),'only the magnifier is painted, with a 44px accessible hit area');
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
  console.log(JSON.stringify({ok:true,checks:['independent basic info and fit','fit-only retry','bounded automatic attempts','slow information messages','404 without automatic retry','basic error recovery','fit arrival preserves active tab','navigation cancellation','icon-only search at 320/390/900 widths']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
