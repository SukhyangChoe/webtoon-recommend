import type { GenreKey } from "@/data/tests/genrePreference";
import type { GenrePercentage } from "./calculateGenrePreference";

export type GenreMapResultType = "single" | "linked" | "balanced";

export type GenreVisualState = "open" | "faint" | "dormant";

export type GenreMapPercentage = GenrePercentage & {
  visualState: GenreVisualState;
};

export type GenreMapResult = {
  resultType: GenreMapResultType;
  primaryGenreKey: GenreKey | null;
  topGenreKeys: GenreKey[];
  finalGenrePercentages: GenreMapPercentage[];
};

function getVisualState(percentage: number): GenreVisualState {
  if (percentage >= 30) return "open";
  if (percentage >= 15) return "faint";
  return "dormant";
}

function getResultType(
  sortedPercentages: GenrePercentage[]
): GenreMapResultType {
  const first = sortedPercentages[0];
  const second = sortedPercentages[1];
  const third = sortedPercentages[2];

  if (!first || first.score === 0) return "balanced";
  if (!second) return "single";

  const firstSecondGap = first.percentage - second.percentage;
  const secondThirdGap = second && third ? second.percentage - third.percentage : 0;

  if (firstSecondGap >= 15) return "single";

  if (firstSecondGap < 15 && secondThirdGap >= 8) {
    return "linked";
  }

  return "balanced";
}

export function getGenreMapResult(params: {
  genrePercentages: GenrePercentage[];
}): GenreMapResult {
  const sortedPercentages = [...params.genrePercentages].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.genreKey.localeCompare(b.genreKey);
  });

  const resultType = getResultType(sortedPercentages);
  const primaryGenreKey = sortedPercentages[0]?.genreKey ?? null;

  const topGenreKeys =
    resultType === "single"
      ? sortedPercentages.slice(0, 1).map((item) => item.genreKey)
      : resultType === "linked"
        ? sortedPercentages.slice(0, 2).map((item) => item.genreKey)
        : sortedPercentages.slice(0, 3).map((item) => item.genreKey);

  const finalGenrePercentages = sortedPercentages.map((item) => ({
    ...item,
    visualState: getVisualState(item.percentage),
  }));

  return {
    resultType,
    primaryGenreKey,
    topGenreKeys,
    finalGenrePercentages,
  };
}