import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateCompatibility } from "../../src/features/match/engine/compatibilityEngine.mjs";
import { matchNicknameKey, sanitizeMatchNickname } from "../../src/features/match/server/nickname.mjs";

const fixtures = JSON.parse(readFileSync(new URL("../../src/features/match/data/syntheticProfiles.v0.2.json", import.meta.url), "utf8"));
const profiles = Object.fromEntries(fixtures.profiles.map((profile) => [profile.profileKey, profile]));

test("identical snapshots score 100", () => {
  assert.equal(calculateCompatibility(profiles.P01, profiles.P01).score, 100);
  assert.equal(calculateCompatibility(profiles.P01, profiles.P12).score, 100);
});

test("overall compatibility is symmetric for every synthetic pair", () => {
  for (const profileA of fixtures.profiles) {
    for (const profileB of fixtures.profiles) {
      assert.equal(calculateCompatibility(profileA, profileB).score, calculateCompatibility(profileB, profileA).score);
    }
  }
});

test("candidate scoring reproduces representative synthetic QA scores", () => {
  const expected = [["P01", "P02", 82], ["P01", "P03", 63], ["P05", "P06", 91], ["P05", "P07", 25], ["P10", "P04", 53], ["P08", "P09", 5]];
  for (const [left, right, score] of expected) assert.equal(calculateCompatibility(profiles[left], profiles[right]).score, score, `${left} × ${right}`);
});

test("genre stars never affect compatibility", () => {
  const altered = { ...profiles.P02, genreStars: { fantasy: 0, sports: 18 } };
  assert.equal(calculateCompatibility(profiles.P01, altered).score, calculateCompatibility(profiles.P01, profiles.P02).score);
});

test("setting indifferent and missing are excluded instead of scored as zero", () => {
  const indifferent = { ...profiles.P01, positiveTasteEvidenceStates: { ...profiles.P01.positiveTasteEvidenceStates, setting: "indifferent" } };
  const missing = { ...profiles.P02, positiveTasteEvidenceStates: { ...profiles.P02.positiveTasteEvidenceStates, setting: "missing" } };
  const result = calculateCompatibility(indifferent, missing);
  assert.deepEqual(Object.keys(result.private.positiveGroups).sort(), ["appeal", "character_relationship"]);
});

test("directional trust is private and does not alter symmetric overall score", () => {
  const forward = calculateCompatibility(profiles.P01, profiles.P03);
  const reverse = calculateCompatibility(profiles.P03, profiles.P01);
  assert.equal(forward.score, reverse.score);
  assert.notEqual(forward.private.ownerToChallengerTrust, forward.private.challengerToOwnerTrust);
  assert.equal("ownerToChallengerTrust" in forward, false);
});

test("different genres identify which person should recommend them", () => {
  const result = calculateCompatibility(profiles.P01, profiles.P03);
  const { differentGenreKeys, ownerRecommendationGenreKeys, challengerRecommendationGenreKeys } = result.explanations;
  assert.deepEqual([...ownerRecommendationGenreKeys, ...challengerRecommendationGenreKeys].sort(), [...differentGenreKeys].sort());
  for (const key of ownerRecommendationGenreKeys) assert.ok((profiles.P01.rawGenreAffinity[key] ?? 0) > (profiles.P03.rawGenreAffinity[key] ?? 0));
  for (const key of challengerRecommendationGenreKeys) assert.ok((profiles.P03.rawGenreAffinity[key] ?? 0) > (profiles.P01.rawGenreAffinity[key] ?? 0));
});

test("public nicknames are normalized and reject contact or script-like input", () => {
  assert.equal(sanitizeMatchNickname("  웹툰   친구  "), "웹툰 친구");
  assert.throws(() => sanitizeMatchNickname("A"), /NICKNAME_REJECTED/);
  assert.throws(() => sanitizeMatchNickname("<script>"), /NICKNAME_REJECTED/);
  assert.throws(() => sanitizeMatchNickname("010-1234-5678"), /NICKNAME_REJECTED/);
  assert.throws(() => sanitizeMatchNickname("me@example.com"), /NICKNAME_REJECTED/);
});

test("nickname keys treat spacing and latin letter case as the same link nickname", () => {
  assert.equal(matchNicknameKey("  Webtoon   Mate  "), "webtoon mate");
  assert.equal(matchNicknameKey(" 향향 "), "향향");
});
