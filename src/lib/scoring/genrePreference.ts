import {
    GENRE_LABELS,
    GENRE_ORDER,
    GENRE_PREFERENCE_QUESTIONS,
    GENRE_PREFERENCE_TEST_KEY,
    GENRE_PREFERENCE_TEST_VERSION,
    type GenreKey,
    type GenrePreferenceOption,
  } from "@/data/tests/genrePreference";
  
  export type GenrePreferenceAnswerMap = Record<number, string>;
  
  export type UserGenreScores = Record<GenreKey, number>;
  
  export type GenreResultType = "single" | "linked" | "balanced";
  
  export type GenreRatioItem = {
    genreKey: GenreKey;
    label: string;
    score: number;
    ratio: number;
    exactRatio: number;
  };
  
  export type SelectedOptionRecord = {
    questionKey: string;
    optionKey: string;
    displayOrder: number;
  };
  
  export type GenrePreferenceResult = {
    schemaVersion: "1.1";
    testKey: typeof GENRE_PREFERENCE_TEST_KEY;
    testVersion: typeof GENRE_PREFERENCE_TEST_VERSION;
    completedAt: string;
    anonymousId: string;
    answers: SelectedOptionRecord[];
    userGenreScores: UserGenreScores;
    genreRatios: GenreRatioItem[];
    genrePercentages: Record<GenreKey, number>;
    topGenres: GenreRatioItem[];
    resultType: GenreResultType;
    primaryGenreKey: GenreKey | null;
    secondaryGenreKey: GenreKey | null;
    mapState: Record<
      GenreKey,
      {
        state: "dominant" | "strong" | "normal" | "weak" | "inactive";
        ratio: number;
        brightness: number;
        opacity: number;
        fogLevel: number;
        haloLevel: number;
        lightPathActive: boolean;
      }
    >;
    tagScores: Record<string, number>;
    avoidanceTagScores: Record<string, number>;
    topTags: string[];
  };
  
  function createEmptyGenreScores(): UserGenreScores {
    return {
      fantasy: 0,
      murim: 0,
      romance_ropan: 0,
      thriller_horror: 0,
      drama_daily: 0,
    };
  }
  
  function findSelectedOption(
    questionId: number,
    optionKey: string
  ): GenrePreferenceOption | undefined {
    const question = GENRE_PREFERENCE_QUESTIONS.find(
      (item) => item.id === questionId
    );
  
    return question?.options.find((item) => item.optionKey === optionKey);
  }
  
  export function getSelectedOptions(
    answers: GenrePreferenceAnswerMap
  ): SelectedOptionRecord[] {
    return GENRE_PREFERENCE_QUESTIONS.flatMap((question) => {
      const optionKey = answers[question.id];
  
      if (!optionKey) return [];
  
      return [
        {
          questionKey: question.questionKey,
          optionKey,
          displayOrder: question.id,
        },
      ];
    });
  }
  
  export function calculateUserGenreScores(
    answers: GenrePreferenceAnswerMap
  ): UserGenreScores {
    const userGenreScores = createEmptyGenreScores();
  
    Object.entries(answers).forEach(([questionId, optionKey]) => {
      const option = findSelectedOption(Number(questionId), optionKey);
  
      if (!option) return;
  
      Object.entries(option.optionGenreScores).forEach(([genreKey, score]) => {
        userGenreScores[genreKey as GenreKey] += score ?? 0;
      });
    });
  
    return userGenreScores;
  }
  
  export function calculateTagScores(
    answers: GenrePreferenceAnswerMap
  ): Record<string, number> {
    const tagScores: Record<string, number> = {};
  
    Object.entries(answers).forEach(([questionId, optionKey]) => {
      const option = findSelectedOption(Number(questionId), optionKey);
  
      if (!option) return;
  
      option.tagScores.forEach((tagKey) => {
        tagScores[tagKey] = (tagScores[tagKey] ?? 0) + 1;
      });
    });
  
    return tagScores;
  }
  
  export function calculateGenreRatios(
    userGenreScores: UserGenreScores
  ): GenreRatioItem[] {
    const totalScore = Object.values(userGenreScores).reduce(
      (sum, score) => sum + score,
      0
    );
  
    return GENRE_ORDER.map((genreKey) => {
      const score = userGenreScores[genreKey];
      const exactRatio = totalScore === 0 ? 0 : (score / totalScore) * 100;
  
      return {
        genreKey,
        label: GENRE_LABELS[genreKey],
        score,
        exactRatio,
        ratio: Math.round(exactRatio),
      };
    }).sort((a, b) => {
      if (b.exactRatio !== a.exactRatio) return b.exactRatio - a.exactRatio;
      if (b.score !== a.score) return b.score - a.score;
  
      return GENRE_ORDER.indexOf(a.genreKey) - GENRE_ORDER.indexOf(b.genreKey);
    });
  }
  
  export function calculateGenrePercentages(
    genreRatios: GenreRatioItem[]
  ): Record<GenreKey, number> {
    const genrePercentages = createEmptyGenreScores();
  
    genreRatios.forEach((item) => {
      genrePercentages[item.genreKey] = item.ratio;
    });
  
    return genrePercentages;
  }
  
  export function calculateResultType(
    genreRatios: GenreRatioItem[]
  ): GenreResultType {
    const [first, second, third] = genreRatios;
  
    if (!first || !second || !third) return "single";
  
    const isBalanced =
      first.exactRatio >= 18 &&
      second.exactRatio >= 18 &&
      third.exactRatio >= 18 &&
      first.exactRatio - third.exactRatio <= 8;
  
    if (isBalanced) return "balanced";
  
    const isLinked =
      first.exactRatio >= 24 &&
      second.exactRatio >= 22 &&
      first.exactRatio - second.exactRatio <= 8;
  
    if (isLinked) return "linked";
  
    return "single";
  }
  
  function createMapState(
    genreRatios: GenreRatioItem[],
    resultType: GenreResultType
  ): GenrePreferenceResult["mapState"] {
    const topGenreKeys =
      resultType === "balanced"
        ? genreRatios.slice(0, 3).map((item) => item.genreKey)
        : resultType === "linked"
          ? genreRatios.slice(0, 2).map((item) => item.genreKey)
          : genreRatios.slice(0, 1).map((item) => item.genreKey);
  
    const mapState = {} as GenrePreferenceResult["mapState"];
  
    GENRE_ORDER.forEach((genreKey) => {
      const ratioItem = genreRatios.find((item) => item.genreKey === genreKey);
      const ratio = ratioItem?.ratio ?? 0;
  
      let state: GenrePreferenceResult["mapState"][GenreKey]["state"] =
        "inactive";
      let brightness = 0.35;
      let opacity = 0.35;
      let fogLevel = 3;
      let haloLevel = 0;
  
      if (ratio >= 30) {
        state = "dominant";
        brightness = 1;
        opacity = 1;
        fogLevel = 0;
        haloLevel = 3;
      } else if (ratio >= 22) {
        state = "strong";
        brightness = 0.88;
        opacity = 0.88;
        fogLevel = 1;
        haloLevel = 2;
      } else if (ratio >= 13) {
        state = "normal";
        brightness = 0.72;
        opacity = 0.72;
        fogLevel = 2;
        haloLevel = 1;
      } else if (ratio >= 1) {
        state = "weak";
        brightness = 0.52;
        opacity = 0.52;
        fogLevel = 3;
        haloLevel = 0;
      }
  
      mapState[genreKey] = {
        state,
        ratio,
        brightness,
        opacity,
        fogLevel,
        haloLevel,
        lightPathActive: topGenreKeys.includes(genreKey),
      };
    });
  
    return mapState;
  }
  
  export function getTopTags(tagScores: Record<string, number>): string[] {
    return Object.entries(tagScores)
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
  
        return a[0].localeCompare(b[0]);
      })
      .slice(0, 5)
      .map(([tagKey]) => tagKey);
  }
  
  export function buildGenrePreferenceResult(params: {
    answers: GenrePreferenceAnswerMap;
    anonymousId: string;
  }): GenrePreferenceResult {
    const userGenreScores = calculateUserGenreScores(params.answers);
    const genreRatios = calculateGenreRatios(userGenreScores);
    const genrePercentages = calculateGenrePercentages(genreRatios);
    const resultType = calculateResultType(genreRatios);
    const tagScores = calculateTagScores(params.answers);
    const topGenres = genreRatios.slice(0, 3);
  
    return {
      schemaVersion: "1.1",
      testKey: GENRE_PREFERENCE_TEST_KEY,
      testVersion: GENRE_PREFERENCE_TEST_VERSION,
      completedAt: new Date().toISOString(),
      anonymousId: params.anonymousId,
      answers: getSelectedOptions(params.answers),
      userGenreScores,
      genreRatios,
      genrePercentages,
      topGenres,
      resultType,
      primaryGenreKey: topGenres[0]?.genreKey ?? null,
      secondaryGenreKey:
        resultType === "linked" ? (topGenres[1]?.genreKey ?? null) : null,
      mapState: createMapState(genreRatios, resultType),
      tagScores,
      avoidanceTagScores: {},
      topTags: getTopTags(tagScores),
    };
  }
  
  export function buildUserTasteProfile(
    result: GenrePreferenceResult
  ) {
    return {
      schemaVersion: "1.1",
      anonymousId: result.anonymousId,
      updatedAt: new Date().toISOString(),
      sourceTests: [result.testKey],
      genreProfile: result.userGenreScores,
      typeProfile: {},
      tagProfile: result.tagScores,
      avoidanceTagProfile: result.avoidanceTagScores,
      topGenres: result.topGenres.map((item) => item.genreKey),
      topTags: result.topTags,
    };
  }