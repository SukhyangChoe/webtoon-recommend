import { MATCH_SCORING_CONFIG } from "../config/scoring.mjs";
import { allocateGenreStars } from "./resultEngine.mjs";
import { blendTasteVectors, buildProfileTasteVector } from "./tasteVectorEngine.mjs";

const RECOMMENDATION_WEIGHT_BY_COUNT = Object.freeze([
  0,
  0.15,
  0.25,
  0.35,
  0.45,
  0.55,
  0.62,
  0.68,
  0.73,
  0.77,
  0.8,
]);

const round = (value, digits = 6) => Number(value.toFixed(digits));
const sum = (values) => values.reduce((total, value) => total + value, 0);
const isPositiveNumber = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;

function normalize(scoreMap, keys) {
  const total = sum(keys.map((key) => scoreMap[key] ?? 0));
  if (!total) return Object.fromEntries(keys.map((key) => [key, 0]));
  return Object.fromEntries(keys.map((key) => [key, round((scoreMap[key] ?? 0) / total)]));
}

function featureGroup(featureKey) {
  if (featureKey.startsWith("setting_")) return "setting";
  if (featureKey.startsWith("appeal_")) return "appeal";
  return "character_relationship";
}

function tagCandidates(featureKey) {
  if (featureKey.startsWith("setting_")) return [featureKey, featureKey.slice("setting_".length)];
  if (featureKey.startsWith("appeal_")) return [featureKey, featureKey.slice("appeal_".length)];
  if (featureKey.startsWith("character_")) return [featureKey, featureKey.slice("character_".length)];
  if (featureKey.startsWith("relationship_")) return [featureKey, featureKey.slice("relationship_".length)];
  return [featureKey];
}

function flattenNumericScores(value, target = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return target;
  for (const [key, nested] of Object.entries(value)) {
    if (isPositiveNumber(nested)) target[key] = Math.max(target[key] ?? 0, nested);
    else flattenNumericScores(nested, target);
  }
  return target;
}

function recommendationFeatureDistribution(recommendations, featureKeys) {
  const mapped = Object.fromEntries(featureKeys.map((key) => [key, 0]));
  for (const recommendation of recommendations) {
    const signals = {
      ...flattenNumericScores(recommendation?.typeScores),
      ...flattenNumericScores(recommendation?.tagScores),
    };
    for (const featureKey of featureKeys) {
      const candidates = tagCandidates(featureKey);
      const value = Math.max(0, ...Object.entries(signals).map(([key, score]) => (
        candidates.some((candidate) => key === candidate || key.endsWith(`_${candidate}`)) ? score : 0
      )));
      mapped[featureKey] += value;
    }
  }
  return normalize(mapped, featureKeys);
}

function blendPositiveTasteScores(snapshot, recommendations, recommendationWeight, positiveFeatureKeys) {
  const groups = ["setting", "appeal", "character_relationship"];
  return Object.fromEntries(groups.map((group) => {
    const featureKeys = positiveFeatureKeys.filter((key) => featureGroup(key) === group);
    const baseScores = snapshot.positiveTasteScores?.[group] ?? {};
    const baseDistribution = normalize(baseScores, featureKeys);
    const recommendationDistribution = recommendationFeatureDistribution(recommendations, featureKeys);
    const hasRecommendationSignal = sum(Object.values(recommendationDistribution)) > 0;
    if (!hasRecommendationSignal) return [group, baseScores];
    const testWeight = 1 - recommendationWeight;
    return [group, Object.fromEntries(featureKeys
      .map((key) => [key, round((baseDistribution[key] ?? 0) * testWeight + (recommendationDistribution[key] ?? 0) * recommendationWeight)])
      .filter(([, value]) => value > 0))];
  }));
}

export function recommendationTasteWeight(workCount) {
  const bounded = Math.max(0, Math.min(10, Math.floor(Number(workCount) || 0)));
  return RECOMMENDATION_WEIGHT_BY_COUNT[bounded];
}

export function applyRecommendationTaste(snapshot, recommendationVectors, seed) {
  const genres = seed.publicGenrePolicy.publicGenres;
  const genreKeys = genres.map((genre) => genre.genreKey);
  const recommendations = Array.isArray(recommendationVectors) ? recommendationVectors : [];
  const recommendationWeight = recommendationTasteWeight(recommendations.length);
  const baseTasteVector = snapshot.tasteVector ?? buildProfileTasteVector(snapshot, seed);
  if (!recommendationWeight) {
    return {
      ...snapshot,
      tasteVector: baseTasteVector,
      recommendationInfluence: { workCount: 0, recommendationPercent: 0, testPercent: 100 },
    };
  }

  const tasteVector = blendTasteVectors(baseTasteVector, recommendations, recommendationWeight, seed);
  const testWeight = 1 - recommendationWeight;
  const rawGenreAffinity = Object.fromEntries(genreKeys.map((key) => [key, tasteVector.genreScores[key] ?? 0]));
  const allocated = allocateGenreStars({
    genres,
    rawGenreAffinity,
    totalStars: MATCH_SCORING_CONFIG.totalStars,
  });
  const positiveFeatureKeys = seed.positiveFeatureCatalog.map((item) => item.featureKey);

  return {
    ...snapshot,
    tasteVector,
    rawGenreAffinity,
    genreStars: allocated.genreStars,
    displayGenres: allocated.displayGenres,
    positiveTasteScores: blendPositiveTasteScores(snapshot, recommendations, recommendationWeight, positiveFeatureKeys),
    recommendationInfluence: {
      workCount: recommendations.length,
      recommendationPercent: Math.round(recommendationWeight * 100),
      testPercent: Math.round(testWeight * 100),
    },
  };
}
