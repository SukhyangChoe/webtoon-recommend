/* Read-only browser regression runner. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium}=require('playwright');

(async()=>{
  const {personalShareLayout}=await import('../../src/features/match/share/sharePersonalLayout.mjs');
  const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000';
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-share-ui-'));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write'],acceptDownloads:true});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    let empty=false,privateRanking=false,fail=false,edge=false;
    let pickCount=4;
    const picks=[{title:'북검전기',coverUrl:'/match/covers/wt_murim_017.webp'},{title:'나노마신',coverUrl:'/match/covers/wt_murim_011.webp'},{title:'매우 긴 추천작 제목도 두 줄 안에 안전하게 표시되는지 & 특수문자 <테스트>',coverUrl:'/match/covers/missing-test-cover.webp'},{title:'네 번째 작품은 카드에 표시하지 않음',coverUrl:null}];
    await page.route('**/match/covers/missing-test-cover.webp',route=>route.fulfill({status:404,body:''}));
    await page.addInitScript(()=>{window.__threads=[];window.open=(url,target,features)=>{window.__threads.push({url,target,features});return null;};});
    const personal={nickname:'무협으로다시',topGenres:[{genreKey:'murim',displayLabel:'무협',stars:10},{genreKey:'fantasy',displayLabel:'판타지',stars:3},{genreKey:'sports',displayLabel:'스포츠',stars:2}],wellMatchedLabels:['사이다'],lessMatchedLabels:[]};
    const pair={ownerNickname:'무협으로다시',challengerNickname:'테스트2',ownerGenreKey:'murim',challengerGenreKey:'action',score:85,band:{label:'취향 잘 맞음'},sharedGenres:['무협','액션'],differentGenres:[],ownerRecommendedGenres:[],challengerRecommendedGenres:[],trustSentence:'웹툰 취향 비교'};
    const ranking={ownerNickname:'무협으로다시',ownerGenreKey:'murim',entryCount:5,rankingVisibility:'public_by_link',canManage:false,top20:[{rank:1,nickname:'테스트2',genreKey:'action',score:96,sharedGenres:[]},{rank:2,nickname:'하린파더',genreKey:'ropan',score:88,sharedGenres:[]},{rank:3,nickname:'서연',genreKey:'murim',score:83,sharedGenres:[]}]};
    await page.route('**/api/v1/**',route=>{
      const url=new URL(route.request().url());
      if(url.pathname.includes('match-events')||url.pathname.includes('analytics'))return route.fulfill({status:202,contentType:'application/json',body:'{"accepted":true}'});
      assert.equal(route.request().method(),'GET','no production writes');
      if(url.pathname.endsWith('/recommendations'))return route.fulfill({status:fail?500:200,contentType:'application/json',body:JSON.stringify({items:empty?[]:picks.slice(0,pickCount)})});
      let body=url.pathname.endsWith('/ranking')?{...ranking,rankingVisibility:privateRanking?'private':'public_by_link',...(empty?{entryCount:0,top20:[]}:{})}:url.pathname.endsWith('/results/pair-demo')?pair:{...personal,...(empty?{topGenres:[]}: {})};
      if(edge){
        const long='아주긴닉네임도모두보이는테스트사용자';
        body=url.pathname.endsWith('/ranking')?{...ranking,ownerNickname:long,top20:ranking.top20.map((entry,index)=>({...entry,nickname:long,score:index===0?100:0}))}:url.pathname.endsWith('/results/pair-demo')?{...pair,ownerNickname:long,challengerNickname:long,score:100}:{...personal,nickname:long,topGenres:[{genreKey:'thriller_horror',displayLabel:'스릴러·공포',stars:18},{genreKey:'drama_daily',displayLabel:'드라마·일상',stars:3},{genreKey:'romance',displayLabel:'로맨스',stars:1}]};
      }
      if(url.pathname.includes('match-events')||url.pathname.includes('analytics'))body={ok:true};
      return route.fulfill({status:fail?404:200,contentType:'application/json',body:JSON.stringify(body)});
    });
    const routes={personal:'/match/share/personal?profilePublicId=share-demo',pair:'/match/share/pair?challengeCode=share-demo&resultId=pair-demo',ranking:'/match/share/ranking?challengeCode=share-demo'};
    async function svg(){
      const source=await page.locator('.wm-share-card img').evaluate(async img=>{await img.decode();return(await fetch(img.src)).text();});
      const stars=await page.evaluate(source=>{
        const holder=document.createElement('div');holder.style.cssText='position:fixed;left:-2000px;top:0;opacity:0';holder.innerHTML=source;document.body.appendChild(holder);
        const stars=[...holder.querySelectorAll('[data-star]')].map(star=>{
          const bounds=star.getBoundingClientRect();
          return {width:bounds.width,height:bounds.height,path:star.getAttribute('d'),transform:star.getAttribute('transform')};
        });
        holder.remove();return stars;
      },source);
      for(const star of stars){
        assert.ok(Math.abs(star.width-11)<.001,'all star counts keep the same 11px width');
        assert.ok(Math.abs(star.height-10.45)<.001,'all star counts keep the same height');
        assert.equal(star.path,stars[0].path,'all genre tiles repeat identical star geometry');
        assert.match(star.transform,/^translate\([\d.]+ [\d.]+\)$/,'stars move into rows without scaling');
      }
      const ownerLabel=await page.evaluate(async source=>{
        const holder=document.createElement('div');holder.style.cssText='position:fixed;left:-2000px;top:0;opacity:0';holder.innerHTML=source;document.body.appendChild(holder);
        await document.fonts.ready;
        const label=holder.querySelector('[data-owner-label]');
        if(!label){holder.remove();return null;}
        const box=label.querySelector('rect');
        const context=document.createElement('canvas').getContext('2d');
        const bounds=[...label.querySelectorAll('text')].map(text=>{
          const style=getComputedStyle(text);context.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const metrics=context.measureText(text.textContent);
          const baseline=Number(text.getAttribute('y'));
          return {top:baseline-metrics.actualBoundingBoxAscent,bottom:baseline+metrics.actualBoundingBoxDescent};
        });
        const y=Number(box.getAttribute('y')),height=Number(box.getAttribute('height'));
        const top=Math.min(...bounds.map(bound=>bound.top))-y;
        const bottom=y+height-Math.max(...bounds.map(bound=>bound.bottom));
        holder.remove();return {top,bottom,lines:bounds.length};
      },source);
      if(ownerLabel){
        assert.ok(ownerLabel.top>0&&ownerLabel.bottom>0,'owner nickname fits inside its label');
        assert.ok(Math.abs(ownerLabel.top-ownerLabel.bottom)<.01,`${ownerLabel.lines}-line owner nickname has equal top and bottom padding`);
      }
      const scores=await page.evaluate(async source=>{
        const holder=document.createElement('div');holder.style.cssText='position:fixed;left:-2000px;top:0;opacity:0';holder.innerHTML=source;document.body.appendChild(holder);
        await document.fonts.ready;
        const result=[...holder.querySelectorAll('[data-ranking-node]')].map(node=>{
          const badge=node.querySelector('[data-ranking-score]');
          const box=badge?.querySelector('rect').getBBox();
          const score=badge?.querySelector('text');
          const scoreBox=score?.getBBox();
          const names=[...node.children].filter(child=>child.tagName==='text');
          const nameBoxes=names.map(name=>name.getBBox());
          return {
            score:score?.textContent,
            fits:!!box&&!!scoreBox&&scoreBox.x>=box.x&&scoreBox.y>=box.y&&scoreBox.x+scoreBox.width<=box.x+box.width&&scoreBox.y+scoreBox.height<=box.y+box.height,
            clearNames:!!box&&nameBoxes.every(name=>name.y>box.y+box.height&&name.y+name.height<305),
          };
        });
        holder.remove();return result;
      },source);
      scores.forEach(score=>{
        assert.match(score.score,/^\d+%$/,'each graph participant shows their percentage');
        assert.ok(score.fits,'graph percentage fits inside its badge');
        assert.ok(score.clearNames,'percentage badges do not overlap even two-line nicknames');
      });
      const pairNames=await page.evaluate(async source=>{
        const holder=document.createElement('div');holder.style.cssText='position:fixed;left:-2000px;top:0;opacity:0';holder.innerHTML=source;document.body.appendChild(holder);await document.fonts.ready;
        const names=[...holder.querySelectorAll('[data-pair-nickname]')].map(label=>{
          const box=label.getBBox(),side=label.getAttribute('data-pair-nickname');
          return {side,text:[...label.querySelectorAll('text')].map(text=>text.textContent).join(''),left:box.x,right:box.x+box.width,top:box.y,bottom:box.y+box.height};
        });
        holder.remove();return names;
      },source);
      if(pairNames.length){
        assert.deepEqual(pairNames.map(name=>name.side),['owner','partner']);
        for(const name of pairNames){
          assert.ok(name.top>0&&name.bottom<49,'nicknames stay above the portraits, including two-line names');
          const center=name.side==='owner'?87.5:262.5;
          assert.ok(Math.abs((name.left+name.right)/2-center)<.1,'each nickname is centered above its own character');
          assert.ok(name.left>=center-73.5&&name.right<=center+73.5,'long nicknames stay within their own side');
        }
      }
      return source;
    }
    for(const [type,route] of Object.entries(routes)){
      await page.goto(base+route);await page.locator('.wm-share-card img').waitFor();
      const source=await svg();
      assert.ok(!source.includes('sd-v1'));
      const parsed=await page.evaluate(source=>{
        const doc=new DOMParser().parseFromString(source,'image/svg+xml');
        return {stars:doc.querySelectorAll('[data-star]').length,text:[...doc.querySelectorAll('text')].map(el=>el.textContent),images:doc.querySelectorAll('image').length,invalid:doc.querySelector('parsererror')!==null};
      },source);
      assert.equal(parsed.invalid,false);
      if(type==='personal'){
        assert.equal(parsed.stars,15);assert.ok(!parsed.text.includes('10'));
        assert.ok(!source.includes('나랑 웹툰 취향 궁합 볼래?'));
        const details=await page.evaluate(source=>{
          const doc=new DOMParser().parseFromString(source,'image/svg+xml');
          return {titles:[...doc.querySelectorAll('[data-recommendation] > title')].map(t=>t.textContent),covers:doc.querySelectorAll('[data-work-cover]').length,eyebrow:doc.querySelector('[data-personal-eyebrow] text').getAttribute('font-size'),height:doc.documentElement.getAttribute('height'),embedded:[...doc.querySelectorAll('image')].every(image=>image.getAttribute('href').startsWith('data:')),placeholder:doc.querySelector('[data-recommendation="2"]').textContent.includes('표지 준비 중')};
        },source);
        assert.deepEqual(details.titles,picks.slice(0,3).map(item=>item.title));
        assert.equal(details.covers,2);assert.ok(details.placeholder&&details.embedded);
        assert.equal(details.eyebrow,'15');assert.equal(details.height,String(personalShareLayout(personal.topGenres,true).cardHeight));
        const fade=await page.evaluate(async source=>{
          const doc=new DOMParser().parseFromString(source,'image/svg+xml'),hero=doc.querySelector('[data-personal-portrait]');
          const masked=hero.getAttribute('mask')==='url(#personalPortraitFade)';
          hero.removeAttribute('mask');const solid=new XMLSerializer().serializeToString(doc);
          hero.remove();const background=new XMLSerializer().serializeToString(doc);
          async function pixels(svg){
            const image=new Image();image.src=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));await image.decode();
            const canvas=document.createElement('canvas');canvas.width=350;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);URL.revokeObjectURL(image.src);return ctx.getImageData(0,0,350,canvas.height).data;
          }
          const [faded,opaque,base]=await Promise.all([source,solid,background].map(pixels));
          function difference(a,b,top,bottom){let sum=0;for(let y=top;y<bottom;y++)for(let x=190;x<330;x++)for(let c=0;c<3;c++)sum+=Math.abs(a[(y*350+x)*4+c]-b[(y*350+x)*4+c]);return sum;}
          return {masked,bottom: difference(faded,base,315,335),solidBottom:difference(opaque,base,315,335),faceMeanDifference:difference(faded,opaque,100,160)/(140*60*3)};
        },source);
        assert.ok(fade.masked&&fade.solidBottom>0&&fade.bottom<fade.solidBottom*.25,'portrait bottom fades into the actual background, not a white overlay strip');
        // Applying an opaque SVG mask can introduce one-channel rounding at antialiased edges.
        assert.ok(fade.faceMeanDifference<.25,'portrait face is unaffected apart from subpixel mask rounding');
        assert.ok((await page.locator('.wm-share-card img').getAttribute('alt')).includes('북검전기'));
      }
      {
        const branding=await page.evaluate(source=>{
          const doc=new DOMParser().parseFromString(source,'image/svg+xml'),logo=doc.querySelector('[data-share-brand]');
          const site=document.querySelector('.brand-logo');
          return {text:logo?.textContent,viewBox:logo?.getAttribute('viewBox'),count:doc.querySelectorAll('[data-share-brand]').length,width:Number(logo?.getAttribute('width')),height:Number(logo?.getAttribute('height')),x:Number(logo?.getAttribute('x')),bottom:Number(doc.documentElement.getAttribute('height'))-Number(logo?.getAttribute('y'))-Number(logo?.getAttribute('height')),samePath:logo?.querySelector('path').getAttribute('d')===site.querySelector('path').getAttribute('d'),sameDot:['cx','cy','r','fill'].every(attribute=>logo?.querySelector('circle').getAttribute(attribute)===site.querySelector('circle').getAttribute(attribute))};
        },source);
        assert.equal(branding.text,'웹툰핏');assert.equal(branding.viewBox,'0 0 110 32');assert.ok(branding.samePath&&branding.sameDot,'export uses the exact site logo drawing');
        assert.equal(branding.count,1);assert.equal(branding.width,68);assert.equal(branding.height,20);assert.equal(branding.x,141);assert.equal(branding.bottom,5,'every share type uses the same centered footer logo with clear bottom padding');
        assert.ok(!source.includes('나와 취향이 통하는 사람은?'));
      }
      if(type==='pair'){
        assert.equal(parsed.images,2);assert.ok(parsed.text.includes('85'));
        assert.ok(!parsed.text.some(text=>text.includes(' × ')),'separate nicknames replace the combined heading');
        const names=await page.evaluate(source=>[...new DOMParser().parseFromString(source,'image/svg+xml').querySelectorAll('[data-pair-nickname]')].map(label=>label.textContent),source);
        assert.deepEqual(names,[pair.ownerNickname,pair.challengerNickname]);
        assert.ok(!source.includes('우리, 다음 작품도 같이 볼까?'));
        const details=await page.evaluate(async source=>{
          const holder=document.createElement('div');holder.style.cssText='position:fixed;left:-2000px;top:0;opacity:0';holder.innerHTML=source;document.body.appendChild(holder);await document.fonts.ready;
          const result=holder.querySelector('[data-pair-result]'),label=result.querySelector('[data-pair-result-label]').getBBox(),name=result.querySelector('[data-pair-result-name]').getBBox(),score=result.querySelector('[data-pair-score]').getBBox(),band=result.querySelector('[data-pair-result-band]').getBBox();
          const sides=[...holder.querySelectorAll('[data-pair-side]')].map(el=>el.getAttribute('fill'));
          const model={label:result.querySelector('[data-pair-result-label]').textContent,band:result.querySelector('[data-pair-result-band]').textContent,grouped:name.y>label.y+label.height&&score.y>label.y+label.height&&name.x+name.width<score.x&&band.y>name.y+name.height,sides,warm:holder.querySelector('#pairPartnerBackground stop:last-child').getAttribute('stop-color')};
          holder.remove();return model;
        },source);
        assert.equal(details.label,'웹툰 취향 궁합');assert.equal(details.band,pair.band.label);assert.ok(details.grouped,'one shared heading covers both result name and score, with band below the name');
        assert.deepEqual(details.sides,['url(#pairOwnerBackground)','url(#pairPartnerBackground)']);assert.equal(details.warm,'#FFF6D9');
      }
      if(type==='ranking'){
        assert.ok(parsed.images>=4);assert.ok(parsed.text.includes('96%'));
        const graphScores=await page.evaluate(source=>[...new DOMParser().parseFromString(source,'image/svg+xml').querySelectorAll('[data-ranking-score] text')].map(text=>text.textContent),source);
        assert.deepEqual(graphScores,['96%','88%','83%'],'graph badges match the ranking scores');
        const distances=await page.evaluate(source=>{
          const doc=new DOMParser().parseFromString(source,'image/svg+xml');
          const owner=doc.querySelector('#owner circle');
          return [...doc.querySelectorAll('[data-ranking-node]')].map(node=>{
            const circle=node.querySelector('circle');
            return Math.hypot(Number(circle.getAttribute('cx'))-Number(owner.getAttribute('cx')),Number(circle.getAttribute('cy'))-Number(owner.getAttribute('cy')));
          });
        },source);
        assert.ok(distances[0]<distances[1]&&distances[1]<distances[2],'higher percentages render closer to the owner');
      }
      for(const width of [320,390,435]){
        await page.setViewportSize({width,height:844});await page.waitForFunction(value=>innerWidth===value,width);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${type} fits ${width}`);
        assert.equal(await page.locator('.wm-share-actions button').count(),3);
        assert.ok(await page.locator('.wm-share-actions button').evaluateAll(buttons=>buttons.every(button=>button.getBoundingClientRect().height>=44)));
        assert.equal(await page.locator('.match-topic-guide,.match-share-copy,.match-share-heading').count(),0);
      }
      const download=page.waitForEvent('download');await page.getByRole('button',{name:'이미지 저장',exact:true}).click();
      const file=await download;assert.equal(file.suggestedFilename(),`webtoon-match-${type}.png`);
      const filePath=path.join(output,`fixture_${type}.png`);await file.saveAs(filePath);
      const bytes=fs.readFileSync(filePath);assert.equal(bytes.readUInt32BE(16),1080);assert.equal(bytes.readUInt32BE(20),type==='personal'?Math.round(1080*personalShareLayout(personal.topGenres,true).cardHeight/350):1543);
      assert.ok(await page.locator('.wm-share-card img').evaluate(async(img,png)=>{
        const exported=new Image();exported.src='data:image/png;base64,'+png;await exported.decode();
        const canvas=document.createElement('canvas');canvas.width=exported.naturalWidth;canvas.height=exported.naturalHeight;
        const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);const expected=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(exported,0,0);const actual=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let different=0;for(let i=0;i<actual.length;i++)if(Math.abs(actual[i]-expected[i])>1)different++;
        return different/actual.length<.002;
      },bytes.toString('base64')),'downloaded PNG matches the visible preview');
      await page.getByRole('button',{name:'링크 복사',exact:true}).click();
      assert.ok((await page.evaluate(()=>navigator.clipboard.readText())).includes('utm_source=threads'));
      await page.getByRole('button',{name:'Threads에 공유하기',exact:true}).click();
      const intent=await page.evaluate(()=>window.__threads.at(-1));
      assert.equal(new URL(intent.url).origin,'https://www.threads.com');assert.equal(intent.features,'noopener,noreferrer');
      assert.ok(new URL(intent.url).searchParams.get('text').includes('utm_source=threads'));
    }
    edge=true;
    for(const type of Object.keys(routes)){
      await page.goto(base+routes[type]);await page.locator('.wm-share-card img').waitFor();const source=await svg();
      assert.ok(await page.evaluate(async source=>{
        const holder=document.createElement('div');holder.style.cssText='position:fixed;left:-2000px;top:0;opacity:0';holder.innerHTML=source;document.body.appendChild(holder);
        await document.fonts.ready;
        const height=Number(holder.querySelector('svg').getAttribute('height'));
        const fits=[...holder.querySelectorAll('text')].every(text=>{const b=text.getBBox();return b.x>=-1&&b.y>=0&&b.x+b.width<=351&&b.y+b.height<=height;});
        holder.remove();return fits;
      },source),`${type}: long names, 100% score and 18 stars remain within the card`);
      if(type==='personal')assert.equal((source.match(/data-star="true"/g)||[]).length,22);
    }
    edge=false;
    for(const score of [0,44,100]){
      pair.score=score;await page.goto(base+routes.pair);await page.locator('.wm-share-card img').waitFor();const source=await svg();
      const result=await page.evaluate(source=>{
        const doc=new DOMParser().parseFromString(source,'image/svg+xml'),arc=doc.querySelector('[data-pair-score-arc]');
        return{score:[...doc.querySelectorAll('[data-pair-score] text')].map(el=>el.textContent).join(''),arc:arc?.getAttribute('stroke-dasharray'),label:doc.querySelector('[data-pair-result-label]').textContent};
      },source);
      assert.equal(result.score,`${score}%`);assert.equal(result.label,'웹툰 취향 궁합');
      if(score===0)assert.equal(result.arc,undefined);else assert.ok(Math.abs(Number(result.arc.split(' ')[0])/(2*Math.PI*36)-score/100)<.00001,'ring arc reflects the actual percentage');
    }
    pair.score=85;
    for(const count of [0,1,2,4]){
      pickCount=count;await page.goto(base+routes.personal);await page.locator('.wm-share-card img').waitFor();
      const source=await svg();
      const state=await page.evaluate(source=>{const doc=new DOMParser().parseFromString(source,'image/svg+xml');return {count:doc.querySelectorAll('[data-recommendation]').length,height:doc.documentElement.getAttribute('height')};},source);
      assert.equal(state.count,Math.min(count,3));assert.equal(state.height,String(personalShareLayout(personal.topGenres,count>0).cardHeight));
    }
    const savedGenres=personal.topGenres;
    for(const counts of [[1,2,3],[5,1,1],[6,1,1],[14,4,1],[18,1,1]]){
      personal.topGenres=savedGenres.map((genre,index)=>({...genre,stars:counts[index]}));
      await page.goto(base+routes.personal);await page.locator('.wm-share-card img').waitFor();const source=await svg();
      const geometry=await page.evaluate(source=>{
        const doc=new DOMParser().parseFromString(source,'image/svg+xml');
        return {heights:[...doc.querySelectorAll('[data-personal-genre] > rect')].map(el=>Number(el.getAttribute('height'))),covers:[...doc.querySelectorAll('[data-work-cover]')].map(el=>({width:Number(el.getAttribute('width')),height:Number(el.getAttribute('height')),y:Number(el.getAttribute('y'))}))};
      },source);
      const layout=personalShareLayout(personal.topGenres,true);
      assert.deepEqual(geometry.heights,[layout.genreHeight,layout.genreHeight,layout.genreHeight]);
      assert.ok(geometry.covers.every(cover=>cover.width===68&&cover.height===98&&cover.y===layout.coverY),'larger covers follow the content-sized genre row without extra space');
    }
    personal.topGenres=savedGenres;
    const {PERSONA_GENRE_KEYS}=await import('../../src/features/match/config/personaImages.mjs');
    for(const genreKey of PERSONA_GENRE_KEYS){
      personal.topGenres[0].genreKey=genreKey;await page.goto(base+routes.personal);await page.locator('.wm-share-card img').waitFor();const source=await svg();
      assert.ok(await page.evaluate(source=>{
        const doc=new DOMParser().parseFromString(source,'image/svg+xml'),image=doc.querySelector('[data-portrait]');
        const x=Number(image.getAttribute('x')),y=Number(image.getAttribute('y')),width=Number(image.getAttribute('width')),height=Number(image.getAttribute('height'));
        return x>=18&&x+width<=332&&y>=64&&y+height<=335&&image.getAttribute('preserveAspectRatio')==='xMidYMin meet'&&!image.hasAttribute('clip-path');
      },source),`${genreKey}: full portrait is contained inside safe card margins`);
    }
    personal.topGenres[0].genreKey='murim';
    empty=true;
    for(const type of ['personal','ranking']){await page.goto(base+routes[type]);await page.locator('.wm-share-card img').waitFor();const source=await svg();assert.ok(source.includes(type==='personal'?'아직 선택한':'첫 번째'));}
    empty=false;privateRanking=true;await page.goto(base+routes.ranking);await page.locator('.wm-share-state[role=alert]').waitFor();assert.equal(await page.locator('.wm-share-card').count(),0);privateRanking=false;
    fail=true;await page.goto(base+routes.personal);await page.locator('.wm-share-state[role=alert]').waitFor();fail=false;await page.getByRole('button',{name:'다시 불러오기'}).click();await page.locator('.wm-share-card img').waitFor();
    assert.deepEqual(errors,[]);
    await context.close();
    // Deliver only actual existing service data, never the isolated fixtures above.
    const live=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce',acceptDownloads:true});
    const real=await live.newPage();
    await real.route('**/api/v1/match-events',route=>route.fulfill({status:202,body:'{"accepted":true}'}));
    await real.route('**/api/v1/analytics/**',route=>route.fulfill({status:200,body:'{"ok":true}'}));
    const realRoutes={personal:'/match/share/personal?profilePublicId=xys7o3_7JlgZl91b',pair:'/match/share/pair?challengeCode=mKOdmiLcE0JU&resultId=VIbseuqFQuk6RRDr',ranking:'/match/share/ranking?challengeCode=mKOdmiLcE0JU'};
    for(const [type,route] of Object.entries(realRoutes)){
      await real.goto(base+route);await real.locator('.wm-share-card img').waitFor();await real.locator('.wm-share-card img').evaluate(img=>img.decode());
      await real.addStyleTag({content:'nextjs-portal{display:none!important}'});
      await real.screenshot({path:path.join(output,`share_${type}_live.png`),fullPage:true});
      const download=real.waitForEvent('download');await real.getByRole('button',{name:'이미지 저장',exact:true}).click();await(await download).saveAs(path.join(output,`share_${type}_export_live.png`));
    }
    console.log(JSON.stringify({ok:true,output,checks:['three mature share types','personal footer removed and 15px nickname heading','saved-order recommendations: zero/one/two/three, long titles and missing covers','68x98 recommendation covers and genre height for 1/2/3/4 star rows','portrait alpha fade verified against solid/background raster; face unchanged','all nine personal portraits contained inside safe margins','actual star glyph counts','original portraits','single renderer for preview/export','1080px PNG downloads with content-aware height','Threads intent and copy link','320/390/435px readability and overflow','zero/empty states','private ranking blocked','load error and retry','no production DB writes']},null,2));
    await live.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
