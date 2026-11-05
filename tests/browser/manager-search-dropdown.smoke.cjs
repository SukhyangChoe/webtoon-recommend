/* Real manager UI with isolated search/restore fixtures. No service writes. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium}=require('playwright');
const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000';
const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-search-dropdown-'));
const works=Array.from({length:24},(_,index)=>({canonicalWebtoonId:'dropdown-work-'+index,title:'검색 작품 '+(index+1),platform:'네이버웹툰',mainGenre:'murim',coverUrl:null,introduction:'표지와 함께 읽는 작품 설명이에요. 수련과 동료들의 이야기를 만나보세요.'}));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce',hasTouch:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let failRestore=false,restoreCount=0,writes=0,releaseSlow;
  await context.route('**/api/v1/**',async route=>{
   const request=route.request(),url=new URL(request.url()),p=url.pathname,reply=(body,status=200)=>route.fulfill({status,json:body});
   if(p.includes('match-events'))return reply({accepted:true},202);
   if(!['GET','HEAD'].includes(request.method())){writes++;throw Error('Unexpected write '+p);}
   if(p==='/api/v1/webtoons/search'){
    const q=url.searchParams.get('q');
    if(q==='천천히'){await new Promise(resolve=>{releaseSlow=resolve;});try{return await reply({items:[{...works[0],title:'취소된 옛 검색 결과'}]});}catch{return;}}
    return reply({items:q==='없음'?[]:q==='처음'?works.slice(0,3):works});
   }
   if(p.includes('/recommendation-comments/')){restoreCount++;return failRestore?reply({error:'RESTORE_FAILED'},503):reply({recommendationComment:'보관된 추천 코멘트'});}
   return reply({items:[]});
  });
  await page.goto(base+'/match/result/manager-dropdown-self/recommendations');
  const input=page.getByRole('searchbox',{name:'추천할 웹툰 검색'}),submit=page.getByRole('button',{name:'검색',exact:true});
  const popup=page.getByRole('dialog',{name:/검색 결과|작품을 찾고 있어요/});
  const selected=page.locator('.wm-manager-section:not(.wm-search-section)');
  await input.waitFor({state:'visible'});
  await page.locator('.wm-local-nav .site-back-control').waitFor({state:'visible'});
  for(const width of [320,390,540,900]){
   await page.setViewportSize({width,height:844});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const header=await page.locator('.wm-local-nav .site-back-control').evaluate(el=>{
    const back=el.getBoundingClientRect(),logo=document.querySelector('.brand-bar__logo').getBoundingClientRect(),bar=document.querySelector('body > .brand-bar').getBoundingClientRect();
    const style=getComputedStyle(document.querySelector('body > .brand-bar'));
    return {aligned:Math.abs(back.top+back.height/2-bar.top-bar.height/2)<1,beforeLogo:back.right<logo.left,width:back.width,height:back.height,background:style.backgroundColor,border:style.borderBottomWidth,backTop:back.top,barTop:bar.top,barHeight:bar.height};
   });
   assert.ok(header.aligned&&header.beforeLogo&&header.width>=44&&header.height>=44&&header.background==='rgb(243, 250, 252)'&&header.border==='0px','manager header at '+width+'px: '+JSON.stringify(header));
   assert.ok(await page.locator('.wm-manager-hero').evaluate(el=>{
    const image=el.querySelector('.wm-hero-book').getBoundingClientRect(),copy=el.firstElementChild.getBoundingClientRect();
    return image.left>=copy.right&&image.right<=innerWidth&&image.width>=60;
   }),'original book illustration never overlaps the heading at '+width+'px');
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await page.locator('.wm-local-nav a').getAttribute('href'),'/match/result/manager-dropdown-self');
  assert.equal(await page.locator('.wm-return-link').count(),0,'no redundant bottom return link');
  assert.equal(await page.getByText(/목록에서 빼도 코멘트는/).count(),0,'no permanent retention note');
  assert.equal(await page.getByText('성인 인증이 필요한 작품은 추천작 등록에서 제외됩니다.',{exact:true}).count(),0,'no permanent age-restriction notice');
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await page.waitForTimeout(150);
  await page.screenshot({path:path.join(output,'recommendation-manager-original-book.png')});
  const top=()=>selected.evaluate(el=>el.getBoundingClientRect().top+scrollY);
  async function search(q){await input.fill(q);await submit.click();await page.locator('.wm-search-results, .wm-search-dropdown .wm-empty').waitFor();}
  const initialTop=await top();await search('처음');assert.ok(Math.abs(await top()-initialTop)<1,'opening search never pushes the selection section');
  assert.equal(await page.locator('.wm-search-results li').count(),3);
  assert.equal(await page.locator('.wm-search-results .wm-work-cover').count(),3);
  assert.ok((await page.locator('.wm-search-results .wm-note').first().innerText()).includes('표지와 함께'));
  const resultScroll=()=>page.locator('.wm-search-dropdown-scroll').evaluate(el=>el.scrollTop);
  const scrollBeforeAdd=await resultScroll();
  await popup.getByRole('button',{name:'추가',exact:true}).first().click();
  await popup.getByRole('button',{name:'추가됨',exact:true}).first().waitFor();
  assert.ok(await popup.isVisible(),'adding keeps the dropdown open');
  assert.equal(await resultScroll(),scrollBeforeAdd,'adding preserves dropdown scroll position');
  assert.equal(await page.locator('.wm-selected-list > li').count(),1);
  await popup.getByRole('button',{name:'추가',exact:true}).first().click();
  await page.waitForFunction(()=>document.querySelectorAll('.wm-selected-list > li').length===2);
  assert.ok(await popup.isVisible(),'a second work can be added without reopening');
  assert.equal(await popup.getByRole('button',{name:'추가됨',exact:true}).count(),2);
  await popup.getByRole('button',{name:'검색 결과 닫기'}).click();await popup.waitFor({state:'detached'});
  const comment=page.locator('.wm-selected-list textarea').first();assert.equal(await comment.inputValue(),'보관된 추천 코멘트');await comment.fill('검색해도 유지되는 코멘트');
  const compact=await comment.evaluate(el=>({height:el.getBoundingClientRect().height,textSize:getComputedStyle(el).fontSize,placeholderSize:getComputedStyle(el,'::placeholder').fontSize,counterSize:getComputedStyle(el.parentElement.querySelector('small')).fontSize}));
  assert.deepEqual(compact,{height:76,textSize:'16px',placeholderSize:'13px',counterSize:'11px'},'compact hint and field preserve mobile-safe input text');
  await comment.scrollIntoViewIfNeeded();await page.waitForTimeout(150);await page.locator('.wm-selected-list > li').first().screenshot({path:path.join(output,'compact-recommendation-comment.png')});
  const stableTop=await top();await search('많이');assert.equal(await page.locator('.wm-search-results li').count(),24);
  assert.ok(Math.abs(await top()-stableTop)<1,'24 search results do not move the selected works');
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:540,height:740}]){
   if(await popup.count())await input.press('Escape');
   await page.setViewportSize(viewport);await input.scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const baseTop=await top();await input.click();await popup.waitFor();await page.waitForTimeout(80);
   assert.ok(await page.locator('.wm-search-dropdown-scroll').evaluate(el=>el.scrollHeight>el.clientHeight&&getComputedStyle(el).overflowY==='auto'));
   assert.ok(await popup.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;}),'dropdown stays within '+JSON.stringify(viewport));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.ok(Math.abs(await top()-baseTop)<1,'results never add flow height at each viewport');
  }
  await page.setViewportSize({width:390,height:844});await input.scrollIntoViewIfNeeded();
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'});await page.screenshot({path:path.join(output,'search-dropdown-fixture.png')});
  await input.press('Escape');assert.equal(await popup.count(),0);assert.equal(await input.inputValue(),'많이');
  await input.press('ArrowDown');await popup.waitFor();await page.waitForFunction(()=>document.querySelector('.wm-search-dropdown')?.contains(document.activeElement));
  assert.ok(await popup.evaluate(el=>el.contains(document.activeElement)),'keyboard can enter rich search results');
  await page.keyboard.press('Escape');assert.equal(await popup.count(),0);
  await input.click();await popup.waitFor();await page.locator('.wm-manager-hero h1').click();assert.equal(await popup.count(),0,'outside click dismisses without navigation');
  assert.equal(await comment.inputValue(),'검색해도 유지되는 코멘트');
  await input.click();await popup.waitFor();await popup.getByRole('button',{name:'검색 결과 닫기'}).click();assert.equal(await popup.count(),0);
  await search('없음');assert.ok((await popup.innerText()).includes('검색 결과가 없어요.'));assert.ok(Math.abs(await top()-stableTop)<1);
  await search('많이');failRestore=true;await popup.getByRole('button',{name:'추가',exact:true}).first().click();
  await page.getByRole('alert').filter({hasText:'이전 코멘트를 확인하지 못했어요.'}).waitFor();assert.equal(await page.locator('.wm-selected-list > li').count(),2,'restore failure never adds an empty replacement');assert.ok(await popup.isVisible());
  failRestore=false;await popup.getByRole('button',{name:'추가',exact:true}).first().click();await page.waitForFunction(()=>document.querySelectorAll('.wm-selected-list > li').length===3);assert.ok(await popup.isVisible());assert.equal(await comment.inputValue(),'검색해도 유지되는 코멘트');
  await input.fill('천천히');await submit.click();await page.waitForFunction(()=>document.querySelector('.wm-search-dropdown[aria-busy="true"]'));
  while(!releaseSlow)await new Promise(resolve=>setTimeout(resolve,10));await input.fill('새 검색');releaseSlow();await page.waitForTimeout(150);
  assert.equal(await popup.count(),0,'editing the query cancels the older request');
  await submit.click();await page.locator('.wm-search-results').waitFor();assert.equal(await page.getByText('취소된 옛 검색 결과',{exact:true}).count(),0);
  await input.press('Escape');
  await page.locator('.wm-selected-list > li').first().getByRole('button',{name:/삭제/}).click();
  await page.getByRole('status').filter({hasText:'목록에서 뺐어요. 코멘트는 보관돼요.'}).waitFor();
  await input.click();await popup.waitFor();await popup.getByRole('button',{name:'추가',exact:true}).first().click();await page.waitForFunction(()=>document.querySelectorAll('.wm-selected-list > li').length===3);
  assert.equal(await page.locator('.wm-selected-list textarea').last().inputValue(),'검색해도 유지되는 코멘트');
  assert.equal(await page.getByRole('status').filter({hasText:'목록에서 뺐어요.'}).count(),0,'adding again dismisses removal notice');
  for(let count=3;count<10;count++){
   await popup.getByRole('button',{name:'추가',exact:true}).first().click();
   await page.waitForFunction(expected=>document.querySelectorAll('.wm-selected-list > li').length===expected,count+1);
   assert.ok(await popup.isVisible(),'dropdown remains open through consecutive additions');
  }
  assert.equal(await popup.locator('[data-search-add]:not(:disabled)').count(),0,'ten-work limit still enforced');
  await page.touchscreen.tap(8,120);
  assert.equal(await popup.count(),0,'outside touch closes the dropdown');
  assert.equal(writes,0);assert.ok(restoreCount>=3);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,output,checks:['back beside logo at 320/390/540/900px','cool seamless manager header','cover and description in rich dropdown','selection section never pushed by results','bounded internal scrolling at 320/390/540px','consecutive additions keep dropdown and scroll position','ten-work limit','outside click/touch, Escape and close controls','keyboard reopening','comments survive search and restore failure','stale searches cancelled','no service writes']}));
  await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error({name:error.name,message:error.message,stack:error.stack});process.exitCode=1;});
