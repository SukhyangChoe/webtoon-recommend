/* Isolated fixture QA. All browser API writes are intercepted; no service data is changed. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium,webkit}=require('playwright');
const versions=require('../../src/features/match/config/versions.mjs').MATCH_VERSIONS;
const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000';
const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-nov-feedback-'));
const work=(id,title,comment)=>({canonicalWebtoonId:id,title,platform:'네이버웹툰',mainGenre:'murim',mainGenreLabel:'무협',coverUrl:null,recommendationComment:comment,commentId:'comment-'+id,likeCount:3,likedByViewer:false,tasteFitHighlighted:true});
const initial=[work('wt_murim_001','추천 작품 하나','기존 추천 한마디'),work('wt_murim_002','추천 작품 둘',null)];
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
  await context.addInitScript(v=>{
   localStorage.setItem('webtoon-match:test-draft:v1',JSON.stringify({schemaVersion:v.draft,testVersion:v.test,questionSetVersion:v.questions,currentPath:'/match/result/feedback-self',answers:{},resultPublicId:'feedback-self',startedAt:new Date().toISOString()}));
   window.copyAttempts=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.copyAttempts.push(text)}});
  },versions);
  let items=initial.map(x=>({...x})),active=true,owner=true,failSave=false,failRead=false,requests=[];
  const route=async route=>{
   const request=route.request(),url=new URL(request.url()),p=url.pathname;
   const reply=(body,status=200)=>route.fulfill({status,json:body});
   if(p.includes('match-events'))return reply({accepted:true},202);
   if(p==='/api/v1/challenges')return reply({active,challengeCode:active?'own-invite':null});
   if(p==='/api/v1/results/feedback-self')return reply({publicProfileId:'feedback-self',nickname:'내 닉네임',canManage:owner,activeChallengeCode:owner&&active?'own-invite':null,topGenres:[{genreKey:'murim',displayLabel:'무협',stars:8}],displayGenres:[{genreKey:'murim',displayLabel:'무협',stars:8}],wellMatchedLabels:['성장'],lessMatchedLabels:['반복 전개']});
   if(p.endsWith('/daily-picks'))return reply({mode:'personalized',items:[],expiresAt:new Date(Date.now()+600000).toISOString()});
   if(p==='/api/v1/results/feedback-self/recommendations')return failRead?reply({error:'FAILED'},503):reply({items});
   if(p.startsWith('/api/v1/results/feedback-self/recommendations/')){
    assert.ok(['PATCH','DELETE'].includes(request.method()));
    const data=request.postDataJSON();requests.push({method:request.method(),data});assert.equal(data.recommendations,undefined,'single-work mutation never submits a stale full list');
    if(failSave)return reply({error:'RECOMMENDATIONS_SAVE_FAILED'},500);
    const id=p.split('/').at(-1);
    items=request.method()==='DELETE'?items.filter(x=>x.canonicalWebtoonId!==id):items.map(x=>x.canonicalWebtoonId===id?{...x,recommendationComment:data.recommendationComment}:x);
    return reply({items});
   }
   if(p.endsWith('/ranking'))return reply({challengeCode:'own-invite',ownerNickname:'내 닉네임',ownerGenreKey:'murim',ownerTopGenreKeys:['murim'],ownerPublicProfileId:'feedback-self',entryCount:0,status:active?'active':'closed',rankingVisibility:'public_by_link',canManage:true,graphEntries:[],entries:[],top20:[],viewerEntry:null,hiddenEntries:[],pagination:{page:1,pageSize:6,totalItems:0,totalPages:1}});
   if(p.endsWith('/results/feedback-pair'))return reply({viewerPublicProfileId:'feedback-self',viewerRole:'owner',ownerNickname:'아주 긴 내 닉네임으로도 잘 보이게',challengerNickname:'친구 닉네임',ownerRelationship:{state:'ready',href:'/match/c/own-invite/ranking'},challengerRelationship:{state:'ready',href:'/match/c/friend-invite/ranking'},ownerGenreKey:'murim',challengerGenreKey:'fantasy',score:78,band:{label:'꽤 잘 맞음'},sharedGenres:['판타지'],differentGenres:[],ownerRecommendedGenres:[],challengerRecommendedGenres:[],ownerRecommendations:items,challengerRecommendations:[work('wt_fantasy_001','친구 추천 작품','친구 코멘트')],sharedTasteLabels:['동료·가족','액션','상처·치유'],rank:1,entryCount:2});
   if(p==='/api/v1/webtoons/search')return reply({items:[],hasMore:false});
   if(!['GET','HEAD'].includes(request.method()))throw Error('Unexpected service write '+p);
   return reply({items:[]});
  };
  await context.route('**/api/v1/**',route);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const footer=page.locator('.wm-action-bar'),invite=footer.getByRole('button',{name:'초대하기',exact:true});
  async function copyOwn(){await invite.click();assert.equal(await page.evaluate(()=>window.copyAttempts.at(-1)),base+'/match/c/own-invite');}
  async function gap(){return page.evaluate(()=>{const a=document.querySelector('.wm-action-bar').getBoundingClientRect(),b=document.querySelector('.wm-floating-search').getBoundingClientRect();return a.top-b.bottom;});}
  await page.goto(base+'/match/result/feedback-self');await page.locator('.wm-recommendation-edit').first().waitFor();
  assert.equal(await page.locator('.wm-recommendation-edit').count(),2,'owner can edit even a work without a comment');
  await copyOwn();
  await page.locator('.wm-recommendation-edit').first().click();
  const dialog=page.getByRole('dialog',{name:'추천 한마디 수정'}),comment=dialog.getByRole('textbox',{name:'추천 이유'});
  await dialog.waitFor();await comment.fill('바로 수정한 추천 한마디');
  for(const width of [320,390,540]){
   await page.setViewportSize({width,height:844});
   assert.ok(await dialog.locator('.wm-editor-actions button').evaluateAll(buttons=>{
    const [remove,save]=buttons.map(button=>button.getBoundingClientRect());
    const css=getComputedStyle(buttons[0]);
    return Math.abs(remove.width-save.width)<1&&Math.abs(remove.height-save.height)<1&&remove.height>=44
      &&Math.abs(remove.top-save.top)<1&&save.left-remove.right>=9&&css.borderTopWidth==='1px'&&css.textDecorationLine==='none'
      &&buttons.every(button=>button.scrollWidth<=button.clientWidth+1);
   }),'delete and save are equal-sized outlined/primary buttons at '+width+'px');
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(output,'recommendation-editor-fixture.png')});
  failSave=true;await dialog.getByRole('button',{name:'저장',exact:true}).click();await dialog.getByRole('alert').waitFor();assert.equal(await comment.inputValue(),'바로 수정한 추천 한마디');
  failSave=false;await dialog.getByRole('button',{name:'저장',exact:true}).click();await dialog.waitFor({state:'detached'});
  await page.getByText('바로 수정한 추천 한마디',{exact:true}).waitFor();assert.equal(items[0].likeCount,3);
  await page.getByRole('button',{name:'추천 작품 하나 추천 한마디 수정',exact:true}).click();await dialog.waitFor();
  await dialog.getByRole('button',{name:'추천작 삭제',exact:true}).click();assert.equal(items.length,2,'deletion requires confirmation');
  await dialog.getByRole('button',{name:'추천 목록에서 삭제',exact:true}).click();await dialog.waitFor({state:'detached'});assert.equal(items.length,1);
  await page.goto(base+'/match/c/friend-invite/match/feedback-pair');await page.locator('.wm-pair-tabs').waitFor();
  await page.waitForFunction(()=>!document.querySelector('.wm-invite-button').disabled);await copyOwn();
  const recommendation=page.getByRole('heading',{name:'친구 닉네임님의 추천',exact:false});await recommendation.waitFor();
  await page.getByRole('tab',{name:'비교 상세',exact:true}).click();assert.ok(await recommendation.isVisible(),'recommendations survive tab switching');
  await page.getByRole('tab',{name:'궁합 요약',exact:true}).click();
  assert.ok(await page.locator('.wm-taste-summary-label').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>parseFloat(getComputedStyle(document.querySelector('.wm-taste-chips strong')).fontSize)));
  for(const width of [320,375,390,540]){
   await page.setViewportSize({width,height:740});await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
   await page.waitForFunction(()=>{const a=document.querySelector('.wm-action-bar').getBoundingClientRect(),b=document.querySelector('.wm-floating-search').getBoundingClientRect();return a.top-b.bottom>=11;});
   assert.ok(await gap()>=11);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  // Reproduce the measurement failure: Safari can report the bottom outside
  // innerHeight during a bounce. Height must not be discarded for one frame.
  await page.evaluate(()=>{
   const f=document.querySelector('.wm-action-bar'),original=f.getBoundingClientRect.bind(f);window.restoreFooterRect=()=>{f.getBoundingClientRect=original;};
   f.getBoundingClientRect=()=>{const r=original();return {height:r.height,top:r.top+20,bottom:r.bottom+20};};dispatchEvent(new Event('resize'));
  });
  await page.waitForFunction(()=>parseFloat(document.querySelector('.match-module').style.getPropertyValue('--wm-search-bottom'))>=80);
  assert.ok(await gap()>=11,'visual viewport overshoot does not drop search over invite');await page.evaluate(()=>{window.restoreFooterRect();dispatchEvent(new Event('resize'));});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await page.screenshot({path:path.join(output,'pair-summary-fixture.png')});
  await page.goto(base+'/match/c/own-invite/ranking');await page.locator('.wm-relationship-heading').waitFor();await copyOwn();
  active=false;
  for(const href of ['/match/result/feedback-self','/match/c/friend-invite/match/feedback-pair','/match/c/own-invite/ranking']){
   await page.goto(base+href);await invite.waitFor();assert.ok(await invite.isDisabled(),href);
   const bg=await invite.evaluate(el=>getComputedStyle(el).backgroundColor);assert.equal(bg,'rgb(237, 240, 242)');
  }
  owner=false;items=[];await page.goto(base+'/match/result/feedback-self');await page.locator('.wm-recommendations-heading').waitFor();assert.equal(await page.locator('.wm-recommendation-edit').count(),0,'foreign results never expose edit controls');
  assert.equal(await page.locator('.wm-recommendation-register-link').count(),0,'registration promotion never edits another person’s list');
  owner=true;items=[];
  await page.goto(base+'/match/result/feedback-self');await page.getByRole('complementary',{name:'추천작 등록 안내'}).waitFor();
  const nudge=page.getByRole('complementary',{name:'추천작 등록 안내'});
  for(const width of [320,390,540]){
   await page.setViewportSize({width,height:844});
   assert.ok(await nudge.getByRole('link',{name:'추천작 등록하기'}).evaluate(el=>{const css=getComputedStyle(el),r=el.getBoundingClientRect();return r.height>=34&&r.height<44&&css.borderTopWidth==='1px'&&css.textDecorationLine==='none'&&parseFloat(css.borderRadius)>=10&&el.scrollWidth<=el.clientWidth&&!el.querySelector('svg');}),'compact arrow-free registration button fits at '+width+'px');
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:path.join(output,'recommendation-nudge-fixture.png')});
  assert.equal(await page.getByRole('dialog').count(),0,'registration nudge does not block the page');
  await page.getByRole('button',{name:'추천작 등록 안내 닫기'}).click();
  const empty=page.locator('.wm-recommendation-empty');await empty.waitFor();
  assert.equal(await empty.getByRole('link',{name:'추천작 등록하기'}).getAttribute('href'),'/match/result/feedback-self/recommendations');
  assert.ok((await empty.innerText()).includes('좋아하는 작품을 등록하면 내 취향이 결과와 오늘의 취향작에 더 잘 반영돼요.'));
  for(const width of [320,390,540]){
   await page.setViewportSize({width,height:844});
   assert.ok(await empty.evaluate(el=>el.scrollWidth<=el.clientWidth&&[...el.children].every(child=>child.getBoundingClientRect().right<=el.getBoundingClientRect().right+1)),'empty recommendation prompt fits at '+width+'px');
  }
  await page.setViewportSize({width:390,height:844});await empty.screenshot({path:path.join(output,'recommendation-empty-fixture.png')});
  await page.locator('.wm-floating-search').click();await page.waitForURL('**/match/search?*');
  await page.getByRole('complementary',{name:'추천작 등록 안내'}).waitFor();
  await page.getByRole('button',{name:'추천작 등록 안내 닫기'}).click();
  for(const excluded of ['/match','/match/test/intro','/match/test/avoidance']){
   await page.goto(base+excluded);await page.waitForTimeout(800);
   assert.equal(await page.locator('.wm-recommendation-nudge').count(),0,'no registration notification on '+excluded);
  }
  items=initial.map(x=>({...x}));await page.goto(base+'/match/result/feedback-self');await page.locator('.wm-recommendation-edit').first().waitFor();
  await page.waitForTimeout(800);assert.equal(await page.locator('.wm-recommendation-nudge').count(),0,'registered works stop the recurring nudge');
  // Manager SSR may perform a read, but no mutation is permitted by this test.
  await page.goto(base+'/match/result/feedback-self/recommendations');await page.getByRole('searchbox',{name:'추천할 웹툰 검색'}).waitFor();
  assert.ok(await page.locator('.wm-search-section').evaluate(el=>el.compareDocumentPosition(document.querySelector('.wm-manager-section:not(.wm-search-section)'))&Node.DOCUMENT_POSITION_FOLLOWING));
  assert.equal(await page.locator('.wm-recommendation-nudge').count(),0);
  assert.deepEqual(errors,[]);assert.equal(requests.filter(x=>x.method==='DELETE').length,1);
  console.log(JSON.stringify({ok:true,output,checks:['same own invitation across three pages','no active link: disabled gray button','summary headings larger than tags','recommendations remain in comparison tab','320/375/390/540 footer clearance','simulated iOS overshoot','owner edit/create/failed-save/retry/delete confirmation','likes retained and no stale-list PUT','foreign result has no edit controls','nonmodal recurring nudge stops after registration','manager search above selected works','all browser API writes intercepted']}));
  await context.close();
 }finally{await browser.close();}
 // Use the installed WebKit runtime when supported on this host. No installation.
 if(process.env.RUN_WEBKIT==='1'){
  const safari=await webkit.launch({headless:true});await safari.close();console.log('WebKit runtime available');
 }
})().catch(error=>{console.error({name:error.name,message:error.message,stack:error.stack});process.exitCode=1;});
