/* All API writes are intercepted; no production data is changed. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const {createEmptyMatchDraft}=await import('../../src/features/match/storage/draft.mjs');
 const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000';
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
  let snapshotRequests=0,entryRequests=0,failEntry=false,hasMap=false,relationState='create';
  const result={publicProfileId:'invite-guest',nickname:'도전자',canManage:true,topGenres:[{genreKey:'murim',displayLabel:'무협',stars:8}],displayGenres:[{genreKey:'murim',displayLabel:'무협',stars:8}],wellMatchedLabels:[],lessMatchedLabels:[]};
  const requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())requests.push(new URL(frame.url()).pathname);});
  await context.addInitScript(draft=>{
   if(sessionStorage.getItem('invitation-fixture-ready'))return;
   sessionStorage.setItem('invitation-fixture-ready','true');
   localStorage.setItem('webtoon-match:test-draft:v1',JSON.stringify(draft));
   localStorage.setItem('webtoon-match:pending-challenge:v1',JSON.stringify({challengeCode:'inviter',challengerNickname:'도전자',agreedAt:new Date().toISOString()}));
  },{...createEmptyMatchDraft(),nickname:'도전자',answers:{},currentPath:'/match/result/building'});
  await page.route('**/api/v1/**',async route=>{
   const req=route.request(),url=new URL(req.url()),reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(url.pathname.includes('analytics')||url.pathname.includes('match-events'))return reply({ok:true},202);
   if(url.pathname==='/api/v1/taste-snapshots'){snapshotRequests++;return reply({publicProfileId:'invite-guest',snapshotId:'snapshot',result},201);}
   if(url.pathname==='/api/v1/challenges/inviter/entries'){
    if(req.postDataJSON().lookupOnly)return reply({error:'CHALLENGE_ENTRY_NOT_FOUND'},404);
    entryRequests++;assert.equal(req.postDataJSON().challengerPublicProfileId,'invite-guest');
    return failEntry?reply({error:'CHALLENGE_CLOSED'},410):reply({resultId:'pair',existing:entryRequests>1},201);
   }
   if(url.pathname==='/api/v1/challenges'&&req.method()==='POST'){hasMap=true;return reply({challengeCode:'guest-map',challengeUrl:base+'/match/c/guest-map',ownerManageToken:'fixture-owner-token'},201);}
   assert.equal(req.method(),'GET','unexpected mutation');
   if(url.pathname==='/api/v1/challenges')return reply(hasMap?{active:true,challengeCode:'guest-map'}:{active:false});
   if(url.pathname.endsWith('/recommendations'))return reply({items:[]});
   if(url.pathname==='/api/v1/results/invite-guest')return reply(result);
   if(url.pathname==='/api/v1/challenges/inviter/results/pair')return reply({ownerNickname:'초대자',challengerNickname:'도전자',viewerPublicProfileId:'invite-guest',ownerGenreKey:'ropan',challengerGenreKey:'murim',ownerRelationship:{state:'ready',href:'/match/c/inviter/ranking'},challengerRelationship:{state:relationState,href:relationState==='ready'?'/match/c/guest-map/ranking':relationState==='create'?'/match/challenge/new':null},score:85,band:{label:'취향 잘 맞음',subcopy:''},sharedGenres:['무협'],differentGenres:[],ownerRecommendedGenres:[],challengerRecommendedGenres:[],ownerRecommendations:[],challengerRecommendations:[],sharedTasteLabels:[],recommendationTasteApplied:false,trustSentence:'취향 비교',rank:1,entryCount:1});
   if(url.pathname.endsWith('/ranking'))return reply({challengeCode:url.pathname.includes('guest-map')?'guest-map':'inviter',ownerNickname:'도전자',ownerGenreKey:'murim',ownerTopGenreKeys:['murim'],ownerPublicProfileId:'invite-guest',entryCount:1,status:'active',rankingVisibility:'public_by_link',canManage:true,top20:[{entryId:'reciprocal',resultId:'back-pair',nickname:'초대자',genreKey:'ropan',score:85,rank:1,isReciprocal:true,sharedGenres:['무협']}],entries:[],graphEntries:[],pagination:{page:1,pageSize:6,totalItems:0,totalPages:1},hiddenEntries:[]});
   return reply({ownerNickname:'초대자',questionSetVersion:createEmptyMatchDraft().questionSetVersion,status:'active',entryCount:0,topScore:null});
  });
  await page.goto(base+'/match/result/building');await page.waitForURL('**/match/c/inviter/match/pair');
  await page.locator('.wm-pair-cover').waitFor();
  await page.getByRole('button',{name:'나중에 할게요',exact:true}).click();
  assert.equal(snapshotRequests,1);assert.equal(entryRequests,1);
  assert.ok(!requests.includes('/match/result/invite-guest'),'invitation goes straight to pair, never through the personal result');
  assert.equal(await page.evaluate(()=>localStorage.getItem('webtoon-match:pending-challenge:v1')),null);
  const profiles=page.locator('.wm-pair-comic .wm-pair-profile');
  assert.equal(await profiles.nth(0).getByRole('link').getAttribute('href'),'/match/c/inviter/ranking');
  assert.equal(await profiles.nth(1).getByRole('link').getAttribute('href'),'/match/challenge/new');
  assert.deepEqual(await profiles.locator('a').allTextContents(),['초대자','도전자'],'nickname buttons show only the name and decorative arrow');
  assert.equal(await profiles.locator('a > svg').count(),2);
  assert.equal(await page.locator('.wm-pair-profile-guide').count(),0);
  assert.equal(await page.getByText('추천작 반영',{exact:true}).count(),0);
  for(const width of [320,390,540]){
   await page.setViewportSize({width,height:844});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   assert.ok(await profiles.locator('a').evaluateAll(links=>links.every(link=>{const box=link.getBoundingClientRect(),bubble=document.querySelector('.wm-pair-bubble').getBoundingClientRect();return box.height>=44&&box.bottom<bubble.top;})),'nickname touch targets are clear of the speech bubble');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.getByRole('link',{name:'내 결과',exact:true}).click();await page.waitForURL('**/match/result/invite-guest?from=pair');
  const footer=page.locator('.wm-action-bar');
  await footer.getByRole('link',{name:'관계도 만들기',exact:true}).waitFor();
  assert.equal(await footer.getByRole('link',{name:/님과/}).count(),0);
  await footer.getByRole('link',{name:'관계도 만들기',exact:true}).click();
  await page.getByRole('checkbox',{name:/공개 범위를 확인/}).check();
  await page.getByRole('button',{name:'초대 링크 만들기',exact:true}).click();
  await page.getByRole('heading',{name:'궁합 링크가 만들어졌어요'}).waitFor();
  await page.goto(base+'/match/result/invite-guest');
  await footer.getByRole('link',{name:'내 취향 관계도',exact:true}).waitFor();
  assert.equal(await footer.getByRole('link',{name:'내 취향 관계도',exact:true}).getAttribute('href'),'/match/c/guest-map/ranking');
  relationState='ready';await page.goto(base+'/match/c/inviter/match/pair');
  await profiles.nth(1).getByRole('link',{name:'도전자님의 취향 관계도 보기',exact:true}).click();
  await page.waitForURL('**/match/c/guest-map/ranking');
  for(const state of ['private','unavailable']){
   relationState=state;await page.goto(base+'/match/c/inviter/match/pair');await profiles.nth(1).locator('.wm-pair-profile-static').waitFor();
   assert.equal(await profiles.nth(1).locator('a').count(),0,'unavailable/private nicknames are not misleading links');
  }
  // Failed entry retry reuses the completed snapshot and preserved consent.
  await page.evaluate(()=>localStorage.setItem('webtoon-match:pending-challenge:v1',JSON.stringify({challengeCode:'inviter',challengerNickname:'도전자',agreedAt:new Date().toISOString()})));
  failEntry=true;await page.goto(base+'/match/result/building');await page.getByText('참여가 종료된 초대 링크예요. 내 취향 결과는 저장되어 있어요.').waitFor();
  assert.equal(snapshotRequests,1);
  assert.ok(await page.evaluate(()=>localStorage.getItem('webtoon-match:pending-challenge:v1')));
  failEntry=false;await page.getByRole('button',{name:'다시 시도',exact:true}).click();await page.waitForURL('**/match/c/inviter/match/pair');assert.equal(snapshotRequests,1);
  await page.locator('.wm-pair-cover').waitFor();
  await page.evaluate(()=>localStorage.removeItem('webtoon-match:challenge-result:v1:inviter'));
  await page.goto(base+'/match/c/inviter');
  await page.getByRole('button',{name:'저장된 취향으로 바로 궁합 보기',exact:true}).waitFor();
  await page.getByRole('checkbox',{name:/공개 범위를 확인/}).check();
  await page.getByRole('button',{name:'저장된 취향으로 바로 궁합 보기',exact:true}).click();
  await page.waitForURL('**/match/c/inviter/match/pair');assert.equal(snapshotRequests,1,'saved-taste invitation does not create another snapshot');
  // A direct test keeps its personal result path, even with an old pair history.
  await page.goto(base+'/match/result/building');await page.waitForURL('**/match/result/invite-guest');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,checks:['invitation -> snapshot -> pair first','saved-taste invitation -> pair without recreating snapshot','pair -> my result -> own map/create only','nickname buttons and destination states','320/390/540px touch targets and bubble clearance','entry retry without recreating the test','direct test remains personal','all writes mocked']}));
  await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
