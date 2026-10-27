/* Real save SQL, always rolled back. UI save response is intercepted: no committed writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');
const postgres = require('postgres');
const { chromium } = require('playwright');

(async () => {
  const base = process.env.MATCH_TEST_BASE_URL ?? 'http://127.0.0.1:3000';
  const shots = fs.mkdtempSync(path.join(os.tmpdir(), 'webtoon-save-cover-'));
  const sql = postgres(process.env.WEBTOON_MATCH_DATABASE_URL, { ssl: 'require', prepare: false, max: 1 });
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const [owner] = await sql`
      select latest.public_profile_id, p.anonymous_id from public.match_challenges c
      join public.match_profiles p on p.profile_id = c.owner_profile_id
      join lateral (select public_profile_id from public.match_taste_snapshots s where s.profile_id = p.profile_id order by completed_at desc, snapshot_id desc limit 1) latest on true
      where c.challenge_code = 'mKOdmiLcE0JU'
    `;
    // Load the real store, swapping only the transaction boundary to force ROLLBACK.
    let rolledBack = 0;
    const dryDatabase = new Proxy(sql, { get(target, key) {
      if (key !== 'begin') return Reflect.get(target, key);
      return async callback => {
        const rollback = new Error('INTENTIONAL_SAVE_TEST_ROLLBACK');
        let value;
        try { await sql.begin(async transaction => { value = await callback(transaction); throw rollback; }); }
        catch (error) { if (error !== rollback) throw error; rolledBack++; }
        return value;
      };
    } });
    const storePath = path.resolve('src/features/match/server/webtoonCatalogStore.ts');
    const localRequire = createRequire(storePath);
    const moduleValue = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync(storePath, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(source, { exports: moduleValue.exports, module: moduleValue, require: name => name === 'server-only' ? {} : name === './database' ? { getMatchDatabase: () => dryDatabase } : localRequire(name) }, { filename: storePath });
    const store = moduleValue.exports;
    const before = await store.getProfileRecommendations(owner.public_profile_id, owner.anonymous_id);
    assert.ok(before.length > 0, 'use the existing saved recommendations, never synthetic user data');
    assert.ok(before.every(item => item.coverUrl), 'the saved works have real detail-backed covers');
    const saved = await store.replaceProfileRecommendations({ publicProfileId: owner.public_profile_id, anonymousId: owner.anonymous_id, recommendations: before.map(item => ({ canonicalWebtoonId: item.canonicalWebtoonId, recommendationComment: item.recommendationComment })) });
    assert.equal(rolledBack, 1);
    assert.equal(JSON.stringify(saved.items), JSON.stringify(before), 'real save response retains covers, synopsis, order, comments and likes');
    const after = await store.getProfileRecommendations(owner.public_profile_id, owner.anonymous_id);
    assert.equal(JSON.stringify(after), JSON.stringify(before), 'rollback preserves the actual saved list');

    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'wm_aid', value: owner.anonymous_id, url: base }]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/v1/match-events', route => route.fulfill({ status: 202, contentType: 'application/json', body: '{"accepted":true}' }));
    await page.route('**/api/v1/analytics/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    let saves = 0;
    await page.route(`**/api/v1/results/${owner.public_profile_id}/recommendations`, route => {
      if (route.request().method() !== 'PUT') return route.continue();
      saves++;
      assert.equal(JSON.stringify(route.request().postDataJSON().recommendations), JSON.stringify(before.map(item => ({ canonicalWebtoonId: item.canonicalWebtoonId, recommendationComment: item.recommendationComment }))));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: saved.items, recommendationInfluence: { workCount: saved.items.length, recommendationPercent: 80, testPercent: 20 } }) });
    });
    await page.goto(`${base}/match/result/${owner.public_profile_id}/recommendations`);
    const covers = page.locator('.wm-selected-list img.wm-work-cover');
    await covers.first().waitFor();
    const sources = await covers.evaluateAll(items => items.map(img => img.getAttribute('src')));
    await page.getByRole('button', { name: '추천작 저장', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '추천작과 코멘트를 저장했어요.' }).waitFor();
    assert.equal(saves, 1);
    assert.equal(await covers.count(), before.length);
    assert.deepEqual(await covers.evaluateAll(items => items.map(img => img.getAttribute('src'))), sources, 'covers survive the actual manager setSelected(saveResponse.items) update');
    await covers.evaluateAll(items => Promise.all(items.map(img => img.decode())));
    assert.equal(await page.locator('.wm-selected-list .wm-work-cover--empty').count(), 0);
    // Deliverable screenshot is a fresh real server read, not the intercepted save state.
    await page.reload();
    await covers.first().waitFor();
    await covers.evaluateAll(items => Promise.all(items.map(img => img.decode())));
    await page.addStyleTag({ content: 'nextjs-portal { display:none !important; }' });
    const card = page.locator('.wm-selected-list > li').first();
    await card.evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 80, behavior: 'instant' }));
    await page.screenshot({ path: path.join(shots, 'saved_recommendation_real_cover.png') });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, screenshots: shots, checks: ['actual save SQL returns full cover metadata', 'real transaction rolled back', 'comments/order/likes unchanged', 'manager cover survives save response', 'reload decodes real cover images', 'no committed database writes'] }, null, 2));
    await context.close();
  } finally { await browser.close(); await sql.end(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
