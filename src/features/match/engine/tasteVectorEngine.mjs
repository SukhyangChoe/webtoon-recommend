import { MATCH_VERSIONS } from "../config/versions.mjs";

export const MATCH_TASTE_VECTOR_VERSION = MATCH_VERSIONS.tasteVector;

const round = (value, digits = 6) => Number(value.toFixed(digits));
const sum = (values) => values.reduce((total, value) => total + value, 0);
const isPositiveNumber = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;

function numericMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([, score]) => isPositiveNumber(score))
    .map(([key, score]) => [key, round(score)]));
}

function addDistributed(target, keys, score) {
  const uniqueKeys = [...new Set((keys ?? []).filter(Boolean))];
  if (!uniqueKeys.length || !isPositiveNumber(score)) return;
  const share = score / uniqueKeys.length;
  for (const key of uniqueKeys) target[key] = round((target[key] ?? 0) + share);
}

function parentGenreForType(typeKey) {
  if (typeKey.startsWith("thriller_")) return "thriller_horror";
  if (typeKey.startsWith("drama_")) return "drama_daily";
  if (typeKey.startsWith("romance_")) return "romance_ropan";
  if (typeKey.startsWith("fantasy_")) return "fantasy";
  if (typeKey.startsWith("murim_")) return "murim";
  return "other";
}

export function flattenTypeScores(typeScores) {
  const flat = {};
  for (const [genreKey, scores] of Object.entries(typeScores ?? {})) {
    for (const [typeKey, score] of Object.entries(numericMap(scores))) flat[`${genreKey}.${typeKey}`] = score;
  }
  return flat;
}

export function nestTypeScores(flatScores) {
  const nested = {};
  for (const [compoundKey, score] of Object.entries(numericMap(flatScores))) {
    const separator = compoundKey.indexOf(".");
    const genreKey = separator > 0 ? compoundKey.slice(0, separator) : "other";
    const typeKey = separator > 0 ? compoundKey.slice(separator + 1) : compoundKey;
    nested[genreKey] ??= {};
    nested[genreKey][typeKey] = score;
  }
  return nested;
}

function compatibilityFor(seed, featureKey, catalogKey) {
  return (seed[catalogKey] ?? []).find((item) => item.featureKey === featureKey)?.webtoonFitCompatibility ?? null;
}

function addPositiveFeature(target, featureKey, score, seed) {
  const mapping = compatibilityFor(seed, featureKey, "positiveFeatureCatalog");
  if (!mapping || mapping.mappingType === "webtoon_match_only") return;
  addDistributed(target.tagScores, mapping.positiveTagKeys, score);
  addDistributed(target.contentAxisScores, mapping.contentAxisKeys, score);
  const typeHints = mapping.typeHints ?? [];
  if (typeHints.length) {
    const share = score / typeHints.length;
    for (const typeKey of typeHints) {
      const parent = parentGenreForType(typeKey);
      target.typeScores[parent] ??= {};
      target.typeScores[parent][typeKey] = round((target.typeScores[parent][typeKey] ?? 0) + share);
    }
  }
}

export function buildProfileTasteVector(snapshot, seed) {
  const vector = {
    vectorVersion: MATCH_TASTE_VECTOR_VERSION,
    genreScores: numericMap(snapshot.rawGenreAffinity),
    typeScores: {},
    tagScores: {},
    avoidanceTagScores: {},
    contentAxisScores: {},
    artStyleScores: numericMap(snapshot.artPreferenceScores),
  };

  const positiveGroups = snapshot.positiveTasteScores ?? {};
  for (const scores of Object.values(positiveGroups)) {
    for (const [featureKey, score] of Object.entries(numericMap(scores))) addPositiveFeature(vector, featureKey, score, seed);
  }
  for (const [featureKey, score] of Object.entries(numericMap(snapshot.avoidanceTasteScores))) {
    const mapping = compatibilityFor(seed, featureKey, "avoidanceFeatureCatalog");
    addDistributed(vector.avoidanceTagScores, mapping?.avoidanceTagKeys, score);
  }
  return vector;
}

function maxScore(scoreMap, keys) {
  return Math.max(0, ...(keys ?? []).map((key) => scoreMap?.[key] ?? 0));
}

function maxTypeScore(typeScores, predicate) {
  return Math.max(0, ...Object.entries(flattenTypeScores(typeScores))
    .filter(([key]) => predicate(key))
    .map(([, score]) => score));
}

