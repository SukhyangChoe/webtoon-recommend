/* All browser API writes are intercepted. No production data/cache mutations. */
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000';
const out=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-nov09-refinements-'));
const covers=['wt_murim_017','wt_murim_011','wt_romance_ropan_016'];
const works=Array.from({length:24},(_,i)=>({canonicalWebtoonId:'refine-work-'+i,title:'테스트 작품 '+(i+1),mainGenre:'murim',mainGenreLabel:'무협',platform:'네이버웹툰',coverUrl:'/match/covers/'+covers[i%3]+'.webp',introduction:'나만의 이야기를 찾아가는 인물과 동료들의 모험이에요.'}));
(async()=>{
 const {sharedFitReasons}=await import('../../src/features/match/config/workDetailPresentation.mjs');
 const readingVector={tagScores:{growth:3,story_immersion:3,humor_comedy:3,action_catharsis:2},artStyleScores:{detailed_rendering:2}};
 const reasons=sharedFitReasons(readingVector,{...readingVector,contentAxisScores:{martial_training:3}},{growth:'성장',story_immersion:'몰입감',humor_comedy:'유쾌함',action_catharsis:'전투 쾌감'},{},{limit:5,descriptions:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--disable-gpu']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  let items=[{...works[0],recommendationComment:null,likeCount:0},{...works[1],recommendationComment:'좋아요',likeCount:2}],writes=0,reads=0;
  await context.route('**/api/v1/**',async route=>{
   const req=route.request(),url=new URL(req.url()),p=url.pathname,reply=(body,status=200)=>route.fulfill({status,json:body});
   if(p.includes('match-events'))return reply({accepted:true},202);
   if(p==='/api/v1/webtoons/search'){reads++;return reply({items:url.searchParams.get('q')==='없음'?[]:url.searchParams.get('scope')==='catalog'&&url.searchParams.get('page')==='1'?works.slice(0,20):url.searchParams.get('page')==='2'?works.slice(20):works,page:Number(url.searchParams.get('page')||1),hasMore:url.searchParams.get('scope')==='catalog'&&url.searchParams.get('page')==='1'});}
   if(p.startsWith('/api/v1/webtoons/refine-work-')){
    const id=p.replace('/api/v1/webtoons/','').replace('/fit',''),work=works.find(w=>w.canonicalWebtoonId===id);
    const fit={rawScore:.64,displayScore:80,percent:64,displayScoreVersion:'sqrt_v1',highlighted:true,reasons};
    return reply(p.endsWith('/fit')?{fitStatus:'ready',fit}:{...work,creators:[],officialUrl:null,statusLabel:'연재 중',ageRating:'전체이용가',contentLabels:[],artStyles:[],appreciationPoints:[{key:'growth',label:'성장',icon:'growth'}],introductionKind:'editorial',fitStatus:'pending',fit:null});
   }
   if(p==='/api/v1/results/refinement-self')return reply({publicProfileId:'refinement-self',nickname:'독자',canManage:true,activeChallengeCode:null,topGenres:[],displayGenres:[],wellMatchedLabels:[],lessMatchedLabels:[]});
   if(p.endsWith('/daily-picks'))return reply({publicProfileId:'refinement-self',mode:'personalized',items:[]});
   if(p==='/api/v1/challenges/recommendation-ui/results/pair')return reply({ownerNickname:'친구',challengerNickname:'나',viewerRole:'challenger',viewerPublicProfileId:'refinement-self',ownerGenreKey:'murim',challengerGenreKey:'fantasy',score:80,band:{label:'취향 잘 맞음'},sharedGenres:[],differentGenres:[],sharedTasteLabels:[],ownerRecommendedGenres:[],challengerRecommendedGenres:[],ownerRecommendations:[{...works[0],recommendationComment:'친구가 남긴 추천 한마디',commentId:'11111111-1111-4111-8111-111111111111',likeCount:2,likedByViewer:false,canViewerLike:true},{...works[1],recommendationComment:null,likeCount:0,canViewerLike:false}],challengerRecommendations:[]});
   if(p.startsWith('/api/v1/recommendation-comments/')&&req.method()==='PUT')return reply({commentId:'11111111-1111-4111-8111-111111111111',likedByViewer:req.postDataJSON().liked,likeCount:req.postDataJSON().liked?3:2});
   if(p.endsWith('/recommendations'))return reply({items});
   if(p.includes('/recommendation-comments/'))return reply({recommendationComment:null});
   if(p.includes('/recommendations/')&&req.method()==='PATCH'){writes++;const id=p.split('/').at(-1);items=items.map(item=>item.canonicalWebtoonId===id?{...item,recommendationComment:req.postDataJSON().recommendationComment}:item);return reply({items});}
   assert.ok(['GET','HEAD'].includes(req.method()),'no unexpected mutation '+p);return reply({items:[]});
  });
  await page.goto(base+'/match/search?q=검');const dropdown=page.locator('.wm-search-dropdown');await page.locator('.wm-catalog-list li').nth(19).waitFor();
  async function rowStyle(selector){return page.locator(selector).first().evaluate(el=>{const cover=el.querySelector('.wm-work-cover').getBoundingClientRect();return {coverWidth:cover.width,coverHeight:cover.height,title:getComputedStyle(el.querySelector('.wm-library-result-copy strong')).fontSize,description:getComputedStyle(el.querySelector('.wm-library-result-description')).fontSize};});}
  const catalogStyle=await rowStyle('.wm-catalog-card');
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:540,height:740}]){
   await page.setViewportSize(viewport);await page.waitForTimeout(80);
   assert.ok(await dropdown.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&el.scrollWidth<=el.clientWidth+1;}));
  }
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'검색 결과 닫기'}).click();assert.equal(await dropdown.count(),0);
  const input=page.getByRole('searchbox',{name:'작품명 검색'});await input.press('ArrowDown');await dropdown.waitFor();await page.waitForFunction(()=>document.querySelector('.wm-search-result')===document.activeElement);
  await page.keyboard.press('Escape');assert.equal(await dropdown.count(),0);await input.click();await dropdown.waitFor();await page.mouse.click(4,500);assert.equal(await dropdown.count(),0);
  await input.click();await dropdown.waitFor();await page.getByRole('button',{name:'작품 더 보기'}).click();await page.locator('.wm-catalog-list li').nth(23).waitFor();
  const last=page.locator('.wm-catalog-card').last();await last.scrollIntoViewIfNeeded();
  const savedScroll=await page.locator('.wm-search-dropdown-scroll').evaluate(el=>el.scrollTop),beforeReads=reads;
  await last.click();await page.waitForURL('**/match/work/refine-work-23?*');await page.getByRole('button',{name:'핏 점수 안내'}).waitFor();
  async function checkFitLabel(selector){
   const row=page.locator(selector),diamond=row.locator('svg');
   await diamond.waitFor({state:'visible'});
   assert.ok(await row.evaluate(el=>{
    const title=el.firstElementChild,mark=title.querySelector('svg'),path=mark.querySelector('path');
    const label=title.getBoundingClientRect(),icon=mark.getBoundingClientRect(),shape=path.getBoundingClientRect();
    const info=el.querySelector('.wm-fit-help > span').getBoundingClientRect(),css=getComputedStyle(path);
    return icon.width>=16&&icon.height>=16&&shape.width>10&&shape.height>10&&css.stroke!=='none'&&Number(css.opacity)>0&&
     icon.left>=0&&info.right<=innerWidth&&info.left-label.right>=0&&info.left-label.right<=7&&
     Math.abs(info.top+info.height/2-label.top-label.height/2)<1;
   }),'diamond is visibly drawn at full size; info icon aligned closely beside label');
  }
  for(const width of [320,390,540]){
   await page.setViewportSize({width,height:844});await page.waitForTimeout(80);
   await checkFitLabel('.wm-work-summary .wm-fit-label-row');
  }
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(80);
  await page.locator('.wm-work-fit').screenshot({path:path.join(out,'collapsed-fit-diamond-fixture.png')});
  const guide=page.getByRole('dialog',{name:'핏 점수란?',exact:true});await page.getByRole('button',{name:'핏 점수 안내'}).click();await guide.waitFor();
  assert.equal(await guide.locator('li').count(),4);assert.equal(await guide.locator('p').count(),1,'only the introductory paragraph remains');
  assert.equal(await guide.locator('.wm-fit-guide-note').count(),0);
  assert.ok(await guide.getByRole('heading',{name:'핏 점수란?',exact:true}).evaluate(el=>Number(getComputedStyle(el).fontWeight)>=700),'guide title is bold');
  await page.keyboard.press('Escape');await guide.waitFor({state:'detached'});assert.equal(await page.locator('.wm-work-page').getAttribute('data-stage'),'collapsed');
  await page.locator('.wm-work-open').click();await page.locator('.wm-work-reasons').waitFor();assert.equal(await page.locator('.wm-work-reason').count(),5);assert.equal(await page.locator('.wm-work-reason p').count(),5);
  assert.doesNotMatch(await page.locator('.wm-work-reasons').innerText(),/내 취향과.*겹쳐|함께 찾았어요/);
  assert.ok((await page.locator('.wm-work-reasons').innerText()).includes('수련 전후'));
  await checkFitLabel('.wm-work-reading-fit .wm-fit-label-row');
  assert.equal(await page.getByRole('heading',{name:'감상 포인트',exact:true}).count(),0);
  await page.getByRole('button',{name:'핏 점수 안내'}).click();await guide.waitFor();await page.keyboard.press('Escape');await guide.waitFor({state:'detached'});assert.equal(await page.locator('.wm-work-page').getAttribute('data-stage'),'reasons','closing guide does not collapse the parent sheet');
  assert.equal(await page.getByRole('meter',{name:'핏점수'}).getAttribute('aria-valuenow'),'80');
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'});await page.screenshot({path:path.join(out,'expanded-work-fixture.png')});
  await page.getByRole('button',{name:'이전 화면으로 돌아가기'}).click();await page.waitForURL('**/match/search?q=*');await page.locator('.wm-catalog-list li').nth(23).waitFor();
  await page.waitForFunction(y=>Math.abs(document.querySelector('.wm-search-dropdown-scroll').scrollTop-y)<3,savedScroll);assert.equal(reads,beforeReads,'both loaded pages and dropdown position restored');
  await page.goto(base+'/match/result/refinement-self/recommendations');await page.getByRole('searchbox',{name:'추천할 웹툰 검색'}).fill('검');await page.getByRole('button',{name:'검색',exact:true}).click();await page.locator('.wm-library-search-results li').first().waitFor();
  assert.deepEqual(await rowStyle('.wm-library-search-results button'),catalogStyle,'catalog and manager use the same result row layout');
  await page.goto(base+'/match/result/refinement-self');await page.locator('.wm-recommendation-comment').first().waitFor();
  assert.equal(await page.getByText('추천 한마디를 남겨보세요.',{exact:true}).count(),0,'empty comments never imitate actual comment text');
  assert.equal(await page.locator('.wm-recommendation-edit').count(),1,'filled comments have one pencil');
  assert.equal(await page.locator('.wm-recommendation-comment-needed').count(),1,'empty comments use a red recommendation prompt instead of a box');
  assert.ok((await page.locator('.wm-recommendation-comment-needed').innerText()).includes('추천 한마디'));
  assert.equal(await page.locator('.wm-recommendation-comment').count(),1,'no empty bordered comment box');
  assert.equal(await page.locator('.wm-comment-actions button.wm-pair-work-like').count(),0,'personal recommendation likes are read-only counts');
  assert.ok(await page.locator('.wm-pair-work-like-count').evaluateAll(items=>items.every(el=>{const css=getComputedStyle(el);return css.borderTopWidth==='0px'&&css.backgroundColor==='rgba(0, 0, 0, 0)';})));
  assert.ok(await page.locator('.wm-recommendation-comment').evaluateAll(items=>items.every(el=>{const box=el.getBoundingClientRect(),quote=el.querySelector('blockquote'),edit=el.querySelector('.wm-recommendation-edit').getBoundingClientRect(),like=el.querySelector('.wm-pair-work-like-count').getBoundingClientRect();return getComputedStyle(el).borderTopWidth==='1px'&&edit.right<=like.left&&getComputedStyle(quote).borderTopWidth==='0px'&&quote.getBoundingClientRect().bottom<=edit.top&&like.bottom<box.bottom&&edit.bottom<box.bottom;})),'one border encloses comment, pencil and count');
  assert.ok(await page.locator('.wm-recommendation-edit').evaluateAll(buttons=>buttons.every(el=>{const css=getComputedStyle(el),r=el.getBoundingClientRect();return css.borderTopWidth==='0px'&&css.backgroundColor==='rgba(0, 0, 0, 0)'&&r.width>=44&&r.height>=44;})),'plain pencils retain accessible tap targets');
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'});await page.locator('.wm-personal-carousel').screenshot({path:path.join(out,'personal-comment-controls-fixture.png')});
  await page.getByRole('button',{name:works[0].title+' 추천 한마디 입력',exact:true}).click();
  const editor=page.getByRole('dialog',{name:'추천 한마디 수정',exact:true});await editor.waitFor();assert.equal(await editor.locator('textarea').inputValue(),'');
  await editor.locator('textarea').fill('다른 독자에게 전하고 싶은 한마디');await editor.getByRole('button',{name:'저장',exact:true}).click();await editor.waitFor({state:'detached'});assert.equal(writes,1);
  assert.equal(await page.getByRole('button',{name:works[0].title+' 추천 한마디 입력',exact:true}).count(),0);
  assert.equal(await page.locator('.wm-recommendation-comment-needed').count(),0,'saving turns the prompt into a real comment box');
  assert.equal(await page.locator('.wm-recommendation-comment').count(),2);
  await page.goto(base+'/match/c/recommendation-ui/match/pair');await page.locator('.wm-pair-work-like').waitFor();
  assert.equal(await page.locator('.wm-recommendation-edit').count(),0,'a viewer cannot edit a friend’s recommendation');
  assert.equal(await page.locator('.wm-pair-work-like').count(),1,'only a real counterpart comment is likeable');
  const like=page.locator('.wm-pair-work-like');
  assert.ok(await like.evaluate(el=>{const box=el.closest('.wm-recommendation-comment'),quote=box.querySelector('blockquote');return getComputedStyle(el).borderTopWidth==='1px'&&getComputedStyle(box).borderTopWidth==='1px'&&el.getBoundingClientRect().top>=quote.getBoundingClientRect().bottom&&el.getBoundingClientRect().bottom<box.getBoundingClientRect().bottom;}),'counterpart like button stays inside the shared comment border');
  await like.click();await page.waitForFunction(()=>document.querySelector('.wm-pair-work-like').getAttribute('aria-pressed')==='true');assert.equal(await like.locator('b').innerText(),'3');
  for(const width of [320,390,540]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,out,checks:['unified bounded dropdowns','close/X/outside/keyboard','pagination and inner-scroll restoration','fit guide four score ranges','guide Escape preserves parent sheet','five explained genuine-match cards; no appreciation block','unchanged fit score','empty personal comment is a direct editor action','all API writes mocked']}));await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
