import { MATCH_COMPATIBILITY_CONFIG } from "../config/compatibility.mjs";

const clamp = (value) => Math.max(0, Math.min(1, value));
const round = (value, digits = 6) => Number(value.toFixed(digits));

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function cosine(a, b, keys) {
  const dot = sum(keys.map((key) => (a[key] ?? 0) * (b[key] ?? 0)));
  const magnitudeA = Math.sqrt(sum(keys.map((key) => (a[key] ?? 0) ** 2)));
  const magnitudeB = Math.sqrt(sum(keys.map((key) => (b[key] ?? 0) ** 2)));
  return magnitudeA && magnitudeB ? dot / (magnitudeA * magnitudeB) : 0;
}

function normalize(vector) {
  const total = sum(Object.values(vector));
  if (!total) return Object.fromEntries(Object.keys(vector).map((key) => [key, 0]));
  return Object.fromEntries(Object.entries(vector).map(([key, value]) => [key, value / total]));
}

function tasteVector(snapshot) {
  return snapshot.tasteVector ?? null;
}

function genreScores(snapshot) {
  return tasteVector(snapshot)?.genreScores ?? snapshot.rawGenreAffinity ?? {};
}

function flattenTypeScores(typeScores) {
  return Object.fromEntries(Object.entries(typeScores ?? {}).flatMap(([genreKey, scores]) =>
    Object.entries(scores ?? {}).map(([typeKey, score]) => [`${genreKey}.${typeKey}`, score])));
}

function structuredPositiveGroups(snapshot) {
  const vector = tasteVector(snapshot);
  if (!vector) return null;
  return {
    tagScores: vector.tagScores ?? {},
    contentAxisScores: vector.contentAxisScores ?? {},
    typeScores: flattenTypeScores(vector.typeScores),
    artStyleScores: vector.artStyleScores ?? {},
  };
}

function vectorSimilarity(a, b) {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  if (!keys.length) return 0;
  const cosineSimilarity = cosine(a, b, keys);
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);
  const overlap = sum(keys.map((key) => Math.min(normalizedA[key] ?? 0, normalizedB[key] ?? 0)));
  return round(cosineSimilarity * 0.7 + overlap * 0.3);
}

function featureGroup(featureKey) {
  if (featureKey.startsWith("setting_")) return "setting";
  if (featureKey.startsWith("appeal_")) return "appeal";
  return "character_relationship";
}

export function flattenPositiveScores(snapshot) {
  const scores = snapshot.positiveTasteScores ?? {};
  if (scores.setting || scores.appeal || scores.character_relationship) {
    return { ...(scores.setting ?? {}), ...(scores.appeal ?? {}), ...(scores.character_relationship ?? {}) };
  }
  return scores;
}

function groupScores(snapshot, group) {
  const flat = flattenPositiveScores(snapshot);
  return normalize(Object.fromEntries(Object.entries(flat).filter(([key]) => featureGroup(key) === group)));
}

function clusterVector(scores, clusters) {
  return Object.fromEntries(Object.entries(clusters).map(([clusterKey, features]) => [clusterKey, sum(features.map((key) => scores[key] ?? 0))]));
}

export function calculateGenreSimilarity(a, b, config = MATCH_COMPATIBILITY_CONFIG) {
  const keys = config.genre.dimensions;
  const scoresA = genreScores(a);
  const scoresB = genreScores(b);
  const rawA = Object.fromEntries(keys.map((key) => [key, scoresA[key] ?? 0]));
  const rawB = Object.fromEntries(keys.map((key) => [key, scoresB[key] ?? 0]));
  const cosineSimilarity = cosine(rawA, rawB, keys);
  const distributionA = normalize(rawA);
  const distributionB = normalize(rawB);
  const overlap = sum(keys.map((key) => Math.min(distributionA[key], distributionB[key])));
  return round(cosineSimilarity * config.genre.cosineWeight + overlap * config.genre.overlapWeight);
}

