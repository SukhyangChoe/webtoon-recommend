/* Edge cases use isolated routes. Delivered screenshots use real read-only catalog/profile data. */
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const {chromium}=require('playwright');const postgres=require('postgres');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3100';
 const output=process.env.MATCH_QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-free-rail-'));
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 const sql=postgres(process.env.WEBTOON_MATCH_RUNTIME_DATABASE_URL||process.env.WEBTOON_MATCH_DATABASE_URL,{max:1,prepare:false,ssl:'require',connect_timeout:5,onnotice:()=>{}});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  const work=index=>({canonicalWebtoonId:`rail-work-${index}`,title:index===0?'끝 글자까지 읽을 수 있어야 하는 아주 긴 웹툰 작품 제목입니다':`추천 작품 ${index+1}`,mainGenre:'fantasy',mainGenreLabel:'판타지',coverUrl:null,platform:'테스트',recommendationComment:'카드 설명은 끝까지 읽을 수 있어요.',likeCount:0,likedByViewer:false,canViewerLike:false,recommenderPublicProfileId:'rail-owner'});
  let count=10,resultReads=0,recReads=0;
  await context.route('**/api/v1/**',async route=>{
   const url=new URL(route.request().url()),p=url.pathname;
   const reply=body=>route.fulfill({status:200,json:body});
   if(!['GET','HEAD'].includes(route.request().method()))return reply({accepted:true});
   if(p==='/api/v1/results/rail-fixture'){if(resultReads++)await pause(450);return reply({publicProfileId:'rail-fixture',nickname:'목록 테스트',canManage:false,topGenres:[],displayGenres:[],wellMatchedLabels:[],lessMatchedLabels:[]});}
   if(p==='/api/v1/results/rail-fixture/recommendations'){if(recReads++)await pause(650);return reply({items:Array.from({length:count},(_,i)=>work(i))});}
   if(p==='/api/v1/challenges/rail/results/pair')return reply({ownerNickname:'목록 테스트',challengerNickname:'다른 독자',ownerGenreKey:'fantasy',challengerGenreKey:'murim',score:65,band:{label:'취향 잘 맞음'},sharedGenres:[],differentGenres:[],ownerRecommendedGenres:[],challengerRecommendedGenres:[],ownerRecommendations:Array.from({length:count},(_,i)=>work(i)),challengerRecommendations:[{...work(11),recommenderPublicProfileId:'rail-other'}],sharedTasteLabels:[],trustSentence:'취향 비교',rank:1,entryCount:2});
   if(p.startsWith('/api/v1/webtoons/rail-work-')){
    if(p.endsWith('/fit'))return reply({fit:null,fitStatus:'test_required'});
    const index=Number(p.split('/').at(-1).replace('rail-work-',''));
    return reply({...work(index),creators:[],introduction:'작품 상세에서 뒤로가면 목록 위치를 복원합니다.',contentLabels:[],appreciationPoints:[],artStyles:[],ageRating:null,statusLabel:null,fit:null,fitStatus:'pending'});
   }
   return reply({active:false});
  });
  for(const source of ['/match/result/rail-fixture','/match/c/rail/match/pair?from=ranking']){
   await page.goto(base+source);
   const track=page.locator('.wm-pair-work-track').first();await track.waitFor();
   assert.equal(await page.locator('.wm-carousel-controls,.wm-pair-carousel-controls').count(),0,'visible page counters are removed');
   for(const width of [320,390,435,540,900]){
    await page.setViewportSize({width,height:844});
    const measurements=await track.evaluate(el=>{
     const cards=[...el.children],first=cards[0].getBoundingClientRect(),last=cards.at(-1).getBoundingClientRect();
     return {width:first.width,ratio:el.querySelector('.wm-pair-work-artwork').getBoundingClientRect().width/el.querySelector('.wm-pair-work-artwork').getBoundingClientRect().height,snap:getComputedStyle(el).scrollSnapType,content:el.scrollWidth,expected:cards.length*160+(cards.length-1)*10,pageFits:document.documentElement.scrollWidth<=innerWidth,viewport:el.clientWidth};
    });
    assert.equal(measurements.width,160);assert.equal(measurements.snap,'none');assert.ok(measurements.pageFits);assert.ok(Math.abs(measurements.ratio-2/3)<.01);assert.ok(Math.abs(measurements.content-measurements.expected)<=1,'no trailing filler');
    if(width>=435)assert.ok(measurements.viewport>=330,'large phones fit two full compact covers');
   }
   await page.setViewportSize({width:390,height:844});
   await track.evaluate(el=>{scrollTo({top:scrollY+el.getBoundingClientRect().top-130,behavior:'instant'});el.scrollLeft=73;});await pause(450);
   assert.ok(Math.abs(await track.evaluate(el=>el.scrollLeft)-73)<1,'intermediate positions do not snap');
   await track.hover();await page.mouse.wheel(47,0);await pause(600);
   assert.ok(Math.abs(await track.evaluate(el=>el.scrollLeft)-120)<3,'wheel strength is preserved');
   const placement=await track.locator('.wm-pair-work-artwork').first().evaluate(el=>{const box=el.getBoundingClientRect(),genre=el.querySelector('.wm-pair-work-meta small').getBoundingClientRect();return box.bottom-genre.bottom;});
   assert.ok(placement>=4&&placement<=8,'genre sits at the lower cover edge');
   await track.focus();await page.keyboard.press('End');await page.waitForFunction(()=>{const el=document.querySelector('.wm-pair-work-track');return Math.abs(el.scrollLeft-(el.scrollWidth-el.clientWidth))<2;});
   assert.ok(await track.evaluate(el=>Math.abs(el.lastElementChild.getBoundingClientRect().right-el.getBoundingClientRect().right)<2),'last cover ends at the viewport right edge');
   await page.keyboard.press('Home');await page.waitForFunction(()=>document.querySelector('.wm-pair-work-track').scrollLeft<1);
   await track.evaluate(el=>{el.scrollLeft=0;scrollTo({top:scrollY+el.getBoundingClientRect().top-130,behavior:'instant'});});
   const title=track.locator('.wm-scrolling-title').first();await page.waitForFunction(()=>document.querySelector('.wm-scrolling-title')?.dataset.overflow==='true');
   const motion=await title.evaluate(el=>{
    const text=el.firstElementChild,animation=text.getAnimations()[0];animation.pause();
    const duration=animation.effect.getTiming().duration,travel=-parseFloat(text.style.getPropertyValue('--wm-title-travel'));
    const x=()=>new DOMMatrixReadOnly(getComputedStyle(text).transform).m41;
    const moveDuration=duration-1500;
    animation.currentTime=250;const initial=x();animation.currentTime=500+moveDuration*.5;const middle=x();animation.currentTime=500+moveDuration+50;const holdStart=x();animation.currentTime=duration-1;const end=x(),endRight=text.getBoundingClientRect().right-el.getBoundingClientRect().right;
    animation.currentTime=duration+1;const reset=x();animation.play();
    return {duration,travel,middle,end,reset,endRight,holdStart,initial};
   });
   assert.ok(Math.abs(motion.duration/1000-(motion.travel/48+1.5))<.01);assert.ok(Math.abs(motion.initial)<.01,'the beginning stays still for half a second');assert.ok(motion.end<motion.middle);assert.ok(Math.abs(motion.end-motion.holdStart)<.01,'the final characters stay still for the one-second end hold');assert.ok(motion.endRight<=1&&motion.endRight>=-4);assert.ok(Math.abs(motion.reset)<1,'cycle jumps directly to the beginning without reverse panning');
   for(const browserBack of [false,true]){
    await track.evaluate(el=>{el.scrollLeft=73;scrollTo({top:scrollY+el.getBoundingClientRect().top-130,behavior:'instant'});});await pause(150);
    const saved=await track.evaluate(el=>({left:el.scrollLeft,top:el.getBoundingClientRect().top,y:scrollY}));
    await track.locator('.wm-pair-work-artwork > a').nth(1).click({position:{x:80,y:80}});
    await page.waitForURL(/\/match\/work\/rail-work-1/);await page.getByRole('heading',{name:work(1).title,level:1}).waitFor();
    if(browserBack)await page.goBack();else await page.getByRole('button',{name:'이전 화면으로 돌아가기',exact:true}).click();
    await page.waitForURL(base+source);
    await page.waitForFunction(saved=>{const el=document.querySelector('.wm-pair-work-track');return el&&Math.abs(el.scrollLeft-saved.left)<2&&Math.abs(el.getBoundingClientRect().top-saved.top)<3&&scrollY>20;},saved);
    await pause(550);
    assert.ok(Math.abs(await track.evaluate(el=>el.scrollLeft)-saved.left)<2);assert.ok(Math.abs(await track.evaluate(el=>el.getBoundingClientRect().top)-saved.top)<3);
   }
  }
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.wm-scrolling-title').first().evaluate(el=>getComputedStyle(el.firstElementChild).animationName),'none');
  count=1;await page.goto(base+'/match/result/rail-fixture');await page.locator('.wm-pair-work-slide').waitFor();assert.equal(await page.locator('.wm-pair-work-slide').count(),1);assert.equal(await page.locator('.wm-rail-scrollbar:visible').count(),0);
  count=0;await page.reload();await page.getByText('아직 등록한 추천작이 없어요.',{exact:true}).waitFor();assert.equal(await page.locator('.wm-pair-work-track').count(),0);
  assert.deepEqual(errors,[]);await context.close();console.log(JSON.stringify({stage:'isolated-ui-checks',ok:true}));

  // Read-only real data and actual server responses for the user-facing evidence.
  const [profile]=await sql.begin('read only',tx=>tx`select latest.public_profile_id,count(*)::int as work_count from public.match_profiles p
   join lateral (select public_profile_id from public.match_taste_snapshots s where s.profile_id=p.profile_id order by completed_at desc,snapshot_id desc limit 1) latest on true
   join public.match_profile_recommendations r on r.profile_id=p.profile_id join public.webtoons w using(canonical_webtoon_id)
   where w.catalog_status='active' and public.webtoon_is_public_safe(w.raw_data)
   group by latest.public_profile_id having count(*)>=3 order by count(*) desc limit 1`);
  assert.ok(profile,'a real public result has at least three recommendations');
  const liveContext=await browser.newContext({viewport:{width:435,height:844},deviceScaleFactor:2,reducedMotion:'reduce'}),live=await liveContext.newPage();
  await liveContext.route('**/api/v1/**',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.fulfill({status:202,json:{accepted:true}}));
  await live.goto(`${base}/match/result/${profile.public_profile_id}`);const liveTrack=live.locator('.wm-pair-work-track');await liveTrack.waitFor();
  await liveTrack.evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-170,behavior:'instant'}));
  await liveTrack.locator('img').evaluateAll(images=>Promise.race([Promise.all(images.map(img=>img.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,8000))]));
  await live.screenshot({path:path.join(output,'personal_recommendations_compact.png')});
  await liveTrack.evaluate(el=>{el.scrollLeft=73;scrollTo({top:scrollY+el.getBoundingClientRect().top-170,behavior:'instant'});});
  const saved=await liveTrack.evaluate(el=>({left:el.scrollLeft,top:el.getBoundingClientRect().top}));
  await liveTrack.locator('.wm-pair-work-artwork > a').nth(1).click({position:{x:80,y:70}});await live.waitForURL(/\/match\/work\//);await live.locator('.wm-work-summary h1').waitFor();
  await live.getByRole('button',{name:'이전 화면으로 돌아가기',exact:true}).click();await live.waitForURL(`${base}/match/result/${profile.public_profile_id}`);
  await live.waitForFunction(saved=>{const el=document.querySelector('.wm-pair-work-track');return el&&Math.abs(el.scrollLeft-saved.left)<2&&Math.abs(el.getBoundingClientRect().top-saved.top)<3;},saved);await pause(500);
  await live.screenshot({path:path.join(output,'recommendations_after_detail_back.png')});
  await live.goto(base+'/match/c/mKOdmiLcE0JU/match/VIbseuqFQuk6RRDr?from=ranking');const pairTrack=live.locator('.wm-pair-work-track').first();await pairTrack.waitFor();
  await pairTrack.evaluate(el=>{scrollTo({top:scrollY+el.closest('.wm-pair-work-group').getBoundingClientRect().top-100,behavior:'instant'});el.scrollLeft=el.scrollWidth;});
  await pairTrack.locator('img').evaluateAll(images=>Promise.race([Promise.all(images.map(img=>img.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,8000))]));
  assert.ok(await pairTrack.evaluate(el=>el.scrollWidth<=el.clientWidth+1||Math.abs(el.lastElementChild.getBoundingClientRect().right-el.getBoundingClientRect().right)<2));
  await live.screenshot({path:path.join(output,'pair_recommendations_last_edge.png')});
  console.log(JSON.stringify({ok:true,checks:['shared personal/pair layouts','160px compact covers','no page counters','no snap or trailing filler','native 47px wheel movement','faster one-way title pan with instant reset','reduced motion','0/1/10 works','320/390/435/540/900 widths','button and browser back restore viewport anchor and exact pixels after delayed data','real-data screenshots; no committed writes'],output}));
  await liveContext.close();
 }finally{await sql.end({timeout:1});await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
