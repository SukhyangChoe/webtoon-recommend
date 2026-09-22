import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { allocateGenreStars, buildTasteSnapshot, calculateGenreResult, toPublicTasteResult } from "../../src/features/match/engine/resultEngine.mjs";

const seed = JSON.parse(readFileSync(new URL("../../src/features/match/data/questionSeed.v0.4.json", import.meta.url), "utf8"));
const synthetic = JSON.parse(readFileSync(new URL("../../src/features/match/data/syntheticProfiles.v0.2.json", import.meta.url), "utf8"));
const genres = seed.publicGenrePolicy.publicGenres;

test("all synthetic raw profiles allocate exactly 18 stars and retain zero-star genres", () => {
  for (const profile of synthetic.profiles) {
    const { genreStars } = allocateGenreStars({ genres, rawGenreAffinity: profile.rawGenreAffinity });
    assert.equal(Object.values(genreStars).reduce((sum, stars) => sum + stars, 0), 18, profile.profileKey);
    assert.equal(Object.keys(genreStars).length, 9, profile.profileKey);
  }
});

test("same answers produce the same genre result", () => {
  const answers = { genre: Object.fromEntries(genres.map((genre, index) => [genre.genreKey, index < 2 ? "high" : "low"])), duels: {} };
  assert.deepEqual(calculateGenreResult(seed, answers), calculateGenreResult(seed, answers));
});

test("largest remainder tie follows display order", () => {
  const raw = Object.fromEntries(genres.map((genre) => [genre.genreKey, 1]));
  const { genreStars } = allocateGenreStars({ genres, rawGenreAffinity: raw });
  assert.deepEqual(Object.values(genreStars), [2, 2, 2, 2, 2, 2, 2, 2, 2]);
});

test("recovery applies only to the selected genre", () => {
  const answers = { genre: Object.fromEntries(genres.map((genre) => [genre.genreKey, "low"])), duels: {}, recoveryGenre: "sports" };
  const result = calculateGenreResult(seed, answers);
  assert.equal(result.genreStars.sports, 18);
  assert.equal(Object.values(result.genreStars).reduce((sum, stars) => sum + stars, 0), 18);
});

test("public result excludes raw answers, affinities, and internal scores", () => {
  const answers = {
    genre: Object.fromEntries(genres.map((genre) => [genre.genreKey, genre.genreKey === "fantasy" ? "high" : "low"])),
    duels: {},
    setting: { selected: [], primary: null, indifferent: true },
    appeal: ["appeal_growth_training"],
    characterRelationship: ["character_effortful_protagonist"],
    avoidance: ["avoid_none"],
  };
  const snapshot = buildTasteSnapshot({ seed, answers, anonymousId: "11111111-1111-4111-8111-111111111111", profileId: "p1", publicProfileId: "public1", completedAt: "2026-09-09T00:00:00.000Z" });
  const publicResult = toPublicTasteResult(snapshot);
  assert.equal(publicResult.genreStars.fantasy, 18);
  assert.deepEqual(publicResult.wellMatchedLabels, ["성장", "노력형"]);
  assert.deepEqual(publicResult.wellMatchedDetails, [
    { category: "전개", value: "성장" },
    { category: "관계", value: "노력형" },
  ]);
  assert.deepEqual(publicResult.lessMatchedLabels, []);
  assert.equal("answers" in publicResult, false);
  assert.equal("rawGenreAffinity" in publicResult, false);
  assert.equal("positiveTasteScores" in publicResult, false);
});

test("appeal and character choices give the primary double weight and secondary choices equal weight", () => {
  const answers = {
    genre: Object.fromEntries(genres.map((genre) => [genre.genreKey, genre.genreKey === "fantasy" ? "high" : "low"])),
    duels: {},
    setting: { selected: [], primary: null, indifferent: true },
    appeal: ["appeal_growth_training", "appeal_action_catharsis", "appeal_revenge_justice", "appeal_strategy_powerplay"],
    characterRelationship: ["character_effortful_protagonist", "character_hidden_power", "character_overpowered", "relationship_bond"],
    avoidance: ["avoid_none"],
  };
  const snapshot = buildTasteSnapshot({ seed, answers, anonymousId: "11111111-1111-4111-8111-111111111111", profileId: "p1", snapshotId: "s1", publicProfileId: "public1" });
  assert.deepEqual(Object.values(snapshot.positiveTasteScores.appeal), [0.4, 0.2, 0.2, 0.2]);
  assert.deepEqual(Object.values(snapshot.positiveTasteScores.character_relationship), [0.4, 0.2, 0.2, 0.2]);
  assert.ok(Math.abs(Object.values(snapshot.positiveTasteScores.appeal).reduce((sum, weight) => sum + weight, 0) - 1) < 1e-9);
});
