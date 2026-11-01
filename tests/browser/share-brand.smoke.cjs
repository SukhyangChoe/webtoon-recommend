/* Read-only regression against existing service data; all non-GET APIs intercepted. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'webtoon-share-brand-'));
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/v1/**', route => route.request().method() === 'GET' ? route.continue() : route.fulfill({ status: 202, body: '{"accepted":true}' }));
    const routes = {
      personal: '/match/share/personal?profilePublicId=xys7o3_7JlgZl91b',
      pair: '/match/share/pair?challengeCode=mKOdmiLcE0JU&resultId=VIbseuqFQuk6RRDr',
      ranking: '/match/share/ranking?challengeCode=mKOdmiLcE0JU',
    };
    for (const [type, route] of Object.entries(routes)) {
      await page.goto((process.env.MATCH_TEST_BASE_URL ?? 'http://127.0.0.1:3000') + route);
      const preview = page.locator('.wm-share-card img');
      await preview.waitFor();
      const brand = await preview.evaluate(async image => {
        await image.decode();
        const source = await (await fetch(image.src)).text();
        const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
        const logos = doc.querySelectorAll('[data-share-brand]');
        const logo = logos[0];
        return { count: logos.length, text: logo.textContent, width: Number(logo.getAttribute('width')), height: Number(logo.getAttribute('height')), x: Number(logo.getAttribute('x')), bottom: Number(doc.documentElement.getAttribute('height')) - Number(logo.getAttribute('y')) - Number(logo.getAttribute('height')), pathMatches: logo.querySelector('path').getAttribute('d') === document.querySelector('.brand-logo path').getAttribute('d') };
      });
      assert.deepEqual(brand, { count: 1, text: '웹툰핏', width: 68, height: 20, x: 141, bottom: 5, pathMatches: true }, type);
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: '이미지 저장', exact: true }).click();
      const filePath = path.join(output, `${type}_smaller_logo_live.png`);
      await (await download).saveAs(filePath);
      const bytes = fs.readFileSync(filePath);
      assert.equal(bytes.readUInt32BE(16), 1080);
      assert.ok(await preview.evaluate(async (image, png) => {
        const exported = new Image(); exported.src = `data:image/png;base64,${png}`; await exported.decode();
        const canvas = document.createElement('canvas'); canvas.width = exported.naturalWidth; canvas.height = exported.naturalHeight;
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const expected = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(exported, 0, 0);
        const actual = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let differences = 0;
        for (let i = 0; i < actual.length; i++) if (Math.abs(actual[i] - expected[i]) > 1) differences++;
        return differences / actual.length < .002;
      }, bytes.toString('base64')), `${type}: downloaded image matches preview`);
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, output, checks: ['all three share types use smaller centered logo and wordmark', '1080px downloads match previews', 'only existing service data', 'no production writes'] }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