export function calculatePositiveSimilarity(a, b, config = MATCH_COMPATIBILITY_CONFIG) {
  const structuredA = structuredPositiveGroups(a);
  const structuredB = structuredPositiveGroups(b);
  if (structuredA && structuredB) {
    /** @type {Record<string, number>} */
    const groups = {};
    let usedWeight = 0;
    let weightedSimilarity = 0;
    for (const [group, weight] of Object.entries(config.positive.vectorGroupWeights)) {
      const scoresA = structuredA[group] ?? {};
      const scoresB = structuredB[group] ?? {};
      if (!Object.keys(scoresA).length || !Object.keys(scoresB).length) continue;
      const similarity = vectorSimilarity(scoresA, scoresB);
      groups[group] = similarity;
      usedWeight += weight;
      weightedSimilarity += similarity * weight;
    }
    const comparableGroups = Object.keys(groups);
    return {
      similarity: usedWeight ? round(weightedSimilarity / usedWeight) : 0,
      comparableGroups,
      groups,
    };
  }
  const comparableGroups = config.positive.groups.filter((group) => a.positiveTasteEvidenceStates?.[group] === "specific" && b.positiveTasteEvidenceStates?.[group] === "specific");
  const groups = Object.fromEntries(comparableGroups.map((group) => {
    const scoresA = groupScores(a, group);
    const scoresB = groupScores(b, group);
    const featureKeys = [...new Set([...Object.keys(scoresA), ...Object.keys(scoresB)])];
    const clusters = config.positive.clusters[group];
    const clusterA = clusterVector(scoresA, clusters);
    const clusterB = clusterVector(scoresB, clusters);
    const exact = cosine(scoresA, scoresB, featureKeys);
    const cluster = cosine(clusterA, clusterB, Object.keys(clusters));
    return [group, round(exact * config.positive.exactWeight + cluster * config.positive.clusterWeight)];
  }));
  return { similarity: comparableGroups.length ? round(sum(Object.values(groups)) / comparableGroups.length) : 0, comparableGroups, groups };
}

function selectedAvoidance(snapshot) {
  if (tasteVector(snapshot)) {
    return Object.keys(snapshot.tasteVector.avoidanceTagScores ?? {}).filter((key) => (snapshot.tasteVector.avoidanceTagScores[key] ?? 0) > 0);
  }
  return Object.keys(snapshot.avoidanceTasteScores ?? {}).filter((key) => (snapshot.avoidanceTasteScores[key] ?? 0) > 0);
}

function directionalConflict(positiveSnapshot, avoidanceSnapshot, config) {
  const structured = structuredPositiveGroups(positiveSnapshot);
  if (structured && tasteVector(avoidanceSnapshot)) {
    const positive = normalize({ ...structured.tagScores, ...structured.contentAxisScores });
    const avoidance = new Set(selectedAvoidance(avoidanceSnapshot));
    return clamp(sum(config.avoidance.vectorConflictMap.map(([positiveKey, avoidanceKey, severity]) =>
      avoidance.has(avoidanceKey) ? (positive[positiveKey] ?? 0) * severity : 0)));
  }
  const positive = normalize(flattenPositiveScores(positiveSnapshot));
  const avoidance = new Set(selectedAvoidance(avoidanceSnapshot));
  return clamp(sum(config.avoidance.conflictMap.map(([positiveKey, avoidanceKey, severity]) => avoidance.has(avoidanceKey) ? (positive[positiveKey] ?? 0) * severity : 0)));
}

export function calculateAvoidanceCompatibility(a, b, config = MATCH_COMPATIBILITY_CONFIG) {
  const selectedA = selectedAvoidance(a);
  const selectedB = selectedAvoidance(b);
  let base;
  if (!selectedA.length && !selectedB.length) base = config.avoidance.bothEmpty;
  else if (!selectedA.length || !selectedB.length) base = config.avoidance.oneEmpty;
  else {
    const setA = new Set(selectedA);
    const intersection = selectedB.filter((key) => setA.has(key)).length;
    const union = new Set([...selectedA, ...selectedB]).size;
    base = 0.5 + 0.5 * intersection / union;
  }
  const conflictAtoB = directionalConflict(a, b, config);
  const conflictBtoA = directionalConflict(b, a, config);
  const similarity = clamp(base - ((conflictAtoB + conflictBtoA) / 2) * config.avoidance.conflictWeight);
  return { similarity: round(similarity), base: round(base), conflictAtoB: round(conflictAtoB), conflictBtoA: round(conflictBtoA) };
}

function genreCoverage(a, b, dimensions) {
  const rawA = genreScores(a);
  const rawB = genreScores(b);
  const totalB = sum(dimensions.map((key) => rawB[key] ?? 0));
  if (!totalB) return 0;
  return sum(dimensions.map((key) => {
    const target = rawB[key] ?? 0;
    if (!target) return 0;
    return target / totalB * Math.min(1, (rawA[key] ?? 0) / target);
  }));
}

function sameCluster(group, featureA, featureB, config) {
  return Object.values(config.positive.clusters[group]).some((features) => features.includes(featureA) && features.includes(featureB));
}

