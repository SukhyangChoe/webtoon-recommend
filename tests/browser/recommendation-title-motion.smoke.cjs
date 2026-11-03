/* Deterministic animation timing; every API call is intercepted (no DB writes). */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const base = process.env.MATCH_TEST_BASE_URL || 'http://127.0.0.1:3000';
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    const context = await browser.newContext({ viewport: { width: 540, height: 844 }, reducedMotion: 'no-preference' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const items = [
      '끝 글자까지 읽을 수 있어야 하는 아주 긴 웹툰 작품 제목입니다',
      '고양이와 함께하는 두 번째 새로운 이야기',
      '화산귀환',
    ].map((title, i) => ({ canonicalWebtoonId: `motion-${i}`, title, mainGenre: 'fantasy', coverUrl: null, recommendationComment: null }));
    await context.route('**/api/v1/**', route => {
      const p = new URL(route.request().url()).pathname;
      let body = { active: false };
      if (p === '/api/v1/results/motion-fixture') body = { publicProfileId: 'motion-fixture', nickname: '애니메이션 검증', topGenres: [], displayGenres: [], wellMatchedLabels: [], lessMatchedLabels: [] };
      if (p.endsWith('/recommendations')) body = { items };
      if (p === '/api/v1/challenges/motion/results/pair') body = { ownerNickname: '검증', challengerNickname: '비교', ownerGenreKey: 'fantasy', challengerGenreKey: 'murim', score: 65, band: { label: '취향 잘 맞음' }, sharedGenres: [], differentGenres: [], ownerRecommendedGenres: [], challengerRecommendedGenres: [], ownerRecommendations: items, challengerRecommendations: [], sharedTasteLabels: [], trustSentence: '취향 비교', rank: 1, entryCount: 2 };
      return route.fulfill({ status: 200, json: body });
    });
    const speeds = [];
    for (const source of ['/match/result/motion-fixture', '/match/c/motion/match/pair']) {
      await page.goto(base + source);
      const titles = page.locator('.wm-scrolling-title');
      await titles.first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      await titles.first().scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await page.waitForFunction(() => [...document.querySelectorAll('.wm-scrolling-title')].slice(0, 2).every(el => el.dataset.overflow === 'true' && el.firstElementChild.getAnimations().length === 1));
      assert.equal(await titles.nth(2).evaluate(el => getComputedStyle(el.firstElementChild).animationName), 'none', 'fitting titles remain stationary');
      // Include a tiny overflow: it used to be slowed down by the minimum duration.
      for (const index of [0, 1, 'tiny']) {
        const title = titles.nth(index === 'tiny' ? 0 : index);
        if (index === 'tiny') {
          await title.evaluate(el => { el.style.width = `${el.firstElementChild.offsetWidth - 8}px`; });
          await page.waitForFunction(() => Math.abs(-parseFloat(document.querySelector('.wm-scrolling-title > span').style.getPropertyValue('--wm-title-travel')) - 10) < 1);
        }
        const timing = await title.evaluate(el => {
          const text = el.firstElementChild, animation = text.getAnimations()[0];
          animation.pause();
          const total = Number(animation.effect.getTiming().duration);
          const travel = -parseFloat(text.style.getPropertyValue('--wm-title-travel'));
          const start = parseFloat(text.style.getPropertyValue('--wm-title-move-start')) / 100 * total;
          const end = parseFloat(text.style.getPropertyValue('--wm-title-move-end')) / 100 * total;
          const move = end - start;
          const at = time => { animation.currentTime = time; return new DOMMatrixReadOnly(getComputedStyle(text).transform).m41; };
          const initial = at(0), initialMiddle = at(start * .5), initialEnd = at(start - .01);
          const a = at(start + move * .2), b = at(start + move * .7);
          const holdStart = at(end + .01), holdMiddle = at(end + 500), holdEnd = at(total - .01), reset = at(total + .01);
          return { total, start, end, move, travel, speed: (a - b) / (move * .5 / 1000), initial, initialMiddle, initialEnd, holdStart, holdMiddle, holdEnd, reset };
        });
        assert.ok(Math.abs(timing.speed - 48) < .05, `${source}/${index}: constant pixel speed`);
        assert.ok(Math.abs(timing.start - 500) < .001, 'half-second start hold in every cycle');
        for (const x of [timing.initial, timing.initialMiddle, timing.initialEnd]) assert.ok(Math.abs(x) < .01, 'first characters stay still throughout initial hold');
        assert.ok(Math.abs(timing.total - timing.end - 1000) < .001, 'one-second end hold');
        for (const x of [timing.holdStart, timing.holdMiddle, timing.holdEnd]) assert.ok(Math.abs(x + timing.travel) < .01, 'stays at the exact end throughout hold');
        assert.ok(Math.abs(timing.reset) < .01, 'instant reset, no reverse animation');
        speeds.push(timing.speed);
      }
      await titles.first().evaluate(el => { el.style.removeProperty('width'); el.firstElementChild.getAnimations()[0].play(); });
      await titles.first().hover();
      assert.equal(await titles.first().evaluate(el => getComputedStyle(el.firstElementChild).animationPlayState), 'paused');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await titles.first().evaluate(el => getComputedStyle(el.firstElementChild).animationName), 'none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, checks: ['personal and pair recommendation cards', 'two title lengths and tiny overflow at identical 48px/s', 'exact 500ms start hold on every cycle', 'exact 1000ms end hold', 'instant restart without reverse', 'short stationary titles', 'hover pause', 'reduced motion'], measuredSpeeds: speeds.map(x => Number(x.toFixed(3))) }));
  } finally { await browser.close(); }
})().catch(e => { console.error({ name: e.name, message: e.message }); process.exitCode = 1; });
