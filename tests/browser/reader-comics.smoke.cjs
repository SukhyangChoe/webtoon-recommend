/* Public result fixtures. Every service API request is intercepted. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const { withReaderComic } = await import('../../src/features/match/server/readerComics.mjs');
  const { COMIC_JOBS } = await import('../../scripts/reader-comics/jobs.mjs');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  const base = process.env.MATCH_TEST_BASE_URL || 'http://127.0.0.1:3000';
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    let job = COMIC_JOBS[0], legacy = false, broken = false;
    await context.route('**/api/v1/**', route => route.fulfill({ json: new URL(route.request().url()).pathname === '/api/v1/results/comic-fixture' ? {
      publicProfileId: 'comic-fixture', nickname: '독자', canManage: false, topGenres: [], displayGenres: [], wellMatchedLabels: [], lessMatchedLabels: [],
      readerExplanation: legacy ? { headline: '예전 사용설명서', scene: '이전의 일상 에피소드', introduction: '나의 독서 취향' } : withReaderComic({ genreKey: job.genre, sceneKey: job.key, headline: '내 취향 사용설명서', introduction: '나의 독서 취향', scene: job.sourceScene }),
    } : { items: [], active: false } }));
    await context.route('**/match/reader-comics/v1/*.webp', route => broken ? route.fulfill({ status: 404, body: '' }) : route.continue());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = base + '/match/result/comic-fixture';
    for (const width of [320, 390, 540]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(url);
      const comic = page.locator('.wm-reader-comic');
      await comic.scrollIntoViewIfNeeded();
      await comic.evaluate(img => img.decode());
      assert.ok(await comic.evaluate(el => el.getBoundingClientRect().right <= innerWidth && el.naturalWidth > 0));
      assert.equal(await comic.getAttribute('src'), job.src);
      const scene = page.locator('.wm-reader-scene');
      assert.equal(await scene.locator('p').innerText(), job.sourceScene);
      assert.ok(await scene.locator('p').isVisible());
      assert.ok(await comic.evaluate(el => el.getBoundingClientRect().top >= el.previousElementSibling.getBoundingClientRect().bottom));
      if (width === 390 && process.env.READER_COMIC_SCREENSHOT) {
        await page.locator('.wm-reader-explanation').screenshot({ path: process.env.READER_COMIC_SCREENSHOT });
      }
      assert.equal(await page.locator('.wm-reader-explanation details').count(), 0);
    }
    job = COMIC_JOBS.find(item => item.key === 'murim.growth');
    await page.reload();
    assert.equal(await page.locator('.wm-reader-comic').getAttribute('src'), job.src);
    broken = true;
    await page.reload();
    await page.getByText(job.sourceScene, { exact: true }).waitFor();
    assert.equal(await page.locator('.wm-reader-comic').count(), 0);
    legacy = true;
    await page.reload();
    await page.getByText('이전의 일상 에피소드', { exact: true }).waitFor();
    assert.equal(await page.locator('.wm-reader-comic').count(), 0);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, checks: ['matched static images', '320/390/540px layout', 'visible original text above comic', 'no dialogue disclosure', 'changed episode', 'image failure fallback', 'legacy explanations'] }));
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
