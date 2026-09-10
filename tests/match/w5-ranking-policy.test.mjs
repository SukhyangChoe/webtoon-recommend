import test from "node:test";
import assert from "node:assert/strict";
import { denseRankEntries, selectRankingWindow } from "../../src/features/match/engine/rankingPolicy.mjs";

function entry(entryId, challengerProfileId, score, createdAt, hiddenByOwner = false) {
  return { entryId, challengerProfileId, score, createdAt, hiddenByOwner };
}

test("ranking uses dense rank and gives equal scores a shared rank", () => {
  const ranked = denseRankEntries([
    entry("late-90", "p4", 90, "2026-01-04"),
    entry("first-100", "p1", 100, "2026-01-01"),
    entry("second-100", "p2", 100, "2026-01-02"),
    entry("score-80", "p3", 80, "2026-01-03"),
  ]);
  assert.deepEqual(ranked.map(({ entryId, rank }) => [entryId, rank]), [
    ["first-100", 1], ["second-100", 1], ["late-90", 2], ["score-80", 3],
  ]);
});

test("hidden owner entries never appear in public ranking", () => {
  const ranked = denseRankEntries([
    entry("visible", "p1", 80, "2026-01-01"),
    entry("hidden", "p2", 100, "2026-01-02", true),
  ]);
  assert.deepEqual(ranked.map((item) => item.entryId), ["visible"]);
  assert.equal(ranked[0].rank, 1);
});

test("ranking returns top 20 and a viewer row when the viewer is outside it", () => {
  const ranked = denseRankEntries(Array.from({ length: 25 }, (_, index) =>
    entry(`e${index + 1}`, `profile${index + 1}`, 100 - index, `2026-01-${String(index + 1).padStart(2, "0")}`)
  ));
  const window = selectRankingWindow(ranked, "profile25", 20);
  assert.equal(window.top20.length, 20);
  assert.equal(window.viewerEntry.entryId, "e25");
  assert.equal(window.viewerEntry.rank, 25);
  assert.equal(selectRankingWindow(ranked, "profile2", 20).viewerEntry, null);
});
