/* Isolated UI mutations; actual-data captures use read-only queries and block all writes. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const postgres=require('postgres');

(async()=>{
  const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000';
  const output=process.env.MATCH_QA_OUTPUT??fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-result-presentation-'));
  fs.mkdirSync(output,{recursive:true});
  const {PERSONA_GENRE_KEYS}=await import('../../src/features/match/config/personaImages.mjs');
  const {personalArchetypeFor}=await import('../../src/features/match/share/shareArchetypes.mjs');
  const {tasteFeatureIconFor}=await import('../../src/features/match/config/tasteFeatureIcons.mjs');
  const seed=require('../../src/features/match/data/questionSeed.v0.4.json');
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    let genre='fantasy',canManage=true,nickname='긴닉네임'.repeat(5),nicknameFails=false,patches=0;
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
          let textLeft=Infinity,textRight=-Infinity;
          while(walker.nextNode()){
            const node=walker.currentNode;
            for(let i=0;i<node.length;i++)if(!/\s/.test(node.textContent[i])){
              const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);const r=range.getBoundingClientRect();
              textLeft=Math.min(textLeft,r.left);textRight=Math.max(textRight,r.right);
              const y=Math.round(r.top*2)/2;lines.set(y,(lines.get(y)??0)+1);
            }
          }
          const identity=hero.querySelector('.wm-result-identity').getBoundingClientRect(),ranking=hero.querySelector('.wm-genre-ranking').getBoundingClientRect();
          const chip=hero.querySelector('.wm-nickname-edit'),chipStyle=getComputedStyle(chip),pillStyle=getComputedStyle(hero.querySelector('.wm-nickname-chip'),'::before'),label=chip.querySelector('span'),mark=h.querySelector('.wm-result-title-mark'),stroke=getComputedStyle(mark);
          const caption=hero.querySelector('.wm-result-identity-caption'),captionBox=caption.getBoundingClientRect();
          return {
            counts:[...lines.values()],font:parseFloat(getComputedStyle(h).fontSize),
            contained:img.left>=frame.left-.1&&img.right<=frame.right+.1&&Math.abs(img.top-frame.top)<1&&frame.height>=img.height*.65,
            fit:getComputedStyle(image).objectFit,mask:getComputedStyle(hero.querySelector('.wm-persona-frame')).maskImage,
            separate:copy.right<=frame.left,identitySeparate:hero.firstElementChild.classList.contains('wm-result-identity')&&identity.width>copy.width,
            identityStacked:caption.textContent==='님의 웹툰 취향'&&captionBox.top>=chip.getBoundingClientRect().bottom+1&&Math.abs(captionBox.left-chip.getBoundingClientRect().left)<1,
            titleBelowIdentity:h.getBoundingClientRect().top>=captionBox.bottom+15,
            rankingBelowBoth:ranking.top>=Math.max(copy.bottom,frame.bottom)-.1,
            compactGap:ranking.top-h.getBoundingClientRect().bottom<=90,raised:frame.top>=20&&frame.top<=40,
            enlarged:Math.abs(img.width-Math.min(hero.clientWidth*.5,230))<1&&Math.abs(img.width/img.height-.75)<.01,
            // The intentional marker padding may overflow h1; measure the actual glyphs, not its decoration.
            within:document.documentElement.scrollWidth<=innerWidth,copyFits:textLeft>=copy.left-1&&textRight<=copy.right+1,
            marker:h.children.length===1&&mark.textContent===h.textContent&&stroke.backgroundImage.includes('rgb(175, 234, 241)')&&stroke.boxDecorationBreak==='clone'&&[...mark.querySelectorAll('.wm-result-title-phrase')].every(el=>getComputedStyle(el,'::after').content==='none'),
            markerBleed:Math.abs(parseFloat(stroke.paddingLeft)-(parseFloat(stroke.fontSize)*.14+2))<.05&&stroke.paddingLeft===stroke.paddingRight&&Math.abs(parseFloat(stroke.paddingLeft)+parseFloat(stroke.marginLeft))<.05&&stroke.marginLeft===stroke.marginRight,
            pill:parseFloat(chipStyle.borderRadius)>=99&&pillStyle.backgroundColor==='rgb(189, 243, 248)'&&pillStyle.top==='6px',
            singleLine:getComputedStyle(label).whiteSpace==='nowrap'&&getComputedStyle(label).textOverflow==='ellipsis',touchTarget:chip.getBoundingClientRect().height>=44,
          };
        });
        assert.ok(layout.counts.every(count=>count>1),`${key}/${width}: no single-character orphan`);
        assert.ok(Math.abs(layout.font-Math.max(24,Math.min(32,width*.06)))<.05,'original title size stays unchanged');
        assert.ok(layout.contained&&layout.separate&&layout.within&&layout.copyFits,`${key}/${width}: upper body and title stay intact; only the portrait bottom may fade out: ${JSON.stringify(layout)}`);
        assert.equal(layout.fit,'contain');
        assert.ok(layout.mask.includes('linear-gradient')&&layout.mask.includes('60%')&&layout.mask.includes('100%'),`${key}/${width}: portrait fades at the bottom without changing its layout`);
        assert.ok(layout.identitySeparate&&layout.identityStacked,'profile places the caption below the nickname, even with a maximum-length nickname');
        assert.ok(layout.raised&&layout.enlarged,'portrait keeps its width and natural aspect ratio while entering the header slightly');
        assert.ok(await page.locator('.wm-result-hero').evaluate(hero=>{
          const row=hero.querySelector('.wm-result-identity').getBoundingClientRect();
          const portrait=hero.querySelector('.wm-persona-frame').getBoundingClientRect();
          return Math.abs(row.top-hero.getBoundingClientRect().top-12)<1&&Math.abs(portrait.top-28)<1;
        }),'nickname gains 12px top spacing while the portrait stays in its previous position');
        assert.ok(layout.compactGap,`${key}/${width}: excess space below the result title is removed`);
        assert.ok(await page.locator('.wm-result-hero').evaluate(hero=>{
          const intro=hero.querySelector('.wm-result-intro').getBoundingClientRect();
          const ranking=hero.querySelector('.wm-genre-ranking').getBoundingClientRect();
          const portrait=hero.querySelector('.wm-persona-frame').getBoundingClientRect();
          return Math.abs(ranking.top-intro.bottom-24)<1
            &&Math.abs(portrait.height-Math.min(portrait.width*1.25,220))<1;
        }),'24px spacing and a taller portrait viewport show more of the lower body without moving its top');
        assert.ok(layout.titleBelowIdentity&&layout.rankingBelowBoth,'long nicknames and titles expand without overlapping the portrait or genre cards');
        assert.ok(layout.marker&&layout.pill&&layout.singleLine&&layout.touchTarget,'all genres share a marker emphasis and accessible cyan nickname pill');
        assert.ok(layout.markerBleed,'marker extends equally past both ends without indenting the title');
        assert.ok(await page.evaluate(()=>['.brand-bar__logo','.wm-floating-search'].every(selector=>{
          const link=document.querySelector(selector),r=link?.getBoundingClientRect();
          return r&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('a')===link;
        })),'the raised portrait does not block the logo or search control');
      }
      assert.equal(await page.locator('.wm-result-meta').count(),0);
      assert.equal(await page.getByRole('button',{name:'닉네임 변경',exact:true}).count(),0);
    }
    nickname='무협으로다시';genre='murim';
    await page.setViewportSize({width:390,height:844});await page.reload();
    await page.locator('.wm-persona-image').evaluate(img=>img.decode());
    const compact=await page.locator('.wm-result-intro').evaluate(intro=>({height:intro.getBoundingClientRect().height,identityInCopy:!!intro.querySelector('.wm-hero-copy .wm-result-identity')}));
    assert.ok(!compact.identityInCopy&&compact.height<=125,'profile row is separate while the raised upper-body viewport shortens the result stage');
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
    assert.equal(await dialog.locator('input').getAttribute('maxlength'),'20','nickname limit is unchanged');
    await dialog.locator('input').fill('긴닉네임'.repeat(5));
    assert.ok(await dialog.getByRole('button',{name:'저장',exact:true}).isEnabled(),'20-character nicknames remain valid');
    await dialog.locator('input').fill('가');assert.ok(await dialog.getByRole('button',{name:'저장',exact:true}).isDisabled());
    await dialog.locator('input').fill('새로운닉네임');nicknameFails=true;
    await dialog.getByRole('button',{name:'저장',exact:true}).click();await dialog.getByText('닉네임을 변경하지 못했어요.').waitFor();
    assert.equal(await dialog.locator('input').inputValue(),'새로운닉네임');nicknameFails=false;
    await dialog.getByRole('button',{name:'저장',exact:true}).click();await dialog.waitFor({state:'hidden'});
    assert.equal(await page.locator('.wm-nickname-edit > span').innerText(),'새로운닉네임');assert.equal(patches,2);
    canManage=false;nickname='긴닉네임'.repeat(5);await page.reload();await page.locator('.wm-persona-image').waitFor();
    assert.equal(await page.locator('.wm-nickname-edit').count(),0,'visitors cannot change the nickname');
    assert.ok(await page.locator('.wm-result-identity').evaluate(el=>{
      const name=el.firstElementChild;
      const caption=el.querySelector('.wm-result-identity-caption');
      return el.children.length===2&&getComputedStyle(name).whiteSpace==='nowrap'&&document.documentElement.scrollWidth<=innerWidth&&caption.textContent==='님의 웹툰 취향'&&caption.getBoundingClientRect().top>=name.getBoundingClientRect().bottom;
    }),'a visitor sees the caption below the nickname in the same compact profile layout');
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
      const heroBounds=await real.locator('.wm-result-hero').boundingBox();
      await real.screenshot({path:path.join(output,'result_profile_portrait_live.png'),clip:{x:0,y:0,width:390,height:Math.ceil(heroBounds.y+heroBounds.height)}});
      await real.locator('.wm-result-hero').screenshot({path:path.join(output,'result_hero_emphasis_live.png')});
      await real.locator('.wm-interpretation').screenshot({path:path.join(output,'result_taste_icons_live.png')});
      await live.close();
    }
    console.log(JSON.stringify({ok:true,output,checks:['caption beneath nickname and 16px space before result title','unchanged 20-character nickname limit','portrait keeps its size and header position','shorter genre cards preserve their width and all stars','30 bespoke taste icons','all nine personas plus fallback at 320/390/435/540px','no title clipping or single-character orphans','nickname validation, failure and save','visitor permissions preserved','all UI writes intercepted; actual captures read-only']},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
