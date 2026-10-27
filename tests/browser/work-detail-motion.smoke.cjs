/* Local browser regression runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const base=process.env.MATCH_TEST_BASE_URL??'http://127.0.0.1:3000';
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'webtoon-detail-motion-'));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  let stopRecording=()=>{};
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
    const app=await context.newPage(), demo=await context.newPage();
    const errors=[];app.on('pageerror',error=>errors.push(error.message));
    await app.route('**/api/v1/match-events',route=>route.fulfill({status:202,contentType:'application/json',body:'{"accepted":true}'}));
    const response=await app.request.get(`${base}/api/v1/challenges/mKOdmiLcE0JU/results/VIbseuqFQuk6RRDr`);
    assert.equal(response.status(),200);
    const pair=await response.json();
    await app.goto(`${base}/match/work/wt_romance_ropan_016?profile=${pair.challengerRecommendations[0].fitTargetPublicProfileId}`);
    await app.getByRole('heading',{level:1}).waitFor();
    await app.locator('.wm-work-hero img').evaluate(img=>img.decode());
    await app.addStyleTag({content:'nextjs-portal { display:none !important; }'});
    await demo.goto(pathToFileURL(process.env.WORK_DETAIL_DEMO??'/Users/choesukhyang/Downloads/webtoon_detail_demo_v0_2_7.html').href);
    await demo.waitForFunction(()=>window.__DEMO_QA__);
    const targets=[
      {page:demo,grip:'#sheetHandle',sheet:'#sheet',stage:()=>demo.evaluate(()=>window.__DEMO_QA__.snapshot().stage)},
      {page:app,grip:'.wm-work-grab',sheet:'.wm-work-sheet',stage:()=>app.locator('.wm-work-page').getAttribute('data-stage')},
    ];
    const traces=[];
    for(const target of targets){
      const {page}=target, trace=[];
      const drag=async(dx,dy,release=true)=>{
        const box=await page.locator(target.grip).boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
        await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:10});
        if(release){await page.mouse.up();await page.waitForTimeout(320);trace.push(await target.stage());}
      };
      await drag(0,0);await drag(70,-10);await drag(0,-63);await drag(0,-65);
      assert.equal(await target.stage(),'reasons');
      const openHeight=await page.locator(target.sheet).evaluate(el=>el.getBoundingClientRect().height);
      await drag(0,30,false);
      assert.ok(Math.abs(await page.locator(target.sheet).evaluate(el=>el.getBoundingClientRect().height)-openHeight+30)<2);
      await page.locator(target.grip).dispatchEvent('pointercancel',{pointerId:1});
      await page.mouse.up();await page.waitForTimeout(320);trace.push(await target.stage());
      await drag(0,-80); // Upward drag while expanded does not reveal info.
      await page.locator(target===targets[0]?'#openDetails':'#wm-work-info-tab').click();
      await page.waitForTimeout(340);
      trace.push((await target.stage())==='info'?'details':await target.stage());
      await drag(0,65);
      traces.push(trace);
    }
    assert.deepEqual(traces[0],['collapsed','collapsed','collapsed','reasons','reasons','reasons','details','collapsed']);
    assert.deepEqual(traces[1],traces[0],'original demo and implementation follow the same gesture sequence');
    // With animation enabled, the height must actually interpolate, not jump.
    const start=await app.locator('.wm-work-sheet').evaluate(el=>el.getBoundingClientRect().height);
    await app.locator('.wm-work-open').click();
    await app.waitForTimeout(65);
    const during=await app.locator('.wm-work-sheet').evaluate(el=>el.getBoundingClientRect().height);
    await app.waitForTimeout(280);
    const end=await app.locator('.wm-work-sheet').evaluate(el=>el.getBoundingClientRect().height);
    assert.ok(during>start&&during<end,`height interpolates (${start}, ${during}, ${end})`);
    await app.keyboard.press('Escape');await app.waitForTimeout(330);
    // Resize and lost capture cancel a gesture instead of leaving a ghost layer.
    let box=await app.locator('.wm-work-grab').boundingBox();
    await app.mouse.move(box.x+64,box.y+22);await app.mouse.down();await app.mouse.move(box.x+64,box.y-12);
    await app.setViewportSize({width:435,height:844});await app.mouse.up();await app.waitForTimeout(350);
    assert.equal(await app.locator('.wm-work-page').getAttribute('data-stage'),'collapsed');
    assert.equal(await app.locator('.wm-work-page[data-morph]').count(),0);
    await app.setViewportSize({width:390,height:844});await app.waitForTimeout(350);
    // Record real DOM frames, without altering content or inserting a fake cursor.
    let recorder, recordingDone, session, frameTimer, lastFrame, stderr='';
    const ffmpeg=process.env.WORK_DETAIL_FFMPEG;
    if(ffmpeg){
      recorder=spawn(ffmpeg,['-hide_banner','-loglevel','error','-f','image2pipe','-c:v','mjpeg','-r','25','-i','pipe:0','-an','-c:v','libvpx','-b:v','900k',path.join(output,'work_detail_demo_motion.webm')]);
      recorder.stderr.on('data',buffer=>stderr+=buffer.toString());
      recordingDone=new Promise((resolve,reject)=>{recorder.on('error',reject);recorder.on('close',code=>code===0?resolve():reject(new Error(stderr)));});
      void recordingDone.catch(()=>{});recorder.stdin.on('error',()=>{});
      session=await context.newCDPSession(app);
      session.on('Page.screencastFrame',event=>{lastFrame=Buffer.from(event.data,'base64');void session.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});});
      await session.send('Page.startScreencast',{format:'jpeg',quality:95,maxWidth:390,maxHeight:844,everyNthFrame:1});
      frameTimer=setInterval(()=>{if(lastFrame)recorder.stdin.write(lastFrame);},40);
      stopRecording=()=>{clearInterval(frameTimer);if(recorder.exitCode===null)recorder.kill();};
    }
    await app.screenshot({path:path.join(output,'work_detail_collapsed.png')});
    await app.waitForTimeout(650);
    box=await app.locator('.wm-work-grab').boundingBox();
    await app.mouse.move(box.x+64,box.y+22);await app.mouse.down();
    for(let step=1;step<=18;step++){await app.mouse.move(box.x+64,box.y+22-step*5);await app.waitForTimeout(24);}
    await app.mouse.up();await app.waitForTimeout(650);
    assert.equal(await app.locator('.wm-work-page').getAttribute('data-stage'),'reasons');
    await app.screenshot({path:path.join(output,'work_detail_expanded.png')});
    await app.locator('#wm-work-info-tab').click();await app.waitForTimeout(850);
    await app.screenshot({path:path.join(output,'work_detail_info.png')});
    await app.locator('.wm-work-cover-close').click({position:{x:20,y:20}});await app.waitForTimeout(750);
    assert.equal(await app.locator('.wm-work-page').getAttribute('data-stage'),'collapsed');
    if(recorder){clearInterval(frameTimer);await session.send('Page.stopScreencast');await session.detach();recorder.stdin.end();await recordingDone;assert.ok(fs.statSync(path.join(output,'work_detail_demo_motion.webm')).size>10000);}
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(JSON.stringify({ok:true,demoParity:traces,checks:['animated height interpolation','pointer cancel','resize cancellation','real-data walkthrough'],artifacts:output},null,2));
  } finally {stopRecording();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
