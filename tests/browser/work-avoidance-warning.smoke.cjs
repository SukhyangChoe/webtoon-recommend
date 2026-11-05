/* Interaction fixtures are not screenshots. User-facing captures use actual
   stored answers and a matching DB work; every browser write is blocked. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { chromium } = require('playwright');
const postgres = require('postgres');
(async () => {
  const base = process.env.MATCH_TEST_BASE_URL || 'http://127.0.0.1:3000';
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'webtoon-avoidance-ui-'));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let warn = true, sparse = false;
    const warnings = [{ key: 'progression_fatigue', label: '반복·늘어지는 전개' }, { key: 'relationship_stress', label: '오해·감정싸움' }];
    const info = { canonicalWebtoonId: 'avoidance-fixture', title: '기피 요소 경고 검증', mainGenreLabel: '판타지', mainGenre: 'fantasy', platform: '플랫폼', coverUrl: null, officialUrl: 'https://example.com', introduction: '작품 소개', creators: [], contentLabels: [], appreciationPoints: [], artStyles: [], statusLabel: '연재중', ageRating: null, fit: null, fitStatus: 'pending', avoidanceWarnings: [] };
    await context.route('**/api/v1/**', route => {
      const request = route.request(), url = new URL(request.url());
      if (!['GET', 'HEAD'].includes(request.method())) return route.fulfill({ status: 202, json: { ok: true } });
      if (url.pathname === '/api/v1/webtoons/avoidance-fixture') return route.fulfill({ json: info });
      if (url.pathname === '/api/v1/webtoons/avoidance-fixture/fit') return route.fulfill({ json: {
        fitStatus: sparse ? 'insufficient_data' : 'ready', avoidanceWarnings: warn ? warnings : [],
        fit: sparse ? null : { rawScore: .81, displayScore: 90, percent: 81, displayScoreVersion: 'sqrt_v1', highlighted: true, reasons: [{ key: 'growth', label: '성장', icon: 'growth' }] },
      } });
      if (url.pathname === '/api/v1/results/avoidance-daily-fixture') return route.fulfill({ json: {
        publicProfileId: 'avoidance-daily-fixture', nickname: '검증', canManage: true, activeChallengeCode: null,
        topGenres: [], displayGenres: [], wellMatchedLabels: [], lessMatchedLabels: [],
        readerExplanation: { headline: '취향 설명', introduction: '검증용 설명', scene: '선택한 취향을 확인해요.' },
      } });
      if (url.pathname === '/api/v1/results/avoidance-daily-fixture/daily-picks') return route.fulfill({ json: {
        publicProfileId: 'avoidance-daily-fixture', mode: 'personalized', selectionVersion: 'fixture', items: [
          { canonicalWebtoonId: 'avoidance-fixture', title: '기피 요소가 남은 작품', mainGenreLabel: '판타지', platform: '플랫폼', coverUrl: null, avoidanceWarnings: warnings },
        ],
      } });
      return route.fulfill({ json: { items: [], ok: true } });
    });
    await page.goto(base + '/match/work/avoidance-fixture');
    const summary = page.locator('.wm-work-summary');
    await summary.getByRole('note', { name: '내 기피 요소 경고' }).waitFor();
    for (const [width, height] of [[320, 740], [390, 844], [540, 844], [900, 844], [390, 520]]) {
      await page.setViewportSize({ width, height });
      await summary.getByRole('note').scrollIntoViewIfNeeded();
      assert.match(await summary.getByRole('note').textContent(), /주의! 내가 피하고 싶은 요소/);
      assert.equal(await summary.getByRole('meter').getAttribute('aria-valuenow'), '90');
      assert.ok(await summary.getByRole('note').evaluate(element => { const r = element.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), 'warning wraps within the viewport');
      await page.locator('.wm-work-open').click();
      for (const tab of ['궁합 · 소개', '작품 정보']) {
        await page.getByRole('tab', { name: tab, exact: true }).click();
        await page.locator('.wm-work-dialog-body').evaluate(element => { element.scrollTop = 0; });
        const warning = page.locator('.wm-work-reading').getByRole('note');
        await warning.scrollIntoViewIfNeeded();
        assert.ok(await warning.isVisible());assert.match(await warning.textContent(), /핏 점수가 높아도/);
        assert.equal(await page.locator('.wm-work-reading-fit').getAttribute('aria-valuenow'), '90');
      }
      await page.getByRole('button', { name: '작품 정보 접기', exact: true }).click();
    }
    warn = false;await page.reload();await page.getByRole('meter', { name: '핏점수', exact: true }).waitFor();
    assert.equal(await page.locator('.wm-avoidance-warning').count(), 0);
    sparse = true;warn = true;await page.reload();await summary.getByRole('note').waitFor();
    assert.equal(await summary.getByRole('meter').count(), 0, 'warning is independent of a positive fit number');
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(base + '/match/result/avoidance-daily-fixture');
    await page.locator('.wm-daily-preview-warning').waitFor();
    await page.locator('.wm-daily-preview').click();
    const daily = page.getByRole('dialog', { name: '오늘의 취향작', exact: true });
    await daily.getByRole('note', { name: '내 기피 요소 경고' }).waitFor();
    assert.match(await daily.getByRole('note').textContent(), /주의! 내가 피하고 싶은 요소/);
    assert.ok(await daily.getByRole('note').evaluate(element => { const r=element.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth; }));
    assert.deepEqual(errors, []);await context.close();

    let actualCapture = false;
    if (process.env.WEBTOON_MATCH_DATABASE_URL) {
      const sql = postgres(process.env.WEBTOON_MATCH_DATABASE_URL, { ssl: 'require', prepare: false, max: 1, onnotice: () => {} });
      let reader, work;
      try {
        [reader] = await sql.begin('read only', tx => tx`
          with latest as (select distinct on (profile_id) profile_id,public_profile_id,snapshot_data
            from public.match_taste_snapshots order by profile_id,completed_at desc,snapshot_id desc)
          select p.anonymous_id::text,latest.public_profile_id,latest.snapshot_data
          from latest join public.match_profiles p using(profile_id)
          where jsonb_array_length(coalesce(latest.snapshot_data#>'{answers,avoidance}','[]'::jsonb))>0
            and latest.snapshot_data#>'{answers,avoidance}' <> '["avoid_none"]'::jsonb limit 1
        `);
        if (reader) {
          const { readerAvoidanceKeys } = await import('../../src/features/match/engine/avoidanceEngine.mjs');
          const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/features/match/data/questionSeed.v0.4.json'), 'utf8'));
          const keys = readerAvoidanceKeys(reader.snapshot_data, seed);
          if (keys.length) [work] = await sql.begin('read only', tx => tx`
            select canonical_webtoon_id from public.webtoons w
            where catalog_status='active' and recommendation_eligible=true and public.webtoon_is_public_safe(raw_data)
              and exists(select 1 from jsonb_each(w.raw_data#>'{recommendation,avoidanceTagScores}') t
                where t.key=any(${keys}::text[]) and jsonb_typeof(t.value)='number' and (t.value#>>'{}')::numeric>0)
            order by canonical_webtoon_id limit 1
          `);
        }
      } finally { await sql.end(); }
      assert.ok(reader && work, 'actual warning capture requires a stored reader choice and a real matching work');
      const actual = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
      await actual.route('**/api/v1/**', route => ['GET', 'HEAD'].includes(route.request().method())
        ? route.continue({ headers: { ...route.request().headers(), 'x-match-anonymous-id': reader.anonymous_id } })
        : route.fulfill({ status: 202, json: { ok: true } }));
      const real = await actual.newPage();
      await real.goto(base + '/match/work/' + encodeURIComponent(work.canonical_webtoon_id));
      await real.locator('.wm-work-summary').getByRole('note', { name: '내 기피 요소 경고' }).waitFor();
      await real.evaluate(() => document.fonts.ready);
      await real.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
      await real.locator('.wm-work-sheet').screenshot({ path: path.join(out, 'personal_avoidance_warning_actual.png') });
      await real.locator('.wm-work-open').click();
      await real.locator('.wm-work-reading').getByRole('note').waitFor();
      await actual.close();actualCapture = true;
    }
    console.log(JSON.stringify({ ok: true, out, actualCapture, checks: ['320/390/540/900 widths and short viewport', 'collapsed and both expanded tabs', 'daily preview and list warnings', 'high fit unchanged', 'warning with insufficient positive data', 'no-warning reader', 'all browser writes blocked'] }));
  } finally { await browser.close(); }
})().catch(error => { console.error({ name: error.name, message: error.message }); process.exitCode = 1; });
