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
  let mode='manager',restores=0,failRestore=false,releaseRestore,holdRestore=true,submitted,members=[...original],savedComment='이전에 저장해 둔 추천 코멘트';
  const pendingLikes=new Map();
  await context.route('**/api/v1/**',async route=>{
   const request=route.request(),url=new URL(request.url()),reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(url.pathname.includes('match-events')||url.pathname.includes('analytics'))return reply({ok:true},202);
   if(mode==='manager'&&url.pathname.includes('/recommendation-comments/')){
    restores++;assert.ok(request.headers()['x-match-anonymous-id']);
    if(failRestore)return reply({error:'LOAD_FAILED'},500);
    if(holdRestore)await new Promise(resolve=>{releaseRestore=resolve;});
    return reply({commentId:ids[0],recommendationComment:savedComment});
   }
   if(mode==='manager'&&url.pathname==='/api/v1/webtoons/search')return reply({items:[work]});
   if(mode==='manager'&&['POST','PATCH','DELETE'].includes(request.method())){
    assert.ok(url.pathname.endsWith('/recommendations/'+work.canonicalWebtoonId));
    submitted=request.postDataJSON();assert.equal(submitted.recommendations,undefined);
    if(request.method()==='DELETE')members=members.filter(item=>item.canonicalWebtoonId!==work.canonicalWebtoonId);
    else{savedComment=submitted.recommendationComment;members=[...members.filter(item=>item.canonicalWebtoonId!==work.canonicalWebtoonId),{...work,recommendationComment:savedComment,commentId:ids[0],likeCount:3}];}
    return reply({items:members});
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
  const editor=page.getByRole('dialog',{name:/추천작 담기|추천 한마디 수정/});
  await page.getByRole('button',{name:work.title+' 추천작 담기',exact:true}).click();
  await editor.waitFor();assert.equal(await editor.getByRole('button',{name:'저장',exact:true}).isDisabled(),true);
  while(!releaseRestore)await page.waitForTimeout(10);holdRestore=false;releaseRestore();
  await page.waitForFunction(()=>!document.querySelector('#wm-edit-comment').disabled);
  assert.equal(await editor.locator('textarea').inputValue(),'이전에 저장해 둔 추천 코멘트');
  await editor.locator('textarea').fill('수정한 코멘트');await editor.getByRole('button',{name:'저장',exact:true}).click();await editor.waitFor({state:'detached'});
  assert.equal(submitted.recommendationComment,'수정한 코멘트');
  const selected=()=>page.locator('.wm-library-grid').getByRole('button').filter({hasText:work.title});
  await selected().click();await editor.locator('textarea').fill('');await editor.getByRole('button',{name:'저장',exact:true}).click();await editor.waitFor({state:'detached'});
  await selected().click();assert.equal(await editor.locator('textarea').inputValue(),'');await editor.getByRole('button',{name:'추천작 삭제',exact:true}).click();await editor.getByRole('button',{name:'추천 목록에서 삭제',exact:true}).click();await editor.waitFor({state:'detached'});
  failRestore=true;await page.getByRole('searchbox',{name:'추천할 웹툰 검색'}).click();await page.getByRole('button',{name:work.title+' 추천작 담기',exact:true}).click();await editor.getByRole('alert').waitFor();assert.equal(await selected().count(),0);
  failRestore=false;await editor.getByRole('button',{name:'다시 불러오기'}).click();await page.waitForFunction(()=>!document.querySelector('#wm-edit-comment').disabled);assert.equal(await editor.locator('textarea').inputValue(),'','cleared comment stays blank after delete/re-add');
  assert.ok(restores>=3,'initial load, failed re-add and successful retry all read preserved comments');
  await editor.getByRole('button',{name:'닫기',exact:true}).click();
  mode='pair';await page.goto(base+'/match/c/comments-demo/match/comments-pair');await page.locator('.wm-recommendation-comment').first().waitFor();
  assert.equal(await page.locator('.wm-pair-work-artwork .wm-pair-work-like').count(),0);assert.equal(await page.locator('.wm-pair-work-like').count(),2);assert.equal(await page.locator('.wm-pair-work-card').filter({has:page.getByRole('heading',{name:'코멘트 없는 항목',exact:true})}).locator('.wm-pair-work-like,.wm-pair-work-like-count').count(),0);
  const a=page.locator(`[data-comment-id="${ids[0]}"] button`),b=page.locator(`[data-comment-id="${ids[1]}"] button`);
  await a.click();await b.click();assert.ok(await a.isDisabled()&&await b.isDisabled(),'requests are tracked per comment, not per work');
  await pendingLikes.get(ids[1])();await pendingLikes.get(ids[0])(500);await page.getByRole('alert').filter({hasText:'좋아요를 저장하지 못했어요.'}).waitFor();assert.equal(await a.getAttribute('aria-pressed'),'false');assert.equal(await b.getAttribute('aria-pressed'),'true','one failed comment does not undo another author’s like on the same work');
  for(const width of [320,390,435]){await page.setViewportSize({width,height:844});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('.wm-recommendation-comment').evaluateAll(items=>items.every(el=>el.querySelector('button,.wm-pair-work-like-count').getBoundingClientRect().top>=el.querySelector('blockquote').getBoundingClientRect().bottom)));}
  await page.setViewportSize({width:390,height:1100});await page.addStyleTag({content:'nextjs-portal{display:none!important}'});const card=page.locator('.wm-pair-work-card').filter({has:page.locator('.wm-recommendation-comment')}).first();await card.screenshot({path:path.join(output,'recommendation_comment_heart_fixture.png')});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks:['old comment automatically restored','pending restoration blocks save','saved edits and explicit blanks survive deletion/re-add','safe restoration failure and retry','saved payload retains edited comment','comment-only heart; no blank-comment likes','same work, two authors: independent in-flight likes and rollback','320/390/435px layout','synthetic pair fixture screenshot','all writes intercepted'],output},null,2));await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
