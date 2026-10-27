import test from 'node:test';
import assert from 'node:assert/strict';
import { appendRecommendationReason, recommendationCarouselState, recommendationGenreLabel, reorderRecommendation, safeWorkCoverUrl } from '../../src/features/match/config/recommendationPresentation.mjs';

test('recommendation genres use readable Korean labels', () => {
  assert.equal(recommendationGenreLabel('drama_daily'), '드라마·일상');
  assert.equal(recommendationGenreLabel('romance_ropan'), '로맨스·로판');
  assert.equal(recommendationGenreLabel(null), '웹툰');
});
test('cover URLs reject unsafe schemes, protocol-relative URLs, and credentials', () => {
  for (const value of ['javascript:alert(1)', 'data:image/png;base64,x', '//example.com/x', '/\\example.com/x', 'http://example.com/x', 'https://user:password@example.com/x', 'x'.repeat(2049), null]) assert.equal(safeWorkCoverUrl(value), null);
  assert.equal(safeWorkCoverUrl('/covers/example.jpg'), '/covers/example.jpg');
  assert.equal(safeWorkCoverUrl('https://example.com/x.jpg'), 'https://example.com/x.jpg');
});
test('quick comments append without replacing and enforce Unicode character limit', () => {
  assert.equal(appendRecommendationReason('기존 이유', '작화가 좋아요'), '기존 이유 작화가 좋아요');
  assert.equal(appendRecommendationReason('', '케미가 좋아요'), '케미가 좋아요');
  assert.equal(appendRecommendationReason('가'.repeat(78), '새 이유'), null);
  assert.equal(appendRecommendationReason('😀'.repeat(78), 'a'), '😀'.repeat(78) + ' a');
});
test('reordering preserves comments, membership, and input', () => {
  const items = ['a', 'b', 'c'].map(id => ({ canonicalWebtoonId: id, recommendationComment: id }));
  const moved = reorderRecommendation(items, 'a', 'c');
  assert.deepEqual(moved.map(x => x.canonicalWebtoonId), ['b', 'c', 'a']);
  assert.equal(moved[2], items[0]);
  assert.deepEqual(items.map(x => x.canonicalWebtoonId), ['a', 'b', 'c']);
  assert.equal(reorderRecommendation(items, 'missing', 'c'), items);
  assert.equal(reorderRecommendation(items, 'a', 'a'), items);
});

test('a two-page carousel enables only its available direction, including intermediate scroll positions', () => {
  for (const index of [0, .01, .25, .49, .5, .75, .99, 1]) {
    const state = recommendationCarouselState(index, 2);
    assert.equal(Number(state.left) + Number(state.right), 1);
  }
  assert.deepEqual(recommendationCarouselState(0, 2), { index: 0, left: false, right: true });
  assert.deepEqual(recommendationCarouselState(1, 2), { index: 1, left: true, right: false });
});
test('carousel arrows correctly handle empty, single, middle, and out-of-range cards', () => {
  for (const count of [0, 1]) assert.deepEqual(recommendationCarouselState(0, count), { index: 0, left: false, right: false });
  assert.deepEqual(recommendationCarouselState(1, 3), { index: 1, left: true, right: true });
  assert.deepEqual(recommendationCarouselState(100, 3), { index: 2, left: true, right: false });
  assert.deepEqual(recommendationCarouselState(-1, 3), { index: 0, left: false, right: true });
});
