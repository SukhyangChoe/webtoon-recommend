/* Fixtures are isolated. Optional live audit only SELECTs, GETs, and blocks all UI writes. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const postgres=require('postgres');

(async()=>{
  const base=process.env.MATCH_TEST_BASE_URL||'http://127.0.0.1:3000';
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-fit-display-'));
  const {recommendationFitPresentation:present,recommendationFitDisplayScore:display}=await import('../../src/features/match/config/recommendationFitDisplay.mjs');
  const {calculateRecommendationFit}=await import('../../src/features/match/engine/recommendationFitEngine.mjs');
  const {recommendationFitHighlighted}=await import('../../src/features/match/config/recommendationFitHighlight.mjs');
  const baselineSource=execFileSync('git',['show','HEAD:src/features/match/engine/recommendationFitEngine.mjs'],{encoding:'utf8'})
    .replace('"./tasteVectorEngine.mjs"',JSON.stringify(pathToFileURL(path.resolve('src/features/match/engine/tasteVectorEngine.mjs')).href));
  const {calculateRecommendationFit:baselineFit}=await import('data:text/javascript;base64,'+Buffer.from(baselineSource).toString('base64'));
  const {applyRecommendationTaste}=await import('../../src/features/match/engine/recommendationTasteEngine.mjs');
  const seed=require('../../src/features/match/data/questionSeed.v0.4.json');
  // Badge policy changed explicitly; shared person scoring and eligibility stay unchanged.
  for(const file of ['src/features/match/engine/compatibilityEngine.mjs','src/features/match/config/catalogAgePolicy.mjs','src/features/match/config/recommendationPolicy.mjs','src/features/match/server/webtoonCatalogStore.ts','src/features/match/data/questionSeed.v0.4.json']) {
    assert.equal(fs.readFileSync(file,'utf8'),execFileSync('git',['show',`HEAD:${file}`],{encoding:'utf8'}));
  }
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    let raw=.255,legacy=false,stale=false,missing=false;
    const info={canonicalWebtoonId:'display-check',title:'표시 점수 검증',mainGenreLabel:'무협',mainGenre:'murim',platform:'검증',coverUrl:null,officialUrl:null,introduction:'소개',creators:[],contentLabels:[],appreciationPoints:[],artStyles:[],statusLabel:null,ageRating:null,fit:null,fitStatus:'pending'};
    await context.route('**/api/v1/**',route=>{
      const p=new URL(route.request().url()).pathname;
      if(!['GET','HEAD'].includes(route.request().method()))return route.fulfill({status:202,json:{ok:true}});
      if(p.endsWith('/display-check/fit'))return route.fulfill({json:{fitStatus:missing?'insufficient_data':'ready',fit:missing?null:{...(legacy?{percent:65}:present(raw)||{rawScore:raw,percent:0}),...(stale?{displayScore:99,displayScoreVersion:'old'}:{}),highlighted:false,reasons:[]}}});
      return route.fulfill({json:p.endsWith('/display-check')?info:{active:false}});
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    for(const [score,expected] of [[0,0],[.25,50],[.4,63],[.5,71],[.6,77],[.65,81],[.7,84],[.8,89],[1,100],[.255,50]]){
      raw=score;await page.goto(base+'/match/work/display-check');
      const meter=page.getByRole('meter',{name:'핏점수',exact:true});await meter.waitFor();
      assert.equal(await meter.getAttribute('aria-valuenow'),String(expected));
      assert.equal(await meter.getAttribute('aria-valuetext'),`${expected}점 / 100점`);
      assert.equal(await page.locator('.wm-work-fit strong').textContent(),`${expected}점`);
      assert.equal(await meter.locator('span').evaluate(el=>el.style.width),`${expected}%`);
    }
    raw=.65;stale=true;await page.reload();await page.getByRole('meter').waitFor();
    assert.equal(await page.getByRole('meter').getAttribute('aria-valuenow'),'81','old display fields are ignored; raw data is corrected once');
    stale=false;
    raw=1;
    for(const width of [320,390,540]){
      await page.setViewportSize({width,height:844});await page.reload();await page.getByRole('meter').waitFor();
      assert.equal(await page.locator('.wm-work-fit strong').textContent(),'100점');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'100-point label fits narrow screens');
    }
    for(const kind of ['legacy','missing','invalid']){
      legacy=kind==='legacy';missing=kind==='missing';raw=kind==='invalid'?1.01:.65;
      await page.reload();await page.getByText('비교할 취향 정보가 부족해 핏점수를 표시하지 않아요.',{exact:true}).waitFor();
      assert.equal(await page.getByRole('meter').count(),0,kind+' is not fabricated into a score');
    }
    assert.deepEqual(errors,[]);await context.close();

    if(process.env.WEBTOON_MATCH_DATABASE_URL){
      const sql=postgres(process.env.WEBTOON_MATCH_DATABASE_URL,{ssl:'require',prepare:false,max:1,onnotice:()=>{}});
      let snapshot,recommendations,works,policyCounts,excludedWork;
      try { await sql.begin('read only',async tx=>{
        [snapshot]=await tx`select s.snapshot_data,p.profile_id,p.anonymous_id from public.match_profiles p
          join public.match_taste_snapshots anchor on anchor.profile_id=p.profile_id
          join lateral(select snapshot_data from public.match_taste_snapshots where profile_id=p.profile_id order by completed_at desc,snapshot_id desc limit 1)s on true
          where anchor.public_profile_id='xys7o3_7JlgZl91b'`;
        assert.ok(snapshot);
        recommendations=await tx`select w.canonical_webtoon_id,w.title,w.raw_data->'recommendation' as recommendation from public.match_profile_recommendations r join public.webtoons w using(canonical_webtoon_id)
          where r.profile_id=${snapshot.profile_id} and w.catalog_status='active' and public.webtoon_is_public_safe(w.raw_data) order by r.sort_order`;
        works=await tx`select canonical_webtoon_id,title,recommendation from (
          select canonical_webtoon_id,title,raw_data->'recommendation' as recommendation,row_number() over(partition by main_genre order by canonical_webtoon_id) as genre_row
          from public.webtoons where catalog_status='active' and public.webtoon_is_public_safe(raw_data)
          ) candidates order by genre_row,canonical_webtoon_id limit 60`;
        policyCounts=await tx`select catalog_status,public.webtoon_is_public_safe(raw_data) as public_safe,count(*)::int as count from public.webtoons group by 1,2 order by 1,2`;
        [excludedWork]=await tx`select canonical_webtoon_id from public.webtoons where catalog_status='active' and not public.webtoon_is_public_safe(raw_data) order by canonical_webtoon_id limit 1`;
      }); } finally {await sql.end();}
      const taste=applyRecommendationTaste(snapshot.snapshot_data,recommendations.map(r=>r.recommendation).filter(Boolean),seed).tasteVector;
      const scores=works.map(w=>({id:w.canonical_webtoon_id,title:w.title,fit:calculateRecommendationFit(taste,w.recommendation,seed)}));
      const baseline=works.map(w=>({id:w.canonical_webtoon_id,title:w.title,fit:baselineFit(taste,w.recommendation,seed)}));
      assert.deepEqual(scores.map(w=>[w.id,w.fit.score,w.fit.comparableAxes]),baseline.map(w=>[w.id,w.fit.score,w.fit.comparableAxes]),'raw calculation is identical to the deployed engine');
      const before=baseline.filter(w=>w.fit.comparableAxes.length>=2);
      const after=scores.filter(w=>w.fit.comparableAxes.length>=2).map(w=>({...w,presentation:present(w.fit.score)}));
      assert.ok(after.every(w=>w.presentation));
      const order=rows=>rows.slice().sort((a,b)=>b.fit.score-a.fit.score||a.id.localeCompare(b.id)).map(w=>w.id);
      assert.deepEqual(order(before),order(after),'diagnostic raw-score order is unchanged');
      assert.ok(after.every(w=>w.fit.highlighted===recommendationFitHighlighted(w.fit.score,w.fit.comparableAxes.length)));
      const live=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
      await live.addCookies([{name:'wm_aid',value:snapshot.anonymous_id,url:base}]);
      await live.route('**/api/v1/**',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.fulfill({status:202,json:{ok:true}}));
      const headers={'x-match-anonymous-id':snapshot.anonymous_id};
      assert.ok(excludedWork);
      for(const suffix of ['', '/fit'])assert.equal((await live.request.get(base+'/api/v1/webtoons/'+excludedWork.canonical_webtoon_id+suffix,{headers})).status(),404,'adult-excluded works stay unavailable');
      const savedBefore=await (await live.request.get(base+'/api/v1/results/xys7o3_7JlgZl91b/recommendations',{headers})).json();
      const samples=after.slice().sort((a,b)=>Math.abs(a.fit.score-.65)-Math.abs(b.fit.score-.65)).slice(0,6);
      const registered=recommendations.map(w=>({id:w.canonical_webtoon_id,title:w.title,fit:calculateRecommendationFit(taste,w.recommendation,seed)})).filter(w=>w.fit.comparableAxes.length>=2).map(w=>({...w,presentation:present(w.fit.score)}));
      for(const sample of [...samples,...registered]){
        const url=base+'/api/v1/webtoons/'+sample.id;
        const a=await live.request.get(url,{headers}),b=await live.request.get(url+'/fit',{headers});
        assert.equal(a.status(),200);assert.equal(b.status(),200);
        assert.match(b.headers()['cache-control'],/private, no-store/);
        const detail=await a.json(),fit=await b.json();assert.deepEqual(detail.fit,fit.fit);
        assert.equal(fit.fit.rawScore,sample.fit.score);assert.equal(fit.fit.displayScore,display(sample.fit.score));
        assert.equal(fit.fit.percent,Math.round(sample.fit.score*100));assert.equal(fit.fit.highlighted,sample.fit.highlighted);
      }
      const savedAfter=await (await live.request.get(base+'/api/v1/results/xys7o3_7JlgZl91b/recommendations',{headers})).json();
      assert.deepEqual(savedBefore,savedAfter,'saved works, ordering and exclusions are unchanged');
      const real=await live.newPage();
      for(const from of ['/match/search','/match/result/xys7o3_7JlgZl91b','/match/c/mKOdmiLcE0JU/match/5ujFmEcO6RE050ST']){
        await real.goto(base+'/match/work/'+samples[0].id+'?returnTo='+encodeURIComponent(from));
        const meter=real.getByRole('meter',{name:'핏점수',exact:true});await meter.waitFor();
        assert.equal(await meter.getAttribute('aria-valuenow'),String(samples[0].presentation.displayScore),'entry routes share the same viewer display');
      }
      const publicSample=w=>({id:w.id,title:w.title,rawScore:w.fit.score,rawPoints:w.fit.score*100,before:Math.round(w.fit.score*100),after:w.presentation.displayScore,highlighted:w.fit.highlighted});
      const report={source:'read-only existing viewer, saved recommendations and 60 active public-safe catalog rows; diagnostic sorting, not a new recommendation feature',policy:'sqrt_v1',highlightPolicy:'displayed score >= 75 and at least two comparable axes',comparable:before.length,excludedForInsufficientAxes:scores.length-before.length,rawOrderUnchanged:true,highlightMatchesDisplayed75:true,savedRecommendationsUnchanged:true,adultExclusionVerified:true,policyCounts,registeredRecommendations:registered.map(publicSample),samples:samples.map(publicSample)};
      // Artifacts contain public work titles and scalar scores only, never vectors or viewer identity.
      fs.writeFileSync(path.join(output,'fit_display_audit.json'),JSON.stringify(report,null,2));
      await real.addStyleTag({content:'nextjs-portal{display:none!important}'});
      await real.screenshot({path:path.join(output,'work_fit_display_live.png')});
      await live.close();console.log(JSON.stringify(report));
    }
    console.log(JSON.stringify({ok:true,output,checks:['all expected values in DOM/text/meter/bar','unknown and legacy data stay unknown','stale display ignored','no double transform','raw engine matches deployed results; person scoring and access policy unchanged','highlight follows displayed 75']}));
  }finally{await browser.close();}
})().catch(error=>{console.error({name:error.name,message:error.message});process.exitCode=1;});
