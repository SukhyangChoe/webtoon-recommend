import {
  flattenTypeScores,
  recommendationToTasteVector,
} from "./tasteVectorEngine.mjs";

export const RECOMMENDATION_FIT_HIGHLIGHT_THRESHOLD = 0.7;
export const RECOMMENDATION_FIT_MIN_COMPARABLE_AXES = 2;

const AXIS_WEIGHTS = Object.freeze({
  tagScores: 0.35,
  contentAxisScores: 0.3,
  typeScores: 0.2,
  artStyleScores: 0.15,
});

const round = (value, digits = 6) => Number(value.toFixed(digits));
const sum = (values) => values.reduce((total, value) => total + value, 0);
const clamp = (value) => Math.max(0, Math.min(1, value));

function positiveScores(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, score]) => (
    typeof score === "number" && Number.isFinite(score) && score > 0
  )));
}

function normalize(scoreMap, keys) {
  const total = sum(keys.map((key) => scoreMap[key] ?? 0));
  if (!total) return Object.fromEntries(keys.map((key) => [key, 0]));
  return Object.fromEntries(keys.map((key) => [key, (scoreMap[key] ?? 0) / total]));
}

function vectorSimilarity(leftValue, rightValue) {
  const left = positiveScores(leftValue);
  const right = positiveScores(rightValue);
  if (!Object.keys(left).length || !Object.keys(right).length) return null;

  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])];
  const dot = sum(keys.map((key) => (left[key] ?? 0) * (right[key] ?? 0)));
  const leftMagnitude = Math.sqrt(sum(keys.map((key) => (left[key] ?? 0) ** 2)));
  const rightMagnitude = Math.sqrt(sum(keys.map((key) => (right[key] ?? 0) ** 2)));
  const cosine = leftMagnitude && rightMagnitude
    ? dot / (leftMagnitude * rightMagnitude)
    : 0;
  const normalizedLeft = normalize(left, keys);
  const normalizedRight = normalize(right, keys);
  const overlap = sum(keys.map((key) => Math.min(
    normalizedLeft[key] ?? 0,
    normalizedRight[key] ?? 0,
  )));

  return round(clamp(cosine * 0.7 + overlap * 0.3));
}

/**
 * 사용자 취향 벡터와 작품 벡터의 긍정 취향 적합도를 계산합니다.
 * 장르명 자체가 아니라 태그·콘텐츠축·세부 타입·그림체 축을 비교하며,
 * 어느 한쪽에 근거가 없는 축은 0점 처리하지 않고 가중치에서 제외합니다.
 */
export function calculateRecommendationFit(userTasteVector, recommendation, seed) {
  if (!userTasteVector || !recommendation) {
    return { score: 0, comparableAxes: [], highlighted: false };
  }

  const workTasteVector = recommendationToTasteVector(recommendation, seed);
  const userAxes = {
    tagScores: userTasteVector.tagScores,
    contentAxisScores: userTasteVector.contentAxisScores,
    typeScores: flattenTypeScores(userTasteVector.typeScores),
    artStyleScores: userTasteVector.artStyleScores,
  };
  const workAxes = {
    tagScores: workTasteVector.tagScores,
    contentAxisScores: workTasteVector.contentAxisScores,
    typeScores: flattenTypeScores(workTasteVector.typeScores),
    artStyleScores: workTasteVector.artStyleScores,
  };

  const comparableAxes = Object.entries(AXIS_WEIGHTS).flatMap(([axisKey, weight]) => {
    const similarity = vectorSimilarity(userAxes[axisKey], workAxes[axisKey]);
    return similarity === null ? [] : [{ axisKey, weight, similarity }];
  });
  const activeWeight = sum(comparableAxes.map((axis) => axis.weight));
  const score = activeWeight
    ? round(sum(comparableAxes.map((axis) => axis.similarity * axis.weight)) / activeWeight)
    : 0;

  return {
    score,
    comparableAxes: comparableAxes.map(({ axisKey, similarity }) => ({
      axisKey,
      similarity,
    })),
    highlighted:
      comparableAxes.length >= RECOMMENDATION_FIT_MIN_COMPARABLE_AXES
      && score >= RECOMMENDATION_FIT_HIGHLIGHT_THRESHOLD,
  };
}