function positiveCoverage(a, b, config) {
  const structuredA = structuredPositiveGroups(a);
  const structuredB = structuredPositiveGroups(b);
  if (structuredA && structuredB) {
    let usedWeight = 0;
    let coverage = 0;
    for (const [group, weight] of Object.entries(config.positive.vectorGroupWeights)) {
      const source = normalize(structuredA[group] ?? {});
      const target = normalize(structuredB[group] ?? {});
      if (!Object.keys(source).length || !Object.keys(target).length) continue;
      usedWeight += weight;
      coverage += weight * sum(Object.entries(target).map(([key, targetWeight]) =>
        targetWeight * Math.min(1, (source[key] ?? 0) / targetWeight)));
    }
    return usedWeight ? coverage / usedWeight : 0;
  }
  const source = flattenPositiveScores(a);
  const target = normalize(flattenPositiveScores(b));
  return sum(Object.entries(target).map(([targetKey, weight]) => {
    if ((source[targetKey] ?? 0) > 0) return weight;
    const group = featureGroup(targetKey);
    const hasClusterMatch = Object.keys(source).some((sourceKey) => (source[sourceKey] ?? 0) > 0 && featureGroup(sourceKey) === group && sameCluster(group, sourceKey, targetKey, config));
    return weight * (hasClusterMatch ? 0.35 : 0);
  }));
}

function extractExplanations(a, b, config) {
  const genresA = genreScores(a);
  const genresB = genreScores(b);
  const sharedGenreKeys = config.genre.dimensions
    .map((key, order) => ({ key, order, shared: Math.min(genresA[key] ?? 0, genresB[key] ?? 0) }))
    .filter((item) => item.shared >= 1.2)
    .sort((x, y) => y.shared - x.shared || x.order - y.order)
    .slice(0, 3)
    .map((item) => item.key);
  const differentGenres = config.genre.dimensions
    .map((key, order) => ({ key, order, scoreA: genresA[key] ?? 0, scoreB: genresB[key] ?? 0 }))
    .map((item) => ({ ...item, difference: Math.abs(item.scoreA - item.scoreB), any: Math.max(item.scoreA, item.scoreB) }))
    .filter((item) => item.any >= 1.5 && item.difference > 0)
    .sort((x, y) => y.difference - x.difference || x.order - y.order)
    .slice(0, 2);
  const differentGenreKeys = differentGenres.map((item) => item.key);
  const ownerRecommendationGenreKeys = differentGenres.filter((item) => item.scoreA > item.scoreB).map((item) => item.key);
  const challengerRecommendationGenreKeys = differentGenres.filter((item) => item.scoreB > item.scoreA).map((item) => item.key);
  const positiveA = flattenPositiveScores(a);
  const positiveB = flattenPositiveScores(b);
  const sharedTasteKeys = Object.keys(positiveA)
    .filter((key) => (positiveA[key] ?? 0) > 0 && (positiveB[key] ?? 0) > 0)
    .sort((x, y) => Math.min(positiveB[y], positiveA[y]) - Math.min(positiveB[x], positiveA[x]))
    .slice(0, 3);
  return { sharedGenreKeys, differentGenreKeys, ownerRecommendationGenreKeys, challengerRecommendationGenreKeys, sharedTasteKeys };
}

export function calculateCompatibility(a, b, config = MATCH_COMPATIBILITY_CONFIG) {
  const genreSimilarity = calculateGenreSimilarity(a, b, config);
  const positive = calculatePositiveSimilarity(a, b, config);
  const avoidance = calculateAvoidanceCompatibility(a, b, config);
  const rawCompatibility = clamp(genreSimilarity * config.overallWeights.genre + positive.similarity * config.overallWeights.positive + avoidance.similarity * config.overallWeights.avoidance);
  const score = Math.round(rawCompatibility * 100);
  const band = config.bands.find((item) => score >= item.min) ?? config.bands.at(-1) ?? { min: 0, key: "different", label: "취향이 꽤 다름", subcopy: "서로 다른 장르를 맡아주면 의외로 유용함" };
  const conflictAtoB = avoidance.conflictAtoB;
  const conflictBtoA = avoidance.conflictBtoA;
  const trustAtoB = clamp(genreCoverage(a, b, config.genre.dimensions) * 0.65 + positiveCoverage(a, b, config) * 0.25 + (1 - conflictAtoB) * 0.1);
  const trustBtoA = clamp(genreCoverage(b, a, config.genre.dimensions) * 0.65 + positiveCoverage(b, a, config) * 0.25 + (1 - conflictBtoA) * 0.1);
  return {
    score,
    band,
    explanations: extractExplanations(a, b, config),
    private: {
      rawCompatibility: round(rawCompatibility),
      genreSimilarity,
      positiveTasteSimilarity: positive.similarity,
      positiveGroups: positive.groups,
      avoidanceCompatibility: avoidance.similarity,
      ownerToChallengerTrust: round(trustAtoB),
      challengerToOwnerTrust: round(trustBtoA),
    },
  };
}
