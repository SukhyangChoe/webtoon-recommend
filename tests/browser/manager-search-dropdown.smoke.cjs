/* Synthetic fixtures; every browser API mutation is intercepted. Never writes service data. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium}=require('playwright');
const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000';
const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-library-manager-'));
const covers=['wt_murim_017','wt_fantasy_081','wt_romance_ropan_016'];
const works=Array.from({length:24},(_,i)=>({canonicalWebtoonId:'library-fixture-'+i,title:i===0?'다시 펼치는 나의 이야기':i===1?'오늘도 함께 달리는 우리':'좋아하는 이야기 '+(i+1),mainGenre:'murim',coverUrl:'/match/covers/'+covers[i%3]+'.webp',introduction:'수련과 동료들의 이야기를 만나보세요. 표지와 함께 읽는 작품 설명이에요.'}));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--disable-gpu']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce',hasTouch:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  let selected=[],failRestore=false,failSave=false,releaseRestore,holdRestore=false,releaseSave,holdSave=false,releaseSlow,forceDuplicate=false;
  const comments=new Map([[works[0].canonicalWebtoonId,'보관된 추천 코멘트']]),writes=[];
  await context.route('**/api/v1/**',async route=>{
   const request=route.request(),url=new URL(request.url()),p=url.pathname,reply=(body,status=200)=>route.fulfill({status,json:body});
   if(p.includes('match-events'))return reply({accepted:true},202);
   if(p==='/api/v1/webtoons/search'){
    assert.ok(url.searchParams.has('registrationPolicy'));
    if(url.searchParams.get('q')==='천천히'){await new Promise(resolve=>{releaseSlow=resolve;});try{return await reply({items:[{...works[0],title:'취소된 옛 검색 결과'}]});}catch{return;}}
    return reply({items:url.searchParams.get('q')==='없음'?[]:[...works,{...works[0],canonicalWebtoonId:'adult',recommendationRegistrationBlocked:true}]});
   }
   if(p.includes('/recommendation-comments/')){
    assert.ok(request.headers()['x-match-anonymous-id']);
    if(holdRestore)await new Promise(resolve=>{releaseRestore=resolve;});
    return failRestore?reply({error:'FAILED'},503):reply({recommendationComment:comments.get(p.split('/').at(-1))??null});
   }
   if(p.includes('/recommendations/')&&!['GET','HEAD'].includes(request.method())){
    const method=request.method(),id=p.split('/').at(-1),body=request.postDataJSON();
    assert.ok(body.anonymousId);assert.equal(body.recommendations,undefined);writes.push({method,id,body});
    if(holdSave)await new Promise(resolve=>{releaseSave=resolve;});
    if(failSave)return reply({error:'FAILED'},503);
    if(forceDuplicate)return reply({error:'RECOMMENDATION_ALREADY_EXISTS'},409);
    if(method==='DELETE')selected=selected.filter(item=>item.canonicalWebtoonId!==id);
    else{
     comments.set(id,body.recommendationComment);
     const item={...works.find(item=>item.canonicalWebtoonId===id),recommendationComment:body.recommendationComment,commentId:'preserved-comment',likeCount:7};
     if(method==='POST')selected.push(item);else{assert.equal(method,'PATCH');selected=selected.map(old=>old.canonicalWebtoonId===id?item:old);}
    }
    return reply({items:selected});
   }
   assert.ok(['GET','HEAD'].includes(request.method()),'unexpected mutation '+p);
   return reply({items:selected});
  });
  await page.goto(base+'/match/result/library-manager-fixture/recommendations');
  const input=page.getByRole('searchbox',{name:'추천할 웹툰 검색'}),submit=page.getByRole('button',{name:'검색',exact:true});
  const dropdown=page.getByRole('dialog',{name:/검색 결과|作品を|작품을 찾고/});
  const editor=page.getByRole('dialog',{name:/추천작 담기|추천 한마디 수정/});
  const grid=page.locator('.wm-library-grid');
  const save=()=>editor.getByRole('button',{name:'저장',exact:true});
  await input.waitFor();
  await page.getByRole('heading',{level:1,name:'내 추천작 관리',exact:true}).waitFor();
  assert.equal(await page.locator('.wm-library-identity p').innerText(),'친구에게 건네고 싶은 웹툰');
  assert.equal(await page.locator('.wm-library-symbol').getAttribute('aria-hidden'),'true','small shelf symbol is decorative, not an action');
  assert.equal(await page.locator('.wm-library-identity button,.wm-library-identity a').count(),0);
  assert.equal(await page.getByRole('heading',{name:/선택한 작품/}).count(),0);
  assert.equal(await page.locator('.wm-library-title-row .wm-count').innerText(),'0 / 10');
  assert.equal(await page.locator('.wm-library-empty button,.wm-library-help,.wm-library-heading .wm-eyebrow').count(),0,'no decorative CTA or explanatory copy');
  assert.equal(await page.locator('.wm-library-empty p').innerText(),'등록한 추천작이 없어요.');
  assert.equal(await page.locator('.wm-library-footnote').innerText(),'최대 10편까지 저장할 수 있어요.');
  assert.equal(await page.getByText('어떤 작품을 추천하고 싶나요?',{exact:true}).count(),0);
  assert.equal(await page.locator('.wm-save-tray,.wm-floating-search').count(),0,'single top search, no bulk save footer');
  assert.ok(await page.locator('.wm-search-section').evaluate(el=>el.getBoundingClientRect().top<document.querySelector('.wm-library-collection').getBoundingClientRect().top));
  assert.equal(await page.getByText(/목록에서 빼도 코멘트는/).count(),0);
  async function search(q='작품'){await input.fill(q);await submit.click();await page.locator('.wm-library-search-results,.wm-search-dropdown .wm-empty').waitFor();}
  async function open(i){await input.click();await dropdown.waitFor();await dropdown.getByRole('button',{name:works[i].title+' '+(selected.some(item=>item.canonicalWebtoonId===works[i].canonicalWebtoonId)?'추천 한마디 수정':'추천작 담기'),exact:true}).click();await editor.waitFor();}
  const collectionTop=()=>page.locator('.wm-library-collection').evaluate(el=>el.getBoundingClientRect().top+scrollY);
  const initialTop=await collectionTop();await search();
  assert.ok(Math.abs(await collectionTop()-initialTop)<1,'dropdown does not push selected collection');
  assert.equal(await page.locator('.wm-library-search-results li').count(),24,'adult works excluded');
  assert.ok((await page.locator('.wm-library-result-description').first().innerText()).includes('표지와 함께'));
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:540,height:740}]){
   await page.setViewportSize(viewport);await page.waitForTimeout(100);
   assert.ok(await dropdown.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;}));
   assert.ok(await page.locator('.wm-search-dropdown-scroll').evaluate(el=>el.scrollHeight>el.clientHeight));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.setViewportSize({width:390,height:844});
  await input.press('Escape');assert.equal(await dropdown.count(),0);
  await input.press('ArrowDown');await page.waitForFunction(()=>document.querySelector('.wm-search-dropdown')?.contains(document.activeElement));
  await page.keyboard.press('Escape');await input.click();await page.mouse.click(4,400);assert.equal(await dropdown.count(),0);
  await input.click();await dropdown.waitFor();await dropdown.getByRole('button',{name:'검색 결과 닫기'}).click();assert.equal(await dropdown.count(),0);
  await search('없음');assert.ok((await dropdown.innerText()).includes('검색 결과가 없어요'));
  await search();holdRestore=true;await open(0);assert.ok(await save().isDisabled());assert.equal(selected.length,0);
  while(!releaseRestore)await page.waitForTimeout(10);holdRestore=false;releaseRestore();await save().waitFor();await page.waitForFunction(()=>!document.querySelector('.wm-editor-actions button').disabled);
  assert.equal(await editor.locator('textarea').inputValue(),'보관된 추천 코멘트');
  assert.equal(await editor.locator('.wm-editor-eyebrow').count(),0);
  assert.equal(await editor.getByText('작품 상세 보기',{exact:true}).count(),0);
  assert.ok(await editor.getByRole('link',{name:works[0].title+' 작품 상세 보기',exact:true}).isVisible());
  assert.equal(await editor.locator('textarea').getAttribute('placeholder'),'다른 독자에게 이 작품이 어떤지 알려주세요.');
  assert.ok(await editor.locator('label').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=17));
  await editor.locator('textarea').fill('수정 중인 코멘트');await editor.getByRole('button',{name:'닫기',exact:true}).click();
  await editor.getByRole('button',{name:'계속 작성'}).click();assert.equal(writes.length,0);
  await editor.getByRole('button',{name:'닫기',exact:true}).click();await editor.getByRole('button',{name:'저장하지 않고 닫기'}).click();await editor.waitFor({state:'detached'});assert.equal(await grid.count(),0);
  await open(0);await page.waitForFunction(()=>!document.querySelector('#wm-edit-comment').disabled);
  await editor.locator('textarea').fill('저장할 추천 한마디');failSave=true;await save().click();await editor.getByRole('alert').waitFor();
  assert.equal(await editor.locator('textarea').inputValue(),'저장할 추천 한마디');assert.equal(selected.length,0);
  failSave=false;holdSave=true;await save().click();await page.waitForFunction(()=>document.querySelector('.wm-editor-actions button').disabled);
  await page.keyboard.press('Escape');assert.ok(await editor.isVisible(),'cannot dismiss pending save');while(!releaseSave)await page.waitForTimeout(10);holdSave=false;releaseSave();
  await editor.waitFor({state:'detached'});assert.equal(await grid.locator('li').count(),1);assert.equal(writes.at(-1).method,'POST');
  assert.equal(await grid.locator('textarea,.wm-genre-tag,.wm-recommendation-comment,small').count(),0,'selected grid has only cover and title');
  assert.ok(page.url().includes('/recommendations'),'save stays on manager');
  await grid.getByRole('button').first().click();assert.equal(await editor.locator('textarea').inputValue(),'저장할 추천 한마디');
  await editor.locator('textarea').fill('');await save().click();await editor.waitFor({state:'detached'});assert.equal(writes.at(-1).method,'PATCH');assert.equal(comments.get(works[0].canonicalWebtoonId),'');assert.equal(selected[0].likeCount,7);
  assert.equal(await grid.locator('.wm-library-comment-needed').count(),1,'empty comments get a visible reminder');
  await grid.getByRole('button').first().click();await editor.getByRole('button',{name:'추천작 삭제',exact:true}).click();
  assert.equal(selected.length,1);await editor.getByText(/작성한 코멘트는 보관/).waitFor();await editor.getByRole('button',{name:'추천 목록에서 삭제',exact:true}).click();
  await editor.waitFor({state:'detached'});assert.equal(writes.at(-1).method,'DELETE');assert.equal(selected.length,0);await page.getByRole('status').filter({hasText:'목록에서 뺐어요.'}).waitFor();
  failRestore=true;await open(0);await editor.getByRole('alert').waitFor();assert.ok(await save().isDisabled());assert.equal(selected.length,0);
  failRestore=false;await editor.getByRole('button',{name:'다시 불러오기'}).click();await page.waitForFunction(()=>!document.querySelector('#wm-edit-comment').disabled);assert.equal(await editor.locator('textarea').inputValue(),'','explicit blank restored');
  await save().click();await editor.waitFor({state:'detached'});
  forceDuplicate=true;await open(1);await page.waitForFunction(()=>!document.querySelector('#wm-edit-comment').disabled);await save().click();await editor.getByRole('alert').filter({hasText:'이미 등록한 작품'}).waitFor();assert.equal(selected.length,1);
  forceDuplicate=false;await editor.getByRole('button',{name:'닫기',exact:true}).click();await editor.waitFor({state:'detached'});
  for(let i=1;i<10;i++){await open(i);await page.waitForFunction(()=>!document.querySelector('#wm-edit-comment').disabled);await save().click();await editor.waitFor({state:'detached'});}
  assert.equal(await grid.locator('li').count(),10);await input.click();await dropdown.waitFor();
  assert.equal(await dropdown.locator('[data-search-work]:not(:disabled)').count(),10,'limit blocks new works but allows existing edits');
  await open(0);await editor.getByRole('button',{name:'닫기',exact:true}).click();await editor.waitFor({state:'detached'});
  for(const width of [320,390,540,900]){
   await page.setViewportSize({width,height:844});await page.waitForTimeout(120);
   await page.evaluate(()=>scrollTo(0,0));
   const original=await page.locator('.wm-library-identity').boundingBox();
   await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.ok(await page.evaluate(()=>scrollY>0),'selected works can scroll');
   const pinned=await page.locator('.wm-library-identity').boundingBox();
   assert.ok(Math.abs(pinned.y-original.y)<1,'manager title and count stay pinned at '+width+'px');
   assert.ok(await page.locator('.wm-library-toolbar').evaluate(el=>Math.abs(el.getBoundingClientRect().top-document.querySelector('.brand-bar').getBoundingClientRect().bottom)<1),'toolbar sits below the brand header');
   await input.click();await dropdown.waitFor();
   assert.ok(await dropdown.evaluate(el=>{const r=el.getBoundingClientRect(),top=document.querySelector('.wm-library-identity').getBoundingClientRect();return document.elementFromPoint(r.left+10,Math.min(r.bottom-10,top.top+10))?.closest('.wm-search-dropdown')===el;}),'search dropdown stays above the pinned identity');
   await input.press('Escape');await page.evaluate(()=>scrollTo(0,0));
   assert.ok(await page.locator('.wm-library-identity').evaluate(el=>{const copy=el.firstElementChild.getBoundingClientRect(),art=el.querySelector('svg').getBoundingClientRect();return copy.right<art.left&&art.right<=innerWidth;}),'identity copy and symbol stay separate at '+width+'px');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.ok(await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length===3));
   const tile=grid.locator('li').first();assert.ok(await tile.evaluate(el=>{const r=el.getBoundingClientRect();return r.width>75&&r.width<180;}));
  }
  await page.setViewportSize({width:390,height:844});await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'library-grid-fixture.png')});
  await grid.getByRole('button').first().click();await page.screenshot({path:path.join(output,'library-editor-fixture.png')});await editor.getByRole('button',{name:'닫기',exact:true}).click();
  await input.fill('천천히');await submit.click();while(!releaseSlow)await page.waitForTimeout(10);
  await input.fill('새 검색');releaseSlow();await page.waitForTimeout(150);assert.equal(await dropdown.count(),0);
  await submit.click();await page.locator('.wm-library-search-results').waitFor();assert.equal(await page.getByText('취소된 옛 검색 결과',{exact:true}).count(),0);
  await page.touchscreen.tap(8,240);assert.equal(await dropdown.count(),0,'outside touch closes results');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,output,writes:writes.length,checks:['cover-only three-column collection','search-first bounded dropdown','keyboard/outside/X dismissal','save-only addition; no bulk replacement','unsaved discard guard','pending restore and fail-closed retry','failure preserves draft; pending-save guard','POST/PATCH/DELETE','soft delete and blank restoration','like identity preserved','duplicate and ten-work limit','320/390/540/900px layout','all mutations mocked']}));
  await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
