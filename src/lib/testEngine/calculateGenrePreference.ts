import {
    genrePreferenceGenres,
    genrePreferenceQuestions,
    type GenreKey,
    type GenrePreferenceQuestion,
    type PairChoiceSide,
  } from "@/data/tests/genrePreference";
  
  export type PairChoiceAnswer = {
    questionKey: string;
    selectedSide: PairChoiceSide;
  };
  
  export type GenreScoreMap = Record<GenreKey, number>;
  
  export type GenrePercentage = {
    genreKey: GenreKey;
    score: number;
    percentage: number;
    roundedPercentage: number;
    rank: number;
  };
  
  export type GenrePreferenceCalculationResult = {
    userGenreScores: GenreScoreMap;
    totalScore: number;
    genrePercentages: GenrePercentage[];
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
  
  function addScore(scores: GenreScoreMap, genreKey: GenreKey, value: number) {
    scores[genreKey] = Number(((scores[genreKey] ?? 0) + value).toFixed(10));
  }
  
  function findQuestionByKey(
    questions: GenrePreferenceQuestion[],
    questionKey: string
  ) {
    return questions.find((question) => question.questionKey === questionKey);
  }
  
  export function calculateGenrePreference(params: {
    answers: PairChoiceAnswer[];
    questions?: GenrePreferenceQuestion[];
  }): GenrePreferenceCalculationResult {
    const questions = params.questions ?? genrePreferenceQuestions;
    const scores = createEmptyGenreScoreMap();
  
    params.answers.forEach((answer) => {
      const question = findQuestionByKey(questions, answer.questionKey);
      if (!question) return;
  
      if (answer.selectedSide === "left") {
        addScore(scores, question.left.genreKey, 3);
        addScore(scores, question.right.genreKey, 0);
        return;
      }
  
      if (answer.selectedSide === "draw") {
        addScore(scores, question.left.genreKey, 1);
        addScore(scores, question.right.genreKey, 1);
        return;
      }
  
      if (answer.selectedSide === "right") {
        addScore(scores, question.left.genreKey, 0);
        addScore(scores, question.right.genreKey, 3);
      }
    });
  
    const totalScore = Object.values(scores).reduce(
      (sum, score) => sum + score,
      0
    );
  
    const sortedEntries = [...genrePreferenceGenres]
      .map((genre) => {
        const score = scores[genre.genreKey];
        const percentage = totalScore > 0 ? (score / totalScore) * 100 : 0;
  
        return {
          genreKey: genre.genreKey,
          score,
          percentage,
          roundedPercentage: Math.round(percentage),
          rank: 0,
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.genreKey.localeCompare(b.genreKey);
      });
  
    const genrePercentages = sortedEntries.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  
    return {
      userGenreScores: scores,
      totalScore,
      genrePercentages,
    };
  }