export function projectRecommendationGenreScores(recommendation, seed) {
  const direct = numericMap(recommendation?.genreScores);
  const tags = numericMap(recommendation?.tagScores);
  const content = numericMap(recommendation?.contentAxisScores);
  const projected = {};
  const policies = seed.publicGenrePolicy.publicGenres;

  for (const genre of policies) {
    if (isPositiveNumber(direct[genre.genreKey])) projected[genre.genreKey] = direct[genre.genreKey];
  }

  const combinedRomance = direct.romance_ropan ?? 0;
  if (combinedRomance > 0) {
    const romancePolicy = policies.find((item) => item.genreKey === "romance")?.webtoonFitCompatibility;
    const ropanPolicy = policies.find((item) => item.genreKey === "ropan")?.webtoonFitCompatibility;
    const romanceEvidence = maxScore(content, romancePolicy?.contentAxisExamples);
    const ropanEvidence = maxScore(content, ropanPolicy?.contentAxisExamples);
    const evidenceTotal = romanceEvidence + ropanEvidence;
    const romanceShare = evidenceTotal ? romanceEvidence / evidenceTotal : 0.5;
    projected.romance = round(combinedRomance * romanceShare);
    projected.ropan = round(combinedRomance * (1 - romanceShare));
  }

  for (const genreKey of ["action", "comedy", "sports"]) {
    if (isPositiveNumber(projected[genreKey])) continue;
    const policy = policies.find((item) => item.genreKey === genreKey)?.webtoonFitCompatibility;
    const contentAxisKeys = genreKey === "comedy"
      ? ["comedy_sitcom"]
      : genreKey === "sports"
        ? ["sports_competition", "sports_professional", "tournament_rank"]
        : policy?.contentAxisExamples;
    let evidence = Math.max(
      maxScore(tags, policy?.positiveTagKeys),
      maxScore(content, contentAxisKeys),
    );
    if (genreKey === "comedy") {
      evidence = Math.max(evidence, maxTypeScore(recommendation?.typeScores, (key) => key.includes("comedy") || key.includes("romcom")));
    }
    if (evidence > 0) {
      projected[genreKey] = round(evidence);
      // 구 DB의 넓은 장르 점수에서 세부 장르 신호를 분리한다.
      // 예: drama_daily 5 + humor_comedy 3 => drama_daily 2 + comedy 3.
      const parentKeys = (policy?.legacyGenreKeys ?? []).flatMap((key) =>
        key === "romance_ropan" ? ["romance", "ropan"] : [key]);
      let remaining = evidence;
      for (const parentKey of [...parentKeys].sort((a, b) => (projected[b] ?? 0) - (projected[a] ?? 0))) {
        if (remaining <= 0) break;
        const deduction = Math.min(projected[parentKey] ?? 0, remaining);
        projected[parentKey] = round((projected[parentKey] ?? 0) - deduction);
        remaining -= deduction;
      }
    }
  }
  return Object.fromEntries(Object.entries(projected).filter(([, score]) => score > 0));
}

export function matchingRecommendationGenreKeys(recommendation, targetGenreKeys, seed, minimumPeakRatio = 0.6) {
  const projected = projectRecommendationGenreScores(recommendation, seed);
  const peakScore = Math.max(0, ...Object.values(projected));
  if (!peakScore) return [];
  const threshold = peakScore * minimumPeakRatio;
  return [...new Set(targetGenreKeys ?? [])]
    .filter((genreKey) => (projected[genreKey] ?? 0) >= threshold);
}

export function recommendationToTasteVector(recommendation, seed) {
  return {
    vectorVersion: MATCH_TASTE_VECTOR_VERSION,
    genreScores: projectRecommendationGenreScores(recommendation, seed),
    typeScores: Object.fromEntries(Object.entries(recommendation?.typeScores ?? {})
      .map(([genreKey, scores]) => [genreKey, numericMap(scores)])
      .filter(([, scores]) => Object.keys(scores).length)),
    tagScores: numericMap(recommendation?.tagScores),
    avoidanceTagScores: numericMap(recommendation?.avoidanceTagScores),
    contentAxisScores: numericMap(recommendation?.contentAxisScores),
    artStyleScores: numericMap(recommendation?.artStyleScores),
  };
}

function normalize(scoreMap) {
  const clean = numericMap(scoreMap);
  const total = sum(Object.values(clean));
  if (!total) return {};
  return Object.fromEntries(Object.entries(clean).map(([key, score]) => [key, round(score / total)]));
}

function averageNormalized(vectors) {
  const normalized = vectors.map(normalize).filter((item) => Object.keys(item).length);
  if (!normalized.length) return {};
  const keys = [...new Set(normalized.flatMap((item) => Object.keys(item)))];
  return Object.fromEntries(keys.map((key) => [key, round(sum(normalized.map((item) => item[key] ?? 0)) / normalized.length)]));
}

function blendMap(base, recommendationAverage, recommendationWeight, preserveTotal = false) {
  const baseClean = numericMap(base);
  if (!Object.keys(recommendationAverage).length) return baseClean;
  const baseNormalized = normalize(baseClean);
  const keys = [...new Set([...Object.keys(baseNormalized), ...Object.keys(recommendationAverage)])];
  const testWeight = 1 - recommendationWeight;
  const total = preserveTotal ? sum(Object.values(baseClean)) || 1 : 1;
  return Object.fromEntries(keys.map((key) => [
    key,
    round(((baseNormalized[key] ?? 0) * testWeight + (recommendationAverage[key] ?? 0) * recommendationWeight) * total),
  ]).filter(([, score]) => score > 0));
}

export function blendTasteVectors(baseVector, recommendations, recommendationWeight, seed) {
  const workVectors = recommendations.map((item) => recommendationToTasteVector(item, seed));
  const average = {
    genreScores: averageNormalized(workVectors.map((item) => item.genreScores)),
    tagScores: averageNormalized(workVectors.map((item) => item.tagScores)),
    contentAxisScores: averageNormalized(workVectors.map((item) => item.contentAxisScores)),
    artStyleScores: averageNormalized(workVectors.map((item) => item.artStyleScores)),
    typeScores: averageNormalized(workVectors.map((item) => flattenTypeScores(item.typeScores))),
  };
  return {
    vectorVersion: MATCH_TASTE_VECTOR_VERSION,
    genreScores: blendMap(baseVector.genreScores, average.genreScores, recommendationWeight, true),
    typeScores: nestTypeScores(blendMap(flattenTypeScores(baseVector.typeScores), average.typeScores, recommendationWeight)),
    tagScores: blendMap(baseVector.tagScores, average.tagScores, recommendationWeight),
    // 작품의 avoidance는 작품의 부담 요소다. 추천했다고 사용자의 불호가 되지는 않으므로 직접 응답만 유지한다.
    avoidanceTagScores: numericMap(baseVector.avoidanceTagScores),
    contentAxisScores: blendMap(baseVector.contentAxisScores, average.contentAxisScores, recommendationWeight),
    artStyleScores: blendMap(baseVector.artStyleScores, average.artStyleScores, recommendationWeight),
  };
}
