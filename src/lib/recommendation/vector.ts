export type ScoreMap = Record<string, number>;

export function addScoreMaps(scoreMaps: ScoreMap[]): ScoreMap {
  return scoreMaps.reduce<ScoreMap>((accumulator, scoreMap) => {
    Object.entries(scoreMap).forEach(([key, value]) => {
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

export function flattenTypeScores(
  typeScores?: Record<string, ScoreMap>
): ScoreMap {
  if (!typeScores) return {};

  return Object.values(typeScores).reduce<ScoreMap>(
    (flattenedScores, genreTypeScores) => {
      Object.entries(genreTypeScores).forEach(([typeKey, score]) => {
        flattenedScores[typeKey] = (flattenedScores[typeKey] ?? 0) + score;
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
    return sum + value * (longerMap[key] ?? 0);
  }, 0);
}

export function vectorMagnitude(scoreMap: ScoreMap): number {
  const squaredSum = Object.values(scoreMap).reduce((sum, value) => {
    return sum + value * value;
  }, 0);

  return Math.sqrt(squaredSum);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundScore(value: number): number {
  return Math.round(value * 10000) / 10000;
}