import { getContentAxisLabel } from "@/data/contentAxis/contentAxisLabels";

import type { ScoreMap } from "./vector";

const GENRE_LABELS: Record<string, string> = {
  fantasy: "판타지",
  murim: "무협",
  romance_ropan: "로맨스·로판",
  thriller_horror: "스릴러·공포",
  drama_daily: "드라마·일상",
};

function getFallbackGenreLabel(fallbackGenreKey?: string) {
  if (!fallbackGenreKey) return "장르별";

  return GENRE_LABELS[fallbackGenreKey] ?? fallbackGenreKey;
}

export function getPrimaryContentAxisKey(
  contentAxisScores: ScoreMap
): string | null {
  const entries = Object.entries(contentAxisScores).filter(([, score]) => {
    return typeof score === "number" && Number.isFinite(score) && score > 0;
  });

  if (entries.length === 0) return null;

  return entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  })[0][0];
}

export function getDisplayAxisLabel(
  contentAxisScores: ScoreMap,
  fallbackGenreKey?: string
): string {
  const primaryContentAxisKey = getPrimaryContentAxisKey(contentAxisScores);

  if (!primaryContentAxisKey) {
    return getFallbackGenreLabel(fallbackGenreKey);
  }

  return (
    getContentAxisLabel(primaryContentAxisKey) ??
    getFallbackGenreLabel(fallbackGenreKey)
  );
}

export function getContentAxisSearchLabels(contentAxisScores: ScoreMap) {
  return Object.keys(contentAxisScores)
    .map((axisKey) => getContentAxisLabel(axisKey))
    .filter((label): label is string => Boolean(label));
}