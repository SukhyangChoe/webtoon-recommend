/* Real question UI and local answers only. All server writes are intercepted. */
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const seed=require('../../src/features/match/data/questionSeed.v0.4.json');
(async()=>{
 const {TEST_HELP_COPY,DUEL_HELP_COPY}=await import('../../src/features/match/config/testPresentation.mjs');
 const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000';
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-test-palette-'));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'}),page=await context.newPage();
  page.setDefaultTimeout(15000);
  const errors=[],icons=new Map();page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/api/v1/**',route=>route.fulfill({status:202,contentType:'application/json',body:'{"ok":true}'}));
  async function audit(label){
   const purple=await page.locator('main.match-page').evaluate(root=>{
    const violations=[];
    const violet=text=>[...text.matchAll(/rgba?\(([^)]+)\)/g)].some(match=>{
     const [r,g,b,a=1]=match[1].split(/[, /]+/).map(Number);if(!a)return false;
     const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;if(delta<3)return false;
     let hue=max===r?(g-b)/delta:max===g?2+(b-r)/delta:4+(r-g)/delta;
     hue=(hue*60+360)%360;return hue>=250&&hue<=315;
    });
    for(const el of [root,...root.querySelectorAll('*')]){
     if(!el.getClientRects().length)continue;
     for(const pseudo of [null,'::before','::after']){
      const css=getComputedStyle(el,pseudo);if(pseudo&&['none','normal'].includes(css.content))continue;
      const properties=['color','backgroundColor','backgroundImage','boxShadow','textShadow'];
      if(css.outlineStyle!=='none')properties.push('outlineColor');
      if(css.borderTopStyle!=='none')properties.push('borderTopColor');
      for(const key of properties)if(violet(css[key]))violations.push({element:el.className?.baseVal??el.className,pseudo,key,value:css[key]});
     }
    }
    return violations.slice(0,12);
   });
   assert.deepEqual(purple,[],`no remaining purple UI: ${label}`);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no overflow: ${label}`);
  }
  async function checkHelp(label){
   const help=page.locator('.match-helper');
   assert.ok(await help.count(),`helper exists: ${label}`);
   assert.ok(await help.evaluateAll(items=>items.every(el=>{
    const css=getComputedStyle(el),question=el.closest('.match-card').querySelector('.match-question-text');
    return parseFloat(css.fontSize)===14&&(!question||parseFloat(css.fontSize)<parseFloat(getComputedStyle(question).fontSize))&&!/주세요|있어요|돼요|골라줘|표시해줘/.test(el.textContent);
   })),`14px noun-style help stays smaller than the question: ${label}`);
  }
  for(const shelf of [1,2]){
   await page.goto(base+`/match/test/genre-shelf/${shelf}`);await page.locator('.match-segmented').first().waitFor();
   const question=seed.questions.find(q=>q.questionId===`wm_genre_shelf_0${shelf}`);
   assert.equal(await page.locator('.match-helper').textContent(),TEST_HELP_COPY[question.questionId]);
   for(const [genre,d]of await page.locator('.match-genre-pictogram').evaluateAll(items=>items.map(el=>[el.dataset.genre,el.querySelector('path').getAttribute('d')]))){assert.ok(d.length>30);icons.set(genre,d);}
   assert.equal(await page.locator('.match-genre-card__visual').allTextContents().then(text=>text.some(value=>value.includes('•'))),false);
   await page.locator('.match-segmented button').first().hover();await audit(`genre ${shelf} hover`);
   await page.locator('.match-segmented').first().getByRole('button').first().click();
   await page.locator('.match-segmented button').first().focus();await audit(`genre ${shelf} selected/focused`);
   for(const width of [320,390,435]){await page.setViewportSize({width,height:844});await checkHelp(`genre ${shelf}/${width}`);await audit(`genre ${shelf}/${width}`);}
   if(shelf===1){await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'nextjs-portal{display:none!important}'});await page.screenshot({path:path.join(output,'cyan_genre_pictograms.png')});}
   for(const segment of await page.locator('.match-segmented').all())await segment.getByRole('button').first().click();
  }
  assert.deepEqual([...icons.keys()].sort(),seed.publicGenrePolicy.publicGenres.map(g=>g.genreKey).sort());assert.equal(new Set(icons.values()).size,9,'each genre has its own original path');
  for(let index=1;index<=6;index++){
   await page.goto(base+`/match/test/duel/${index}`);await page.locator('.match-duel-card').first().waitFor();
   assert.equal(await page.locator('.match-duel-caption').textContent(),DUEL_HELP_COPY);
   await audit(`duel ${index} normal/disabled`);await page.locator('.match-duel-card').first().click();await audit(`duel ${index} selected`);
   await page.getByRole('button',{name:'둘 다 볼래',exact:true}).click();await audit(`duel ${index} both selected`);
   for(const width of [320,390]){await page.setViewportSize({width,height:844});await checkHelp(`duel ${index}/${width}`);await audit(`duel ${index}/${width}`);}
  }
  for(const step of ['taste/setting','taste/appeal','taste/character-relationship','avoidance','recovery']){
   await page.goto(base+'/match/test/'+step);await page.locator('.match-feature-grid').waitFor();await audit(step+' default');await checkHelp(step);
   const card=page.locator('.match-feature-card > button:first-child,.match-ranked-card').first();
   const description=await card.locator('span:not(.match-check-badge)').first().count()?await card.locator('span:not(.match-check-badge)').first().textContent():null;
   await card.click();await audit(step+' selected');
   if(step.startsWith('taste/')){
    assert.equal(await card.locator('span').textContent(),description,'selection retains the original option description');
    assert.equal(await card.getAttribute('aria-pressed'),'true');
    assert.equal(await page.getByText('✓ 선택됨',{exact:true}).count(),0);
   }
   if(step.startsWith('taste/')){await page.locator('.match-feature-card > button:first-child').nth(1).click();await page.locator('.match-primary-toggle:not(.is-primary)').first().click();await audit(step+' primary changed');}
   for(const width of [320,390,435]){await page.setViewportSize({width,height:844});await checkHelp(step+'/'+width);await audit(step+'/'+width);}
   if(step==='taste/appeal'){
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'nextjs-portal{display:none!important}'});await page.screenshot({path:path.join(output,'compact_test_help.png')});
   }
  }
  await page.goto(base+'/match/test/intro');const input=page.getByRole('textbox',{name:'테스트에서 사용할 닉네임'});await input.waitFor();await input.fill('취향검증');await input.focus();await checkHelp('intro');await audit('intro focused');
  await page.evaluate(()=>localStorage.setItem('webtoon-match:pending-challenge:v1',JSON.stringify({challengeCode:'palette-check',challengerNickname:'취향검증',agreedAt:null})));
  await page.reload();await page.getByRole('checkbox').waitFor();await page.getByRole('checkbox').check();await audit('intro consent');
  await page.getByRole('button',{name:'테스트 시작',exact:true}).click();await page.waitForURL('**/match/test/genre-shelf/1');
  await page.evaluate(()=>localStorage.removeItem('webtoon-match:pending-challenge:v1'));
  let releaseLoading;
  await page.route('**/api/v1/taste-snapshots',async route=>{await new Promise(resolve=>{releaseLoading=resolve;});await route.fulfill({status:503,contentType:'application/json',body:'{"error":"일시적인 연결 오류"}'});});
  await page.goto(base+'/match/result/building');await page.getByRole('heading',{name:'취향별을 모으는 중',exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector('.match-loading-bar'));
  await audit('result building');
  assert.equal(await page.locator('.match-building-stars span').first().evaluate(el=>getComputedStyle(el).color),'rgb(0, 200, 234)');
  assert.ok(await page.locator('.match-loading-bar span').evaluate(el=>getComputedStyle(el).backgroundImage.includes('rgb(0, 200, 234)')&&getComputedStyle(el).backgroundImage.includes('rgb(0, 105, 127)')));
  await page.setViewportSize({width:390,height:844});await page.addStyleTag({content:'nextjs-portal{display:none!important}'});await page.screenshot({path:path.join(output,'cyan_result_loading.png')});
  releaseLoading();await page.getByRole('button',{name:'다시 시도',exact:true}).waitFor();await audit('result building retry');
  assert.deepEqual(errors,[]);await context.close();
  console.log(JSON.stringify({ok:true,genres:icons.size,testRoutes:14,checks:['cyan-only visible UI including shadows, focus and selected states','nine distinct hand-drawn genre pictograms','14px noun-style helpers across all test screens','selection and primary switching','320/390/435px layout','no server writes'],artifacts:output}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
