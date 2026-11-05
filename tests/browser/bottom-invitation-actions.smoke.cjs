/* Isolated navigation/clipboard checks. All API calls are intercepted; no DB writes. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const base = process.env.MATCH_TEST_BASE_URL || 'http://127.0.0.1:3000';
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      window.copyAttempts = [];
      window.copyFails = false;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => {
        if (window.copyFails) throw new Error('PERMISSION_DENIED');
        window.copyAttempts.push(text);
      } } });
    });
    let owner = true, activeChallenge = true, viewer = 'viewer-self', challengeWrites = 0;
    await context.route('**/api/v1/**', route => {
      const request = route.request(), p = new URL(request.url()).pathname;
      const reply = body => route.fulfill({ status: 200, json: body });
      if (!['GET', 'HEAD'].includes(request.method())) {
        if (p.startsWith('/api/v1/challenges')) challengeWrites++;
        return reply({ accepted: true });
      }
      if (p === '/api/v1/results/public-result') return reply({ publicProfileId: 'public-result', nickname: '결과 주인장', canManage: owner, activeChallengeCode: owner && activeChallenge ? 'own-invite' : null, topGenres: [], displayGenres: [], wellMatchedLabels: [], lessMatchedLabels: [] });
      if (p.endsWith('/recommendations')) return reply({ items: [] });
      if (p === '/api/v1/challenges') return reply({ active: activeChallenge, challengeCode: 'own-invite', ownerNickname: '내 닉네임' });
      if (p.endsWith('/ranking')) return reply({ challengeCode: 'own-invite', ownerNickname: '관계도 주인장', ownerGenreKey: 'fantasy', ownerTopGenreKeys: [], ownerPublicProfileId: 'viewer-self', entryCount: 0, status: 'active', rankingVisibility: 'public_by_link', canManage: owner, graphEntries: [], entries: [], top20: [], viewerEntry: null, hiddenEntries: [], pagination: { page: 1, pageSize: 6, totalItems: 0, totalPages: 1 } });
      if (p.endsWith('/results/pair')) return reply({ viewerPublicProfileId: viewer, ownerNickname: '상대방', challengerNickname: '참여자', ownerGenreKey: 'fantasy', challengerGenreKey: 'murim', score: 65, band: { label: '취향 잘 맞음' }, sharedGenres: [], differentGenres: [], ownerRecommendedGenres: [], challengerRecommendedGenres: [], ownerRecommendations: [], challengerRecommendations: [], sharedTasteLabels: [], trustSentence: '', rank: 1, entryCount: 2 });
      return reply({ active: false });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const footer = page.locator('.wm-action-bar');
    async function checkLayout() {
      for (const width of [320, 390, 435, 540]) {
        await page.setViewportSize({ width, height: 844 });
        assert.ok(await footer.locator('.match-button').evaluateAll(items => {
          const boxes = items.map(el => el.getBoundingClientRect());
          return boxes.every(box => box.height >= 44 && Math.abs(box.top - boxes[0].top) < 1) && items.every(el => el.scrollWidth <= el.clientWidth + 1);
        }), `footer controls stay readable in one row at ${width}px`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.mouse.move(0, 0);
        const invite = footer.getByRole('button', { name: '초대하기', exact: true });
        const disabled=await invite.isDisabled();
        assert.deepEqual(await invite.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color })), disabled ? {background:'rgb(237, 240, 242)',color:'rgb(134, 146, 154)'} : { background: 'rgb(0, 200, 234)', color: 'rgb(7, 60, 71)' }, 'only an available invitation receives the brand accent');
        const navigation=await footer.locator('.match-button:not(.wm-invite-button)').evaluateAll(items=>items.map(el=>({text:el.textContent,background:getComputedStyle(el).backgroundColor})));
        assert.ok(navigation.every(item=>item.background==='rgb(255, 255, 255)'),`only invite remains cyan on personal, pair and ranking pages: ${JSON.stringify(navigation)}`);
        assert.equal(await invite.locator('svg[aria-hidden="true"] path').getAttribute('d'), 'M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M20 8v6m-3-3h6', 'person-plus icon communicates inviting a friend');
      }
    }
    async function copy(expected) {
      await footer.getByRole('button', { name: '초대하기', exact: true }).click();
      await page.waitForFunction(text => window.copyAttempts.at(-1) === text, expected);
      assert.equal(await page.evaluate(() => window.copyAttempts.at(-1)), expected);
    }
    await page.goto(base + '/match/result/public-result?from=pair&returnTo=not-for-sharing');
    await footer.getByRole('link', { name: '내 취향 관계도', exact: true }).waitFor();
    assert.ok(await page.getByRole('link',{name:'내 추천작 관리',exact:true}).evaluate(el=>el.firstElementChild.tagName.toLowerCase()==='svg'&&el.lastElementChild.textContent==='관리'&&el.firstElementChild.getBoundingClientRect().right<=el.lastElementChild.getBoundingClientRect().left),'settings icon appears before the manage label');
    assert.equal(await footer.locator('.match-button').count(), 3);
    await copy(base + '/match/c/own-invite');
    await page.getByRole('status').filter({ hasText: '초대 링크를 복사했어요.' }).waitFor();
    await checkLayout();
    await page.evaluate(() => { window.copyFails = true; });
    await footer.getByRole('button', { name: '초대하기', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '링크를 복사하지 못했어요.' }).waitFor();
    await page.evaluate(() => { window.copyFails = false; });
    await copy(base + '/match/c/own-invite');
    activeChallenge = false;
    await page.reload();
    assert.equal(await footer.getByRole('link', { name: '관계도 만들기', exact: true }).getAttribute('href'), '/match/challenge/new');
    await checkLayout();
    assert.ok(await footer.getByRole('button', {name:'초대하기',exact:true}).isDisabled());
    owner = false;
    await page.reload();
    await footer.getByRole('button', { name: '초대하기', exact: true }).waitFor();
    assert.equal(await footer.locator('.match-button').count(), 2, 'visitor keeps sharing but gains no owner controls');
    assert.ok(await footer.getByRole('button', {name:'초대하기',exact:true}).isDisabled());

    owner = true; activeChallenge = true;
    await page.goto(base + '/match/c/current-invite/ranking');
    await footer.getByRole('button', { name: '초대하기', exact: true }).waitFor();
    assert.equal(await footer.getByRole('button', { name: '링크 복사', exact: true }).count(), 0);
    await copy(base + '/match/c/own-invite');
    await page.getByRole('status').filter({ hasText: '초대 링크를 복사했어요.' }).waitFor();
    await checkLayout();

    await page.goto(base + '/match/c/current-invite/match/pair?from=ranking');
    await footer.getByRole('link', { name: '내 결과', exact: true }).waitFor();
    assert.equal(await footer.getByRole('link', { name: '내 결과', exact: true }).getAttribute('href'), '/match/result/viewer-self?from=pair');
    assert.deepEqual(await footer.locator('.match-button').allTextContents(), ['내 결과', '공유', '초대하기']);
    assert.equal(await footer.getByRole('link', { name: /취향 관계도/ }).count(), 0);
    await copy(base + '/match/c/own-invite');
    await checkLayout();
    viewer = null;
    await page.reload();
    await footer.getByRole('link', { name: '테스트하기', exact: true }).waitFor();
    assert.equal(await footer.getByRole('link', { name: '테스트하기', exact: true }).getAttribute('href'), '/match/c/current-invite');
    await checkLayout();
    await copy(base + '/match/c/own-invite');
    assert.equal(challengeWrites, 0, 'sharing never creates or changes a relationship map');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, checks: ['own invitation from every footer', 'no active link disables invitation', 'visitor sharing without owner controls', 'pair footer order and viewer-specific result link', 'no-result test fallback', 'clipboard failure and retry', 'clean invitation URLs only', '320/390/435/540px controls', 'no challenge mutations'] }));
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error({ name: error.name, message: error.message }); process.exitCode = 1; });
