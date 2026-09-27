import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { allocateGenreStars, buildTasteSnapshot, calculateGenreResult, toPublicTasteResult } from "../../src/features/match/engine/resultEngine.mjs";
import { applyRecommendationTaste, recommendationTasteWeight } from "../../src/features/match/engine/recommendationTasteEngine.mjs";
import { MATCH_TASTE_VECTOR_VERSION, matchingRecommendationGenreKeys, projectRecommendationGenreScores } from "../../src/features/match/engine/tasteVectorEngine.mjs";

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

test("a snapshot stores a catalog-compatible multidimensional taste vector", () => {
  const answers = {
    genre: Object.fromEntries(genres.map((genre) => [genre.genreKey, genre.genreKey === "thriller_horror" ? "high" : "low"])),
    duels: {},
    setting: { selected: ["setting_case_mystery", "setting_occult_uncanny"], primary: "setting_case_mystery", weights: { setting_case_mystery: 0.666667, setting_occult_uncanny: 0.333333 }, indifferent: false },
    appeal: ["appeal_world_mystery", "appeal_survival_tension"],
    characterRelationship: ["character_overpowered"],
    avoidance: ["avoid_excessive_comedy", "avoid_visual_style_barrier"],
  };
  const snapshot = buildTasteSnapshot({ seed, answers, anonymousId: "11111111-1111-4111-8111-111111111111", profileId: "p1", snapshotId: "s1", publicProfileId: "public1" });
  assert.equal(snapshot.tasteVector.vectorVersion, MATCH_TASTE_VECTOR_VERSION);
  assert.ok(snapshot.tasteVector.tagScores.mystery_investigation > 0);
  assert.ok(snapshot.tasteVector.tagScores.world_mystery > 0);
  assert.ok(snapshot.tasteVector.contentAxisScores.occult_ghost > 0);
  assert.ok(snapshot.tasteVector.avoidanceTagScores.tone_mismatch > 0);
  assert.ok(snapshot.tasteVector.avoidanceTagScores.visual_barrier > 0);
  assert.deepEqual(snapshot.tasteVector.artStyleScores, {});
});

test("recommendation influence grows by registered vector count and caps at eighty percent", () => {
  assert.equal(recommendationTasteWeight(0), 0);
  assert.equal(recommendationTasteWeight(1), 0.15);
  assert.equal(recommendationTasteWeight(5), 0.55);
  assert.equal(recommendationTasteWeight(10), 0.8);
  assert.equal(recommendationTasteWeight(99), 0.8);
});

test("a concentrated recommendation list can change the leading genre", () => {
  const snapshot = {
    rawGenreAffinity: Object.fromEntries(genres.map((genre) => [genre.genreKey, genre.genreKey === "ropan" ? 3 : genre.genreKey === "thriller_horror" ? 2.9 : 0])),
    positiveTasteScores: { setting: {}, appeal: {}, character_relationship: {} },
  };
  const recommendations = Array.from({ length: 10 }, () => ({
    genreScores: { thriller_horror: 5 },
    tagScores: { survival_tension: 3, world_mystery: 2 },
  }));
  const result = applyRecommendationTaste(snapshot, recommendations, seed);
  assert.equal(result.displayGenres[0].genreKey, "thriller_horror");
  assert.deepEqual(result.recommendationInfluence, { workCount: 10, recommendationPercent: 80, testPercent: 20 });
  assert.equal(Object.values(result.genreStars).reduce((sum, stars) => sum + stars, 0), 18);
  assert.ok(result.positiveTasteScores.appeal.appeal_survival_tension > 0);
});

test("the combined romance catalog vector is shared between romance and ropan", () => {
  const snapshot = {
    rawGenreAffinity: Object.fromEntries(genres.map((genre) => [genre.genreKey, 1])),
    positiveTasteScores: { setting: {}, appeal: {}, character_relationship: {} },
  };
  const result = applyRecommendationTaste(snapshot, [{ genreScores: { romance_ropan: 5 }, tagScores: {} }], seed);
  assert.equal(result.rawGenreAffinity.romance, result.rawGenreAffinity.ropan);
  assert.ok(result.rawGenreAffinity.romance > result.rawGenreAffinity.fantasy);
});

test("catalog comedy signals are projected out of the broad drama genre", () => {
  const projected = projectRecommendationGenreScores({
    genreScores: { drama_daily: 5 },
    tagScores: { humor_comedy: 3 },
    contentAxisScores: { comedy_sitcom: 3 },
  }, seed);
  assert.equal(projected.comedy, 3);
  assert.equal(projected.drama_daily, 2);
});

test("recommendation highlights follow the projected vector instead of the catalog main genre", () => {
  const actionHeavy = {
    genreScores: { fantasy: 5 },
    contentAxisScores: { combat_growth: 3 },
  };
  assert.deepEqual(matchingRecommendationGenreKeys(actionHeavy, ["action"], seed), ["action"]);

  const weakAction = {
    genreScores: { fantasy: 5 },
    contentAxisScores: { combat_growth: 1 },
  };
  assert.deepEqual(matchingRecommendationGenreKeys(weakAction, ["action"], seed), []);
});

test("comedy-heavy recommendations can make comedy the leading public genre", () => {
  const snapshot = {
    rawGenreAffinity: Object.fromEntries(genres.map((genre) => [genre.genreKey, genre.genreKey === "ropan" ? 3 : genre.genreKey === "comedy" ? 2.9 : 0])),
    positiveTasteScores: { setting: {}, appeal: {}, character_relationship: {} },
    avoidanceTasteScores: {},
  };
  const recommendations = Array.from({ length: 10 }, () => ({
    genreScores: { drama_daily: 5 },
    tagScores: { humor_comedy: 3 },
    contentAxisScores: { comedy_sitcom: 3 },
  }));
  const result = applyRecommendationTaste(snapshot, recommendations, seed);
  assert.equal(result.displayGenres[0].genreKey, "comedy");
  assert.ok(result.tasteVector.tagScores.humor_comedy > 0);
  assert.deepEqual(result.tasteVector.avoidanceTagScores, {});
});
