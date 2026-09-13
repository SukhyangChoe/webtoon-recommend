import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getPrimarySelectionWeights, getSettingWeights, needsGenreRecovery, promotePrimarySelection, shouldSwapDuel, toggleDuelSide, toggleExclusiveSelection, togglePrimarySelection, validateSettingSelection } from "../../src/features/match/engine/selectionPolicy.mjs";

const fixtures = JSON.parse(readFileSync(new URL("../../src/features/match/data/settingSelectionFixtures.v0.1.json", import.meta.url), "utf8"));
const seed = JSON.parse(readFileSync(new URL("../../src/features/match/data/questionSeed.v0.4.json", import.meta.url), "utf8"));

test("v0.4 question seed contains every required screen and policy", () => {
  assert.equal(seed.questionSetVersion, "webtoon_match_question_set_v0_4_candidate");
  assert.equal(seed.questions.length, 13);
  assert.equal(seed.publicGenrePolicy.publicGenres.length, 9);
  assert.deepEqual(seed.choiceSets.duel_four_way.map((choice) => choice.choiceKey), ["left", "both", "right", "neither"]);
  for (const questionId of ["wm_positive_02_appeal", "wm_positive_03_character_relationship"]) {
    const question = seed.questions.find((item) => item.questionId === questionId);
    assert.equal(question.maxSelect, 4);
    assert.equal(question.selectMode, "primary_plus_secondary_multi_select");
    assert.equal(question.rankPolicyKey, "positive_primary_plus_secondary_up_to_4");
  }
});

test("duel choices can be displayed as left, right, both, neither without changing keys", () => {
  const choices = Object.fromEntries(seed.choiceSets.duel_four_way.map((choice) => [choice.choiceKey, choice]));
  const displayOrder = [choices.left, choices.right, choices.both, choices.neither];
  assert.deepEqual(displayOrder.map((choice) => choice.choiceKey), ["left", "right", "both", "neither"]);
});

for (const fixture of fixtures.weightCases) {
  test(`setting weights: ${fixture.caseKey}`, () => {
    const weights = getSettingWeights({ selected: fixture.selected, primary: fixture.primary, indifferent: false });
    assert.deepEqual(weights, fixture.expectedWeights);
    assert.ok(Math.abs(Object.values(weights).reduce((sum, weight) => sum + weight, 0) - fixture.expectedSum) <= fixtures.tolerance);
  });
}

for (const fixture of fixtures.validationCases) {
  test(`setting validation: ${fixture.caseKey}`, () => {
    const actual = validateSettingSelection({
      selected: fixture.input.selected ?? [],
      primary: fixture.input.primary ?? null,
      indifferent: fixture.input.specialChoice === "setting_indifferent",
    });
    assert.equal(actual, fixture.expected);
  });
}

test("primary choices allow four selections and block a fifth", () => {
  let selected = [];
  for (const key of ["a", "b", "c", "d"]) selected = togglePrimarySelection(selected, key, 4);
  assert.deepEqual(selected, ["a", "b", "c", "d"]);
  assert.deepEqual(togglePrimarySelection(selected, "e", 4), selected);
  assert.deepEqual(togglePrimarySelection(selected, "b", 4), ["a", "c", "d"]);
});

test("primary choices promote a selected option and give secondary choices equal weight", () => {
  const promoted = promotePrimarySelection(["a", "b", "c", "d"], "c", 4);
  assert.deepEqual(promoted, ["c", "a", "b", "d"]);
  assert.deepEqual(getPrimarySelectionWeights(promoted), { c: 0.4, a: 0.2, b: 0.2, d: 0.2 });
  assert.equal(Object.values(getPrimarySelectionWeights(promoted)).reduce((sum, weight) => sum + weight, 0), 1);
});

test("avoid-none is exclusive and regular avoidance is capped at three", () => {
  assert.deepEqual(toggleExclusiveSelection(["a"], "avoid_none", "avoid_none", 3), ["avoid_none"]);
  assert.deepEqual(toggleExclusiveSelection(["avoid_none"], "a", "avoid_none", 3), ["a"]);
  assert.deepEqual(toggleExclusiveSelection(["a", "b", "c"], "d", "avoid_none", 3), ["a", "b", "c"]);
});

test("duel side swap is deterministic", () => {
  const args = ["11111111-1111-4111-8111-111111111111", "wm_duel_01_fantasy_vs_murim"];
  assert.equal(shouldSwapDuel(...args), shouldSwapDuel(...args));
});

test("duel image toggles map to the four existing choices", () => {
  let selected = toggleDuelSide(undefined, "left");
  assert.equal(selected, "left");
  selected = toggleDuelSide(selected, "right");
  assert.equal(selected, "both");
  selected = toggleDuelSide(selected, "left");
  assert.equal(selected, "right");
  selected = toggleDuelSide(selected, "right");
  assert.equal(selected, "neither");
  assert.equal(toggleDuelSide("neither", "right"), "right");
  assert.equal(toggleDuelSide("right", "left"), "both");
});

test("recovery appears only when every genre and duel gives zero", () => {
  assert.equal(needsGenreRecovery({ genreAnswers: { fantasy: "low" }, duelAnswers: { q1: { choiceKey: "neither" } } }), true);
  assert.equal(needsGenreRecovery({ genreAnswers: { fantasy: "medium" }, duelAnswers: {} }), false);
  assert.equal(needsGenreRecovery({ genreAnswers: {}, duelAnswers: { q1: { choiceKey: "both" } } }), false);
});
