import test from 'node:test';
import assert from 'node:assert/strict';
import { SHARE_RANKING_OWNER as owner, shareRankingNodes } from '../../src/features/match/share/shareRankingLayout.mjs';

const distance = node => Math.hypot(node.x - owner.x, node.y - owner.y);

test('higher percentages are closer to the owner regardless of fan position', () => {
  for (const scores of [[100, 50, 0], [0, 50, 100], [85, 62, 53], [51, 50, 49]]) {
    const nodes = shareRankingNodes(scores.map(score => ({ score })));
    scores.forEach((score, i) => scores.forEach((other, j) => {
      if (score > other) assert.ok(distance(nodes[i]) < distance(nodes[j]));
    }));
  }
});

test('tied percentages keep exactly the same distance for one, two and three people', () => {
  for (const score of [0, 50, 100]) {
    for (const count of [1, 2, 3]) {
      const nodes = shareRankingNodes(Array.from({ length: count }, () => ({ score })));
      assert.ok(nodes.every(node => Math.abs(distance(node) - distance(nodes[0])) < 1e-10));
    }
  }
  assert.deepEqual(shareRankingNodes([]), []);
});

test('85%, 62% and 53% have visibly distinct distances, not just a few pixels', () => {
  const nodes = shareRankingNodes([85, 62, 53].map(score => ({ score })));
  assert.ok(distance(nodes[2]) - distance(nodes[0]) > 28);
  assert.ok(distance(nodes[1]) - distance(nodes[0]) > 20);
  assert.ok(distance(nodes[2]) - distance(nodes[1]) > 8);
  const distances = Array.from({ length: 101 }, (_, score) => distance(shareRankingNodes([{ score }])[0]));
  assert.ok(distances.every((value, score) => score === 0 || value < distances[score - 1]));
});

test('extreme scores keep characters and two-line names inside the graph without collisions', () => {
  const scores = [0, 25, 50, 53, 62, 85, 100];
  for (const a of scores) for (const b of scores) for (const c of scores) {
    for (const count of [1, 2, 3]) {
      const nodes = shareRankingNodes([a, b, c].slice(0, count).map(score => ({ score })));
      nodes.forEach((node, i) => {
        assert.ok(node.x - 49 > 0 && node.x + 49 < 350);
        assert.ok(node.y - node.radius > 34 && node.y + 62 < 305);
        assert.ok(distance(node) > owner.radius + node.radius);
        nodes.slice(i + 1).forEach(other => assert.ok(Math.hypot(node.x - other.x, node.y - other.y) > node.radius + other.radius));
        // Owner nickname rectangle: x=112..238, y=130..156.
        const dx = node.x - Math.max(112, Math.min(238, node.x));
        const dy = node.y - Math.max(130, Math.min(156, node.y));
        assert.ok(Math.hypot(dx, dy) > node.radius);
      });
    }
  }
});
