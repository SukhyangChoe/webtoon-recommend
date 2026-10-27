/* Isolated browser regression runner. */
/* All server mutations are mocked. Live screenshots only use local question UI. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const { createEmptyMatchDraft, MATCH_DRAFT_STORAGE_KEY } = await import('../../src/features/match/storage/draft.mjs');
  const { buildTasteSnapshot, toPublicTasteResult } = await import('../../src/features/match/engine/resultEngine.mjs');
  const { applyRecommendationTaste } = await import('../../src/features/match/engine/recommendationTasteEngine.mjs');
  const { personalArchetypeFor } = await import('../../src/features/match/share/shareArchetypes.mjs');
  const seed = JSON.parse(fs.readFileSync(path.resolve('src/features/match/data/questionSeed.v0.4.json'), 'utf8'));
  const base = process.env.MATCH_TEST_BASE_URL ?? 'http://127.0.0.1:3000';
  const shots = fs.mkdtempSync(path.join(os.tmpdir(), 'webtoon-retake-'));
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const oldDraft = { ...createEmptyMatchDraft(), resultPublicId: 'old-result', snapshotId: 'old-snapshot', nickname: '이전 닉네임', answers: { genre: { ropan: 'high' } } };
    await context.addInitScript(({ key, draft }) => {
      // Init scripts also run after navigation; seed once per isolated test context.
      if (!localStorage.getItem('retake-test-seeded')) {
        localStorage.setItem(key, JSON.stringify(draft));
        localStorage.setItem('webtoon-match:public-result:v1:old-result', JSON.stringify({ publicProfileId: 'old-result', topGenres: [{ genreKey: 'ropan', stars: 18 }] }));
        localStorage.setItem('retake-test-seeded', 'true');
      }
    }, { key: MATCH_DRAFT_STORAGE_KEY, draft: oldDraft });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let failRestart = true;
    let restartCalls = 0;
    let buildCalls = 0;
    let recommendations = [{ canonicalWebtoonId: 'old-romance-work' }];
    let createdResult;
    await page.route('**/api/v1/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname === '/api/v1/test-restart') {
        restartCalls++;
        assert.ok(request.postDataJSON().anonymousId);
        if (failRestart) return reply({ error: 'TEST_RESTART_FAILED' }, 503);
        recommendations = [];
        return reply({ cleared: true, removedCount: 1 });
      }
      if (url.pathname === '/api/v1/taste-snapshots') {
        buildCalls++;
        assert.equal(recommendations.length, 0, 'old recommendations were deleted before the new result is built');
        const body = request.postDataJSON();
        assert.equal(body.answers.genre.murim, 'high');
        assert.equal(body.answers.genre.ropan, 'low');
        assert.equal(body.answers.avoidance.length, 3);
        const snapshot = buildTasteSnapshot({ seed, answers: body.answers, anonymousId: body.anonymousId, profileId: 'fixture-profile', snapshotId: 'new-snapshot', publicProfileId: 'new-result' });
        const computed = applyRecommendationTaste(snapshot, [], seed);
        createdResult = { ...toPublicTasteResult(computed), nickname: body.nickname, canManage: true };
        return reply({ publicProfileId: 'new-result', snapshotId: 'new-snapshot', result: createdResult }, 201);
      }
      if (url.pathname === '/api/v1/results/new-result') return reply(createdResult);
      if (url.pathname.endsWith('/recommendations')) return reply({ items: recommendations });
      if (url.pathname === '/api/v1/challenges') return reply({ active: false });
      if (url.pathname.includes('analytics') || url.pathname === '/api/v1/match-events') return reply({ ok: true });
      throw new Error(`Unexpected API call: ${request.method()} ${url.pathname}`);
    });

    await page.goto(`${base}/match`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '다시 테스트하기', exact: true }).click();
    await page.locator('.match-notice[role=alert]').waitFor();
    assert.equal(new URL(page.url()).pathname, '/match');
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).resultPublicId, MATCH_DRAFT_STORAGE_KEY), 'old-result');
    assert.equal(recommendations.length, 1);
    failRestart = false;
    await page.getByRole('button', { name: '다시 테스트하기', exact: true }).click();
    await page.waitForURL('**/match/test/intro');
    assert.equal(restartCalls, 2);
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).resultPublicId, MATCH_DRAFT_STORAGE_KEY), undefined);
    assert.equal(await page.evaluate(key => Object.keys(JSON.parse(localStorage.getItem(key)).answers).length, MATCH_DRAFT_STORAGE_KEY), 0);
    await page.getByRole('textbox', { name: /테스트에서 사용할 닉네임/ }).fill('무협 재테스트');
    await page.getByRole('button', { name: /테스트 시작/ }).click();

    for (const shelf of [1, 2]) {
      await page.waitForURL(`**/match/test/genre-shelf/${shelf}`);
      const question = seed.questions.find(item => item.questionId === `wm_genre_shelf_0${shelf}`);
      for (const key of question.genreKeys) {
        const label = seed.publicGenrePolicy.publicGenres.find(item => item.genreKey === key).displayLabel;
        const choice = seed.choiceSets.genre_affinity_three_level.find(item => item.choiceKey === (key === 'murim' ? 'high' : 'low'));
        await page.locator('.match-genre-card').filter({ has: page.getByRole('heading', { name: label, exact: true }) }).getByRole('button', { name: choice.displayLabel, exact: true }).click();
      }
      await page.getByRole('button', { name: /^다음/ }).click();
    }
    for (let index = 1; index <= 6; index++) {
      await page.waitForURL(`**/match/test/duel/${index}`);
      await page.locator('.match-duel-card').first().waitFor();
      if (index === 1) await page.locator('.match-duel-card').filter({ has: page.locator('.match-duel-genre', { hasText: '무협' }) }).click();
      else await page.getByRole('button', { name: '둘 다 안 볼래', exact: true }).click();
      await page.getByRole('button', { name: /^다음/ }).click();
    }
    await page.waitForURL('**/match/test/taste/setting');
    await page.getByRole('button', { name: '설정은 크게 안 따짐', exact: true }).click();
    await page.getByRole('button', { name: /^다음/ }).click();
    for (const step of ['appeal', 'character-relationship']) {
      await page.waitForURL(`**/match/test/taste/${step}`);
      await page.locator('.match-feature-card > button:first-child').first().click();
      await page.getByRole('button', { name: /^다음/ }).click();
    }
    await page.waitForURL('**/match/test/avoidance');
    await page.getByText('최대 3개 선택', { exact: true }).waitFor();
    assert.equal(await page.getByText(/최대 4개|대표 취향|별표/).count(), 0);
    const choices = page.locator('.match-ranked-card');
    for (let index = 0; index < 3; index++) await choices.nth(index).click();
    await choices.nth(3).click();
    assert.equal(await choices.filter({ has: page.locator('[aria-hidden=true]', { hasText: '✓' }) }).count(), 3);
    assert.equal(await choices.nth(3).getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('.match-primary-toggle').count(), 0);
    await choices.nth(0).click();
    await choices.nth(3).click();
    assert.equal(await choices.nth(3).getAttribute('aria-pressed'), 'true');
    await choices.last().click();
    assert.equal(await page.locator('.match-ranked-card[aria-pressed=true]').count(), 1);
    assert.equal(await choices.last().getAttribute('aria-pressed'), 'true');
    await choices.nth(0).click();
    assert.equal(await choices.last().getAttribute('aria-pressed'), 'false');
    await choices.nth(1).click();
    await choices.nth(2).click();
    await page.getByRole('button', { name: /^결과 만들기/ }).click();
    await page.waitForURL('**/match/result/new-result');
    const expectedName = personalArchetypeFor('murim').name;
    await page.getByRole('heading', { name: expectedName, exact: true }).waitFor();
    assert.equal(createdResult.topGenres[0].genreKey, 'murim');
    assert.equal(createdResult.topGenres[0].stars, 18);
    assert.equal(createdResult.recommendationInfluence.workCount, 0);
    assert.equal(buildCalls, 1, 'cached old result does not bypass recalculation');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: expectedName, exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: '황궁 서사 VIP', exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    await context.close();

    // User-facing proof: real question UI, isolated local answers, no DB mutations.
    const live = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const questionPage = await live.newPage();
    await questionPage.route('**/api/v1/match-events', route => route.fulfill({ status: 202, contentType: 'application/json', body: '{"accepted":true}' }));
    await questionPage.goto(`${base}/match/test/avoidance`);
    await questionPage.getByText('최대 3개 선택', { exact: true }).waitFor();
    for (let index = 0; index < 3; index++) await questionPage.locator('.match-ranked-card').nth(index).click();
    await questionPage.waitForFunction(() => document.querySelectorAll('.match-ranked-card[aria-pressed=true]').length === 3);
    await questionPage.locator('.match-ranked-card').evaluateAll(items => Promise.all(items.flatMap(el => el.getAnimations({ subtree: true })).map(animation => animation.finished.catch(() => {}))));
    await questionPage.evaluate(() => window.scrollTo(0, 0));
    await questionPage.addStyleTag({ content: 'nextjs-portal { display:none !important; }' });
    await questionPage.screenshot({ path: path.join(shots, 'avoidance_live.png') });
    await live.close();
    console.log(JSON.stringify({ ok: true, checks: ['failed restart preserves draft', 'delete before navigation', 'all test screens through actual UI', 'three avoidance selections without primary star', 'fourth blocked, deselection and exclusive none', 'murim-first new result', 'no old cached result reuse', 'reload stays murim', 'no production DB writes'], artifacts: shots }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
