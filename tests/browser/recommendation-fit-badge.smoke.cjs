/* Real public result only; no fixture data or API writes in the delivered evidence. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const base = process.env.MATCH_TEST_BASE_URL || 'http://127.0.0.1:3000';
  const output = process.env.MATCH_QA_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'webtoon-fit-badge-'));
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    const context = await browser.newContext({ viewport: { width: 435, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await context.route('**/api/v1/**', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.fulfill({ status: 202, json: { accepted: true } }));
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/match/c/mKOdmiLcE0JU/match/5ujFmEcO6RE050ST?from=ranking');
    const card = page.locator('.wm-pair-work-card.is-taste-fit').first();
    await card.waitFor();
    for (const width of [320, 390, 435, 540]) {
      await page.setViewportSize({ width, height: 844 });
      const badge = card.locator('.wm-pair-work-artwork > .wm-pair-work-fit');
      assert.equal(await badge.textContent(), '✦취향 저격');
      assert.ok(await badge.evaluate(el => {
        const box = el.getBoundingClientRect(), cover = el.parentElement.getBoundingClientRect();
        return Math.abs(box.top - cover.top - 8) < 1 && Math.abs(box.left - cover.left - 8) < 1 && box.right <= cover.right - 7 && el.scrollWidth <= el.clientWidth && getComputedStyle(el).pointerEvents === 'none';
      }), `badge stays inside the top left of the real cover at ${width}px`);
      assert.equal(await page.locator('.wm-pair-work-card > .wm-pair-work-fit').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.setViewportSize({ width: 435, height: 844 });
    const group = page.locator('.wm-pair-work-group').filter({ has: page.locator('.wm-pair-work-card.is-taste-fit') }).first();
    await group.scrollIntoViewIfNeeded();
    await group.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode().catch(() => {}))));
    await group.screenshot({ path: path.join(output, 'recommendation_fit_badge_live.png') });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, checks: ['real server-selected highlight', 'top-left cover badge', 'no separate fit-caption row', '320/390/435/540px layout', 'real public screenshot; API writes blocked'], output }));
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error({ name: error.name, message: error.message }); process.exitCode = 1; });
