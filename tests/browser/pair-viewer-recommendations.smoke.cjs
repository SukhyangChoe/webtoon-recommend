/* Participant roles are mocked for edge cases; screenshots use real read-only data. */
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright'),postgres=require('postgres');
(async()=>{
 const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000',output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-pair-viewer-'));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
  let role=null,ownerCount=2,guestCount=1;
  const item=(owner,index)=>({canonicalWebtoonId:owner+'-'+index,title:owner+' 작품 '+index,mainGenre:'fantasy',mainGenreLabel:'판타지',platform:'네이버웹툰',officialUrl:null,coverUrl:null,recommenderPublicProfileId:owner,likeCount:0,likedByViewer:false,canViewerLike:owner!==role,tasteFitHighlighted:false});
  await context.route('**/api/v1/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(new URL(route.request().url()).pathname.endsWith('/results/pair')?{
   viewerRole:role,viewerPublicProfileId:'newer-result-unrelated-to-old-snapshot-id',ownerNickname:'주인장',challengerNickname:'참여자',ownerGenreKey:'fantasy',challengerGenreKey:'murim',ownerTopGenres:[],challengerTopGenres:[],score:80,band:{label:'취향 잘 맞음'},sharedGenres:[],differentGenres:[],sharedTasteLabels:[],ownerRecommendations:Array.from({length:ownerCount},(_,i)=>item('owner',i)),challengerRecommendations:Array.from({length:guestCount},(_,i)=>item('challenger',i)),ownerRecommendedGenres:[],challengerRecommendedGenres:[],trustSentence:'함께 볼 작품',rank:1,entryCount:2
  }:{ok:true})}));
  for(const who of ['owner','challenger',null]){
   role=who;await page.goto(base+'/match/c/check/match/pair');await page.locator('.wm-pair-details').waitFor();
   assert.equal(await page.locator('.wm-pair-work-group').count(),who?1:2);
   assert.equal(await page.getByRole('heading',{name:'서로의 추천작',exact:true}).count(),who?0:1);
   assert.equal(await page.locator('.wm-pair-work-card').count(),who==='owner'?guestCount:who==='challenger'?ownerCount:ownerCount+guestCount);
   if(who){const heading=page.locator('.wm-pair-work-group header h2');assert.ok((await heading.textContent()).startsWith(who==='owner'?'참여자님의 추천':'주인장님의 추천'));}
  }
  for(const who of ['owner','challenger']){
   role=who;ownerCount=0;guestCount=0;await page.reload();await page.locator('.wm-pair-work-empty').waitFor();
   assert.equal(await page.locator('.wm-pair-work-group').count(),1,'an empty self group is hidden too');
   for(const width of [320,390,435]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('.wm-pair-work-empty').evaluate(el=>{const r=el.getBoundingClientRect(),about=document.querySelector('.wm-pair-about').getBoundingClientRect();return getComputedStyle(el).borderTopWidth==='1px'&&r.bottom+15<=about.top;}),'empty recommendations are visually separated from the result explanation');}
  }
  await context.close();
  const liveContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'}),live=await liveContext.newPage();
  await liveContext.route('**/api/v1/**',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.fulfill({status:202,contentType:'application/json',body:'{"ok":true}'}));
  const api='/api/v1/challenges/mKOdmiLcE0JU/results/VIbseuqFQuk6RRDr';
  const publicResult=await (await live.request.get(base+api)).json();
  assert.equal(publicResult.viewerRole,null,'no anonymous identity never guesses a participant');
  const profile=publicResult.challengerRecommendations[0].recommenderPublicProfileId;
  const sql=postgres(process.env.WEBTOON_MATCH_DATABASE_URL,{max:1,prepare:false,ssl:'require',connect_timeout:4});
  let identity;
  try{identity=(await sql.begin('read only',tx=>tx`select p.anonymous_id from public.match_profiles p join public.match_taste_snapshots s using(profile_id) where s.public_profile_id=${profile} limit 1`))[0]?.anonymous_id;}finally{await sql.end();}
  assert.ok(identity);await liveContext.addCookies([{name:'wm_aid',value:identity,url:base}]);
  const response=await live.request.get(base+api,{headers:{'x-match-anonymous-id':identity}}),actual=await response.json();
  assert.equal(actual.viewerRole,'challenger');assert.equal(response.headers()['cache-control'],'private, no-store');
  assert.equal(actual.challengerRecommendations.length,publicResult.challengerRecommendations.length,'own recommendation data remains available for fit calculations, not deleted');
  await live.goto(base+'/match/c/mKOdmiLcE0JU/match/VIbseuqFQuk6RRDr?from=ranking');await live.locator('.wm-pair-work-group header h2').waitFor();
  assert.equal(await live.locator('.wm-pair-work-group').count(),1);assert.ok((await live.locator('.wm-pair-work-group header h2').textContent()).startsWith(actual.ownerNickname+'님의 추천'));
  assert.equal(await live.getByRole('heading',{name:'서로의 추천작',exact:true}).count(),0);
  const group=live.locator('.wm-pair-work-group');
  if(!actual.ownerRecommendations.length){await live.locator('.wm-pair-work-empty').waitFor();}
  await group.evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-100));
  await group.locator('img.wm-work-cover').evaluateAll(images=>Promise.all(images.map(img=>img.decode().catch(()=>{}))));
  await live.addStyleTag({content:'nextjs-portal{display:none!important}'});
  const clip=await group.evaluate(el=>{const r=el.getBoundingClientRect(),about=document.querySelector('.wm-pair-about').getBoundingClientRect();return{x:r.x,y:r.y-8,width:r.width,height:Math.min(innerHeight-r.y-110,about.bottom-r.y+24)};});
  await live.screenshot({path:path.join(output,'other_recommendations_only.png'),clip});
  const ownerSql=postgres(process.env.WEBTOON_MATCH_DATABASE_URL,{max:1,prepare:false,ssl:'require',connect_timeout:4});
  let ownerIdentity;
  try{ownerIdentity=(await ownerSql.begin('read only',tx=>tx`select p.anonymous_id from public.match_profiles p join public.match_challenges c on c.owner_profile_id=p.profile_id where c.challenge_code=${'mKOdmiLcE0JU'} limit 1`))[0]?.anonymous_id;}finally{await ownerSql.end();}
  assert.ok(ownerIdentity);await liveContext.addCookies([{name:'wm_aid',value:ownerIdentity,url:base}]);
  const emptyApi='/api/v1/challenges/mKOdmiLcE0JU/results/PVOHWBy4ycU2C-Ts';
  const ownerView=await (await live.request.get(base+emptyApi,{headers:{'x-match-anonymous-id':ownerIdentity}})).json();
  assert.equal(ownerView.viewerRole,'owner');
  await live.goto(base+'/match/c/mKOdmiLcE0JU/match/PVOHWBy4ycU2C-Ts?from=ranking');await live.locator('.wm-pair-work-group header h2').waitFor();
  assert.equal(await live.locator('.wm-pair-work-group').count(),1);assert.ok((await live.locator('.wm-pair-work-group header h2').textContent()).startsWith(ownerView.challengerNickname+'님의 추천'));
  if(!ownerView.challengerRecommendations.length){
    await live.locator('.wm-pair-work-empty').waitFor();
    await group.evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-100));await live.addStyleTag({content:'nextjs-portal{display:none!important}'});
    const emptyClip=await group.evaluate(el=>{const r=el.getBoundingClientRect(),about=document.querySelector('.wm-pair-about').getBoundingClientRect();return{x:r.x,y:r.y-8,width:r.width,height:about.bottom-r.y+24};});
    await live.screenshot({path:path.join(output,'other_recommendations_empty.png'),clip:emptyClip});
  }
  await liveContext.close();console.log(JSON.stringify({ok:true,checks:['both participant roles hide self recommendations','counterpart name becomes the main heading','empty counterpart remains boxed','anonymous viewer keeps both groups','retakes cannot confuse snapshot IDs with identity','real API role and private caching','no data deletion or server writes'],artifacts:output}));
 }finally{await browser.close();}
})().catch(error=>{console.error({name:error.name,message:error.name==='AssertionError'?error.message:'Pair viewer checks failed'});process.exitCode=1;});
