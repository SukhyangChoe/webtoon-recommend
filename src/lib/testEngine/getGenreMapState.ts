import type {
    FinalGenrePercentage,
    GenrePreferenceResult,
    GenrePreferenceResultType,
    GenreVisualState,
  } from "./calculateGenrePreferenceResult";
  import type { GenreKey } from "@/data/tests/genrePreference";
  
  export type GenreDisplayInfo = {
    name: string;
    shortLabel: string;
    mapObjectLabel: string;
  };
  
  export type GenreMapNodeState = {
    genreKey: GenreKey;
    genreName: string;
    percentage: number;
    roundedPercentage: number;
    score: number;
    rank: number;
    visualState: GenreVisualState;
    isPathActive: boolean;
    shortLabel: string;
    mapObjectLabel: string;
  };
  
  export type GenreMapState = {
    resultType: GenrePreferenceResultType;
    centerGenreKeys: GenreKey[];
    primaryGenreKey: GenreKey | null;
    secondaryGenreKey: GenreKey | null;
    topGenreKeys: GenreKey[];
    nodes: GenreMapNodeState[];
  };
  
  export const genreDisplayInfoMap: Record<GenreKey, GenreDisplayInfo> = {
    fantasy: {
      name: "판타지",
      shortLabel: "세계관과 성장에 끌려요",
      mapObjectLabel: "마법서",
    },
    murim: {
      name: "무협",
      shortLabel: "수련과 강호의 흐름에 끌려요",
      mapObjectLabel: "검",
    },
    romance_ropan: {
      name: "로맨스·로판",
      shortLabel: "관계와 감정선에 끌려요",
      mapObjectLabel: "편지",
    },
    thriller_horror: {
      name: "스릴러·공포",
      shortLabel: "긴장과 미스터리에 끌려요",
      mapObjectLabel: "단서",
    },
    drama_daily: {
      name: "드라마·일상",
      shortLabel: "현실감과 여운에 끌려요",
      mapObjectLabel: "찻잔",
    },
  };
  
  function getCenterGenreKeys(params: {
    resultType: GenrePreferenceResultType;
    topGenreKeys: GenreKey[];
  }) {
    const { resultType, topGenreKeys } = params;
  
    if (resultType === "single") {
      return topGenreKeys.slice(0, 1);
    }
  
    if (resultType === "linked") {
      return topGenreKeys.slice(0, 2);
    }
  
    return topGenreKeys.slice(0, 3);
  }
  
  function shouldActivatePath(params: {
    resultType: GenrePreferenceResultType;
    genreKey: GenreKey;
    topGenreKeys: GenreKey[];
  }) {
    const { resultType, genreKey, topGenreKeys } = params;
  
    if (resultType === "single") {
      return topGenreKeys.slice(0, 1).includes(genreKey);
    }
  
    if (resultType === "linked") {
      return topGenreKeys.slice(0, 2).includes(genreKey);
    }
  
    return topGenreKeys.slice(0, 3).includes(genreKey);
  }
  
  function toNode(
    percentage: FinalGenrePercentage,
    resultType: GenrePreferenceResultType,
    topGenreKeys: GenreKey[]
  ): GenreMapNodeState {
    const displayInfo = genreDisplayInfoMap[percentage.genreKey];
  
    return {
      genreKey: percentage.genreKey,
      genreName: displayInfo?.name ?? percentage.genreName,
      percentage: percentage.percentage,
      roundedPercentage: percentage.roundedPercentage,
      score: percentage.score,
      rank: percentage.rank,
      visualState: percentage.visualState,
      isPathActive: shouldActivatePath({
        resultType,
        genreKey: percentage.genreKey,
        topGenreKeys,
      }),
      shortLabel: displayInfo?.shortLabel ?? "",
      mapObjectLabel: displayInfo?.mapObjectLabel ?? "",
    };
  }
  
  export function getGenreMapState(result: GenrePreferenceResult): GenreMapState {
    const centerGenreKeys = getCenterGenreKeys({
      resultType: result.resultType,
      topGenreKeys: result.topGenreKeys,
    });
  
    const nodes = result.finalGenrePercentages.map((percentage) =>
      toNode(percentage, result.resultType, result.topGenreKeys)
    );
  
    return {
      resultType: result.resultType,
      centerGenreKeys,
      primaryGenreKey: result.primaryGenreKey,
      secondaryGenreKey: result.secondaryGenreKey,
      topGenreKeys: result.topGenreKeys,
      nodes,
    };
  }