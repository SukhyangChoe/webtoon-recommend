import test from 'node:test';
import assert from 'node:assert/strict';
import { appendRecommendationReason, recommendationGenreLabel, reorderRecommendation, safeWorkCoverUrl } from '../../src/features/match/config/recommendationPresentation.mjs';

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
