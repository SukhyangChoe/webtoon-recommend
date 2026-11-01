/* Interaction fixtures never reach the database. Final screenshots use real, read-only catalog data. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');

(async()=>{
 const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000';
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-work-search-'));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
  page.setDefaultTimeout(20000);
  let tested=false,fail=false,failMore=false,snapshots=0,searchReads=0,detailReads=0;
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const item=index=>({canonicalWebtoonId:'search-work-'+index,title:index===0?'제목이 아주 길어도 카드 안에서 겹치거나 잘리지 않고 읽을 수 있는 검색 작품':'검색 작품 '+index,platform:'네이버웹툰',mainGenre:'murim',coverUrl:null,introduction:'서로 다른 취향으로 만나도 작품의 이야기는 자유롭게 살펴볼 수 있어요.'});
  const result={publicProfileId:'search-viewer',nickname:'검색 도전자',canManage:true,topGenres:[{genreKey:'murim',displayLabel:'무협',stars:10}],displayGenres:[{genreKey:'murim',displayLabel:'무협',stars:10}],wellMatchedLabels:[],lessMatchedLabels:[]};
  await context.route('**/api/v1/**',async route=>{
   const req=route.request(),url=new URL(req.url()),reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(url.pathname.includes('analytics')||url.pathname.includes('match-events'))return reply({ok:true},202);
   if(url.pathname==='/api/v1/webtoons/search'){
    searchReads++;assert.equal(url.searchParams.get('scope'),'catalog');
    const number=Number(url.searchParams.get('page'));
    if(fail||(failMore&&number===2))return reply({error:'FAILED'},500);
    const query=url.searchParams.get('q');
    if(query==='늦은 검색')await new Promise(resolve=>setTimeout(resolve,600));
    return reply({items:query==='없는작품'?[]:Array.from({length:number===1?20:3},(_,index)=>item((number-1)*20+index)),page:number,hasMore:query!=='없는작품'&&number===1});
   }
   if(url.pathname.startsWith('/api/v1/webtoons/search-work-')){
    detailReads++;if(url.pathname.endsWith('/fit'))assert.ok(req.headers()['x-match-anonymous-id']);assert.equal(url.searchParams.has('profile'),false);
    const work=item(Number(/search-work-(\d+)/.exec(url.pathname)[1]));
    return reply({...work,mainGenreLabel:'무협',officialUrl:null,creators:[],statusLabel:null,ageRating:null,contentLabels:[],appreciationPoints:[{key:'revenge',label:'복수',icon:'spark'}],artStyles:[],introductionKind:'editorial',fitStatus:tested?'ready':'test_required',fit:tested?{percent:88,highlighted:true,reasons:[{key:'revenge',label:'복수',icon:'spark'}]}:null});
   }
   if(url.pathname==='/api/v1/taste-snapshots'){
    snapshots++;assert.equal(req.method(),'POST');const payload=req.postDataJSON();
    assert.equal(payload.nickname,'검색 도전자');assert.ok(Object.keys(payload.answers.genre).length>0);
    tested=true;return reply({publicProfileId:'search-viewer',snapshotId:'new-test',result},201);
   }
   assert.equal(req.method(),'GET','no recommendation reset, unsolicited invitation entry or other mutation');
   if(url.pathname==='/api/v1/results/search-viewer')return reply(result);
   if(url.pathname.endsWith('/recommendations'))return reply({items:[]});
   if(url.pathname==='/api/v1/challenges')return reply({active:false});
   return reply({error:'NOT_FOUND'},404);
  });
  await page.goto(base+'/match');
  await page.locator('.wm-search-entry').click();await page.waitForURL('**/match/search');
  await page.getByRole('heading',{name:'어떤 작품이 궁금하세요?'}).waitFor();
  assert.equal(searchReads,0);assert.equal(detailReads,0);
  async function search(query){await page.getByRole('searchbox',{name:'작품명 검색'}).fill(query);await page.getByRole('button',{name:'검색',exact:true}).click();}
  await search('검색');await page.locator('.wm-catalog-list > li').nth(19).waitFor();
  assert.equal(detailReads,0,'search never calculates every result’s personal fit');
  for(const width of [320,390,540,900]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no overflow at ${width}`);
   assert.equal(await page.locator('.wm-catalog-card').first().getAttribute('target'),null,'work opens in the same tab');
   assert.ok(await page.locator('.wm-catalog-card').first().evaluate(card=>{const cover=card.querySelector('.wm-work-cover').getBoundingClientRect(),copy=card.querySelector('.wm-catalog-copy').getBoundingClientRect();return cover.right<copy.left&&copy.right<=card.getBoundingClientRect().right;}));
  }
  await page.setViewportSize({width:390,height:844});
  failMore=true;await page.getByRole('button',{name:'작품 더 보기'}).click();await page.locator('.wm-catalog-error').waitFor();
  assert.equal(await page.locator('.wm-catalog-list > li').count(),20,'pagination errors retain the first page');
  failMore=false;await page.getByRole('button',{name:'다시 시도',exact:true}).click();await page.locator('.wm-catalog-list > li').nth(22).waitFor();
  const last=page.locator('.wm-catalog-card').last();await last.scrollIntoViewIfNeeded();
  const scroll=await page.evaluate(()=>scrollY),reads=searchReads;
  await last.click();await page.waitForURL('**/match/work/search-work-22?*');
  await page.getByRole('button',{name:'취향 테스트로 핏점수 확인하기'}).waitFor();
  assert.equal(await page.getByRole('meter').count(),0);
  await page.getByRole('button',{name:'이전 화면으로 돌아가기'}).click();await page.waitForURL('**/match/search?q=*');
  await page.locator('.wm-catalog-list > li').nth(22).waitFor();
  await page.waitForFunction(previous=>Math.abs(scrollY-previous)<3,scroll);
  assert.equal(searchReads,reads,'back restores both loaded pages without a new search');
  await page.locator('.wm-catalog-card').last().click();await page.getByRole('button',{name:'취향 테스트로 핏점수 확인하기'}).click();
  await page.waitForURL('**/match/test/intro');
  await page.getByRole('textbox',{name:'테스트에서 사용할 닉네임'}).fill('검색 도전자');
  await page.getByRole('button',{name:'테스트 시작',exact:true}).click();
  for(let n=1;n<=2;n++){
   await page.waitForURL('**/match/test/genre-shelf/'+n);
   await page.locator('.match-genre-card').first().waitFor();
   const cards=page.locator('.match-genre-card');for(let i=0;i<await cards.count();i++)await cards.nth(i).getByRole('button').first().click();
   await page.getByRole('button',{name:'다음',exact:true}).click();
  }
  for(let n=1;n<=6;n++){
   await page.waitForURL('**/match/test/duel/'+n);await page.locator('.match-duel-card').first().click();
   await page.getByRole('button',{name:'다음',exact:true}).click();
  }
  await page.waitForURL('**/match/test/taste/setting');await page.locator('.match-feature-card > button').first().click();await page.getByRole('button',{name:'다음',exact:true}).click();
  for(const step of ['appeal','character-relationship']){
   await page.waitForURL('**/match/test/taste/'+step);await page.locator('.match-feature-card > button').first().click();await page.getByRole('button',{name:'다음',exact:true}).click();
  }
  await page.waitForURL('**/match/test/avoidance');await page.locator('.match-ranked-card').first().click();await page.getByRole('button',{name:'결과 만들기',exact:true}).click();
  await page.waitForURL('**/match/work/search-work-22?*');
  await page.getByRole('button',{name:'나중에 할게요',exact:true}).click();
  const meter=page.getByRole('meter',{name:'핏점수',exact:true});await meter.waitFor();assert.equal(await meter.getAttribute('aria-valuenow'),'88');assert.equal(snapshots,1);
  await page.locator('.wm-work-open').click();await page.locator('.wm-work-reason').getByText('복수',{exact:true}).waitFor();
  await page.getByRole('button',{name:'작품 정보 접기',exact:true}).click();
  await page.getByRole('button',{name:'이전 화면으로 돌아가기'}).click();await page.waitForURL('**/match/search?q=*');
  await page.locator('.wm-catalog-list > li').nth(22).waitFor();await page.waitForFunction(previous=>Math.abs(scrollY-previous)<3,scroll);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('webtoon-match:work-test-continuation:v1')),null);
  await page.getByRole('button',{name:'검색어 지우기'}).click();await page.getByRole('heading',{name:'어떤 작품이 궁금하세요?'}).waitFor();
  await search('없는작품');await page.getByRole('heading',{name:'검색 결과가 없어요.'}).waitFor();
  fail=true;await search('실패');await page.locator('.wm-catalog-error').waitFor();fail=false;await page.getByRole('button',{name:'다시 시도',exact:true}).click();await page.locator('.wm-catalog-list > li').nth(19).waitFor();
  await search('늦은 검색');await page.waitForURL(url=>url.searchParams.get('q')==='늦은 검색');
  await search('새 검색');await page.waitForURL(url=>url.searchParams.get('q')==='새 검색');await page.locator('.wm-catalog-list > li').nth(19).waitFor();
  assert.equal(await page.getByRole('searchbox',{name:'작품명 검색'}).inputValue(),'새 검색');
  await page.goto(base+'/match/result/search-viewer');await page.getByRole('link',{name:/작품 검색/}).click();
  await page.waitForURL('**/match/search?*');
  assert.equal(new URL(page.url()).searchParams.get('from'),'/match/result/search-viewer');
  await page.getByRole('link',{name:'내 취향 결과',exact:true}).click();await page.waitForURL('**/match/result/search-viewer');
  assert.deepEqual(errors,[]);await context.close();

  // Actual catalog and details, with API mutations blocked and no fixture screenshots.
  const real=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'}),live=await real.newPage();
  await real.route('**/api/v1/**',route=>route.request().method()==='GET'?route.continue():route.fulfill({status:202,contentType:'application/json',body:'{"ok":true}'}));
  const legacy=await (await live.request.get(base+'/api/v1/webtoons/search?q='+encodeURIComponent('검'))).json();
  const catalog=await (await live.request.get(base+'/api/v1/webtoons/search?scope=catalog&q='+encodeURIComponent('검'))).json();
  assert.ok(legacy.items.length&&catalog.items.length);assert.equal(catalog.page,1);
  await live.goto(base+'/match/search?q='+encodeURIComponent('나노'));await live.locator('.wm-catalog-card').first().waitFor();
  await live.locator('.wm-catalog-card img').evaluateAll(images=>Promise.all(images.map(img=>img.decode().catch(()=>{}))));
  await live.evaluate(()=>document.fonts.ready);await live.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await live.screenshot({path:path.join(output,'work_search_live_catalog.png'),fullPage:false});
  await live.locator('.wm-catalog-card').first().click();await live.getByRole('button',{name:'취향 테스트로 핏점수 확인하기'}).waitFor();
  const img=live.locator('.wm-work-hero img');if(await img.count())await img.evaluate(node=>node.decode());
  await live.addStyleTag({content:'nextjs-portal{display:none!important}'});await live.screenshot({path:path.join(output,'work_search_live_test_prompt.png')});
  await real.close();
  console.log(JSON.stringify({ok:true,checks:['home/result entry','public catalog scope','pagination and retries','same-tab detail','query/results/scroll restoration','no fit calculation on list','guest prompt','all test screens -> saved result -> original work with fit','no recommendation deletion','empty/error/race states','320/390/540/900 widths','real read-only screenshots'],artifacts:output}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
