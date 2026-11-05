/* All interaction writes are mocked. Actual-data screenshots replay a saved result's pending prompt, without DB writes. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');

(async()=>{
 const {createEmptyMatchDraft}=await import('../../src/features/match/storage/draft.mjs');
 const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000',profile='onboarding-me';
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-floating-onboarding-'));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
  page.setDefaultTimeout(20000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let snapshots=0,entries=0,saves=0,pairReads=0,workReads=0,failSave=false,registered=[];
  const result={publicProfileId:profile,nickname:'도전자',canManage:true,topGenres:[{genreKey:'murim',displayLabel:'무협',stars:10}],displayGenres:[{genreKey:'murim',displayLabel:'무협',stars:10}],wellMatchedLabels:['성장'],lessMatchedLabels:[]};
  const work={canonicalWebtoonId:'ui-work',title:'등록할 작품',platform:'네이버웹툰',mainGenre:'murim',coverUrl:null,officialUrl:null,introduction:'좋아하는 작품을 등록해 취향을 더할 수 있어요.'};
  const pairPath='/match/c/invite/match/pair',workPath='/match/work/ui-work?returnTo=%2Fmatch%2Fsearch';
  await context.route('**/api/v1/**',async route=>{
   const req=route.request(),url=new URL(req.url()),reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(url.pathname.includes('analytics')||url.pathname.includes('match-events'))return reply({ok:true},202);
   if(url.pathname==='/api/v1/taste-snapshots'){snapshots++;return reply({publicProfileId:profile,snapshotId:'snapshot-'+snapshots,result},201);}
   if(url.pathname==='/api/v1/challenges/invite/entries'){
    if(req.postDataJSON().lookupOnly)return reply({error:'CHALLENGE_ENTRY_NOT_FOUND'},404);
    entries++;return reply({resultId:'pair'},201);
   }
   if(url.pathname===`/api/v1/results/${profile}/recommendations`&&req.method()==='PUT'){
    saves++;if(failSave)return reply({error:'FAILED'},500);
    registered=req.postDataJSON().recommendations.map(item=>({...work,...item,likeCount:0,likedByViewer:false}));return reply({items:registered});
   }
   assert.equal(req.method(),'GET','no other mutations');
   if(url.pathname===`/api/v1/results/${profile}`)return reply(result);
   if(url.pathname===`/api/v1/results/${profile}/recommendation-comments/ui-work`)return reply({recommendationComment:null});
   if(url.pathname.endsWith('/recommendations'))return reply({items:registered});
   if(url.pathname==='/api/v1/challenges')return reply({active:false});
   if(url.pathname==='/api/v1/webtoons/search'){assert.notEqual(url.searchParams.get('scope'),'catalog');return reply({items:[work]});}
   if(['/api/v1/webtoons/ui-work','/api/v1/webtoons/ui-work/fit'].includes(url.pathname)){
    workReads++;return reply({...work,mainGenreLabel:'무협',creators:[],contentLabels:[],artStyles:[],appreciationPoints:[],introductionKind:'editorial',fitStatus:'ready',fit:{rawScore:registered.length?.8836:.5184,percent:registered.length?88:52,displayScore:registered.length?94:72,displayScoreVersion:'sqrt_v1',reasons:[],highlighted:registered.length>0}});
   }
   if(url.pathname==='/api/v1/challenges/invite/results/pair'){
    pairReads++;return reply({ownerNickname:'초대자',challengerNickname:'도전자',viewerPublicProfileId:profile,ownerGenreKey:'ropan',challengerGenreKey:'murim',score:registered.length?92:80,band:{label:'취향 잘 맞음',subcopy:''},sharedGenres:['무협'],differentGenres:[],ownerRecommendedGenres:[],challengerRecommendedGenres:[],ownerRecommendations:[],challengerRecommendations:registered,sharedTasteLabels:[],recommendationTasteApplied:registered.length>0,trustSentence:'같이 달리면 완주',rank:1,entryCount:1});
   }
   if(url.pathname.endsWith('/ranking'))return reply({challengeCode:'invite',ownerNickname:'초대자',ownerGenreKey:'ropan',ownerTopGenreKeys:['ropan'],entryCount:0,status:'active',rankingVisibility:'public_by_link',canManage:false,top20:[],entries:[],graphEntries:[],pagination:{page:1,pageSize:6,totalItems:0,totalPages:1},hiddenEntries:[]});
   return reply({ownerNickname:'초대자',questionSetVersion:createEmptyMatchDraft().questionSetVersion,status:'active',entryCount:0,topScore:null});
  });
  await page.goto(base+'/match');await page.locator('.wm-floating-search').waitFor();await page.locator('.wm-search-entry').waitFor();
  await page.locator('.wm-floating-search').click();await page.waitForURL(base+'/match/search');
  async function fresh(mode){
   const draft={...createEmptyMatchDraft(),nickname:'도전자',currentPath:'/match/result/building'};
   await page.evaluate(({draft,mode})=>{
    localStorage.setItem('webtoon-match:test-draft:v1',JSON.stringify(draft));
    localStorage.removeItem('webtoon-match:pending-challenge:v1');sessionStorage.removeItem('webtoon-match:recommendation-prompt:v1');sessionStorage.removeItem('webtoon-match:work-test-continuation:v1');
    if(mode==='pair')localStorage.setItem('webtoon-match:pending-challenge:v1',JSON.stringify({challengeCode:'invite',challengerNickname:'도전자',agreedAt:new Date().toISOString()}));
    if(mode==='work')sessionStorage.setItem('webtoon-match:work-test-continuation:v1',JSON.stringify({workId:'ui-work',returnTo:'/match/search',startedAt:draft.startedAt,savedAt:Date.now()}));
    sessionStorage.removeItem('wm-work-entry');
   },{draft,mode});
   await page.goto(base+'/match/result/building');
   await page.waitForURL(base+(mode==='pair'?pairPath:mode==='work'?workPath:`/match/result/${profile}`));
   await page.getByRole('dialog',{name:/좋아하는 작품을/}).waitFor();
  }
  await fresh('direct');assert.equal(snapshots,1);assert.equal(entries,0);
  for(const width of [320,390,540,900]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.locator('.wm-recommendation-prompt').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&el.scrollWidth<=el.clientWidth;}));
  }
  for(let n=0;n<8;n++){await page.keyboard.press('Tab');assert.ok(await page.locator('.wm-recommendation-prompt').evaluate(el=>el.contains(document.activeElement)),'native dialog traps keyboard focus');}
  await page.keyboard.press('Escape');await page.locator('.wm-recommendation-prompt').waitFor({state:'detached'});
  await page.reload();await page.locator('.wm-result-screen').waitFor();assert.equal(await page.locator('.wm-recommendation-prompt').count(),0,'dismissed prompt does not reopen on refresh');
  await page.setViewportSize({width:390,height:844});
  const paths=[`/match/result/${profile}`,`/match/result/${profile}/recommendations`,pairPath,'/match/c/invite/ranking','/match/c/invite','/match/challenge/new',workPath,`/match/share/personal?profilePublicId=${profile}`];
  for(const path of paths){
   await page.goto(base+path);await page.locator('.wm-floating-search').waitFor();
   assert.ok(await page.locator('.wm-floating-search').evaluate(el=>{const r=el.getBoundingClientRect();return r.width>=100&&r.height>=44&&r.top>innerHeight/2&&r.bottom<=innerHeight-12&&r.right<=innerWidth;}),path);
  }
  for(const path of ['/match/test/intro','/match/test/genre-shelf/1','/match/test/duel/1','/match/test/avoidance','/match/search']){await page.goto(base+path);assert.equal(await page.locator('.wm-floating-search').count(),0,path);}
  await page.goto(base+pairPath);await page.locator('.wm-floating-search').click();await page.waitForURL('**/match/search?*');assert.equal(new URL(page.url()).searchParams.get('from'),pairPath);
  await page.getByRole('link',{name:'이전 화면',exact:true}).click();await page.waitForURL(base+pairPath);
  await fresh('pair');assert.equal(entries,1);
  await page.getByRole('button',{name:'추천작 등록하기',exact:true}).click();await page.waitForURL('**/recommendations?*');
  assert.equal(new URL(page.url()).searchParams.get('returnTo'),pairPath);
  await page.getByRole('searchbox',{name:'추천할 웹툰 검색'}).fill('작품');await page.getByRole('button',{name:'검색',exact:true}).click();await page.getByRole('button',{name:'추가',exact:true}).click();
  failSave=true;await page.getByRole('button',{name:'저장하고 궁합 보기',exact:true}).click();await page.locator('.wm-floating-toast').waitFor();assert.ok(page.url().includes('/recommendations?'));
  failSave=false;const beforePair=pairReads;await page.getByRole('button',{name:'저장하고 궁합 보기',exact:true}).click();await page.waitForURL(base+pairPath);await page.getByRole('link',{name:'등록할 작품 작품 상세 보기',exact:true}).waitFor();assert.ok(pairReads>beforePair);assert.equal(await page.locator('.wm-recommendation-prompt').count(),0);
  await page.goto(base+`/match/result/${profile}/recommendations?returnTo=${encodeURIComponent(pairPath)}`);await page.getByRole('link',{name:'궁합으로 돌아가기',exact:true}).click();await page.waitForURL(base+pairPath);assert.equal(saves,2,'cancel does not save');
  registered=[];await fresh('work');const beforeWork=workReads;await page.getByRole('button',{name:'추천작 등록하기',exact:true}).click();await page.waitForURL('**/recommendations?*');
  assert.equal(new URL(page.url()).searchParams.get('returnTo'),workPath);
  await page.getByRole('searchbox',{name:'추천할 웹툰 검색'}).fill('작품');await page.getByRole('button',{name:'검색',exact:true}).click();await page.getByRole('button',{name:'추가',exact:true}).click();
  await page.getByRole('button',{name:'저장하고 작품 상세 보기',exact:true}).click();await page.waitForURL(base+workPath);await page.getByRole('meter',{name:'핏점수',exact:true}).waitFor();assert.equal(await page.getByRole('meter').getAttribute('aria-valuenow'),'94');assert.ok(workReads>beforeWork);
  await page.getByRole('button',{name:'이전 화면으로 돌아가기'}).click();await page.waitForURL('**/match/search');
  await fresh('direct');await page.getByRole('button',{name:'추천작 등록하기',exact:true}).click();await page.waitForURL('**/recommendations?*');await page.getByRole('button',{name:'저장하고 내 취향 결과 보기',exact:true}).click();await page.waitForURL(base+`/match/result/${profile}`);await page.locator('.wm-result-screen').waitFor();
  // Cached/saved results do not show another post-test prompt or create another snapshot.
  const beforeSnapshots=snapshots;await page.goto(base+'/match/result/building');await page.waitForURL(base+`/match/result/${profile}`);assert.equal(snapshots,beforeSnapshots);assert.equal(await page.locator('.wm-recommendation-prompt').count(),0);
  assert.deepEqual(errors,[]);await context.close();

  // Real saved-result recovery state: no synthetic result, score, portrait or recommendation data.
  const real=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'}),live=await real.newPage();
  await real.route('**/api/v1/**',route=>route.request().method()==='GET'?route.continue():route.fulfill({status:202,contentType:'application/json',body:'{"ok":true}'}));
  await live.goto(base+'/match');await live.locator('.wm-floating-search').waitFor();await live.locator('.match-home-readers').evaluate(img=>img.decode());await live.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await live.screenshot({path:path.join(output,'floating_search_live_home.png')});
  const realProfile='xys7o3_7JlgZl91b';
  await live.goto(base+`/match/result/${realProfile}`);await live.locator('.wm-persona-image').evaluate(img=>img.decode());await live.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await live.screenshot({path:path.join(output,'floating_search_live_result.png')});
  await live.evaluate(({profile,draft})=>localStorage.setItem('webtoon-match:test-draft:v1',JSON.stringify({...draft,resultPublicId:profile,recommendationPromptPending:true})),{profile:realProfile,draft:createEmptyMatchDraft()});
  await live.goto(base+'/match/result/building');await live.waitForURL(base+`/match/result/${realProfile}`);await live.getByRole('dialog',{name:/좋아하는 작품을/}).waitFor();await live.locator('.wm-persona-image').evaluate(img=>img.decode());await live.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await live.screenshot({path:path.join(output,'recommendation_prompt_live_result.png')});await real.close();
  console.log(JSON.stringify({ok:true,checks:['home search icon opens catalog; tests excluded','all non-test routes get a 44px floating search','origin preserved','optional once-only dialog and Escape/focus trap','registration returns to personal/pair/work','failed save retains edits; cancel does not write','fresh pair/work data after registration','cached results skip prompt','all writes mocked; real-data screenshots'],artifacts:output}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
