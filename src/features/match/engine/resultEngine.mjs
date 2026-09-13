import { MATCH_SCORING_CONFIG } from "../config/scoring.mjs";
import { MATCH_VERSIONS } from "../config/versions.mjs";
import { getPrimarySelectionWeights, getSettingWeights } from "./selectionPolicy.mjs";

const GENRE_CHOICE_SCORE = Object.freeze({ high: 3, medium: 1.5, low: 0 });

function round(value, digits = 6) {
  return Number(value.toFixed(digits));
}

function getDuelScores(seed, answers) {
  const totals = Object.fromEntries(seed.publicGenrePolicy.publicGenres.map((genre) => [genre.genreKey, 0]));
  const counts = Object.fromEntries(seed.publicGenrePolicy.publicGenres.map((genre) => [genre.genreKey, 0]));
  const duelQuestions = seed.questions.filter((question) => question.sectionKey === "first_episode_duel");

  for (const question of duelQuestions) {
    const answer = answers.duels?.[question.questionId];
    if (!answer) continue;
    const displayedLeft = answer.swapped ? question.right.genreKey : question.left.genreKey;
    const displayedRight = answer.swapped ? question.left.genreKey : question.right.genreKey;
    const choice = seed.choiceSets.duel_four_way.find((item) => item.choiceKey === answer.choiceKey);
    if (!choice) continue;
    totals[displayedLeft] += choice.leftScore;
    totals[displayedRight] += choice.rightScore;
    counts[displayedLeft] += 1;
    counts[displayedRight] += 1;
  }

  return Object.fromEntries(Object.keys(totals).map((key) => [key, counts[key] ? totals[key] / counts[key] : 0]));
}

export function calculateGenreResult(seed, answers, config = MATCH_SCORING_CONFIG) {
  const genres = seed.publicGenrePolicy.publicGenres;
  const duelAverage = getDuelScores(seed, answers);
  const baseGenreScore = Object.fromEntries(genres.map((genre) => [genre.genreKey, GENRE_CHOICE_SCORE[answers.genre?.[genre.genreKey]] ?? 0]));
  const baseSum = Object.values(baseGenreScore).reduce((sum, score) => sum + score, 0);
  const duelSum = Object.values(duelAverage).reduce((sum, score) => sum + score, 0);
  if (baseSum === 0 && duelSum === 0 && answers.recoveryGenre) baseGenreScore[answers.recoveryGenre] = config.recoveryBaseScore;

  const rawGenreAffinity = Object.fromEntries(genres.map((genre) => {
    const raw = baseGenreScore[genre.genreKey] * config.genreAffinity.baseWeight + duelAverage[genre.genreKey] * config.genreAffinity.duelScale * config.genreAffinity.duelWeight;
    return [genre.genreKey, round(Math.max(0, Math.min(3, raw)))];
  }));
  const total = Object.values(rawGenreAffinity).reduce((sum, score) => sum + score, 0);
  if (total === 0) throw new Error("GENRE_RECOVERY_REQUIRED");

  const allocated = allocateGenreStars({ genres, rawGenreAffinity, baseGenreScore, duelAverage, totalStars: config.totalStars });
  return { rawGenreAffinity, baseGenreScore, duelAverage, ...allocated };
}

export function allocateGenreStars({ genres, rawGenreAffinity, baseGenreScore = {}, duelAverage = {}, totalStars = MATCH_SCORING_CONFIG.totalStars }) {
  const total = Object.values(rawGenreAffinity).reduce((sum, score) => sum + score, 0);
  if (total === 0) throw new Error("GENRE_RECOVERY_REQUIRED");
  const allocations = genres.map((genre) => {
    const expected = (rawGenreAffinity[genre.genreKey] ?? 0) / total * totalStars;
    return { genreKey: genre.genreKey, displayLabel: genre.displayLabel, displayOrder: genre.displayOrder, raw: rawGenreAffinity[genre.genreKey] ?? 0, base: baseGenreScore[genre.genreKey] ?? 0, duel: duelAverage[genre.genreKey] ?? 0, stars: Math.floor(expected), remainder: expected - Math.floor(expected) };
  });
  let remaining = totalStars - allocations.reduce((sum, item) => sum + item.stars, 0);
  const remainderOrder = [...allocations].sort((a, b) => b.remainder - a.remainder || b.raw - a.raw || b.base - a.base || b.duel - a.duel || a.displayOrder - b.displayOrder);
  for (const item of remainderOrder) {
    if (remaining <= 0) break;
    const target = allocations.find((candidate) => candidate.genreKey === item.genreKey);
    target.stars += 1;
    remaining -= 1;
  }

  const genreStars = Object.fromEntries(allocations.map((item) => [item.genreKey, item.stars]));
  const displayGenres = [...allocations].sort((a, b) => b.stars - a.stars || b.raw - a.raw || b.base - a.base || a.displayOrder - b.displayOrder).map(({ genreKey, displayLabel, stars }) => ({ genreKey, displayLabel, stars }));
  return { genreStars, displayGenres };
}

function labelFor(seed, featureKey) {
  return [...seed.positiveFeatureCatalog, ...seed.avoidanceFeatureCatalog].find((item) => item.featureKey === featureKey)?.publicShortLabel ?? null;
}

export function buildTasteSnapshot({ seed, answers, anonymousId, profileId, snapshotId, publicProfileId, completedAt = new Date().toISOString() }) {
  const genre = calculateGenreResult(seed, answers);
  const settingState = answers.setting?.indifferent ? "indifferent" : answers.setting?.selected?.length ? "specific" : "missing";
  const settingScores = settingState === "specific" ? getSettingWeights(answers.setting) : {};
  const appealScores = getPrimarySelectionWeights(answers.appeal);
  const characterScores = getPrimarySelectionWeights(answers.characterRelationship);
  const avoidanceKeys = (answers.avoidance ?? []).filter((key) => key !== "avoid_none");
  const wellMatchedLabels = [
    settingState === "specific" ? labelFor(seed, answers.setting.primary) : null,
    labelFor(seed, answers.appeal?.[0]),
    labelFor(seed, answers.characterRelationship?.[0]),
  ].filter(Boolean);

  return {
    profileId,
    snapshotId,
    publicProfileId,
    anonymousId,
    testVersion: MATCH_VERSIONS.test,
    questionSetVersion: MATCH_VERSIONS.questions,
    completedAt,
    profileResultCopyVersion: MATCH_VERSIONS.copy,
    rawGenreAffinity: genre.rawGenreAffinity,
    genreStars: genre.genreStars,
    displayGenres: genre.displayGenres,
    positiveTasteScores: { setting: settingScores, appeal: appealScores, character_relationship: characterScores },
    positiveTasteEvidenceStates: { setting: settingState, appeal: answers.appeal?.length ? "specific" : "missing", character_relationship: answers.characterRelationship?.length ? "specific" : "missing" },
    avoidanceTasteScores: Object.fromEntries(avoidanceKeys.map((key) => [key, 1])),
    wellMatchedLabels,
    lessMatchedLabels: avoidanceKeys.slice(0, 3).map((key) => labelFor(seed, key)).filter(Boolean),
    answers,
  };
}

export function toPublicTasteResult(snapshot) {
  return {
    publicProfileId: snapshot.publicProfileId,
    completedAt: snapshot.completedAt,
    genreStars: snapshot.genreStars,
    displayGenres: snapshot.displayGenres,
    wellMatchedLabels: snapshot.wellMatchedLabels,
    lessMatchedLabels: snapshot.lessMatchedLabels,
    topGenres: snapshot.displayGenres.slice(0, 3),
  };
}
