/* UI fixtures never write to the service. Delivered images use existing data. */
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000',profile='xys7o3_7JlgZl91b',output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-comments-ui-'));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const original=(await(await page.request.get(`${base}/api/v1/results/${profile}/recommendations`)).json()).items;
  const works=(await(await page.request.get(`${base}/api/v1/webtoons/search?q=${encodeURIComponent('북검')}`)).json()).items;
  const work=works.find(item=>!original.some(saved=>saved.canonicalWebtoonId===item.canonicalWebtoonId));assert.ok(work);
  const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
  let mode='manager',restores=0,failRestore=false,releaseRestore,holdRestore=true,submitted;
  const pendingLikes=new Map();
  await context.route('**/api/v1/**',async route=>{
   const request=route.request(),url=new URL(request.url()),reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(url.pathname.includes('match-events')||url.pathname.includes('analytics'))return reply({ok:true},202);
   if(mode==='manager'&&url.pathname.includes('/recommendation-comments/')){
    restores++;assert.ok(request.headers()['x-match-anonymous-id']);
    if(failRestore)return reply({error:'LOAD_FAILED'},500);
    if(holdRestore)await new Promise(resolve=>{releaseRestore=resolve;});
    return reply({commentId:ids[0],recommendationComment:'이전에 저장해 둔 추천 코멘트'});
   }
   if(mode==='manager'&&url.pathname==='/api/v1/webtoons/search')return reply({items:[work]});
   if(mode==='manager'&&request.method()==='PUT'){
    submitted=request.postDataJSON().recommendations;return reply({error:'RECOMMENDATIONS_SAVE_FAILED'},500);
   }
   if(mode==='pair'&&url.pathname.endsWith('/results/comments-pair')){
    const item=(id,body)=>({...work,commentId:id,recommendationComment:body,likeCount:0,likedByViewer:false,canViewerLike:true,recommenderPublicProfileId:id,tasteFitHighlighted:false});
    return reply({ownerNickname:'작성자 A',challengerNickname:'작성자 B',viewerRole:null,ownerGenreKey:'murim',challengerGenreKey:'fantasy',score:80,band:{label:'취향 잘 맞음'},sharedGenres:[],differentGenres:[],sharedTasteLabels:[],ownerRecommendedGenres:[],challengerRecommendedGenres:[],ownerRecommendations:[item(ids[0],'A의 추천 코멘트')],challengerRecommendations:[item(ids[1],'B의 추천 코멘트'),{...item(null,null),canonicalWebtoonId:'no-comment',title:'코멘트 없는 항목'}],rank:1,entryCount:2});
   }
   if(mode==='pair'&&request.method()==='PUT'){
    assert.ok(url.pathname.startsWith('/api/v1/recommendation-comments/'));
    const id=url.pathname.split('/').at(-2);return new Promise(resolve=>{pendingLikes.set(id,async(status=200)=>{await reply(status===200?{commentId:id,likedByViewer:request.postDataJSON().liked,likeCount:request.postDataJSON().liked?1:0}:{error:'FAILED'},status);resolve();});});
   }
   assert.ok(['GET','HEAD'].includes(request.method()),'no service writes');return route.continue();
  });
  const manager=`${base}/match/result/${profile}/recommendations`;
  await page.goto(manager);await page.getByRole('searchbox',{name:'추천할 웹툰 검색'}).fill('북검');await page.getByRole('button',{name:'검색',exact:true}).click();
  await page.locator('.wm-search-results').getByRole('button',{name:'추가',exact:true}).click();
  await page.getByRole('button',{name:'불러오는 중…',exact:true}).waitFor();assert.equal(await page.locator('.wm-save-tray button').isDisabled(),true);
  releaseRestore();await page.locator('.wm-restored-comment').waitFor();
  const selected=()=>page.locator('.wm-selected-list > li').filter({has:page.getByRole('heading',{name:work.title,exact:true})});
  assert.equal(await selected().locator('textarea').inputValue(),'이전에 저장해 둔 추천 코멘트');
  await selected().locator('textarea').fill('수정 중인 코멘트');await selected().getByRole('button',{name:`${work.title} 추천작에서 삭제`,exact:true}).click();
  await page.locator('.wm-search-results').getByRole('button',{name:'추가',exact:true}).click();assert.equal(await selected().locator('textarea').inputValue(),'수정 중인 코멘트');assert.equal(restores,1,'local removal/re-add preserves unsaved text without another request');
  await selected().locator('textarea').fill('');await selected().getByRole('button',{name:`${work.title} 추천작에서 삭제`,exact:true}).click();await page.locator('.wm-search-results').getByRole('button',{name:'추가',exact:true}).click();assert.equal(await selected().locator('textarea').inputValue(),'','explicit empty text is not replaced with an older comment');
  await selected().locator('textarea').fill('그대로 저장할 수정 코멘트');await page.locator('.wm-save-tray button').click();await page.getByRole('alert').filter({hasText:'추천작을 저장하지 못했어요.'}).waitFor();assert.equal(submitted.find(item=>item.canonicalWebtoonId===work.canonicalWebtoonId).recommendationComment,'그대로 저장할 수정 코멘트');
  holdRestore=false;failRestore=true;await page.goto(manager);await page.getByRole('searchbox',{name:'추천할 웹툰 검색'}).fill('북검');await page.getByRole('button',{name:'검색',exact:true}).click();await page.locator('.wm-search-results').getByRole('button',{name:'추가',exact:true}).click();await page.getByRole('alert').filter({hasText:'이전 코멘트를 확인하지 못했어요.'}).waitFor();assert.equal(await selected().count(),0,'restore failure cannot silently add an empty replacement');
  failRestore=false;await page.locator('.wm-search-results').getByRole('button',{name:'추가',exact:true}).click();await page.locator('.wm-restored-comment').waitFor();
  mode='pair';await page.goto(base+'/match/c/comments-demo/match/comments-pair');await page.locator('.wm-recommendation-comment').first().waitFor();
  assert.equal(await page.locator('.wm-pair-work-artwork .wm-pair-work-like').count(),0);assert.equal(await page.locator('.wm-pair-work-like').count(),2);assert.equal(await page.locator('.wm-pair-work-card').filter({has:page.getByRole('heading',{name:'코멘트 없는 항목',exact:true})}).locator('.wm-pair-work-like,.wm-pair-work-like-count').count(),0);
  const a=page.locator(`[data-comment-id="${ids[0]}"] button`),b=page.locator(`[data-comment-id="${ids[1]}"] button`);
  await a.click();await b.click();assert.ok(await a.isDisabled()&&await b.isDisabled(),'requests are tracked per comment, not per work');
  await pendingLikes.get(ids[1])();await pendingLikes.get(ids[0])(500);await page.getByRole('alert').filter({hasText:'좋아요를 저장하지 못했어요.'}).waitFor();assert.equal(await a.getAttribute('aria-pressed'),'false');assert.equal(await b.getAttribute('aria-pressed'),'true','one failed comment does not undo another author’s like on the same work');
  for(const width of [320,390,435]){await page.setViewportSize({width,height:844});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('.wm-recommendation-comment').evaluateAll(items=>items.every(el=>el.querySelector('button,.wm-pair-work-like-count').getBoundingClientRect().top>=el.querySelector('blockquote').getBoundingClientRect().bottom)));}
  mode='live';await page.setViewportSize({width:390,height:1400});await page.goto(`${base}/match/result/${profile}`);await page.locator('.wm-recommendation-comment').first().waitFor();
  await page.evaluate(()=>document.fonts.ready);const card=page.locator('.wm-recommendation-card').filter({has:page.locator('.wm-recommendation-comment')}).first();await card.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode().catch(()=>{}))));await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.addStyleTag({content:'nextjs-portal{display:none!important}'});assert.ok(await card.evaluate(el=>el.getBoundingClientRect().bottom<document.querySelector('.wm-action-bar').getBoundingClientRect().top),'comment hearts remain visible above the fixed action bar');await card.screenshot({path:path.join(output,'recommendation_comment_heart_live.png')});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks:['old comment automatically restored','pending restoration blocks save','unsaved edits and explicit blanks survive removal/re-add','safe restoration failure and retry','saved payload retains edited comment','comment-only heart; no blank-comment likes','same work, two authors: independent in-flight likes and rollback','320/390/435px layout','only real current service data in screenshot','all writes intercepted'],output},null,2));await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
