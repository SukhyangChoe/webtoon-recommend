/* Isolated edge cases first. Delivered evidence uses an actual stored public result. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');

(async () => {
  const { buildReaderExplanation } = await import('../../src/features/match/engine/readerExplanationEngine.mjs');
  const seed = require('../../src/features/match/data/questionSeed.v0.4.json');
  const base = process.env.MATCH_TEST_BASE_URL || 'http://127.0.0.1:3000';
  const output = process.env.MATCH_QA_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'webtoon-reader-explanation-'));
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    let genreKey = 'murim', strategy = false, legacy = false;
    const reply = () => {
      const genre = seed.publicGenrePolicy.publicGenres.find(item => item.genreKey === genreKey);
      const snapshot = {
        publicProfileId: 'explanation-fixture', nickname: '해설 검증', canManage: false,
        displayGenres: [{ genreKey, displayLabel: genre.displayLabel, stars: 18 }], topGenres: [{ genreKey, displayLabel: genre.displayLabel, stars: 18 }],
        wellMatchedLabels: strategy ? ['전략', '힘숨찐'] : ['성장', '노력형'], lessMatchedLabels: ['늘어지는 전개'],
        answers: { appeal: [strategy ? 'appeal_strategy_powerplay' : 'appeal_growth_training'], characterRelationship: [strategy ? 'character_hidden_power' : 'character_effortful_protagonist'], avoidance: ['avoid_slow_without_payoff'] },
      };
      const { answers, ...result } = snapshot;
      return { ...result, ...(!legacy ? { readerExplanation: buildReaderExplanation({ ...result, answers }) } : {}) };
    };
    let mutations = 0;
    await context.route('**/api/v1/**', route => {
      const request = route.request(), p = new URL(request.url()).pathname;
      if (!['GET', 'HEAD'].includes(request.method())) {
        if (!p.includes('analytics') && !p.includes('match-events')) mutations++;
        return route.fulfill({ status: 202, json: { accepted: true } });
      }
      return route.fulfill({ status: 200, json: p === '/api/v1/results/explanation-fixture' ? reply() : p.endsWith('/recommendations') ? { items: [] } : { active: false } });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/match/result/explanation-fixture');
    const explanation = page.locator('.wm-reader-explanation');
    await explanation.waitFor();
    assert.ok(reply().readerExplanation.boundary, 'fixture includes the separate explanatory paragraph');
    assert.equal(await explanation.locator('.wm-reader-boundary').count(), 0);
    assert.equal((await explanation.textContent()).includes(reply().readerExplanation.boundary), false, 'separate avoidance prose stays hidden');
    assert.equal(await explanation.locator('details, summary, .wm-reader-basis, .wm-reader-disclaimer').count(), 0, 'hints and trailing explanatory text are removed');
    assert.equal((await explanation.textContent()).includes(reply().readerExplanation.disclaimer), false);
    assert.ok(await explanation.evaluate(el => el.lastElementChild.classList.contains('wm-reader-scene')), 'the card ends with the humorous scene');
    assert.equal(await explanation.getAttribute('data-scene-key'), 'murim.growth');
    assert.ok(await explanation.evaluate(el => el.previousElementSibling.classList.contains('wm-interpretation') && el.nextElementSibling.querySelector('.wm-recommendations-heading')));
    assert.match(await explanation.locator('.wm-reader-scene p').textContent(), /v17/);
    assert.equal(await explanation.locator('.wm-reader-scene h3').textContent(), '일상 속에서는');
    for (const width of [320, 375, 390, 435, 540, 900]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await explanation.evaluate(el => {
        const box = el.getBoundingClientRect();
        return document.documentElement.scrollWidth <= innerWidth && [...el.querySelectorAll('p, h2, h3, summary')].every(child => {
          const r = child.getBoundingClientRect();
          return child.scrollWidth <= child.clientWidth + 1 && r.left >= box.left && r.right <= box.right;
        });
      }), `text fits without clipping at ${width}px`);
      assert.equal(await explanation.locator('.wm-reader-scene p').evaluate(el => getComputedStyle(el).fontSize), '15px');
      assert.ok(await explanation.evaluate(el => {
        const introduction = getComputedStyle(el.querySelector('.wm-reader-introduction'));
        const scene = getComputedStyle(el.querySelector('.wm-reader-scene p'));
        const heading = getComputedStyle(el.querySelector('.wm-reader-scene h3'));
        const eyebrow = getComputedStyle(el.querySelector('.wm-reader-eyebrow'));
        const card = getComputedStyle(el);
        const title = getComputedStyle(el.querySelector('h2'));
        const neighboringTitle = getComputedStyle(el.nextElementSibling.querySelector('h2'));
        return ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight'].every(key => introduction[key] === scene[key])
          && heading.fontSize === eyebrow.fontSize && Number(heading.fontWeight) >= 700
          && ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight'].every(key => title[key] === neighboringTitle[key])
          && card.padding === '18px 16px' && card.borderRadius === '18px'
          && introduction.fontFamily === neighboringTitle.fontFamily;
      }), 'reader typography follows the shared personal/pair insight system');
    }
    const first = await explanation.locator('.wm-reader-scene p').textContent();
    await page.reload(); await explanation.waitFor();
    assert.equal(await explanation.locator('.wm-reader-scene p').textContent(), first, 'refresh does not randomize the same result');
    strategy = true;
    await page.reload(); await explanation.waitFor();
    assert.equal(await explanation.getAttribute('data-scene-key'), 'murim.strategy');
    assert.match(await explanation.locator('.wm-reader-scene p').textContent(), /노트북/);
    strategy = false;
    const scenes = [];
    for (const genre of seed.publicGenrePolicy.publicGenres) {
      genreKey = genre.genreKey;
      await page.reload(); await explanation.waitFor();
      assert.equal(await explanation.getAttribute('data-scene-key'), `${genreKey}.growth`);
      scenes.push(await explanation.locator('.wm-reader-scene p').textContent());
    }
    assert.equal(new Set(scenes).size, 9, 'the same positive choices yield a distinct complete scene in each genre');
    legacy = true;
    await page.reload(); await page.locator('.wm-interpretation').waitFor();
    assert.equal(await explanation.count(), 0, 'old cached/API shapes without explanation keep working');
    assert.equal(mutations, 0);
    assert.deepEqual(errors, []);
    await context.close();

    // Real server data, without replacing any result fields or impersonating its owner.
    const liveContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await liveContext.route('**/api/v1/**', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.fulfill({ status: 202, json: { accepted: true } }));
    const live = await liveContext.newPage();
    await live.goto(base + '/match/result/xys7o3_7JlgZl91b');
    const real = live.locator('.wm-reader-explanation');
    await real.waitFor({ timeout: 30000 });
    await live.evaluate(() => document.fonts.ready);
    await live.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await real.evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - 80, behavior: 'instant' }));
    await real.screenshot({ path: path.join(output, 'reader_explanation_live_v2.png') });
    await liveContext.close();
    console.log(JSON.stringify({ ok: true, checks: ['nine genre-specific scenes in UI', 'same genre with different positive choices', '320/375/390/435/540/900px text', 'hints and trailing prose removed', 'deterministic reload', 'legacy response compatibility', 'no new mutations', 'actual stored result screenshot'], output }));
  } finally { await browser.close(); }
})().catch(error => { console.error({ name: error.name, message: error.message }); process.exitCode = 1; });
