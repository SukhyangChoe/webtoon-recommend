import test from "node:test";
import assert from "node:assert/strict";
import { denseRankEntries } from "../../src/features/match/engine/rankingPolicy.mjs";
import { relationshipGenreKeys, selectRelationshipPage } from "../../src/features/match/engine/relationshipPolicy.mjs";

test("relationship filters use only the owner's actual top three genres in result order", () => {
  assert.deepEqual(relationshipGenreKeys(["comedy", "thriller_horror", "drama_daily", "fantasy"].map((genreKey) => ({ genreKey }))), ["comedy", "thriller_horror", "drama_daily"]);
  assert.deepEqual(relationshipGenreKeys([{ genreKey: "unknown" }, { genreKey: "sports" }, { genreKey: "sports" }]), ["sports"]);
  assert.deepEqual(relationshipGenreKeys(), []);
});

const entries = () => denseRankEntries(Array.from({ length: 30 }, (_, index) => ({
  entryId: `entry-${index + 1}`, score: 100 - index, genreKey: index % 2 ? "ropan" : "fantasy",
  createdAt: new Date(2026, 0, index + 1).toISOString(), hiddenByOwner: false,
})));

test("relationship map is capped at six even when thirty scores qualify", () => {
  const result = selectRelationshipPage(entries().map((entry) => ({ ...entry, score: 90 })));
  assert.equal(result.graphEntries.length, 6);
  assert.equal(result.pagination.totalItems, 30);
});

test("the list reaches all thirty people, including scores below 80", () => {
  const ranked = entries();
  const ids = Array.from({ length: 5 }, (_, index) => selectRelationshipPage(ranked, { page: index + 1 }).entries.map((entry) => entry.entryId)).flat();
  assert.equal(new Set(ids).size, 30);
  assert.equal(ids.at(-1), "entry-30");
  assert.equal(selectRelationshipPage(ranked, { page: 5 }).entries.at(-1).score, 71);
});

test("the threshold is inclusive and never silently lowered for an empty map", () => {
  const result = selectRelationshipPage([{ score: 80 }, { score: 79 }, { score: 0 }]);
  assert.deepEqual(result.graphEntries.map((entry) => entry.score), [80]);
  assert.equal(result.entries.length, 3);
  assert.equal(selectRelationshipPage([{ score: 79 }]).graphEntries.length, 0);
});

test("hidden people are removed from both map and pagination and restored to the same order", () => {
  const ranked = entries();
  ranked[0].hiddenByOwner = true;
  const hidden = selectRelationshipPage(ranked);
  assert.equal(hidden.graphEntries[0].entryId, "entry-2");
  assert.equal(hidden.pagination.totalItems, 29);
  assert.ok(!hidden.entries.some((entry) => entry.entryId === "entry-1"));
  ranked[0].hiddenByOwner = false;
  assert.equal(selectRelationshipPage(ranked).graphEntries[0].entryId, "entry-1");
});

test("genre filters affect both views without renumbering global dense ranks", () => {
  const result = selectRelationshipPage(entries(), { genreKey: "ropan", page: 3 });
  assert.equal(result.pagination.totalItems, 15);
  assert.equal(result.entries.length, 3);
  assert.ok(result.entries.every((entry) => entry.genreKey === "ropan"));
  assert.deepEqual(result.entries.map((entry) => entry.rank), [26, 28, 30]);
  assert.ok(result.graphEntries.every((entry) => entry.genreKey === "ropan" && entry.score >= 80));
});

test("pagination safely clamps invalid and disappearing last pages", () => {
  for (const page of [NaN, Infinity, -1, 0]) assert.equal(selectRelationshipPage(entries(), { page }).pagination.page, 1);
  assert.equal(selectRelationshipPage(entries(), { page: 1000 }).pagination.page, 5);
  assert.equal(selectRelationshipPage(entries().slice(0, 6), { page: 2 }).pagination.page, 1);
  const empty = selectRelationshipPage([], { page: 40 });
  assert.equal(empty.pagination.page, 1);
  assert.equal(empty.pagination.totalPages, 1);
  assert.equal(empty.pagination.totalItems, 0);
});

test("ties retain the original stable ranking without mutating input", () => {
  const ranked = entries();
  const before = JSON.stringify(ranked);
  selectRelationshipPage(ranked, { genreKey: "fantasy", page: 2 });
  assert.equal(JSON.stringify(ranked), before);
  const tied = denseRankEntries([{ score: 90, createdAt: "a", entryId: "a" }, { score: 90, createdAt: "b", entryId: "b" }]);
  assert.deepEqual(selectRelationshipPage(tied).graphEntries.map((entry) => [entry.entryId, entry.rank]), [["a", 1], ["b", 1]]);
});
