// Read-only live integration: no quiz submissions or recommendation mutations.
import assert from 'node:assert/strict';
import postgres from 'postgres';
const sql = postgres(process.env.WEBTOON_MATCH_RUNTIME_DATABASE_URL || process.env.WEBTOON_MATCH_DATABASE_URL,
  { ssl: 'require', prepare: false, max: 1, onnotice: () => {} });
try {
  const readers = await sql.begin('read only', tx => tx`
    select s.public_profile_id, p.anonymous_id::text
    from (select distinct on(profile_id) * from public.match_taste_snapshots
      order by profile_id,completed_at desc,snapshot_id desc) s
    join public.match_profiles p using(profile_id)
    order by s.completed_at desc limit 20
  `);
  const base = process.env.MATCH_TEST_BASE_URL || 'http://127.0.0.1:3000';
  let tested = false;
  for (const reader of readers) {
    const headers = { 'x-match-anonymous-id': reader.anonymous_id };
    const url = `${base}/api/v1/results/${reader.public_profile_id}`;
    const resultResponse = await fetch(url, { headers });
    assert.equal(resultResponse.status, 200);
    const result = await resultResponse.json();
    const top = result.topGenres?.[0];
    if (!JSON.stringify(top).includes('무협') && !JSON.stringify(top).includes('murim')) continue;
    const response = await fetch(url + '/daily-picks', { headers });
    const picks = await response.json();
    assert.equal(response.status, 200, JSON.stringify(picks));
    assert.equal(picks.mode, 'personalized');
    assert.equal(picks.items.length, 3);
    assert.ok(picks.items.some(item => item.mainGenreLabel === '무협'), 'murim preference reaches selection');
    const repeated = await (await fetch(url + '/daily-picks', { headers })).json();
    assert.deepEqual(picks, repeated);
    assert.doesNotMatch(JSON.stringify(picks), /fixed-preview|snapshotData|"answers"|candidateOverallFit/);
    const visitor = await fetch(url + '/daily-picks');
    assert.equal(visitor.status, 403);
    console.log(JSON.stringify({ ok: true, topGenre: top, items: picks.items.map(item => ({ title: item.title, genre: item.mainGenreLabel })),
      deterministic: true, ownerOnly: true, writes: 0 }));
    process.exitCode = 0;
    tested = true;
    break;
  }
  assert.ok(tested,'a current murim-first reader must be exercised');
} finally { await sql.end(); }
