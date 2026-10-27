/* Run with Playwright available on NODE_PATH. All API calls are mocked: no real DB writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const { denseRankEntries } = await import("../../src/features/match/engine/rankingPolicy.mjs");
  const { selectRelationshipPage } = await import("../../src/features/match/engine/relationshipPolicy.mjs");
  const { createEmptyMatchDraft, MATCH_DRAFT_STORAGE_KEY } = await import("../../src/features/match/storage/draft.mjs");
  const shots = fs.mkdtempSync(path.join(os.tmpdir(), "webtoonfit-relationship-"));
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const draft = { ...createEmptyMatchDraft(), resultPublicId: "ui-owner", nickname: "향향" };
    await context.addInitScript(({ draft, key }) => localStorage.setItem(key, JSON.stringify(draft)), { draft, key: MATCH_DRAFT_STORAGE_KEY });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let canManage = true;
    let privateRanking = false;
    let hasActiveChallenge = true;
    let resultCanManage = true;
    let forceLowScores = false;
    let feedbackSaved = null;
    let resultStarCounts = [8, 5, 1];
    let resultExtraGenres = [];
    let recommendationCount = 3;
    let ownerTopGenreKeys = ["ropan", "romance", "drama_daily"];
    const firstNames = ["지우", "서연", "민지", "도윤", "유나", "하늘"];
    const genres = ["fantasy", "romance", "drama_daily", "action", "comedy", "thriller_horror"];
    const firstScores = [96, 93, 90, 87, 84, 81];
    const fixtures = Array.from({ length: 30 }, (_, index) => ({
      entryId: `entry-${index + 1}`, resultId: `pair-${index + 1}`, nickname: firstNames[index] ?? `참여자${index + 1}`,
      score: firstScores[index] ?? 79 - index, genreKey: genres[index % genres.length],
      sharedGenres: ["로판", "로맨스"], createdAt: new Date(2026, 0, index + 1).toISOString(),
      updatedAt: "2026-10-22", isViewer: false, isReciprocal: index === 29, hiddenByOwner: false,
    }));
    const requests = [];
    await page.route("**/api/v1/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const reply = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      if (url.pathname.endsWith("/ranking")) {
        requests.push(url.search);
        const ranked = denseRankEntries(forceLowScores ? fixtures.map(item => ({ ...item, score: Math.min(item.score, 79) })) : fixtures);
        const selected = selectRelationshipPage(ranked, { page: Number(url.searchParams.get("page") ?? 1), genreKey: url.searchParams.get("genre") ?? "all" });
        return reply({ challengeCode: "ui-preview", ownerNickname: "향향", ownerGenreKey: ownerTopGenreKeys[0], ownerTopGenreKeys, ownerPublicProfileId: canManage ? "ui-owner" : null, entryCount: ranked.length, status: "active", rankingVisibility: privateRanking ? "private" : "public_by_link", canManage, top20: ranked.slice(0, 20), viewerEntry: null, hiddenEntries: canManage ? fixtures.filter((item) => item.hiddenByOwner) : [], ...(privateRanking && !canManage ? { graphEntries: [], entries: [], pagination: { page: 1, pageSize: 6, totalItems: 0, totalPages: 1 } } : selected) });
      }
      if (url.pathname.includes("/entries/") && request.method() === "PATCH") {
        assert.ok(canManage, "only owner fixtures may mutate");
        const item = fixtures.find((entry) => entry.entryId === url.pathname.split("/").at(-1));
        assert.ok(item);
        item.hiddenByOwner = request.postDataJSON().hiddenByOwner;
        return reply({ ok: true });
      }
      if (url.pathname === "/api/v1/results/ui-owner") {
        if (request.method() === "PATCH") { feedbackSaved = request.postDataJSON().feedback; return reply({ ok: true }); }
        const topGenres = [{ genreKey: "ropan", displayLabel: "로판", stars: resultStarCounts[0] }, { genreKey: "fantasy", displayLabel: "판타지", stars: resultStarCounts[1] }, { genreKey: "comedy", displayLabel: "코미디", stars: resultStarCounts[2] }];
        return reply({ publicProfileId: "ui-owner", nickname: "향향", canManage: resultCanManage, displayGenres: [...topGenres, ...resultExtraGenres], topGenres, recommendationInfluence: { workCount: 3, recommendationPercent: 80, testPercent: 20 }, wellMatchedLabels: ["회귀", "반전", "주도권 역전"], lessMatchedLabels: ["감정 소모", "복잡한 설정"], wellMatchedDetails: [{ category: "설정", value: "회귀" }, { category: "전개", value: "반전" }, { category: "관계", value: "주도권 역전" }] });
      }
      if (url.pathname === "/api/v1/challenges") return reply(hasActiveChallenge ? { active: true, challengeCode: "ui-preview", ownerNickname: "향향" } : { active: false });
      if (url.pathname === "/api/v1/challenges/ui-pair") return reply({ ownerNickname: "닉네임이아주긴테스트친구입니다", status: "active" });
      if (url.pathname === "/api/v1/challenges/ui-pair/entries") return reply({ resultId: "pair-demo" });
      if (url.pathname.endsWith("/recommendations")) return reply({ items: Array.from({ length: recommendationCount }, (_, index) => ({ canonicalWebtoonId: `personal-work-${index}`, title: `내 추천작 ${index + 1}`, mainGenre: "romance_ropan", recommendationComment: "계속 읽게 되는 이야기예요.", likeCount: index })) });
      if (url.pathname.includes("active")) return reply({ challenge: null });
      if (url.pathname.includes("analytics")) return reply({ ok: true });
      return reply({ error: "TEST_ONLY_NOT_FOUND" }, 404);
    });

    const base = process.env.MATCH_TEST_BASE_URL ?? "http://127.0.0.1:3000";
    await page.goto(`${base}/match/c/ui-preview/ranking`);
    await page.getByRole("heading", { name: "향향님의 취향 관계도" }).waitFor();
    assert.equal(await page.locator(".match-screen-header a").count(), 0, "relationship header has no duplicate home arrow");
    assert.equal(await page.locator(".brand-bar__logo").getAttribute("href"), "/match", "brand logo keeps the home destination");
    const logo = await page.locator(".brand-bar__logo").boundingBox();
    assert.ok(Math.abs(logo.x + logo.width / 2 - 195) < 2, "relationship logo stays centered");
    assert.deepEqual(await page.locator(".wm-relationship-filters button").allTextContents(), ["전체", "1위로판", "2위로맨스", "3위드라마·일상"]);
    assert.equal(await page.getByRole("button", { name: "모든 장르 보기" }).count(), 0);
    assert.equal(await page.locator(".wm-relationship-node").count(), 6);
    assert.ok(await page.locator(".wm-participants-panel").evaluate((el) => !el.open));
    await page.screenshot({ path: path.join(shots, "01-map.png") });

    const seoyeon = page.locator(".wm-relationship-node").filter({ hasText: "서연" });
    await seoyeon.click();
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.getByRole("link", { name: /서연님과의 상세 궁합 보기/ }).getAttribute("href"), "/match/c/ui-preview/match/pair-2?from=ranking");
    assert.ok(await page.locator(".app-shell").evaluate((el) => el.inert));
    assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
    await page.screenshot({ path: path.join(shots, "02-summary.png") });
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    assert.ok(await seoyeon.evaluate((el) => el === document.activeElement));
    assert.ok(await page.locator(".app-shell").evaluate((el) => !el.inert));

    await seoyeon.click();
    const top = await page.locator(".wm-dialog-top").boundingBox();
    await page.mouse.move(top.x + top.width / 2, top.y + 8);
    await page.mouse.down(); await page.mouse.move(top.x + top.width / 2, top.y + 90); await page.mouse.up();
    await page.getByRole("dialog").waitFor({ state: "detached" });

    await page.locator(".wm-participants-panel > summary").click();
    assert.equal(await page.locator(".wm-participants-content .wm-ranking-person").count(), 6);
    for (let index = 0; index < 4; index++) {
      await page.getByRole("button", { name: "다음 참여자 페이지" }).click();
      await page.waitForFunction((expected) => document.querySelector(".wm-ranking-pagination > div > span")?.textContent === `${expected} / 5`, index + 2);
    }
    assert.ok((await page.locator(".wm-ranking-pagination").innerText()).includes("25–30 / 30명"));
    assert.ok((await page.locator(".wm-participants-content").innerText()).includes("참여자30"));
    for (let index = 0; index < 4; index++) {
      await page.getByRole("button", { name: "이전 참여자 페이지" }).click();
      await page.waitForFunction((expected) => document.querySelector(".wm-ranking-pagination > div > span")?.textContent === `${expected} / 5`, 4 - index);
    }
    await page.getByRole("button", { name: "서연님 관리 메뉴" }).click();
    await page.getByRole("menuitem", { name: "랭킹에서 숨기기" }).waitFor();
    await page.screenshot({ path: path.join(shots, "03-owner-menu.png") });
    await page.getByRole("menuitem", { name: "랭킹에서 숨기기" }).click();
    await page.getByRole("button", { name: "숨기기", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    assert.equal(await page.locator(".wm-relationship-node").filter({ hasText: "서연" }).count(), 0);
    assert.equal(await page.locator(".wm-participants-content .wm-ranking-person").filter({ hasText: "서연" }).count(), 0);
    assert.ok((await page.locator(".wm-relationship-heading").innerText()).includes("29명"));
    await page.locator(".wm-link-management > summary").click();
    await page.locator(".wm-hidden-participants > summary").click();
    await page.getByRole("button", { name: "복원", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".wm-relationship-heading")?.textContent.includes("30명"));
    assert.equal(await page.locator(".wm-relationship-node").filter({ hasText: "서연" }).count(), 1);

    await page.getByRole("button", { name: "2위 로맨스", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("main")?.getAttribute("aria-busy") === "false");
    assert.ok((await page.locator(".wm-participants-panel > summary").innerText()).includes("로맨스 참여자 5명"));
    assert.equal(await page.locator(".wm-relationship-node").count(), 1);
    assert.equal(await page.getByRole("button", { name: "2위 로맨스", exact: true }).getAttribute("aria-pressed"), "true");
    await page.getByRole("button", { name: "전체", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("main")?.getAttribute("aria-busy") === "false");

    forceLowScores = true;
    await page.reload();
    await page.locator('.wm-map-empty').waitFor();
    assert.equal(await page.locator('.wm-relationship-node').count(), 0);
    assert.ok(await page.locator('.wm-participants-panel').evaluate(el => el.open), 'empty graph starts with the participant list expanded');
    assert.equal(await page.locator('.wm-participants-content .wm-ranking-person').count(), 6);
    await page.locator('.wm-participants-panel > summary').click();
    assert.ok(await page.locator('.wm-participants-panel').evaluate(el => !el.open), 'the automatically opened list can still be collapsed');
    forceLowScores = false;
    ownerTopGenreKeys = ["thriller_horror", "drama_daily", "comedy"];
    await page.reload();
    await page.getByRole("button", { name: "1위 스릴러·공포" }).waitFor();
    for (const width of [320, 390, 435]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForFunction(value=>innerWidth===value,width);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no horizontal overflow at ${width}`);
      const tabs = await page.locator(".wm-relationship-filters button").evaluateAll((items) => items.map((el) => ({ y: el.getBoundingClientRect().y, height: el.getBoundingClientRect().height, overflow: el.scrollWidth > el.clientWidth })));
      assert.equal(new Set(tabs.map((tab) => tab.y)).size, 1, "all four filters stay on one row");
      assert.ok(tabs.every((tab) => tab.height >= 44 && !tab.overflow), "long genre labels fit without clipping");
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(shots, "06-top-genre-filters.png") });
    canManage = false;
    await page.reload();
    await page.locator(".wm-relationship-node").first().waitFor();
    await page.locator(".wm-participants-panel > summary").click();
    assert.equal(await page.locator(".wm-ranking-more").count(), 0);
    assert.equal(await page.locator(".wm-link-management").count(), 0);
    await page.locator(".wm-ranking-person-main").first().click();
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.getByRole("link", { name: /상세 궁합 보기/ }).count(), 0, "no new access to other participants' details");
    await page.keyboard.press("Escape");
    privateRanking = true;
    await page.reload();
    await page.getByRole("heading", { name: "비공개 관계도예요" }).waitFor();
    assert.equal(await page.locator(".wm-relationship-node").count(), 0);
    assert.equal(await page.locator(".wm-participants-panel").count(), 0);

    await page.goto(`${base}/match/result/ui-owner`);
    await page.locator(".wm-persona-image").waitFor();
    assert.ok((await page.locator(".wm-persona-image").getAttribute("src")).includes("original-v1"));
    assert.equal(await page.getByText("추천작 3개 반영", { exact: true }).count(), 1);
    assert.equal(await page.getByText(/장르와 별개로|이런 요소에서는|더 좋은 추천을 위해|최신 결과예요|취향 1위/).count(), 0);
    assert.equal(await page.getByRole("heading", { name: "끌리는 요소", exact: false }).count(), 1);
    assert.equal(await page.locator(".wm-taste-tiles strong").allTextContents().then((items) => items.join(",")), "회귀,반전,주도권 역전");
    await page.locator(".wm-personal-carousel").waitFor();
    assert.equal(await page.getByRole('heading', { name: '내 추천작', exact: true }).locator('svg[aria-hidden="true"]').count(), 1, 'recommendation heading uses an accessible decorative book icon');
    const manageRecommendations = page.getByRole('link', { name: '내 추천작 관리', exact: true });
    assert.equal(await manageRecommendations.getAttribute('href'), '/match/result/ui-owner/recommendations');
    assert.equal(await manageRecommendations.locator('svg circle').count(), 1, 'management uses a settings icon');
    assert.equal(await manageRecommendations.textContent(), '관리', 'no text arrow remains after the management label');
    assert.equal(await page.locator(".wm-carousel-controls button").count(), 0, 'personal carousel uses swipe instead of arrow buttons');
    const personalTrack = page.locator('.wm-personal-carousel ol');
    const personalBar = page.locator('.wm-personal-scrollbar');
    await personalBar.waitFor({state:'visible'});
    await page.waitForFunction(()=>document.querySelector('.wm-personal-carousel')?.dataset.scrolling!=='true');
    assert.equal(await personalBar.evaluate(el=>getComputedStyle(el).opacity),'0.4');
    await personalTrack.focus();
    await page.keyboard.press('End');
    await page.waitForFunction(() => document.querySelector(".wm-carousel-controls > span")?.textContent === "추천작 3 / 3");
    await page.waitForFunction(()=>document.querySelector('.wm-personal-carousel')?.dataset.scrolling==='true');
    await page.waitForFunction(()=>{
      const track=document.querySelector('.wm-personal-carousel ol');
      return Math.abs(track.scrollLeft-(track.scrollWidth-track.clientWidth))<=3;
    });
    assert.equal(await personalBar.evaluate(el=>getComputedStyle(el).opacity),'1');
    await page.waitForFunction(()=>{
      const el=document.querySelector('.wm-personal-scrollbar');
      const bar=el.getBoundingClientRect(),thumb=el.firstElementChild.getBoundingClientRect(),track=el.previousElementSibling;
      return Math.abs(thumb.left-bar.left-track.scrollLeft/track.scrollWidth*bar.width)<1&&Math.abs(thumb.width/bar.width-track.clientWidth/track.scrollWidth)<.01;
    },null,{timeout:5000}).catch(async error=>{
      console.error(await personalBar.evaluate(el=>{
        const b=el.getBoundingClientRect(),t=el.firstElementChild.getBoundingClientRect(),track=el.previousElementSibling;
        return {barWidth:b.width,thumbWidth:t.width,thumbLeft:t.left-b.left,scrollLeft:track.scrollLeft,clientWidth:track.clientWidth,scrollWidth:track.scrollWidth,thumbStyle:el.firstElementChild.getAttribute('style')};
      }));throw error;
    });
    await page.waitForFunction(()=>document.querySelector('.wm-personal-carousel')?.dataset.scrolling==='false');
    assert.equal(await personalBar.evaluate(el=>getComputedStyle(el).opacity),'0.4');
    assert.equal(await personalBar.locator('span').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(131, 217, 232)');
    await personalTrack.focus();await page.keyboard.press('Home');
    await page.waitForFunction(()=>document.querySelector('.wm-personal-carousel ol').scrollLeft<=3);
    const personalCdp=await context.newCDPSession(page);
    await personalCdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
    await personalTrack.scrollIntoViewIfNeeded();
    const personalBox=await personalTrack.boundingBox();
    const touchY=personalBox.y+Math.min(80,personalBox.height/2);
    await personalCdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:personalBox.x+personalBox.width-20,y:touchY}]});
    for(let step=1;step<=10;step++){
      await personalCdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:personalBox.x+personalBox.width-20-(personalBox.width-40)*step/10,y:touchY}]});
      await page.waitForTimeout(20);
    }
    await personalCdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(()=>document.querySelector('.wm-personal-carousel ol').scrollLeft>20);
    await personalCdp.detach();
    const footer = page.locator("footer.wm-result-actions");
    assert.equal(await footer.getByRole("link", { name: "내 취향 관계도" }).getAttribute("href"), "/match/c/ui-preview/ranking");
    assert.equal(await footer.getByRole("link", { name: "내 취향 결과를 Threads에 공유" }).getAttribute("href"), "/match/share/personal?profilePublicId=ui-owner");
    for (const width of [320, 390, 435]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `result fits at ${width}`);
      const boxes = await footer.locator("a").evaluateAll((items) => items.map((el) => ({ y: el.getBoundingClientRect().y, height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width })));
      assert.equal(boxes[0].y, boxes[1].y, "actions stay in one row");
      assert.ok(boxes.every((box) => box.height >= 44 && box.width > 90));
      assert.ok((await footer.boundingBox()).y > 740, "actions stay at viewport bottom");
      assert.equal(await page.locator('.wm-feedback,.wm-feedback-row').count(),0,'accuracy feedback UI is removed');
      assert.equal(await page.getByRole('heading',{name:'결과가 얼마나 나 같아?',exact:true}).count(),0);
      assert.ok(await page.locator('.wm-personal-carousel .wm-recommendation-card').count() === 3, 'personal and pair results render the shared recommendation card');
      assert.ok(await page.locator('.wm-personal-carousel .wm-pair-work-artwork').evaluateAll(items => items.every(el => {
        const rect = el.getBoundingClientRect();
        return Math.abs(rect.width / rect.height - 2 / 3) < .01;
      })), 'personal recommendations use the same slim 2:3 frames');
      assert.ok(await page.locator('.wm-personal-carousel blockquote').evaluateAll(items=>items.every(el=>{
        const style=getComputedStyle(el);
        return style.paddingLeft==='11px'&&style.paddingRight==='11px'&&el.scrollWidth<=el.clientWidth+1;
      })), 'personal recommendation reasons share the same inset without horizontal overflow');
      assert.equal(await page.locator('.wm-result-screen').evaluate(el => getComputedStyle(el).fontSize), '16px');
      assert.equal(await page.locator('.wm-taste-tiles strong').first().evaluate(el => getComputedStyle(el).fontSize), '16px');
      assert.ok(await page.locator('.wm-top-genres .match-top-stars i').evaluateAll(items => items.every(el => getComputedStyle(el).fontSize === '14px')), 'top-three stars are larger than the previous 9px');
    }
    for(const count of [1,0]){
      recommendationCount=count;
      await page.reload();
      if(count) await page.locator('.wm-personal-carousel').waitFor();
      else await page.getByText('아직 등록한 추천작이 없어요.',{exact:true}).waitFor();
      assert.equal(await page.locator('.wm-personal-scrollbar,.wm-carousel-controls button').count(),0,'zero or one recommendation has no misleading scroll indicator or arrows');
      if(count) assert.equal(await page.locator('.wm-personal-carousel ol').getAttribute('tabindex'),null);
    }
    recommendationCount=3;
    await page.reload();await page.locator('.wm-top-genres').waitFor();
    assert.equal(await page.getByText('전체 장르 취향', { exact: true }).count(), 0, 'the old expanded genre list is removed');
    assert.equal(await page.locator('.wm-top-genres').getAttribute('tabindex'), null, 'three or fewer genres have no unnecessary scroll focus stop');
    assert.equal(await page.locator('.wm-genre-scrollbar').count(), 0, 'no misleading position indicator when all genres already fit');
    const extraGenres = [
      ['action', '액션'], ['murim', '무협'], ['romance', '로맨스'],
      ['thriller_horror', '스릴러·공포'], ['drama_daily', '드라마·일상'], ['sports', '스포츠'],
    ];
    for (const additionalCount of [1, 6]) {
      resultExtraGenres = extraGenres.map(([genreKey, displayLabel], index) => ({ genreKey, displayLabel, stars: index < additionalCount ? 1 : 0 }));
      await page.reload();
      const rail = page.locator('.wm-top-genres');
      await rail.waitFor();
      assert.equal(await rail.locator('article').count(), 3 + additionalCount, 'only genres with positive stars become ranked cards');
      await page.waitForFunction(() => {
        const el=document.querySelector('.wm-top-genres');
        const wrapper = el.closest('.wm-genre-ranking');
        const bar = wrapper.querySelector('.wm-genre-scrollbar').getBoundingClientRect();
        const card = el.firstElementChild.getBoundingClientRect();
        const hero = wrapper.parentElement.getBoundingClientRect();
        return Math.abs(bar.top - card.bottom - 18) < 1 && Math.abs(hero.bottom - bar.bottom - 18) < 1;
      }); // Wait for ResizeObserver/layout after reloading the ranked cards.
      assert.deepEqual(await rail.locator('article > span:first-child').allTextContents(), Array.from({ length: 3 + additionalCount }, (_, i) => `${i === 0 ? '♛ ' : ''}${i + 1}위`));
      for (const width of [320, 390, 435]) {
        await page.setViewportSize({ width, height: 844 });
        await rail.focus();
        await page.keyboard.press('Home');
        assert.ok(await rail.evaluate(el => {
          const frame = el.getBoundingClientRect();
          const cards = [...el.children].map(card => card.getBoundingClientRect());
          return Math.abs(el.scrollLeft) < 2 && cards.slice(0, 3).every(card => card.left >= frame.left - 1 && card.right <= frame.right + 1) && cards[3].left >= frame.right;
        }), `first three equal-width ranks fit before swiping at ${width}px`);
        await page.keyboard.press('End');
        // Programmatic scroll positions update before the browser dispatches scroll.
        await page.waitForFunction(() => {
          const wrapper = document.querySelector('.wm-genre-ranking');
          const bar = wrapper?.querySelector('.wm-genre-scrollbar');
          if (!bar || wrapper?.dataset.scrolling !== 'true') return false;
          const thumb = bar.firstElementChild.getBoundingClientRect();
          const frame = bar.getBoundingClientRect();
          const track = bar.previousElementSibling;
          return Math.abs(thumb.right - frame.right) < 1 && Math.abs(thumb.width / frame.width - track.clientWidth / track.scrollWidth) < .01;
        });
        assert.equal(await page.locator('.wm-genre-scrollbar').evaluate(el => getComputedStyle(el).opacity), '1', 'the indicator becomes fully visible while scrolling');
        assert.equal(await page.locator('.wm-genre-scrollbar > span').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(131, 217, 232)', 'scrolling uses the original soft cyan color');
        assert.ok(await rail.evaluate(el => {
          const frame = el.getBoundingClientRect();
          const last = el.lastElementChild.getBoundingClientRect();
          return el.scrollLeft > 0 && last.left >= frame.left && last.right <= frame.right + 1;
        }), `remaining ranks can be reached at ${width}px`);
        await page.keyboard.press('Home');
        await page.keyboard.press('ArrowRight');
        assert.ok(await rail.evaluate(el => el.scrollLeft > 0), 'keyboard right advances the genre rail');
        await page.keyboard.press('ArrowLeft');
        assert.ok(await rail.evaluate(el => el.scrollLeft < 2), 'keyboard left returns to the first rank');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'only the genre rail scrolls, not the whole page');
      }
      await page.waitForFunction(() => document.querySelector('.wm-genre-ranking')?.dataset.scrolling === 'false');
      assert.equal(await page.locator('.wm-genre-scrollbar').evaluate(el => getComputedStyle(el).opacity), '0.4', 'the indicator remains more transparent after scrolling stops');
      assert.equal(await page.locator('.wm-genre-scrollbar > span').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(131, 217, 232)', 'only opacity changes at rest, not the cyan color');
      assert.ok(await page.locator('.wm-genre-scrollbar').evaluate(el => {
        const bar = el.getBoundingClientRect();
        const thumb = el.firstElementChild.getBoundingClientRect();
        const track = el.previousElementSibling;
        return Math.abs(thumb.left - bar.left - track.scrollLeft / track.scrollWidth * bar.width) < 1;
      }), 'the resting indicator retains the actual scroll position');
      if (additionalCount === 6) {
        await page.setViewportSize({ width: 390, height: 844 });
        await rail.scrollIntoViewIfNeeded();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
        const box = await rail.boundingBox();
        const y = box.y + box.height / 2;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width - 20, y }] });
        for (let step = 1; step <= 10; step++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width - 20 - (box.width - 40) * step / 10, y }] });
          await page.waitForTimeout(20);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForFunction(() => document.querySelector('.wm-top-genres')?.scrollLeft > 20);
        await cdp.detach();
      }
    }
    resultExtraGenres = [];
    for (const count of [18, 0]) {
      resultStarCounts = [count, 0, 0];
      await page.reload();
      await page.locator('.wm-persona-image').waitFor();
      if (!count) {
        assert.equal(await page.locator('.wm-top-genres').count(), 0, 'zero-star-only data does not render empty genre cards');
        continue;
      }
      await page.locator('.wm-top-genres').waitFor();
      assert.equal(await page.locator('.wm-top-genres article').first().locator('i').count(), count);
      for (const width of [320, 390, 435]) {
        await page.setViewportSize({ width, height: 844 });
        assert.ok(await page.locator('.wm-top-genres article').evaluateAll(items => items.every(el => {
          const card = el.getBoundingClientRect();
          return [...el.querySelectorAll('.match-top-stars, .match-top-stars i')].every(star => {
            const box = star.getBoundingClientRect();
            return box.left >= card.left && box.right <= card.right && box.bottom <= card.bottom;
          });
        })), `all ${count} stars stay inside their cards at ${width}px`);
      }
    }
    resultStarCounts = [8, 5, 1];
    await page.reload();
    await page.locator('.wm-top-genres').waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(shots, "04-original-result.png") });
    assert.equal(await page.getByRole('button',{name:'거의 맞아',exact:true}).count(),0);
    assert.equal(feedbackSaved,null,'removed UI never sends feedback updates');
    await page.screenshot({ path: path.join(shots, "05-result-footer.png") });
    await page.getByRole("button", { name: "닉네임 변경" }).click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "취소", exact: true }).click();
    hasActiveChallenge = false;
    await page.reload();
    assert.equal(await footer.getByRole("link", { name: "관계도 만들기" }).getAttribute("href"), "/match/challenge/new");
    resultCanManage = false;
    await page.reload();
    await page.locator(".wm-persona-image").waitFor();
    assert.equal(await footer.locator("a").count(), 1, "visitors get no owner controls");
    await page.evaluate(() => localStorage.setItem("webtoon-match:pair-result-prompt:v1", JSON.stringify({ challengeCode: "ui-pair", resultId: "pair-demo", publicProfileId: "ui-owner" })));
    await page.reload();
    await footer.getByRole("link", { name: /님과의 상세 궁합 보기/ }).waitFor();
    assert.equal(await footer.getByRole("link", { name: /님과의 상세 궁합 보기/ }).getAttribute("href"), "/match/c/ui-pair/match/pair-demo");
    await page.setViewportSize({ width: 320, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "long pair nickname does not overflow");
    assert.ok(await footer.locator(".wm-action-label").evaluate((el) => el.scrollWidth > el.clientWidth), "long nickname is clipped only in compact action label");
    assert.deepEqual(errors, []);
    // Read-only screenshot of the existing local result, never a fixture artifact.
    const liveContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const live = await liveContext.newPage();
    await live.route('**/api/v1/analytics/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    await live.route('**/api/v1/match-events', route => route.fulfill({ status: 202, contentType: 'application/json', body: '{"accepted":true}' }));
    await live.goto(`${base}/match/result/xys7o3_7JlgZl91b`);
    await live.locator('.wm-top-genres').waitFor();
    await live.locator('.wm-persona-image').evaluate(img => img.decode());
    await live.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    const liveGenres = live.locator('.wm-top-genres');
    assert.equal(await live.getByText('전체 장르 취향', { exact: true }).count(), 0);
    const hasMoreLiveGenres = await liveGenres.locator('article').count() > 3;
    if (hasMoreLiveGenres) {
      await liveGenres.focus();
      await live.keyboard.press('End');
      await liveGenres.evaluate(el => el.blur());
    }
    await live.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    if (hasMoreLiveGenres) {
      await live.waitForFunction(() => document.querySelector('.wm-genre-ranking')?.dataset.scrolling === 'false');
      assert.equal(await live.locator('.wm-genre-scrollbar').evaluate(el => getComputedStyle(el).opacity), '0.4');
    } else assert.equal(await live.locator('.wm-genre-scrollbar').count(), 0);
    await live.screenshot({ path: path.join(shots, 'result_genres_live.png') });
    const liveRecommendations=live.locator('.wm-personal-carousel');
    await liveRecommendations.waitFor();
    await liveRecommendations.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode().catch(()=>{}))));
    await liveRecommendations.locator('ol').evaluate(el=>el.scrollTo({left:0,behavior:'instant'}));
    await liveRecommendations.evaluate(el=>window.scrollTo({top:el.closest('section').getBoundingClientRect().top+window.scrollY-20,behavior:'instant'}));
    await live.waitForFunction(()=>document.querySelector('.wm-personal-carousel')?.dataset.scrolling!=='true');
    assert.equal(await liveRecommendations.getByRole('button').count(),0);
    assert.ok(await live.locator('.wm-personal-scrollbar').isVisible());
    await live.screenshot({path:path.join(shots,'result_recommendations_scroll_live.png')});
    await liveContext.close();
    console.log(JSON.stringify({ ok: true, rankingRequests: requests.length, screenshots: shots, checks: ["30 participants", "summary dialog and detail link", "Escape/focus restore", "swipe close", "owner-only menu", "hide/restore map and list", "genre filters", "320/390/435px overflow", "positive-star-only genre rail: three visible cards, 4/9 ranks, touch swipe and keyboard navigation", "persistent faint scrollbar, stronger while scrolling, accurate thumb, balanced 18px spacing", "personal recommendations: no arrows, keyboard and touch swipe, shared accurate scrollbar, hidden for zero/one item", "18 enlarged stars fit; zero-star cards and old full genre list removed", "real result genre and recommendation screenshots", "private ranking", "original result portrait", "concise result content", "shared fixed single-row actions", "result feedback removed; nickname dialog retained", "owner, new-link, visitor and long-nickname pair actions"] }, null, 2));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
