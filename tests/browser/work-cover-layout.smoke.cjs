/* Real public work data; all UI writes are blocked. No synthetic screenshot evidence. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
  const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000';
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-cover-layout-'));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
    await context.route('**/api/v1/**',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.fulfill({status:202,json:{ok:true}}));
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/match');
    const originalLogo=await page.locator('.brand-logo').evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
    const monoResponse=await page.request.get(base+'/api/v1/webtoons/search?'+new URLSearchParams({q:'앵무살수',scope:'catalog',page:'1'}));
    assert.equal(monoResponse.status(),200);
    const mono=(await monoResponse.json()).items.find(item=>item.title==='앵무살수');assert.ok(mono,'real monochrome cover is available');
    for(const id of ['wt_romance_ropan_019','wt_romance_ropan_016',mono.canonicalWebtoonId]){
      await page.goto(base+'/match/work/'+id);
      await page.getByRole('heading',{level:1}).waitFor();
      await page.locator('.wm-work-cover-foreground img').evaluate(img=>img.decode());
      await page.getByRole('button',{name:'취향 테스트로 핏점수 확인하기',exact:true}).waitFor();
      await page.evaluate(()=>document.fonts.ready);
      for(const [width,height] of [[320,740],[390,844],[435,900],[900,800],[390,520]]){
        await page.setViewportSize({width,height});
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await page.waitForFunction(()=>{
          const root=document.querySelector('.wm-work-page'),hero=root.querySelector('.wm-work-hero').getBoundingClientRect(),sheet=root.querySelector('.wm-work-sheet').getBoundingClientRect();
          return !root.hasAttribute('data-settling')&&Math.abs(hero.bottom-sheet.top-25)<1;
        });
        const layout=await page.locator('.wm-work-page').evaluate(root=>{
          const frame=root.querySelector('.wm-work-cover-foreground'),image=frame.querySelector('img'),backdrop=root.querySelector('.wm-work-cover-backdrop');
          const box=frame.getBoundingClientRect(),sheet=root.querySelector('.wm-work-sheet').getBoundingClientRect();
          const scale=Math.min(box.width/image.naturalWidth,box.height/image.naturalHeight);
          const paint={width:image.naturalWidth*scale,height:image.naturalHeight*scale};
          const header=document.querySelector('.brand-bar'),logo=document.querySelector('.brand-logo').getBoundingClientRect();
          const back=root.querySelector('.wm-work-back'),search=document.querySelector('.wm-floating-search');
          const controls=[back,search];
          return {fit:getComputedStyle(image).objectFit,sharp:!getComputedStyle(image).filter.includes('blur'),blur:getComputedStyle(backdrop).filter,opacity:getComputedStyle(backdrop).opacity,
            frameHeight:box.height,paintFits:paint.width<=box.width+.1&&paint.height<=box.height+.1,
            topSafe:innerHeight<=540||box.top>=header.getBoundingClientRect().bottom+7,
            bottomSafe:box.bottom<=sheet.top-(innerHeight<=540?3:11),
            sameSource:image.currentSrc===backdrop.querySelector('img').currentSrc,
            decorative:backdrop.querySelector('img').alt===''&&backdrop.getAttribute('aria-hidden')==='true',
            logo:{width:logo.width,height:logo.height},headerBackground:getComputedStyle(header).backgroundColor,
            seamlessHeader:getComputedStyle(header).borderBottomWidth==='0px'&&getComputedStyle(header).backdropFilter==='none'&&root.querySelector('.wm-work-hero').getBoundingClientRect().top===0,
            veil:getComputedStyle(root.querySelector('.wm-work-hero'),'::after').backgroundImage,
            backgroundOnly:Number(getComputedStyle(frame).zIndex)>Number(getComputedStyle(root.querySelector('.wm-work-hero'),'::after').zIndex)&&Number(getComputedStyle(root.querySelector('.wm-work-hero'),'::after').zIndex)>Number(getComputedStyle(backdrop).zIndex),
            balanced:controls.every(el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44;})&&
              getComputedStyle(back).borderTopWidth==='0px'&&getComputedStyle(back).backgroundColor==='rgba(0, 0, 0, 0)'&&
              getComputedStyle(search).backgroundColor==='rgb(255, 240, 179)'&&getComputedStyle(search).borderRadius==='999px'&&getComputedStyle(search).borderTopWidth==='0px',
            clickable:[back,search,document.querySelector('.brand-bar__logo')].every(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('a,button')===el;}),
            within:document.documentElement.scrollWidth<=innerWidth};
        });
        assert.equal(layout.fit,'contain');assert.ok(layout.sharp&&layout.blur==='blur(20px)'&&Number(layout.opacity)===.85,'background retains original saturation and most of the cover color');
        assert.ok(layout.frameHeight>0&&layout.paintFits&&layout.topSafe&&layout.bottomSafe&&layout.within,`${id}/${width}x${height}: ${JSON.stringify(layout)}`);
        assert.ok(layout.sameSource&&layout.decorative,'same cover is a decorative background, not a duplicate announced image');
        assert.deepEqual(layout.logo,originalLogo,'brand size stays unchanged');
        assert.equal(layout.headerBackground,'rgba(0, 0, 0, 0)');
        assert.ok(layout.seamlessHeader&&layout.backgroundOnly&&layout.veil.includes('linear-gradient')&&layout.veil.includes('rgba(243, 250, 252, 0)'), 'transparent header has no hard edge; fading veil only affects the blurred backdrop');
        assert.ok(layout.balanced&&layout.clickable,'header controls share a quiet visual style and remain clickable');
        const before=await page.locator('.wm-work-cover-foreground').boundingBox();
        await page.locator('.wm-work-grab').click();await page.getByRole('dialog').waitFor();
        const after=await page.locator('.wm-work-cover-foreground').boundingBox();
        for(const key of ['x','y','width','height'])assert.ok(Math.abs(before[key]-after[key])<1,`${id}/${width}x${height}: opening changed ${key}: ${JSON.stringify({before,after})}`);
        await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
      }
      {
        await page.setViewportSize({width:390,height:844});
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
        await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
        await page.mouse.move(0,843);
        await page.screenshot({path:path.join(output,`work_seamless_header_${id}.png`)});
      }
    }
    // Failure/absent image UI remains accessible without fabricating a cover.
    await context.route('**/api/v1/webtoons/cover-missing**',route=>route.fulfill({json:{canonicalWebtoonId:'cover-missing',title:'표지 없음',mainGenreLabel:'무협',platform:'',coverUrl:null,officialUrl:null,creators:[],contentLabels:[],appreciationPoints:[],artStyles:[],fit:null,fitStatus:'insufficient_data'}}));
    await page.goto(base+'/match/work/cover-missing');await page.getByRole('img',{name:'작품 커버 미등록',exact:true}).waitFor();
    assert.equal(await page.getByRole('img',{name:'작품 커버 미등록',exact:true}).count(),1);
    assert.deepEqual(errors,[]);await context.close();
    console.log(JSON.stringify({ok:true,output,checks:['three real covers','320/390/435/900 and short viewport','original-color blurred background + full sharp foreground','fixed cover geometry across sheet expansion','plain back arrow and floating search with 44px hit areas','transparent seamless header with background-only light veil and unchanged logo size','no duplicate accessible image','missing cover fallback','no user-data writes']}));
  }finally{await browser.close();}
})().catch(error=>{console.error({name:error.name,message:error.message});process.exitCode=1;});
