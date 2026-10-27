/* Read-only integration check against the existing local challenge. No DB writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const postgres = require('postgres');
const { chromium } = require('playwright');

(async () => {
  const { applyRecommendationTaste } = await import('../../src/features/match/engine/recommendationTasteEngine.mjs');
  const { calculateCompatibility } = await import('../../src/features/match/engine/compatibilityEngine.mjs');
  const seed = require('../../src/features/match/data/questionSeed.v0.4.json');
  const base = process.env.MATCH_TEST_BASE_URL ?? 'http://127.0.0.1:3000';
  const shots = fs.mkdtempSync(path.join(os.tmpdir(), 'webtoon-current-persona-'));
  const sql = postgres(process.env.WEBTOON_MATCH_DATABASE_URL, { ssl: 'require', prepare: false, max: 1 });
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const [challenge] = await sql`select challenge_id, challenge_code, owner_snapshot_id, status from public.match_challenges where challenge_code = 'mKOdmiLcE0JU'`;
    assert.equal(challenge.status, 'active');
    const entries = await sql`select entry_id, challenger_snapshot_id, result_id, hidden_by_owner from public.match_challenge_entries where challenge_id = ${challenge.challenge_id}`;
    const ids = [challenge.owner_snapshot_id, ...entries.map(entry => entry.challenger_snapshot_id)];
    const pairs = await sql`
      select original.snapshot_id as linked_id, original.public_profile_id as linked_public_id, original.snapshot_data as linked_data,
        latest.snapshot_id, latest.profile_id, latest.public_profile_id,
        latest.question_set_version, latest.snapshot_data
      from public.match_taste_snapshots original join lateral (
        select * from public.match_taste_snapshots s
        where s.profile_id = original.profile_id and s.question_set_version = original.question_set_version
        order by completed_at desc, snapshot_id desc limit 1
      ) latest on true where original.snapshot_id = any(${sql.array(ids)}::uuid[])
    `;
    const recommendations = await sql`select r.profile_id, w.raw_data from public.match_profile_recommendations r join public.webtoons w on w.canonical_webtoon_id = r.canonical_webtoon_id where r.profile_id = any(${sql.array(pairs.map(row => row.profile_id))}::uuid[]) and w.catalog_status = 'active'`;
    const snapshots = Object.fromEntries(pairs.map(row => [row.linked_id, applyRecommendationTaste({ ...row.snapshot_data, snapshotId: row.snapshot_id, profileId: row.profile_id, publicProfileId: row.public_profile_id, questionSetVersion: row.question_set_version }, recommendations.filter(item => item.profile_id === row.profile_id).map(item => item.raw_data.recommendation), seed)]));
    const owner = snapshots[challenge.owner_snapshot_id];
    const latestGenre = owner.displayGenres[0].genreKey;
    assert.equal(latestGenre, 'murim', 'the reported retake is actually murim-first');
    assert.equal(pairs.find(row => row.linked_id === challenge.owner_snapshot_id).linked_data.displayGenres[0].genreKey, 'ropan', 'reproduces a challenge still pinned to the previous ropan snapshot');
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/v1/analytics/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    await page.route('**/api/v1/match-events', route => route.fulfill({ status: 202, contentType: 'application/json', body: '{"accepted":true}' }));
    const response = await page.request.get(`${base}/api/v1/challenges/${challenge.challenge_code}/ranking`);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['cache-control'], /private, no-store/);
    const ranking = await response.json();
    assert.equal(ranking.ownerGenreKey, latestGenre);
    assert.deepEqual(ranking.ownerTopGenreKeys, owner.displayGenres.slice(0, 3).map(item => item.genreKey));
    const currentResult = await (await page.request.get(`${base}/api/v1/results/${owner.publicProfileId}`)).json();
    assert.equal(currentResult.topGenres[0].genreKey, ranking.ownerGenreKey);
    const oldOwner = pairs.find(row => row.linked_id === challenge.owner_snapshot_id);
    const oldResult = await (await page.request.get(`${base}/api/v1/results/${oldOwner.linked_public_id}`)).json();
    const expectedOldResult = applyRecommendationTaste(oldOwner.linked_data, recommendations.filter(item => item.profile_id === oldOwner.profile_id).map(item => item.raw_data.recommendation), seed);
    assert.deepEqual(oldResult.topGenres, expectedOldResult.displayGenres.slice(0, 3), 'historical results keep their original test answers while applying the current recommendation policy');
    for (const entry of entries.filter(entry => !entry.hidden_by_owner)) {
      const challenger = snapshots[entry.challenger_snapshot_id];
      const expected = calculateCompatibility(owner, challenger);
      const match = await (await page.request.get(`${base}/api/v1/challenges/${challenge.challenge_code}/results/${entry.result_id}`)).json();
      assert.equal(match.ownerGenreKey, latestGenre);
      assert.equal(match.challengerGenreKey, challenger.displayGenres[0].genreKey);
      assert.equal(match.score, expected.score, 'pair score follows the same latest snapshots as the SD characters');
      const ranked = ranking.entries.find(item => item.entryId === entry.entry_id);
      assert.equal(ranked.score, match.score, 'relationship list and detailed result have identical scores');
      assert.equal(ranked.genreKey, match.challengerGenreKey);
      assert.equal(ranked.rank, match.rank);
    }
    await page.goto(`${base}/match/c/${challenge.challenge_code}/ranking`);
    await page.locator('.wm-relationship-owner img').waitFor();
    assert.match(await page.locator('.wm-relationship-owner img').getAttribute('src'), /sd-v1.*murim/);
    assert.ok((await page.locator('.wm-relationship-filters button').allTextContents())[1].includes('무협'));
    await page.locator('.wm-relationship-owner img').evaluate(img => img.decode());
    await page.addStyleTag({ content: 'nextjs-portal { display:none !important; }' });
    await page.screenshot({ path: path.join(shots, 'current_murim_relationship.png') });
    await page.goto(`${base}/match/test/intro`);
    const start = page.getByRole('button', { name: '테스트 시작', exact: true });
    await start.waitFor();
    assert.ok(await start.isDisabled());
    await page.getByRole('textbox', { name: /테스트에서 사용할 닉네임/ }).fill('화살표 확인');
    assert.ok(await start.isEnabled());
    for (const width of [320, 390, 435]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForFunction(value=>innerWidth===value,width);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.ok(await page.locator('.match-screen-header.is-test-intro').evaluate(el=>{
        const link=el.querySelector('a'),arrow=link.querySelector('svg'),label=link.querySelector('.match-screen-header-label');
        const box=el.getBoundingClientRect(),a=arrow.getBoundingClientRect(),text=label.getBoundingClientRect();
        const logo=document.querySelector('.brand-bar__logo').getBoundingClientRect();
        const center=rect=>(rect.top+rect.bottom)/2;
        return Math.abs((logo.left+logo.right)/2-innerWidth/2)<1&&Math.abs(center(a)-center(text))<1&&Math.abs(center(a)-center(box)-2)<1&&Math.abs(center(logo)-center(box))<1&&link.getBoundingClientRect().right<=logo.left-8&&a.width===32&&getComputedStyle(label).fontSize==='16px';
      }), `centered intro logo and shared 2px optical offset for the enlarged back control at ${width}px`);
      assert.equal(await page.getByRole('navigation',{name:'화면 이동'}).getByRole('link',{name:'시작',exact:true}).getAttribute('href'),'/match');
      assert.ok(await page.locator('.match-intro-page').evaluate(el=>{
        const header=document.querySelector('.match-screen-header').getBoundingClientRect(),card=el.querySelector('.match-card').getBoundingClientRect();
        return getComputedStyle(el).paddingTop==='12px'&&Math.abs(card.top-header.bottom-12)<1;
      }), `intro card sits just 12px below the header at ${width}px`);
      assert.ok(await page.locator('.match-cyan-navigation').evaluate(el => {
        const buttons = [...el.children];
        const boxes = buttons.map(button => button.getBoundingClientRect());
        return Math.abs(boxes[0].width - boxes[1].width) < 1 && boxes[0].height === boxes[1].height && buttons.every(button => {
          const rect = button.getBoundingClientRect();
          return [...button.children].every(child => {
            const box = child.getBoundingClientRect();
            return box.left >= rect.left && box.right <= rect.right && box.top >= rect.top && box.bottom <= rect.bottom;
          });
        });
      }), `equal buttons and unclipped arrows/text at ${width}px`);
      assert.ok(await page.locator('.match-cyan-navigation .wm-icon').evaluateAll(items => items.every(el => el.getBoundingClientRect().width >= 26 && getComputedStyle(el).strokeWidth === '2.2px')), 'both navigation arrows are enlarged');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addStyleTag({ content: 'nextjs-portal { display:none !important; }' });
    await page.locator('.match-cyan-navigation').screenshot({ path: path.join(shots, 'larger_navigation_arrows.png') });
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:path.join(shots,'intro_centered_header.png')});
    // Use the existing local owner's identity only for read-only UI inspection.
    // Never log it or submit recommendation/nickname/settings mutations.
    const [ownerIdentity] = await sql`select anonymous_id from public.match_profiles where profile_id = ${owner.profileId}`;
    await context.addCookies([{ name: 'wm_aid', value: ownerIdentity.anonymous_id, url: base }]);
    await page.goto(`${base}/match/result/${owner.publicProfileId}`);
    const heading = page.locator('.wm-recommendations-heading');
    const manage = page.getByRole('link', { name: '내 추천작 관리', exact: true });
    await manage.waitFor();
    assert.equal(await heading.getByRole('heading', { name: '내 추천작', exact: true }).locator('svg').count(), 1);
    assert.equal(await manage.locator('svg circle').count(), 1);
    assert.equal(await manage.textContent(), '관리');
    for (const width of [320, 390, 435]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await heading.evaluate(el => {
        const title = el.querySelector('h2').getBoundingClientRect();
        const link = el.querySelector('a').getBoundingClientRect();
        const frame = el.getBoundingClientRect();
        return title.right < link.left && link.right <= frame.right && link.height >= 44 && Math.abs(title.y + title.height / 2 - link.y - link.height / 2) < 1;
      }), `book, title and settings link align at ${width}px`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addStyleTag({ content: 'nextjs-portal { display:none !important; }' });
    await heading.evaluate(el => window.scrollTo({ top: el.parentElement.getBoundingClientRect().top + scrollY - 140, behavior: 'instant' }));
    await heading.locator('..').screenshot({ path: path.join(shots, 'recommendation_heading_icons.png') });
    await manage.click();
    await page.waitForURL(`**/match/result/${owner.publicProfileId}/recommendations`);
    await page.locator('.wm-manager-screen').waitFor();
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, screenshots: shots, checks: ['real stale ropan -> latest murim', 'owner and challenger latest characters', 'latest-version-safe scores consistent with ranking and pair detail', 'no-store responses', '26/28px navigation arrows and equal buttons at 320/390/435px', 'read-only DB access'] }, null, 2));
    await context.close();
  } finally { await browser.close(); await sql.end(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
