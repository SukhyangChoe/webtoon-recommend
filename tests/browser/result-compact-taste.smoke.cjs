/* Isolated edge cases; final screenshots use the real API, with all writes blocked. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');

(async () => {
  const base = process.env.MATCH_TEST_BASE_URL || 'http://127.0.0.1:3100';
  const output = process.env.MATCH_QA_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'webtoon-compact-taste-'));
  fs.mkdirSync(output, { recursive: true });
  const seed = require('../../src/features/match/data/questionSeed.v0.4.json');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let allGenres = false, genreCount = 3, empty = false, long = false, stars = 6;
    const details = () => empty ? [] : long
      ? [{ category: '설정', value: '오래된 결과에 저장된 아주 긴 설정 이름' }, { category: '관계', value: '동료와 가족의 오랜 결속과 성장' }, { category: '전개', value: '반전' }]
      : [{ category: '설정', value: '회귀' }, { category: '전개', value: '성장' }, { category: '관계', value: '노력형' }];
    await context.route('**/api/v1/**', route => {
      const p = new URL(route.request().url()).pathname;
      const reply = body => route.fulfill({ status: 200, json: body });
      if (!['GET', 'HEAD'].includes(route.request().method())) return reply({ accepted: true });
      if (p === '/api/v1/results/compact-fixture') {
        const genres = seed.publicGenrePolicy.publicGenres.slice(0, allGenres ? 9 : genreCount).map((g, i) => ({ genreKey: g.genreKey, displayLabel: g.displayLabel, stars: i ? 2 : stars }));
        return reply({ publicProfileId: 'compact-fixture', nickname: '레이아웃 확인', canManage: false, topGenres: genres.slice(0, 3), displayGenres: genres, wellMatchedDetails: details(), wellMatchedLabels: details().map(d => d.value), lessMatchedLabels: empty ? [] : long ? ['오래된 결과의 아주 긴 망설이는 요소 이름', '답답한 전개'] : ['그림체 장벽'] });
      }
      return reply(p.endsWith('/recommendations') ? { items: [] } : { active: false });
    });
    await page.goto(base + '/match/result/compact-fixture');
    await page.locator('.wm-interpretation').waitFor();
    assert.equal(await page.locator('.wm-genre-backdrop').count(), 0);
    assert.deepEqual(await page.locator('.wm-taste-group h2 > span[aria-hidden="true"]').allTextContents(), ['♡', '⊖']);
    assert.deepEqual(await page.locator('.wm-avoidance li').first().evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color })), { background: 'rgb(238, 240, 242)', color: 'rgb(75, 80, 87)' });
    assert.deepEqual(await page.locator('.wm-taste-tiles strong').allTextContents(), ['회귀', '성장', '노력형']);
    for (const width of [320, 375, 390, 435, 540, 900]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => document.fonts.ready);
      const layout = await page.locator('.wm-interpretation').evaluate(el => ({
        height: el.getBoundingClientRect().height,
        columns: getComputedStyle(el.firstElementChild).gridTemplateColumns,
        fits: document.documentElement.scrollWidth <= innerWidth,
        textFits: [...el.querySelectorAll('li')].every(li => li.scrollWidth <= li.clientWidth + 1),
        font: getComputedStyle(el.querySelector('strong')).fontSize,
        headings: [...el.querySelectorAll('h2')].map(h => ({ w: h.clientWidth, scroll: h.scrollWidth })),
        headingFont: getComputedStyle(el.querySelector('h2')).fontSize,
        noVerticalRules: [...el.querySelectorAll('ul')].every(list => getComputedStyle(list).borderLeftWidth === '0px'),
      }));
      assert.ok(layout.fits && layout.textFits, `no clipping at ${width}px`);
      assert.ok(layout.headings.every(h => h.scroll <= h.w + 1), 'section labels fit');
      assert.equal(layout.font, '16px', 'compact spacing, not smaller taste text');
      assert.equal(layout.headingFont, '13px', 'quiet labels leave the emphasis on taste values');
      assert.ok(layout.noVerticalRules, 'no table-like vertical separators');
      assert.ok(layout.height <= (width <= 360 ? 205 : 180), `compact two-row panel at ${width}: ${layout.height}`);
      assert.ok(await page.locator('.wm-top-genres article').evaluateAll(cards => cards.every(card => {
        const box = card.getBoundingClientRect();
        const rank = card.querySelector('.wm-genre-rank').getBoundingClientRect(), name = card.querySelector('strong').getBoundingClientRect();
        const star = card.querySelector('.match-top-stars').getBoundingClientRect();
        return Math.abs(box.width - 148) < .1 && box.height >= 104 && name.left >= rank.right && Math.abs((rank.top + rank.bottom) / 2 - (name.top + name.bottom) / 2) < 1 && star.top >= Math.max(rank.bottom, name.bottom) + 10 && !card.querySelector('svg, img') && getComputedStyle(card).backgroundImage === 'none';
      })), `unchanged card size, inline rank/name, stars below, no artwork at ${width}px`);
    }
    allGenres = true;
    await page.reload(); await page.locator('.wm-top-genres article').nth(8).waitFor({ state: 'attached' });
    assert.equal(await page.locator('.wm-top-genres svg, .wm-top-genres img').count(), 0);
    assert.ok(await page.locator('.wm-top-genres article').evaluateAll(nodes => nodes.every(n => getComputedStyle(n).backgroundImage === 'none')));
    const track = page.locator('.wm-top-genres'); await track.focus(); await page.keyboard.press('End');
    await page.waitForFunction(() => { const el = document.querySelector('.wm-top-genres'); return el.scrollLeft >= el.scrollWidth - el.clientWidth - 2; });
    allGenres = false;
    for (const count of [1, 2, 3]) {
      genreCount = count;
      for (const width of [320, 540]) {
        await page.setViewportSize({ width, height: 844 }); await page.reload();
        await page.locator('.wm-top-genres').waitFor();
        await page.waitForFunction(() => {
          const el = document.querySelector('.wm-top-genres'), overflow = el.scrollWidth > el.clientWidth + 1;
          return (el.getAttribute('tabindex') === '0') === overflow && document.querySelector('.wm-genre-scrollbar').hidden === !overflow;
        });
      }
    }
    genreCount = 3;
    const heights = [];
    for (const n of [1, 18, 36]) {
      stars = n; await page.reload(); await page.locator('.wm-top-genres').waitFor();
      assert.equal(await page.locator('.wm-top-genres article').first().locator('i').count(), n);
      assert.ok(await page.locator('.wm-top-genres article').first().evaluate(card => {
        const box = card.getBoundingClientRect();
        return [...card.querySelectorAll('.match-top-stars i')].every(star => { const r = star.getBoundingClientRect(); return r.left >= box.left && r.right <= box.right && r.bottom <= box.bottom; });
      }), 'all stars remain visible inside the card');
      heights.push(await page.locator('.wm-top-genres article').first().evaluate(el => el.getBoundingClientRect().height));
    }
    assert.ok(heights[0] <= heights[1] && heights[1] < heights[2], 'cards preserve their comfortable minimum and expand when stars need more height');
    long = true;
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 }); await page.reload(); await page.locator('.wm-interpretation').waitFor();
      assert.ok(await page.locator('.wm-interpretation').evaluate(el => document.documentElement.scrollWidth <= innerWidth && [...el.querySelectorAll('li')].every(li => li.scrollWidth <= li.clientWidth + 1)), 'long legacy values wrap in full');
    }
    empty = true; await page.reload(); await page.getByText('선택한 요소 없음', { exact: true }).waitFor();
    assert.equal(await page.locator('.wm-taste-empty').count(), 2);
    assert.deepEqual(errors, []);
    await context.close();

    // Evidence is an actual stored result, not the edge-case fixture above.
    const real = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await real.route('**/api/v1/**', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.fulfill({ status: 202, json: { accepted: true } }));
    const live = await real.newPage();
    await live.goto(base + '/match/result/xys7o3_7JlgZl91b');
    await live.locator('.wm-interpretation').waitFor({ timeout: 30000 });
    await live.locator('.wm-persona-image').evaluate(img => img.decode());
    const bottom = await live.locator('.wm-interpretation').evaluate(el => Math.ceil(el.getBoundingClientRect().bottom + 10));
    await live.screenshot({ path: path.join(output, 'result_compact_taste_focus_live.png'), clip: { x: 0, y: 0, width: 390, height: bottom } });
    await live.locator('.wm-genre-ranking').screenshot({ path: path.join(output, 'genre_cards_balanced_live.png') });
    await live.locator('.wm-interpretation').screenshot({ path: path.join(output, 'taste_points_refined_live.png') });
    await real.close();
    console.log(JSON.stringify({ ok: true, checks: ['no decorative artwork in genre cards', 'restored heart and circled-minus heading glyphs', 'neutral grey avoidance chips with dark grey text', '148px width and 104px minimum height', 'rank and genre in one line with stars below', '320/375/390/435/540/900 widths', 'unchanged 16px taste text', 'compact rows', 'long and empty values', 'dynamic star height', 'overflow-aware scrollbar for 1/2/3/9 cards', 'genre keyboard scrolling', 'real result screenshot; no user-data writes'], output }));
  } finally { await browser.close(); }
})().catch(error => { console.error({ name: error.name, message: error.message }); process.exitCode = 1; });
