import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildCatalogRows, catalogDiff, importedDetailData } from '../../scripts/webtoon-catalog-import.mjs';
import { rankedWorkLabels, safeOfficialWorkUrl, safeWorkReturnPath, sharedFitReasons, workArtStyleCards, workDetailHref, workStatusLabel } from '../../src/features/match/config/workDetailPresentation.mjs';

const work = (extra = {}) => ({canonicalWebtoonId:'work-1',title:'작품',platform:'플랫폼',mainGenre:'fantasy',recommendationEligible:false,...extra});
test('coverage without a reviewed vector remains missing, never a synthetic zero vector',()=>{
  const rows=buildCatalogRows([work()]);
  assert.equal(rows[0].raw_data.recommendation,undefined);
  assert.equal(rows[0].recommendation_eligible,false);
  assert.throws(()=>buildCatalogRows([work({recommendationEligible:true})]),/INVALID_RECOMMENDATION/);
  assert.throws(()=>buildCatalogRows([work({recommendation:{genreScores:{fantasy:6}}})]),/INVALID_SCORE/);
  assert.throws(()=>buildCatalogRows([work({recommendation:{genreScores:{action:3}}})]),/UNKNOWN_GENRE/);
  assert.throws(()=>buildCatalogRows([work(),work()]),/DUPLICATE/);
  assert.throws(()=>buildCatalogRows([]),/EMPTY_CATALOG/);
});
test('integrated seed has five canonical genres and all 11910 works import without altering the source',()=>{
  const seed=JSON.parse(readFileSync(new URL('../../src/data/webtoons/webtoons_seed_current.json',import.meta.url),'utf8'));
  const rows=buildCatalogRows(seed);
  assert.equal(rows.length,11910);
  assert.equal(rows.filter(row=>row.recommendation_eligible).length,2790);
  assert.equal(rows.filter(row=>row.raw_data.recommendation?.genreScores?.action!==undefined).length,0);
  assert.equal(seed.filter(item=>item.recommendation===undefined).length,2);
});
test('catalog diff compares values independent of JSON key order and never deletes historical IDs',()=>{
  const previous=[{canonical_webtoon_id:'a',recommendation_eligible:false,catalog_status:'active',raw_data:{recommendation:{tagScores:{b:2,a:1}}}},{canonical_webtoon_id:'old',catalog_status:'retired'}];
  const next=[{...previous[0],raw_data:{recommendation:{tagScores:{a:1,b:2}}}}];
  assert.deepEqual(catalogDiff(next,previous),{added:[],vectorsChanged:[],eligibilityChanged:[],retired:[]});
  assert.deepEqual(importedDetailData({metadata:{status:'hiatus',sourceContinuation:'INTERNAL MEMO'},officialUrl:'https://example.com'}),{status:'hiatus',sourceUrl:'https://example.com'});
});
test('detail navigation and official URLs reject offsite returns, script protocols and backslashes',()=>{
  for(const path of ['https://evil.example','//evil.example','/match/\\evil','/match-other','/match\n/evil'])assert.equal(safeWorkReturnPath(path),'/match');
  assert.equal(safeWorkReturnPath('/match/c/code/match/result?from=ranking'),'/match/c/code/match/result?from=ranking');
  assert.equal(safeOfficialWorkUrl('javascript:alert(1)'),null);
  assert.equal(safeOfficialWorkUrl('/match'),null);
  assert.equal(safeOfficialWorkUrl('https://user:password@example.com'),null);
  assert.match(workDetailHref('wt_001','profile-1','/match/result/profile-1'),/^\/match\/work\/wt_001\?profile=profile-1&returnTo=/);
});
test('feature cards omit unknown and zero values, retain label provenance and distinct art groups',()=>{
  assert.deepEqual(rankedWorkLabels({a:0,b:3,c:2},{a:'A',b:'B'}),[{key:'b',label:'B',icon:'spark'}]);
  const styles=workArtStyleCards({elegant_ornate:3,rounded_cute:2,bright_vivid:3,detailed_rendering:2});
  assert.equal(new Set(styles.map(item=>item.category)).size,styles.length);
  assert.equal(styles.find(item=>item.category==='인물 표현').key,'elegant_ornate');
  assert.equal(workStatusLabel('hiatus'),'휴재');
  assert.equal(workStatusLabel('unverified'),null);
  assert.deepEqual(sharedFitReasons({tagScores:{b:1}},{tagScores:{a:3,b:2}},{a:'A',b:'B'},{}),[{key:'tagScores.b',label:'B',icon:'spark'}]);
});
test('detail storage and API isolate presentation from source imports and private vectors',()=>{
  const migration=readFileSync(new URL('../../supabase/migrations/202610240001_webtoon_details.sql',import.meta.url),'utf8');
  assert.match(migration,/on delete restrict/);
  assert.match(migration,/enable row level security/);
  assert.match(migration,/revoke all on table public.webtoon_details from anon, authenticated/);
  const sync=readFileSync(new URL('../../scripts/sync-webtoon-catalog.mjs',import.meta.url),'utf8');
  assert.match(sync,/do update set imported_data=excluded.imported_data,updated_at=now\(\)/);
  assert.doesNotMatch(sync,/delete from public\./i);
  assert.match(sync,/SOCIAL_DATA_CHANGED_ABORTING_IMPORT/);
  const store=readFileSync(new URL('../../src/features/match/server/workDetailStore.ts',import.meta.url),'utf8');
  assert.match(store,/calculateRecommendationFit/);
  assert.match(store,/comparableAxes.length >= 2/);
  const route=readFileSync(new URL('../../src/app/api/v1/webtoons/[canonicalWebtoonId]/route.ts',import.meta.url),'utf8');
  assert.match(route,/private, no-store/);
});

test('saving recommendations returns the same detail-backed cover and synopsis as loading them',()=>{
  const store=readFileSync(new URL('../../src/features/match/server/webtoonCatalogStore.ts',import.meta.url),'utf8');
  const saved=store.split('const savedRows = await sql<RecommendationRow[]>')[1].split('export async function setProfileRecommendationLike')[0];
  assert.match(saved,/left join public.webtoon_details details on details.canonical_webtoon_id = webtoons.canonical_webtoon_id/);
  assert.match(saved,/coalesce\(details.cover_url,webtoons.raw_data->>'coverUrl'/);
  assert.match(saved,/coalesce\(details.synopsis,webtoons.raw_data->>'introduction'/);
  assert.match(saved,/items: savedRows.map\(toRecommendationSummary\)/);
});
