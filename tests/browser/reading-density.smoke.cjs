/* Synthetic public fixtures; all service API writes are intercepted. */
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000',out=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-reading-density-'));
(async()=>{
 const {sharedFitReasons}=await import('../../src/features/match/config/workDetailPresentation.mjs');
 const vector={tagScores:{growth:3,story_immersion:3,humor_comedy:2},contentAxisScores:{martial_training:3}};
 const reasons=sharedFitReasons(vector,vector,{growth:'성장',story_immersion:'몰입감',humor_comedy:'유쾌함'},{},{limit:3,descriptions:true,concise:true});
 const works=Array.from({length:4},(_,i)=>({canonicalWebtoonId:'density-'+i,title:'추천 작품 '+(i+1),mainGenre:'murim',mainGenreLabel:'무협',platform:'네이버웹툰',coverUrl:'/match/covers/'+['wt_murim_011','wt_murim_017','wt_fantasy_081','wt_romance_ropan_016'][i]+'.webp',recommendationComment:i%2?'':'좋아하는 작품이에요.',likeCount:i}));
 let selected=[...works],reorders=0;
 const picks={publicProfileId:'density-self',mode:'personalized',selectionVersion:'fixture',expiresAt:new Date(Date.now()+86400000).toISOString(),items:works.slice(0,3).map((work,i)=>({...work,canonicalWebtoonId:'pick-'+i,title:i===1?'아주 긴 작품 제목도 잘 보이는 오늘의 이야기':'오늘의 작품 '+(i+1),officialUrl:'https://example.com/work',matchReason:{version:2,summary:'내 추천작과 성장·관계성의 구성이 닮았어요.',labels:['성장'],referenceWork:{canonicalWebtoonId:works[0].canonicalWebtoonId,title:works[0].title,labels:['성장']}}}))};
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--disable-gpu']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(12000);
  await context.route('**/api/v1/**',async route=>{
   const req=route.request(),p=new URL(req.url()).pathname,reply=(json,status=200)=>route.fulfill({json,status});
   if(p.includes('match-events'))return reply({ok:true});
   if(p==='/api/v1/results/density-self')return reply({publicProfileId:'density-self',nickname:'독자',canManage:true,activeChallengeCode:null,topGenres:[],displayGenres:[],wellMatchedLabels:[],lessMatchedLabels:[]});
   if(p.endsWith('/daily-picks'))return reply(picks);
   if(p==='/api/v1/webtoons/search')return reply({items:works});
   if(p.includes('/recommendation-comments/'))return reply({recommendationComment:works.find(item=>item.canonicalWebtoonId===p.split('/').at(-1))?.recommendationComment??null});
   if(p.includes('/recommendations/')&&req.method()==='POST'){const item=works.find(item=>item.canonicalWebtoonId===p.split('/').at(-1));selected.push({...item,recommendationComment:req.postDataJSON().recommendationComment});return reply({items:selected});}
   if(p.endsWith('/recommendation-order')){assert.equal(req.method(),'PATCH');const ids=req.postDataJSON().canonicalWebtoonIds;assert.deepEqual([...ids].sort(),selected.map(item=>item.canonicalWebtoonId).sort());selected=ids.map(id=>selected.find(item=>item.canonicalWebtoonId===id));reorders++;return reply({items:selected});}
   if(p.endsWith('/recommendations'))return reply({items:selected});
   if(p.startsWith('/api/v1/webtoons/')){
    const id=p.split('/')[4],work=picks.items.find(item=>item.canonicalWebtoonId===id)||works.find(item=>item.canonicalWebtoonId===id)||picks.items[0];
    const fit={rawScore:.64,displayScore:80,percent:64,highlighted:true,reasons,axes:[{key:'typeScores',label:'세부 취향',score:84},{key:'tagScores',label:'이야기 요소',score:80},{key:'contentAxisScores',label:'소재·전개',score:0},{key:'artStyleScores',label:'작화·분위기',score:null}]};
    return reply(p.endsWith('/fit')?{fitStatus:'ready',fit,avoidanceWarnings:[]}:{...work,creators:[],wellMade:true,officialUrl:'https://example.com/work',statusLabel:'연재 중',ageRating:'15세 이용가',introduction:'인물이 경험을 쌓으며 새로운 길을 찾아가는 이야기예요.',introductionKind:'editorial',contentLabels:[{key:'martial_training',label:'무공 수련'}],artStyles:[{key:'detailed_rendering',label:'섬세한 묘사',category:'묘사',icon:'pen'}],fit:null,fitStatus:'pending'});
   }
   assert.ok(['GET','HEAD'].includes(req.method()),'no unexpected mutation');return reply({items:[]});
  });
  await page.goto(base+'/match/result/density-self');const preview=page.locator('.wm-daily-preview');await page.waitForFunction(()=>document.querySelector('.wm-daily-preview')?.getAttribute('aria-busy')==='false');
  const resultBackground = await page.locator('.match-module').evaluate(el => getComputedStyle(el).backgroundColor);
  assert.ok((await preview.boundingBox()).height<150,'completed recommendation preview is compact');
  assert.equal(await page.locator('.wm-recommendation-card.is-comment-missing').count(),2);
  const warningFrame = await page.locator('.wm-recommendation-card.is-comment-missing .wm-pair-work-artwork').first().evaluate(el => {
    const border = getComputedStyle(el, '::before');
    return { inset: border.inset, width: border.borderTopWidth, color: border.borderTopColor, outline: getComputedStyle(el).outlineStyle };
  });
  assert.deepEqual(warningFrame, { inset: '0px', width: '2px', color: 'rgb(217, 102, 125)', outline: 'none' });
  await preview.click();const sheet=page.getByRole('dialog',{name:'오늘의 취향작',exact:true}),body=sheet.locator('.wm-daily-sheet-body');await sheet.waitFor();
  const headerY=(await sheet.locator('.wm-daily-sheet-heading').boundingBox()).y;
  await body.evaluate(el=>{el.scrollTop=300;});assert.ok(await body.evaluate(el=>el.scrollTop>0));
  assert.equal((await sheet.locator('.wm-daily-sheet-heading').boundingBox()).y,headerY,'title stays fixed while list scrolls');
  await body.evaluate(el=>{el.scrollTop=0;});
  for(const width of [320,390,540]){await page.setViewportSize({width,height:844});await page.waitForTimeout(80);assert.ok(await sheet.locator('.wm-daily-work').evaluateAll(rows=>rows.every(row=>{const cover=row.querySelector('.wm-daily-cover-link').getBoundingClientRect(),copy=row.querySelector('.wm-daily-work-copy').getBoundingClientRect();return cover.height>=copy.height-1&&cover.right<=copy.left;})));assert.ok(await sheet.evaluate(el=>el.scrollWidth<=el.clientWidth+1));}
  await page.setViewportSize({width:390,height:844});const grip=sheet.getByRole('button',{name:'취향작 팝업 크기 조절'});
  let point=await grip.boundingBox();await page.mouse.move(point.x+point.width/2,point.y+point.height/2);await page.mouse.down();await page.mouse.move(point.x+point.width/2,point.y-100,{steps:8});await page.mouse.up();assert.equal(await grip.getAttribute('aria-expanded'),'true');
  await grip.press('ArrowDown');assert.equal(await grip.getAttribute('aria-expanded'),'false');
  assert.equal(await sheet.locator('.wm-daily-reference').count(),3);
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'});await page.screenshot({path:path.join(out,'daily-sheet.png')});
  await sheet.getByRole('link',{name:'오늘의 작품 1 표지로 더 알아보기',exact:true}).click();await page.waitForURL('**/match/work/pick-0?*');
  await page.getByRole('button',{name:'핏 점수 안내'}).waitFor();
  assert.equal(await page.locator('.wm-work-summary .wm-work-badge--taste').innerText(),'취향');assert.equal(await page.locator('.wm-work-summary .wm-work-badge--quality').innerText(),'웰메이드');
  await page.locator('.wm-work-open').click();await page.locator('.wm-work-reading').waitFor();
  await page.waitForFunction(()=>document.querySelector('.wm-work-page')?.dataset.stage==='reasons'&&!document.querySelector('.wm-work-page')?.hasAttribute('data-morph'));
  assert.equal(await page.getByRole('tab').count(),0);assert.equal(await page.locator('.wm-work-sheet-header .wm-work-fit').count(),1);
  assert.equal(await page.locator('.wm-work-sheet-header .wm-fit-help > span').innerText(),'?');
  assert.equal(await page.locator('.wm-work-axis-fits > div').count(),4);assert.equal(await page.locator('.wm-work-axis-track').count(),3);assert.ok((await page.locator('.wm-work-axis-fits').innerText()).includes('비교 정보 부족'));
  assert.equal(await page.locator('.wm-work-reason').count(),3);assert.ok(await page.locator('.wm-work-reason p').evaluateAll(els=>els.every(el=>el.textContent.length<100)));
  assert.equal(await page.getByRole('heading',{name:'주요 소재',exact:true}).count(),0);assert.equal(await page.getByRole('heading',{name:'작화 스타일',exact:true}).count(),0);
  await page.screenshot({path:path.join(out,'work-detail.png')});
  await page.getByRole('button',{name:'이전 화면으로 돌아가기'}).click();await sheet.waitFor();
  await sheet.getByRole('link',{name:'오늘의 작품 1 제목으로 더 알아보기',exact:true}).click();await page.waitForURL('**/match/work/pick-0?*');await page.getByRole('button',{name:'이전 화면으로 돌아가기'}).click();await sheet.waitFor();
  await sheet.getByRole('button',{name:'오늘의 취향작 닫기'}).click();await sheet.waitFor({state:'hidden'});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await preview.click();await sheet.waitFor();
  assert.ok(await sheet.evaluate(el=>el.getAnimations().some(animation=>animation.playState==='running')),'opening visibly animates up from the bottom');
  await page.waitForTimeout(350);
  assert.equal(await sheet.evaluate(el=>getComputedStyle(el).transform),'none');
  await sheet.getByRole('button',{name:'오늘의 취향작 닫기'}).click();await sheet.waitFor({state:'hidden'});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({ width: 390, height: 600 });
  await page.getByRole('link', { name: '내 추천작 관리', exact: true }).evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  assert.ok(await page.evaluate(() => scrollY > 0), 'the result is scrolled before opening the manager');
  selected=[];
  await page.getByRole('link', { name: '내 추천작 관리', exact: true }).click();
  await page.locator('.wm-library-manager').waitFor();
  assert.equal(await page.evaluate(() => scrollY), 0, 'a fresh manager visit starts at the top');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('searchbox',{name:'추천할 웹툰 검색'}).fill('추천');await page.getByRole('button',{name:'검색',exact:true}).click();
  for(const work of works){
   await page.getByRole('searchbox',{name:'추천할 웹툰 검색'}).click();await page.getByRole('button',{name:`${work.title} 추천작 담기`,exact:true}).click();
   const editor=page.getByRole('dialog',{name:'추천작 담기',exact:true});await editor.getByRole('button',{name:'저장',exact:true}).click();await editor.waitFor({state:'hidden'});
  }
  const grid=page.locator('.wm-library-grid');await grid.locator('li').nth(3).waitFor();
  assert.equal(await grid.locator('.is-comment-missing').count(),2);
  const managerFrame = await grid.locator('.is-comment-missing .wm-work-cover').first().evaluate(el => {
    const style = getComputedStyle(el);
    return { sizing: style.boxSizing, width: style.borderTopWidth, color: style.borderTopColor, outline: style.outlineStyle };
  });
  assert.deepEqual(managerFrame, { sizing: 'border-box', width: '2px', color: 'rgb(217, 102, 125)', outline: 'none' });
  const firstId=selected[0].canonicalWebtoonId,first=await grid.locator('[data-reorder-handle]').first().boundingBox(),last=await grid.locator('li').last().boundingBox();
  await page.mouse.move(first.x+first.width/2,first.y+first.height/2);await page.mouse.down();await page.mouse.move(last.x+last.width/2,last.y+60,{steps:14});await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('.wm-library-grid')?.getAttribute('aria-busy')==='false');assert.equal(reorders,1);assert.equal(selected.at(-1).canonicalWebtoonId,firstId);assert.equal(await page.locator('.wm-recommendation-editor').count(),0,'drag never opens the editor');
  await grid.locator('[data-reorder-handle]').last().press('ArrowLeft');await page.waitForFunction(()=>document.querySelector('.wm-library-grid')?.getAttribute('aria-busy')==='false');assert.equal(reorders,2);
  // A physical touch long-press on the cover, rather than a synthetic HTML drag.
  const beforeTouch=selected.map(item=>item.canonicalWebtoonId),source=await grid.locator('li button:not([data-reorder-handle])').first().boundingBox(),target=await grid.locator('li').nth(1).boundingBox(),cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:source.x+25,y:source.y+60}]});await page.waitForTimeout(450);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:target.x+target.width/2,y:target.y+60}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(150);assert.equal(reorders,3);assert.notDeepEqual(selected.map(item=>item.canonicalWebtoonId),beforeTouch);
  await page.screenshot({path:path.join(out,'manager-reorder.png')});
  await page.setViewportSize({ width: 390, height: 600 });
  // The mocked saves populate client state only. Keep the returning fixture scrollable when it remounts with an empty server list.
  await page.addStyleTag({ content: '.match-module .wm-library-manager { min-height: 1000px; }' });
  await page.evaluate(() => { history.scrollRestoration = 'manual'; });
  await grid.locator('li button:not([data-reorder-handle])').last().click();
  const managerPosition = await page.evaluate(() => scrollY);
  assert.ok(managerPosition > 0, 'detail is opened from a scrolled manager');
  const detailLink = page.getByRole('dialog', { name: '추천 한마디 수정' }).getByRole('link', { name: /작품 상세 보기/ });
  await detailLink.click();
  await page.waitForURL('**/match/work/*?*');
  await page.getByRole('button', { name: '이전 화면으로 돌아가기' }).click();
  await page.locator('.wm-library-manager').waitFor();
  await page.waitForFunction(top => Math.abs(scrollY - top) < 2, managerPosition);
  await page.evaluate(() => { history.scrollRestoration = 'auto'; });
  await page.locator('.wm-library-manager .wm-local-nav a').click();
  await page.waitForURL('**/match/result/density-self');
  await page.goBack();
  await page.locator('.wm-library-manager').waitFor();
  await page.waitForFunction(() => scrollY === 0);
  assert.equal(resultBackground, 'rgb(243, 250, 252)');
  await page.goto(base+'/');
  await page.locator('.match-home-page').waitFor();
  assert.equal(await page.locator('.match-module').evaluate(el => getComputedStyle(el).backgroundColor), resultBackground);
  assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), resultBackground);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,out,reorders,checks:['compact preview','fixed daily title','resizable sheet','cover and title navigation','reference work link','compact work header without tabs','four genuine axis slots','missing-comment red outlines','pointer/touch/keyboard reorder; writes mocked']}));await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
