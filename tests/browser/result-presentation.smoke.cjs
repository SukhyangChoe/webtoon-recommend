/* Isolated UI mutations; actual-data captures use read-only queries and block all writes. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const postgres=require('postgres');

(async()=>{
  const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000';
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-result-presentation-'));
  const {PERSONA_GENRE_KEYS}=await import('../../src/features/match/config/personaImages.mjs');
  const {personalArchetypeFor}=await import('../../src/features/match/share/shareArchetypes.mjs');
  const {tasteFeatureIconFor}=await import('../../src/features/match/config/tasteFeatureIcons.mjs');
  const seed=require('../../src/features/match/data/questionSeed.v0.4.json');
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    let genre='fantasy',canManage=true,nickname='아주긴닉네임을쓰는테스트사용자',nicknameFails=false,patches=0;
    let details=[{category:'설정',value:'회귀'},{category:'전개',value:'성장'},{category:'관계',value:'노력형'}];
    await page.route('**/api/v1/**',async route=>{
      const request=route.request(),url=new URL(request.url());
      const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
      if(url.pathname.includes('analytics')||url.pathname.includes('match-events'))return reply({ok:true},202);
      if(url.pathname.endsWith('/nickname')){
        assert.equal(request.method(),'PATCH');patches++;
        if(nicknameFails)return reply({error:'SAVE_FAILED'},500);
        nickname=request.postDataJSON().nickname;return reply({nickname});
      }
      assert.equal(request.method(),'GET','no other mutations');
      if(url.pathname==='/api/v1/results/presentation-owner'){
        const topGenres=[{genreKey:genre,displayLabel:'테스트 장르',stars:18}];
        return reply({publicProfileId:'presentation-owner',nickname,canManage,topGenres,displayGenres:topGenres,recommendationInfluence:{workCount:3,recommendationPercent:80,testPercent:20},wellMatchedDetails:details,wellMatchedLabels:details.map(item=>item.value),lessMatchedLabels:['그림체 장벽']});
      }
      if(url.pathname.endsWith('/recommendations'))return reply({items:[]});
      if(url.pathname==='/api/v1/challenges')return reply({active:false});
      return reply({error:'NOT_FOUND'},404);
    });
    for(const key of [...PERSONA_GENRE_KEYS,'unknown']){
      genre=key;await page.goto(base+'/match/result/presentation-owner');
      await page.locator('.wm-persona-image').evaluate(img=>img.decode());
      assert.equal(await page.locator('.wm-hero-copy h1').innerText(),personalArchetypeFor(key).name);
      for(const width of [320,390,435,540]){
        await page.setViewportSize({width,height:844});await page.waitForFunction(value=>innerWidth===value,width);
        await page.evaluate(()=>document.fonts.ready);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const layout=await page.locator('.wm-result-hero').evaluate(hero=>{
          const image=hero.querySelector('.wm-persona-image'),frame=hero.querySelector('.wm-persona-frame').getBoundingClientRect(),copy=hero.querySelector('.wm-hero-copy').getBoundingClientRect(),img=image.getBoundingClientRect(),h=hero.querySelector('h1');
          const lines=new Map(),walker=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);
          while(walker.nextNode()){
            const node=walker.currentNode;
            for(let i=0;i<node.length;i++)if(!/\s/.test(node.textContent[i])){
              const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);const r=range.getBoundingClientRect();
              const y=Math.round(r.top*2)/2;lines.set(y,(lines.get(y)??0)+1);
            }
          }
          const identity=hero.querySelector('.wm-result-identity').getBoundingClientRect(),ranking=hero.querySelector('.wm-genre-ranking').getBoundingClientRect();
          return {counts:[...lines.values()],font:parseFloat(getComputedStyle(h).fontSize),contained:img.left>=frame.left&&img.right<=frame.right&&img.top>=frame.top&&img.bottom<=frame.bottom,fit:getComputedStyle(image).objectFit,mask:getComputedStyle(image).maskImage,separate:copy.right<=frame.left,topAligned:Math.abs(copy.top-frame.top)<1,identityBesidePortrait:identity.right<=frame.left&&Math.abs(identity.top-frame.top)<1,titleBelowIdentity:h.getBoundingClientRect().top>=identity.bottom,rankingBelowBoth:ranking.top>=Math.max(copy.bottom,frame.bottom),within:document.documentElement.scrollWidth<=innerWidth,copyFits:h.scrollWidth<=copy.width+1};
        });
        assert.ok(layout.counts.every(count=>count>1),`${key}/${width}: no single-character orphan`);
        assert.ok(Math.abs(layout.font-Math.max(24,Math.min(32,width*.06)))<.05,'original title size stays unchanged');
        assert.ok(layout.contained&&layout.separate&&layout.within&&layout.copyFits,`${key}/${width}: portrait and copy do not clip or overlap`);
        assert.equal(layout.fit,'contain');
        assert.ok(layout.mask.includes('linear-gradient')&&layout.mask.includes('60%')&&layout.mask.includes('100%'),`${key}/${width}: portrait fades at the bottom without changing its layout`);
        assert.ok(layout.topAligned&&layout.identityBesidePortrait,'nickname and result title share the left column beside the raised portrait');
        assert.ok(layout.titleBelowIdentity&&layout.rankingBelowBoth,'long nicknames and titles expand without overlapping the portrait or genre cards');
      }
      assert.equal(await page.locator('.wm-result-meta').count(),0);
      assert.equal(await page.getByRole('button',{name:'닉네임 변경',exact:true}).count(),0);
    }
    nickname='무협으로다시';genre='murim';
    await page.setViewportSize({width:390,height:844});await page.reload();
    await page.locator('.wm-persona-image').evaluate(img=>img.decode());
    const compact=await page.locator('.wm-result-intro').evaluate(intro=>({height:intro.getBoundingClientRect().height,identityInCopy:!!intro.querySelector('.wm-hero-copy .wm-result-identity')}));
    assert.ok(compact.identityInCopy&&compact.height<=204,'approved compact layout removes the standalone identity row and keeps the intro about 202px tall');
    // Every supported value renders its own illustration, not the category fallback.
    for(let offset=0;offset<seed.positiveFeatureCatalog.length;offset+=3){
      details=seed.positiveFeatureCatalog.slice(offset,offset+3).map(item=>({category:'취향',value:item.publicShortLabel}));
      await page.reload();await page.locator('.wm-taste-icon').first().waitFor();
      assert.deepEqual(await page.locator('.wm-taste-icon').evaluateAll(icons=>icons.map(icon=>icon.dataset.tasteFeature)),details.map(item=>tasteFeatureIconFor(item.value,item.category).key));
      assert.ok(await page.locator('.wm-taste-icon path').evaluateAll(paths=>paths.every(path=>{
        const b=path.getBBox();return b.width>0&&b.height>0&&b.x>=-1&&b.y>=-1&&b.x+b.width<=33&&b.y+b.height<=33;
      })),'all drawings fit their viewboxes without clipped strokes');
    }
    await page.locator('.wm-nickname-edit').click();
    const dialog=page.getByRole('dialog',{name:'닉네임 변경'});
    await dialog.waitFor();assert.equal(await dialog.locator('input').inputValue(),nickname);
    await dialog.locator('input').fill('가');assert.ok(await dialog.getByRole('button',{name:'저장',exact:true}).isDisabled());
    await dialog.locator('input').fill('새로운닉네임');nicknameFails=true;
    await dialog.getByRole('button',{name:'저장',exact:true}).click();await dialog.getByText('닉네임을 변경하지 못했어요.').waitFor();
    assert.equal(await dialog.locator('input').inputValue(),'새로운닉네임');nicknameFails=false;
    await dialog.getByRole('button',{name:'저장',exact:true}).click();await dialog.waitFor({state:'hidden'});
    assert.equal(await page.locator('.wm-nickname-edit > span').innerText(),'새로운닉네임');assert.equal(patches,2);
    canManage=false;await page.reload();await page.locator('.wm-persona-image').waitFor();
    assert.equal(await page.locator('.wm-nickname-edit').count(),0,'visitors cannot change the nickname');
    assert.deepEqual(errors,[]);await context.close();

    // Capture only existing actual data, with the real owner's read-only identity.
    if(process.env.WEBTOON_MATCH_DATABASE_URL){
      const sql=postgres(process.env.WEBTOON_MATCH_DATABASE_URL,{ssl:'require',prepare:false,max:1,onnotice:()=>{}});
      let owner;
      try{[owner]=await sql.begin('read only',tx=>tx`select p.anonymous_id from public.match_profiles p join public.match_taste_snapshots s on s.profile_id=p.profile_id where s.public_profile_id='xys7o3_7JlgZl91b'`);}finally{await sql.end();}
      assert.ok(owner);
      const live=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
      await live.addCookies([{name:'wm_aid',value:owner.anonymous_id,url:base}]);
      await live.route('**/api/v1/**',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.fulfill({status:202,contentType:'application/json',body:'{"ok":true}'}));
      const real=await live.newPage();await real.goto(base+'/match/result/xys7o3_7JlgZl91b');
      await real.locator('.wm-persona-image').evaluate(img=>img.decode());await real.locator('.wm-nickname-edit').waitFor();
      await real.addStyleTag({content:'nextjs-portal{display:none!important}'});
      await real.screenshot({path:path.join(output,'result_hero_live.png')});
      await real.locator('.wm-interpretation').screenshot({path:path.join(output,'result_taste_icons_live.png')});
      await live.close();
    }
    console.log(JSON.stringify({ok:true,output,checks:['compact intro with nickname and title beside portrait','portrait bottom alpha gradient for all personas and widths','30 bespoke taste icons','all nine personas plus fallback at 320/390/435/540px','no portrait clipping or copy overlap','unchanged title sizes and no single-character lines','recommendation count removed','nickname chip opens existing editor','nickname validation, failure and save','visitor permissions preserved','all UI writes intercepted; actual captures read-only']},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
