import { dotProduct, roundScore, vectorMagnitude } from "./vector";

import type { ScoreMap } from "./vector";

export function cosineSimilarity(a: ScoreMap, b: ScoreMap): number {
  const aMagnitude = vectorMagnitude(a);
  const bMagnitude = vectorMagnitude(b);

  if (aMagnitude === 0 || bMagnitude === 0) {
    return 0;
  }

  return roundScore(dotProduct(a, b) / (aMagnitude * bMagnitude));
}