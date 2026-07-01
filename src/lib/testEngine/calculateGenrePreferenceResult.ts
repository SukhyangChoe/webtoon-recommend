import {
    genrePreferenceGenres,
    genrePreferenceQuestions,
    genrePreferenceTest,
    type GenreKey,
    type GenrePreferenceQuestion,
    type PairChoiceSide,
  } from "@/data/tests/genrePreference";
  
  export type PairChoiceAnswer = {
    questionKey: string;
    selectedSide: PairChoiceSide;
  };
  
  export type GenreScoreMap = Record<GenreKey, number>;
  
  export type GenreAvoidanceScoreMap = Partial<Record<GenreKey, number>>;
  
  export type GenrePreferenceResultType = "single" | "linked" | "balanced";
  
  export type GenreVisualState = "open" | "faint" | "dormant";
  
  export type FinalGenrePercentage = {
    genreKey: GenreKey;
    genreName: string;
    displayOrder: number;
    score: number;
    percentage: number;
    roundedPercentage: number;
    rank: number;
    visualState: GenreVisualState;
  };
  
  export type GenrePreferenceResult = {
    testKey: "genre_preference";
    testVersion: "v1.4_pair_league_image_card";
    resultName: "내 웹툰 세계관 지도";
    answers: PairChoiceAnswer[];
    positiveGenreScores: GenreScoreMap;
    genreAvoidanceScores: GenreAvoidanceScoreMap;
    finalGenreScores: GenreScoreMap;
    totalFinalGenreScore: number;
    finalGenrePercentages: FinalGenrePercentage[];
    resultType: GenrePreferenceResultType;
    primaryGenreKey: GenreKey | null;
    secondaryGenreKey: GenreKey | null;
    topGenreKeys: GenreKey[];
    tagScores: Record<string, never>;
    avoidanceTagScores: Record<string, never>;
  };
  
  function createEmptyGenreScoreMap(): GenreScoreMap {
    return {
      fantasy: 0,
      murim: 0,
      romance_ropan: 0,
      thriller_horror: 0,
      drama_daily: 0,
    };
  }
  
  function addGenreScore(
    target: GenreScoreMap,
    genreKey: GenreKey,
    score: number
  ) {
    target[genreKey] = Number(((target[genreKey] ?? 0) + score).toFixed(10));
  }
  
  function findQuestionByKey(
    questions: GenrePreferenceQuestion[],
    questionKey: string
  ) {
    return questions.find((question) => question.questionKey === questionKey);
  }
  
  function getGenreName(genreKey: GenreKey) {
    return (
      genrePreferenceGenres.find((genre) => genre.genreKey === genreKey)?.label ??
      genreKey
    );
  }
  
  function getGenreDisplayOrder(genreKey: GenreKey) {
    return (
      genrePreferenceGenres.find((genre) => genre.genreKey === genreKey)
        ?.displayOrder ?? 999
    );
  }
  
  function getVisualState(percentage: number): GenreVisualState {
    if (percentage >= 18) return "open";
    if (percentage >= 10) return "faint";
    return "dormant";
  }
  
  function calculatePositiveGenreScores(params: {
    answers: PairChoiceAnswer[];
    questions: GenrePreferenceQuestion[];
  }) {
    const positiveGenreScores = createEmptyGenreScoreMap();
  
    params.answers.forEach((answer) => {
      const question = findQuestionByKey(params.questions, answer.questionKey);
  
      if (!question) return;
  
      if (answer.selectedSide === "left") {
        addGenreScore(positiveGenreScores, question.left.genreKey, 3);
        addGenreScore(positiveGenreScores, question.right.genreKey, 0);
        return;
      }
  
      if (answer.selectedSide === "draw") {
        addGenreScore(positiveGenreScores, question.left.genreKey, 1);
        addGenreScore(positiveGenreScores, question.right.genreKey, 1);
        return;
      }
  
      if (answer.selectedSide === "right") {
        addGenreScore(positiveGenreScores, question.left.genreKey, 0);
        addGenreScore(positiveGenreScores, question.right.genreKey, 3);
      }
    });
  
    return positiveGenreScores;
  }
  
  function sortFinalGenrePercentages(
    finalGenrePercentages: FinalGenrePercentage[]
  ) {
    return [...finalGenrePercentages].sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      if (b.score !== a.score) return b.score - a.score;
      return a.displayOrder - b.displayOrder;
    });
  }
  
  function getResultType(
    sortedFinalGenrePercentages: FinalGenrePercentage[]
  ): GenrePreferenceResultType {
    const first = sortedFinalGenrePercentages[0];
    const second = sortedFinalGenrePercentages[1];
    const third = sortedFinalGenrePercentages[2];
  
    if (
      first &&
      second &&
      third &&
      first.percentage >= 18 &&
      second.percentage >= 18 &&
      third.percentage >= 18 &&
      first.percentage - third.percentage <= 8
    ) {
      return "balanced";
    }
  
    if (
      first &&
      second &&
      first.percentage >= 24 &&
      second.percentage >= 22 &&
      first.percentage - second.percentage <= 8
    ) {
      return "linked";
    }
  
    return "single";
  }
  
  function getTopGenreKeys(params: {
    resultType: GenrePreferenceResultType;
    sortedFinalGenrePercentages: FinalGenrePercentage[];
  }) {
    const { resultType, sortedFinalGenrePercentages } = params;
  
    if (resultType === "balanced") {
      return sortedFinalGenrePercentages.slice(0, 3).map((item) => item.genreKey);
    }
  
    if (resultType === "linked") {
      return sortedFinalGenrePercentages.slice(0, 2).map((item) => item.genreKey);
    }
  
    return sortedFinalGenrePercentages.slice(0, 1).map((item) => item.genreKey);
  }
  
  export function calculateGenrePreferenceResult(params: {
    answers: PairChoiceAnswer[];
    questions?: GenrePreferenceQuestion[];
  }): GenrePreferenceResult {
    const questions = params.questions ?? genrePreferenceQuestions;
  
    const positiveGenreScores = calculatePositiveGenreScores({
      answers: params.answers,
      questions,
    });
  
    const genreAvoidanceScores: GenreAvoidanceScoreMap = {};
  
    const finalGenreScores: GenreScoreMap = {
      ...positiveGenreScores,
    };
  
    const totalFinalGenreScore = Object.values(finalGenreScores).reduce(
      (sum, score) => sum + score,
      0
    );
  
    const unsortedFinalGenrePercentages: FinalGenrePercentage[] =
      genrePreferenceGenres.map((genre) => {
        const score = finalGenreScores[genre.genreKey];
        const percentage =
          totalFinalGenreScore > 0 ? (score / totalFinalGenreScore) * 100 : 0;
  
        return {
          genreKey: genre.genreKey,
          genreName: getGenreName(genre.genreKey),
          displayOrder: getGenreDisplayOrder(genre.genreKey),
          score,
          percentage,
          roundedPercentage: Math.round(percentage),
          rank: 0,
          visualState: getVisualState(percentage),
        };
      });
  
    const sortedFinalGenrePercentages = sortFinalGenrePercentages(
      unsortedFinalGenrePercentages
    ).map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  
    const resultType = getResultType(sortedFinalGenrePercentages);
  
    const primaryGenreKey = sortedFinalGenrePercentages[0]?.genreKey ?? null;
  
    const secondaryGenreKey =
      resultType === "linked"
        ? sortedFinalGenrePercentages[1]?.genreKey ?? null
        : null;
  
    const topGenreKeys = getTopGenreKeys({
      resultType,
      sortedFinalGenrePercentages,
    });
  
    return {
      testKey: genrePreferenceTest.testKey,
      testVersion: genrePreferenceTest.testVersion,
      resultName: genrePreferenceTest.resultName,
      answers: params.answers,
      positiveGenreScores,
      genreAvoidanceScores,
      finalGenreScores,
      totalFinalGenreScore,
      finalGenrePercentages: sortedFinalGenrePercentages,
      resultType,
      primaryGenreKey,
      secondaryGenreKey,
      topGenreKeys,
      tagScores: {},
      avoidanceTagScores: {},
    };
  }