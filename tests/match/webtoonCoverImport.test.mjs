import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coverObjectPath, coverProvenance, planCoverImport } from '../../scripts/webtoon-cover-policy.mjs';
import { workCoverSources } from '../../src/features/match/config/recommendationPresentation.mjs';

const record = (extra = {}) => ({ canonicalWebtoonId: 'wt_fantasy_001', title: '작품', platformStored: '플랫폼', integratedRelativePath: 'originals/wt_fantasy_001.jpg', byteSize: 100, sha256: 'a'.repeat(64), rightsState: 'not_verified', publicationReady: false, ...extra });
const catalog = [{ canonicalWebtoonId: 'wt_fantasy_001', title: '작품', platform: '플랫폼', recommendationEligible: true }];
test('cover import matches identity, title and platform without changing recommendation eligibility', () => {
  assert.equal(planCoverImport({ records: [record()] }, catalog).accepted.length, 1);
  const mismatch = planCoverImport({ records: [record({ title: '다른 제목', platformStored: '다른 플랫폼' })] }, catalog);
  assert.deepEqual(mismatch.held[0].reasons, ['title_mismatch', 'platform_mismatch']);
  assert.equal(mismatch.accepted.length, 0);
  assert.equal(planCoverImport({ records: [record()] }, [{ ...catalog[0], recommendationEligible: false }]).accepted.length, 1);
  assert.equal(catalog[0].recommendationEligible, true);
  assert.equal(planCoverImport({ records: [record()] }, []).held[0].reasons[0], 'unknown_id');
});
test('cover importer rejects unsafe paths, duplicate IDs and invalid hashes', () => {
  assert.throws(() => planCoverImport({ records: [] }, catalog), /EMPTY/);
  assert.throws(() => planCoverImport({ records: [record(), record()] }, catalog), /DUPLICATE/);
  for (const integratedRelativePath of ['../secrets', '/originals/wt_fantasy_001.jpg', 'originals/wt_other.jpg']) assert.throws(() => planCoverImport({ records: [record({ integratedRelativePath })] }, catalog), /UNSAFE/);
  assert.throws(() => planCoverImport({ records: [record({ sha256: 'bad' })] }, catalog), /INVALID_COVER_METADATA/);
});
test('user-directed publication never upgrades source license or publication flags', () => {
  const source = record();
  const provenance = coverProvenance(source, 'covers.zip', 'b'.repeat(64), []);
  assert.equal(provenance.rightsState, 'not_verified');
  assert.equal(provenance.publicationReady, false);
  assert.equal(provenance.publicationRequestedByUser, true);
  assert.equal(source.publicationReady, false);
});
test('responsive variants are generated only for our known immutable Storage paths', () => {
  const object = coverObjectPath('wt_fantasy_001', 'a'.repeat(64), 640);
  const url = `https://abcdefghijklmnopqrst.supabase.co/storage/v1/object/public/webtoon-covers/${object}`;
  const sources = workCoverSources(url);
  assert.ok(sources.srcSet.includes('-w320-q82-v1.webp 320w'));
  assert.ok(sources.srcSet.endsWith('-w640-q82-v1.webp 640w'));
  assert.equal(workCoverSources('/match/covers/demo.webp').srcSet, undefined);
  assert.equal(workCoverSources('https://other.example/a-w640-q82-v1.webp').srcSet, undefined);
  assert.equal(workCoverSources('javascript:alert(1)').src, null);
  assert.throws(() => coverObjectPath('invalid', 'a'.repeat(64), 640), /INVALID/);
});
