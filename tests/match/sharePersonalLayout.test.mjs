import test from 'node:test';
import assert from 'node:assert/strict';
import { personalShareLayout, shareStarCount } from '../../src/features/match/share/sharePersonalLayout.mjs';

test('all genre cards share the height needed by the largest star count', () => {
  for (const [counts, rows, height] of [[[1, 2, 5], 1, 85], [[1, 6, 2], 2, 97], [[14, 4, 1], 3, 109], [[1, 18, 2], 4, 121]]) {
    const layout = personalShareLayout(counts.map(stars => ({ stars })), true);
    assert.equal(layout.starRows, rows);
    assert.equal(layout.genreHeight, height);
    assert.equal(layout.recommendationDividerY, layout.genreY + height + 18);
    assert.ok(407 + (rows - 1) * 12 + 11 < layout.genreY + height);
  }
});
test('recommendations and total card height move together rather than leaving an empty gap', () => {
  const small = personalShareLayout([{ stars: 1 }], true), large = personalShareLayout([{ stars: 18 }], true);
  assert.equal(large.genreHeight - small.genreHeight, 36);
  assert.equal(large.coverY - small.coverY, 36);
  assert.equal(large.cardHeight - small.cardHeight, 36);
  assert.equal(small.coverWidth, 68);
  assert.equal(small.coverHeight, 98);
  assert.ok(small.recommendationTitleY > small.coverY + small.coverHeight);
  assert.equal(small.footerY, small.recommendationTitleY + 14 + 19);
  assert.equal(small.cardHeight, small.footerY + 34);
  const noPicks = personalShareLayout([], false);
  assert.equal(noPicks.footerY, noPicks.genreY + noPicks.genreHeight + 18);
  assert.equal(noPicks.cardHeight, noPicks.footerY + 34);
});
test('invalid and extreme star counts cannot create invalid SVG dimensions', () => {
  for (const value of [NaN, Infinity, -Infinity, null, undefined, -3]) assert.equal(shareStarCount(value), 0);
  assert.equal(shareStarCount(99), 18);
  assert.equal(shareStarCount(6.9), 6);
  assert.equal(personalShareLayout([{ stars: NaN }], true).starRows, 1);
});
