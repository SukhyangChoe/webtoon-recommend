export type ScoreMap = Record<string, number>;

export type NestedScoreMap = Record<string, ScoreMap>;

export type TypeScoreMap = ScoreMap | NestedScoreMap;

export type WeightedScoreMap = {
  scoreMap: ScoreMap;
  weight: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function addScoreMaps(scoreMaps: ScoreMap[]): ScoreMap {
  return scoreMaps.reduce<ScoreMap>((accumulator, scoreMap) => {
    Object.entries(scoreMap).forEach(([key, value]) => {
      if (!isFiniteNumber(value)) return;

      accumulator[key] = (accumulator[key] ?? 0) + value;
    });

    return accumulator;
  }, {});
}

export function averageScoreMaps(scoreMaps: ScoreMap[]): ScoreMap {
  if (scoreMaps.length === 0) return {};

  const summedScores = addScoreMaps(scoreMaps);

  return Object.fromEntries(
    Object.entries(summedScores)
      .map(([key, value]) => [key, roundScore(value / scoreMaps.length)])
      .filter(([, value]) => (value as number) > 0)
  );
}

/**
 * 작품별 sourceWeight 합을 공통 분모로 사용하는 가중 평균입니다.
 * 특정 축이 비어 있는 작품도 해당 작품의 sourceWeight는 분모에 포함되며,
 * 그 축에는 0 신호를 준 것으로 처리합니다.
 */
export function weightedAverageScoreMaps(
  weightedScoreMaps: WeightedScoreMap[]
): ScoreMap {
  const validItems = weightedScoreMaps.filter(({ weight }) => {
    return isFiniteNumber(weight) && weight > 0;
  });

  const totalWeight = validItems.reduce((sum, { weight }) => {
    return sum + weight;
  }, 0);

  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return {};
  }

  const weightedSums = validItems.reduce<ScoreMap>(
    (accumulator, { scoreMap, weight }) => {
      Object.entries(scoreMap).forEach(([key, value]) => {
        if (!isFiniteNumber(value)) return;

        accumulator[key] =
          (accumulator[key] ?? 0) + value * weight;
      });

      return accumulator;
    },
    {}
  );

  return Object.fromEntries(
    Object.entries(weightedSums)
      .map(([key, value]) => [key, roundScore(value / totalWeight)])
      .filter(([, value]) => {
        return isFiniteNumber(value) && value > 0;
      })
  ) as ScoreMap;
}

export function getPositiveWeightSum(weights: number[]): number {
  return roundScore(
    weights.reduce((sum, weight) => {
      if (!isFiniteNumber(weight) || weight <= 0) return sum;
      return sum + weight;
    }, 0)
  );
}

/**
 * 작품 DB의 장르별 중첩 typeScores와 기존 userTasteProfile의 평탄화된
 * typeScores를 모두 같은 비교 벡터로 변환합니다.
 */
export function flattenTypeScores(typeScores?: TypeScoreMap): ScoreMap {
  if (!typeScores || !isRecord(typeScores)) return {};

  return Object.entries(typeScores).reduce<ScoreMap>(
    (flattenedScores, [key, value]) => {
      if (isFiniteNumber(value)) {
        flattenedScores[key] =
          (flattenedScores[key] ?? 0) + value;
        return flattenedScores;
      }

      if (!isRecord(value)) return flattenedScores;

      Object.entries(value).forEach(([typeKey, score]) => {
        if (!isFiniteNumber(score)) return;

        flattenedScores[typeKey] =
          (flattenedScores[typeKey] ?? 0) + score;
      });

      return flattenedScores;
    },
    {}
  );
}

export function dotProduct(a: ScoreMap, b: ScoreMap): number {
  const [shorterMap, longerMap] =
    Object.keys(a).length <= Object.keys(b).length ? [a, b] : [b, a];

  return Object.entries(shorterMap).reduce((sum, [key, value]) => {
    if (!isFiniteNumber(value)) return sum;

    const otherValue = longerMap[key] ?? 0;

    if (!isFiniteNumber(otherValue)) return sum;

    return sum + value * otherValue;
  }, 0);
}

export function vectorMagnitude(scoreMap: ScoreMap): number {
  const squaredSum = Object.values(scoreMap).reduce((sum, value) => {
    if (!isFiniteNumber(value)) return sum;

    return sum + value * value;
  }, 0);

  return Math.sqrt(squaredSum);
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;

  return Math.min(Math.max(value, min), max);
}

export function roundScore(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.round(value * 10000) / 10000;
}