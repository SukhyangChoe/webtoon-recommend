/* Real rendering + mocked interaction tests. No production database writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const base = process.env.MATCH_TEST_BASE_URL ?? "http://127.0.0.1:3000";
  const shots = fs.mkdtempSync(path.join(os.tmpdir(), "webtoonfit-pair-"));
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let allowLikes = true;
    const work = (index) => ({ canonicalWebtoonId: `work-${index}`, title: index === 0 ? "언니, 이번 생엔 내가 왕비야" : index === 2 ? "스위트홈" : `아주 긴 제목도 잘리지 않는 추천 작품 ${index}`, officialUrl: index === 3 ? null : "https://example.com/", mainGenre: "romance_ropan", mainGenreLabel: "로맨스·로판", coverUrl: index === 0 ? "/match/personas/original-v1/ropan.png" : index === 1 ? "https://example.com/broken-cover.png" : null, recommendationComment: index === 1 ? "추천 이유가 길어도 잘리지 않고 전부 보이도록 ".repeat(4).slice(0, 80) : "작화도 좋고 이야기에 오래 몰입하게 돼요.", likeCount: index, likedByViewer: false, canViewerLike: allowLikes, recommenderPublicProfileId: "ui-other", tasteFitHighlighted: index === 0 });
    let failLike = false;
    let failResult = false;
    let score = 83;
    let likes = 0;
    let workCount = 10;
    await page.route("https://example.com/broken-cover.png", (route) => route.fulfill({ status: 404, body: "not found" }));
    await page.route("**/api/v1/**", async (route) => {
      const url = new URL(route.request().url());
      const reply = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      if (url.pathname.endsWith("/results/ui-pair")) {
        if (failResult) return reply({ error: "NOT_FOUND" }, 404);
        return reply({ ownerNickname: "향향", challengerNickname: "닉네임이아주긴테스트친구입니다", ownerGenreKey: "ropan", challengerGenreKey: "romance", ownerTopGenres: [{ genreKey: "ropan", displayLabel: "로판", stars: 8 }, { genreKey: "fantasy", displayLabel: "판타지", stars: 5 }, { genreKey: "comedy", displayLabel: "코미디", stars: 1 }], challengerTopGenres: [{ genreKey: "romance", displayLabel: "로맨스", stars: 8 }, { genreKey: "drama_daily", displayLabel: "드라마·일상", stars: 4 }], score, band: { label: "취향이 잘 맞음", subcopy: "" }, sharedGenres: score > 0 ? ["로맨스", "드라마·일상"] : [], differentGenres: ["판타지", "로맨스"], ownerRecommendedGenres: ["로판"], challengerRecommendedGenres: ["로맨스"], ownerRecommendations: Array.from({ length: workCount }, (_, i) => work(i)), challengerRecommendations: [], sharedTasteLabels: ["동료·가족", "세계관", "전략"], recommendationTasteApplied: true, trustSentence: "겹치는 장르부터 추천받아 보세요.", rank: 2, entryCount: 30 });
      }
      if (url.pathname.endsWith("/like")) {
        likes++;
        const liked = Boolean(route.request().postDataJSON().liked);
        return failLike ? reply({ error: "SAVE_FAILED" }, 500) : reply({ likedByViewer: liked, likeCount: liked ? 1 : 0 });
      }
      return reply({ ok: true });
    });
    await page.goto(`${base}/match/c/ui-preview/match/ui-pair?from=ranking`);
    await page.getByRole("heading", { name: "상세 궁합", exact: true }).waitFor();
    assert.equal(await page.getByRole("tabpanel", { name: "궁합 요약" }).count(), 1);
    assert.equal(await page.locator(".wm-pair-comic .wm-persona-avatar img").count(), 2);
    assert.equal(await page.locator(".wm-pair-work-card").count(), 10);
    assert.equal(await page.locator(".wm-pair-work-slide").count(), 10);
    assert.equal(await page.locator(".wm-pair-work-card.is-taste-fit").count(), 1);
    await page.locator(".wm-pair-work-card").nth(1).getByRole("img", { name: "작품 커버 미등록" }).waitFor();
    await page.locator(".wm-pair-work-artwork img").evaluateAll((items) => Promise.all(items.map((img) => img.decode())));
    assert.ok(await page.locator(".wm-pair-work-card").first().locator(".wm-work-cover").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return el.tagName === "IMG" && getComputedStyle(el).objectFit === "cover" && Math.abs(rect.width / rect.height - 2 / 3) < .01;
    }), "covers fill a uniform slim 2:3 frame without stretching");
    assert.equal(await page.getByRole("button", { name: /전체 10개 보기/ }).count(), 0);
    assert.equal(await page.locator(".wm-pair-carousel-controls button").count(), 0);
    const workTrack=page.locator('.wm-pair-work-track').first();
    const workBar=page.locator('.wm-pair-scrollbar').first();
    await workBar.waitFor({state:'visible'});
    await workTrack.focus();await page.keyboard.press('Home');
    for (let index = 0; index < 9; index++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction((first) => document.querySelector(".wm-pair-carousel-controls > span")?.textContent === `${first} / 10`, index + 2);
    }
    await page.waitForFunction(()=>{
      const bar=document.querySelector('.wm-pair-scrollbar'),track=document.querySelector('.wm-pair-work-track');
      const frame=bar.getBoundingClientRect(),thumb=bar.firstElementChild.getBoundingClientRect();
      return Math.abs(track.scrollLeft+track.clientWidth-track.scrollWidth)<3&&Math.abs(thumb.left-frame.left-track.scrollLeft/track.scrollWidth*frame.width)<1&&Math.abs(thumb.width/frame.width-track.clientWidth/track.scrollWidth)<.01;
    });
    assert.equal(await workBar.evaluate(el=>getComputedStyle(el).opacity),'1','scrolling strengthens the indicator');
    await page.waitForFunction(()=>document.querySelector('.wm-pair-work-group')?.dataset.scrolling==='false');
    assert.equal(await workBar.evaluate(el=>getComputedStyle(el).opacity),'0.4','the indicator remains faintly visible at rest');
    assert.equal(await workBar.locator('span').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(131, 217, 232)');
    await page.keyboard.press('Home');
    await page.waitForFunction(() => document.querySelector(".wm-pair-carousel-controls > span")?.textContent === "1 / 10");
    await workTrack.scrollIntoViewIfNeeded();
    const touch=await context.newCDPSession(page);
    await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true});
    const swipeBox=await workTrack.boundingBox(),swipeY=swipeBox.y+70;
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:swipeBox.x+swipeBox.width-20,y:swipeY}]});
    for(let step=1;step<=10;step++){
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:swipeBox.x+swipeBox.width-20-(swipeBox.width-40)*step/10,y:swipeY}]});
      await page.waitForTimeout(20);
    }
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(()=>document.querySelector('.wm-pair-work-track').scrollLeft>20);
    await touch.detach();
    await workTrack.focus();await page.keyboard.press('Home');
    await page.waitForFunction(()=>document.querySelector('.wm-pair-work-track').scrollLeft<=3);
    const like = page.getByRole("button", { name: "언니, 이번 생엔 내가 왕비야 추천 좋아요", exact: true });
    await like.click();
    await page.getByRole("button", { name: "언니, 이번 생엔 내가 왕비야 추천 좋아요 취소", exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector(".wm-pair-work-like")?.disabled);
    failLike = true;
    await page.getByRole("button", { name: "언니, 이번 생엔 내가 왕비야 추천 좋아요 취소", exact: true }).click();
    await page.locator(".wm-pair-like-error[role='alert']").waitFor();
    assert.equal(await page.getByRole("button", { name: "언니, 이번 생엔 내가 왕비야 추천 좋아요 취소", exact: true }).getAttribute("aria-pressed"), "true", "failed like update rolls back");
    assert.equal(likes, 2);
    assert.equal(await page.locator(".wm-pair-work-card.is-taste-fit").count(), 1, "liking or scrolling never changes server-selected highlights");
    assert.equal(await page.locator('.wm-pair-work-artwork .wm-pair-work-fit').count(), 0, "fit labels no longer cover the artwork");
    assert.ok(await page.locator('.wm-pair-work-like').first().evaluate(el => {
      const style = getComputedStyle(el);
      return !el.textContent.includes('좋아요') && el.getAttribute('aria-label').includes('추천 좋아요') && parseFloat(style.borderTopWidth) >= 1 && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && el.getBoundingClientRect().height >= 44;
    }), "likes show only a heart and count while retaining their accessible label and touch target");
    assert.match(page.url(), /\/match\/ui-pair\?from=ranking$/, "like button taps never open work details");
    failLike = false;
    const unlike = page.getByRole('button', { name: '언니, 이번 생엔 내가 왕비야 추천 좋아요 취소', exact: true });
    await unlike.click();
    const unliked = page.getByRole('button', { name: '언니, 이번 생엔 내가 왕비야 추천 좋아요', exact: true });
    await unliked.waitFor();
    await page.waitForFunction(() => !document.querySelector('.wm-pair-work-like')?.disabled);
    await unliked.hover();
    assert.equal(await unliked.getAttribute('aria-pressed'), 'false');
    assert.equal(await unliked.locator('span').first().textContent(), '♡');
    assert.equal(await unliked.locator('b').textContent(), '0');
    assert.ok(await unliked.evaluate(el => !el.classList.contains('is-liked') && !['rgb(255, 229, 239)', 'rgba(255, 229, 239, 1)'].includes(getComputedStyle(el).backgroundColor)), 'unlike clears the pink selected background even while hovered');
    await unliked.locator('b').click();
    await page.getByRole('button', { name: '언니, 이번 생엔 내가 왕비야 추천 좋아요 취소', exact: true }).waitFor();
    assert.equal(likes, 4, 'like and unlike both persist, including tapping the count inside the button');
    assert.match(page.url(), /\/match\/ui-pair\?from=ranking$/);
    allowLikes = false;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.wm-pair-work-like-count').first().waitFor();
    const readonlyUrl = page.url();
    await page.locator('.wm-pair-work-like-count > span').first().click();
    await page.locator('.wm-pair-work-meta > small').first().click();
    assert.equal(page.url(), readonlyUrl, "read-only likes and metadata do not pass clicks to the cover link");
    assert.equal(likes, 4, "read-only counts do not change like permissions");
    allowLikes = true;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: '궁합 요약', exact: true }).waitFor();
    await page.getByRole("tab", { name: "비교 상세" }).click();
    assert.equal(await page.getByRole("tabpanel", { name: "궁합 요약" }).count(), 0);
    await page.getByRole("heading", { name: "각자의 취향 TOP 3" }).waitFor();
    assert.equal(await page.locator(".wm-pair-profiles ol li").count(), 5);
    assert.equal(await page.getByRole("heading", { name: "서로에게 물어볼 장르" }).count(), 0);
    assert.equal(await page.getByRole("heading", { name: "이 사람 추천, 믿어도 될까?" }).count(), 1);
    await page.getByRole("tab", { name: "비교 상세" }).focus();
    await page.keyboard.press("ArrowLeft");
    assert.equal(await page.getByRole("tab", { name: "궁합 요약" }).getAttribute("aria-selected"), "true");
    const longTitle = page.locator('.wm-scrolling-title').first();
    const shortTitle = page.locator('.wm-scrolling-title').nth(2);
    await longTitle.scrollIntoViewIfNeeded();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.mouse.move(0, 0);
    await page.waitForFunction(() => {
      const heading = document.querySelector('.wm-scrolling-title');
      const text = heading?.firstElementChild;
      return heading?.dataset.overflow === 'true' && heading?.dataset.visible === 'true' && text?.getAnimations().length === 1;
    });
    assert.equal(await shortTitle.evaluate(el => getComputedStyle(el.firstElementChild).animationName), 'none', 'short titles stay stationary');
    await page.waitForFunction(() => {
      const text = document.querySelector('.wm-scrolling-title > span');
      return text && new DOMMatrixReadOnly(getComputedStyle(text).transform).m41 < -2;
    });
    await page.locator('.wm-pair-work-title').first().hover();
    assert.equal(await longTitle.evaluate(el => getComputedStyle(el.firstElementChild).animationPlayState), 'paused', 'hover lets the reader pause the title');
    await page.mouse.move(0, 0);
    assert.equal(await page.locator('.wm-scrolling-title').last().evaluate(el => getComputedStyle(el.firstElementChild).animationPlayState), 'paused', 'offscreen cards do not animate');
    assert.ok(await longTitle.evaluate(el => {
      const text = el.firstElementChild;
      const animation = text.getAnimations()[0];
      animation.pause();
      animation.currentTime = Number(animation.effect.getTiming().duration) * .55;
      return Math.abs(text.getBoundingClientRect().right - el.getBoundingClientRect().right) < 2;
    }), 'the animation reaches the final characters without clipping them');
    assert.equal(await longTitle.textContent(), '언니, 이번 생엔 내가 왕비야', 'one complete accessible title, no duplicated marquee text');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await longTitle.evaluate(el => getComputedStyle(el.firstElementChild).animationName), 'none', 'reduced motion disables title movement');
    for (const width of [320, 390, 435]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForFunction(value=>innerWidth===value,width);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      for (const tabName of ["궁합 요약", "비교 상세"]) {
        await page.getByRole("tab", { name: tabName }).click();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no overflow ${width} ${tabName}`);
        assert.equal(await page.locator(".wm-pair-ask").count(), 0);
        assert.ok(await page.locator(".wm-pair-bubble-words").evaluate((el) => {
          const words = el.getBoundingClientRect();
          const bubble = el.parentElement.getBoundingClientRect();
          return words.left >= bubble.left + 5 && words.right <= bubble.right - 5 && words.top >= bubble.top && words.bottom <= bubble.bottom;
        }), `bubble text fits ${width}`);
        if (tabName === "궁합 요약") {
          assert.ok(await page.locator('.wm-pair-character .wm-persona-avatar').evaluateAll(items=>items.every(el=>{
            const crop=el.getBoundingClientRect(),image=el.querySelector('img').getBoundingClientRect();
            return crop.height/image.height>=.7&&crop.height/image.height<=.75&&Math.abs((image.left+image.right)/2-(crop.left+crop.right)/2)<1&&Math.abs(image.top-crop.top)<1;
          })), 'SD framing includes the head and upper body instead of magnifying only the face');
          assert.equal(await page.locator('.wm-pair-work-fit').first().textContent(),'✦취향에 잘 맞아요');
          assert.ok(await page.locator('.wm-pair-work-fit').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=14&&getComputedStyle(el).backgroundImage.includes('linear-gradient')),'fit caption is larger with a fluorescent marker highlight');
          assert.ok(await page.locator('.wm-pair-work-card.is-taste-fit .wm-pair-work-artwork').evaluateAll(items=>items.every(el=>getComputedStyle(el,'::after').borderTopColor==='rgb(232, 255, 56)'&&getComputedStyle(el,'::after').borderTopWidth==='3px')),'highlighted covers use the fluorescent yellow outline');
          const cards = await page.locator(".wm-pair-work-card").evaluateAll((items) => items.slice(0, 2).map((el) => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y, right: el.getBoundingClientRect().right, width: el.getBoundingClientRect().width })));
          const track = await page.locator(".wm-pair-work-track").first().boundingBox();
          assert.equal(cards.length, 2);
          assert.equal(cards[0].y, cards[1].y, `recommendation cards share a row at ${width}`);
          assert.ok(cards[0].x >= track.x && cards[0].right <= track.x + track.width, "first card is fully visible");
          const peekRatio = (track.x + track.width - 2 - cards[1].x) / cards[1].width;
          assert.ok(peekRatio > .63 && peekRatio < .67, `compact cards reveal 65% of the next card at ${width}: ${peekRatio}`);
          assert.ok(cards[0].width < 245, `compact card width stays below 245px at ${width}`);
          assert.ok(Math.abs(cards[0].width - cards[1].width) < 1, "balanced equal-width cards");
          assert.ok(await page.locator(".wm-pair-work-track").first().evaluate((el) => {
            el.scrollTop = 50;
            return el.scrollHeight <= el.clientHeight + 1 && el.scrollTop === 0 && getComputedStyle(el).overflowY === "hidden";
          }), "the recommendation rail has no vertical scrolling or clipped tall cards");
          assert.ok(await page.locator(".wm-pair-work-card").evaluateAll((items) => items.every((el) => {
            const cover = el.querySelector(".wm-work-cover").getBoundingClientRect();
            const artwork = el.querySelector(".wm-pair-work-artwork").getBoundingClientRect();
            const copy = el.querySelector(".wm-pair-work-copy").getBoundingClientRect();
            const title = el.querySelector(".wm-pair-work-title").getBoundingClientRect();
            const meta = el.querySelector(".wm-pair-work-meta").getBoundingClientRect();
            const comment = el.querySelector("blockquote").getBoundingClientRect();
            return Math.abs(cover.width / cover.height - 2 / 3) < .01 && Math.abs(cover.height - artwork.height) < 1 && Math.abs(cover.width - artwork.width) < 1 && copy.top >= artwork.top && Math.abs(copy.bottom - artwork.bottom) < 1 && title.top >= copy.top && Math.abs(title.left - copy.left - 11) < 1 && Math.abs(title.width - copy.width + 22) < 1 && meta.top >= title.bottom && comment.top >= artwork.bottom + 9;
          })), "full-bleed portrait cover, readable title/metadata overlay and separate quote");
          assert.ok(await page.locator('.wm-pair-work-artwork').evaluateAll(items => {
            const height = items[0].getBoundingClientRect().height;
            return items.every(el => Math.abs(el.getBoundingClientRect().height - height) < 1);
          }), "every work has the same cover height regardless of source image ratio");
          assert.ok(await page.locator(".wm-pair-work-copy").evaluateAll((items) => items.every((el) => getComputedStyle(el).backgroundImage.includes("linear-gradient"))), "every cover has a dark readability gradient");
          assert.ok(await page.locator(".wm-pair-work-card").evaluateAll((items) => items.every((el) => getComputedStyle(el).borderTopWidth === "0px")), "no nested outer card borders");
          assert.equal(await page.locator(".wm-pair-work-card a button").count(), 0, "likes are not nested inside navigation links");
          assert.ok(await page.locator(".wm-pair-work-meta").evaluateAll((items) => items.every((el) => {
            const genre = el.querySelector("small").getBoundingClientRect();
            const like = el.querySelector("button, .wm-pair-work-like-count").getBoundingClientRect();
            return genre.right <= like.left && Math.abs((genre.top + genre.height / 2) - (like.top + like.height / 2)) < 1;
          })), "genre and likes stay on a single row");
          assert.ok(await page.locator(".wm-pair-work-card h4").evaluateAll((items) => items.every((el) => {
            const style = getComputedStyle(el);
            return style.whiteSpace === 'nowrap' && style.overflowX === 'hidden' && Math.abs(el.clientHeight - parseFloat(style.lineHeight)) < 1;
          })), "all titles occupy exactly one clipped line at every mobile width");
          assert.ok(await page.locator(".wm-pair-work-card h4").evaluateAll((items) => items.every((el) => parseFloat(getComputedStyle(el).fontSize) >= 16)), "mobile titles are at least 16px");
          assert.ok(await page.locator(".wm-pair-work-card blockquote").evaluateAll((items) => items.every((el) => parseFloat(getComputedStyle(el).fontSize) >= 15)), "mobile comments are at least 15px");
          assert.ok(await page.locator('.wm-recommendation-card blockquote').evaluateAll(items=>items.every(el=>{
            const quote=el.querySelector('q').getBoundingClientRect(),cover=el.closest('article').querySelector('.wm-pair-work-artwork').getBoundingClientRect();
            const style=getComputedStyle(el);
            return style.paddingLeft==='11px'&&style.paddingRight==='11px'&&quote.left>=cover.left+10&&quote.right<=cover.right-10;
          })), 'recommendation reasons are inset from both cover edges and stay within their own card');
        }
      }
      const actions = await page.locator(".wm-action-bar a").evaluateAll((items) => items.map((el) => ({ y: el.getBoundingClientRect().y, height: el.getBoundingClientRect().height })));
      assert.equal(new Set(actions.map((action) => action.y)).size, 1);
      assert.ok(actions.every((action) => action.height >= 44));
    }
    for (const count of [5, 3, 2, 1, 0]) {
      workCount = count;
      await page.reload();
      await page.getByRole("tab", { name: "궁합 요약" }).waitFor();
      assert.equal(await page.locator(".wm-pair-work-card").count(), count);
      assert.equal(await page.locator(".wm-pair-work-slide").count(), count);
      if (count > 1) {
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await workTrack.focus();await page.keyboard.press('End');
        await page.waitForFunction(() => {
          const el = document.querySelector(".wm-pair-work-track");
          return Math.abs(el.scrollLeft + el.clientWidth - el.scrollWidth) < 3;
        });
        assert.equal(await page.locator(".wm-pair-carousel-controls button").count(), 0);
        assert.ok(await workBar.isVisible());
        const lastBox = await page.locator(".wm-pair-work-slide").last().boundingBox();
        const trackBox = await page.locator(".wm-pair-work-track").first().boundingBox();
        assert.ok(Math.abs(lastBox.x - trackBox.x - 2) < 3, "the last work snaps fully into view with no misleading next card");
        assert.equal(await page.locator(".wm-pair-work-slide").last().locator("article").count(), 1);
        await page.keyboard.press('ArrowLeft');
        await page.waitForFunction((total) => document.querySelector(".wm-pair-carousel-controls > span")?.textContent === `${total - 1} / ${total}`, count);
        await page.emulateMedia({ reducedMotion: "reduce" });
      } else if (count) {
        assert.equal(await page.locator(".wm-pair-carousel-controls button,.wm-pair-scrollbar").count(), 0, 'one work has no arrows or misleading scrollbar');
        assert.equal(await workTrack.getAttribute('tabindex'),null);
        assert.ok(await page.locator(".wm-pair-work-track").first().evaluate((el) => Math.abs(el.firstElementChild.getBoundingClientRect().width - (el.clientWidth - 14) / 1.65) < 2), "a single work retains the same compact width without enlargement");
      } else assert.equal(await page.locator(".wm-pair-carousel-controls button,.wm-pair-scrollbar").count(), 0, "empty recommendation groups have no carousel");
    }
    await page.setViewportSize({ width: 320, height: 844 });
    for (const bandScore of [95, 85, 75, 60, 45, 0]) {
      score = bandScore;
      await page.reload();
      await page.locator(".wm-pair-bubble").waitFor();
      assert.equal(await page.locator(".wm-pair-bubble-tail").count(), 2);
      assert.ok(await page.evaluate(async () => (await document.fonts.load('700 16px "WebtoonFit Nanum Gothic"', document.querySelector('.wm-pair-bubble').textContent)).length > 0), "real locally hosted Nanum Gothic loads");
      assert.ok(await page.locator(".wm-pair-bubble-words").evaluate((el) => {
        const words = el.getBoundingClientRect();
        const bubble = el.parentElement.getBoundingClientRect();
        return words.left >= bubble.left + 5 && words.right <= bubble.right - 5 && words.top >= bubble.top && words.bottom <= bubble.bottom;
      }), `all six badge types fit at 320px, score ${bandScore}`);
    }
    score = 0;
    await page.reload();
    await page.getByText("서로 다른 장르를 좋아해요", { exact: true }).waitFor();
    assert.equal(await page.locator(".wm-pair-score").evaluate((el) => el.style.getPropertyValue("--pair-score-angle")), "0deg");
    failResult = true;
    await page.reload();
    await page.getByRole("heading", { name: "이 궁합 결과를 찾지 못했어요." }).waitFor();
    assert.deepEqual(errors, []);
    await context.close();

    // User-facing artifacts use the existing real local result, not the test fixtures above.
    const liveContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" });
    const live = await liveContext.newPage();
    await live.route("**/api/v1/analytics/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
    await live.goto(`${base}/match/c/mKOdmiLcE0JU/match/VIbseuqFQuk6RRDr?from=ranking`);
    await live.getByRole("tab", { name: "궁합 요약" }).waitFor();
    await live.locator(".wm-pair-comic img").evaluateAll((items) => Promise.all(items.map((img) => img.decode().catch(() => {}))));
    // Hide the development-only Next.js badge in screenshots, never in application code.
    await live.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await live.screenshot({ path: path.join(shots, "pair_summary.png") });
    async function captureRecommendations(filename) {
      // Element screenshots scroll snap containers while bringing the section into view.
      // A viewport clip captures the real state without moving its carousels.
      const groupsWithWorks = live.locator('.wm-pair-work-group').filter({ has: live.locator('.wm-pair-work-track') });
      const group = filename === "pair_recommendations.png" ? groupsWithWorks.last() : groupsWithWorks.first();
      const top = await group.evaluate((el) => el.getBoundingClientRect().top + scrollY);
      await live.evaluate((top) => window.scrollTo(0, top - 90), top);
      assert.ok(await group.evaluate(async (el) => {
        const rail = el.querySelector('.wm-pair-work-track').getBoundingClientRect();
        const visibleImages = [...el.querySelectorAll('.wm-pair-work-artwork img')].filter(img => {
          const rect = img.getBoundingClientRect();
          return rect.right > rail.left && rect.left < rail.right;
        });
        await Promise.all(visibleImages.map(img => img.decode()));
        return visibleImages.length > 0 && visibleImages.every(img => {
          const rect = img.getBoundingClientRect();
          return Math.abs(rect.width / rect.height - 2 / 3) < .01 && getComputedStyle(img).objectFit === 'cover';
        });
      }), "live covers share the slim 2:3 frame without image distortion");
      const clip = await group.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });
      const style = await live.addStyleTag({ content: ".wm-action-bar { display: none !important; }" });
      try {
        const screenshot = await live.screenshot({ path: path.join(shots, filename), clip });
        assert.ok(Math.abs(screenshot.readUInt32BE(20) - clip.height) < 2, "the screenshot contains the complete recommendation group");
      } finally {
        await style.evaluate((el) => el.remove());
      }
    }
    await captureRecommendations("pair_card_peek.png");
    const liveTracks=live.locator('.wm-pair-work-track');
    await liveTracks.last().focus();await live.keyboard.press('End');
    await live.waitForFunction(() => [...document.querySelectorAll(".wm-pair-carousel-controls > span")].at(-1)?.textContent === "5 / 5");
    await live.waitForFunction(() => {
      const rail = [...document.querySelectorAll(".wm-pair-work-track")].at(-1);
      const first = rail.firstElementChild;
      const last = rail.lastElementChild;
      return Math.abs(rail.scrollLeft - (last.offsetLeft - first.offsetLeft)) < 3;
    });
    await captureRecommendations("pair_recommendations.png");
    assert.equal(await live.locator(".wm-pair-carousel-controls > span").last().textContent(), "5 / 5", "capturing the last card preserves the live scroll state");
    assert.equal(await live.locator('.wm-pair-carousel-controls button').count(),0);
    await live.waitForFunction(()=>document.querySelector('.wm-pair-work-group:last-child')?.dataset.scrolling!=='true');
    assert.ok(await live.locator('.wm-pair-scrollbar').first().evaluate(el=>parseFloat(el.firstElementChild.style.left)<1),'scrolling the second group leaves the first indicator unchanged');
    await live.getByRole("tab", { name: "비교 상세" }).click();
    await live.evaluate(() => window.scrollTo(0, document.querySelector(".wm-pair-tabs").getBoundingClientRect().top + scrollY - 12));
    await live.screenshot({ path: path.join(shots, "pair_comparison.png") });
    await liveContext.close();
    console.log(JSON.stringify({ ok: true, screenshots: shots, checks: ["real result screenshots", "single-line titles, overflow-only panning reaches final characters, stationary short titles, reduced-motion fallback", "two-tail shared bubble, all six badges, local Nanum Gothic", "summary/comparison tabs and keyboard", "all ten recommendations, one at a time", "equal-height slim 2:3 covers with 65% next-card preview", "full-bleed portrait cover with title/metadata gradient overlay and separate quote", "real cover loading and failed-image fallback", "no vertical scrolling, full 80-character comments", "no arrows; touch swipe and keyboard navigation", "shared accurate scrollbar: active 1, idle .4, same cyan; hidden for zero/one item; independent groups", "removed ask genres", "unchanged fit selection with fluorescent outline and caption", "heart/count-only like buttons with accessible labels and 44px touch targets", "larger mobile titles and comments", "like persistence/rollback", "320/390/435px without overflow", "zero score and empty shared genre", "error state", "existing links preserved"] }, null, 2));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
