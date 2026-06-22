import type {
    ResolvedTestResult,
    ScoreMap,
    TestAnswers,
    TestData,
    TestResult,
  } from "./types";
  
  const DEFAULT_TIE_BREAK_ORDER = ["q4", "q5", "q2", "q3", "q1"];
  
  function getSortedBranchKeys(branchScores: ScoreMap) {
    return Object.entries(branchScores)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .map(([branchKey]) => branchKey);
  }
  
  function getTopScoreBranchKeys(branchScores: ScoreMap) {
    const entries = Object.entries(branchScores);
    if (entries.length === 0) return [];
  
    const topScore = Math.max(...entries.map(([, score]) => score));
  
    return entries
      .filter(([, score]) => score === topScore)
      .map(([branchKey]) => branchKey);
  }
  
  function getChoiceBranchKeys(
    test: TestData,
    questionId: string,
    answers: TestAnswers
  ) {
    const question = test.questions.find((item) => item.questionId === questionId);
    if (!question) return [];
  
    const answer = answers.find((item) => item.questionKey === questionId);
    if (!answer) return [];
  
    const branchKeys: string[] = [];
  
    answer.selectedOptions.forEach((selectedOption) => {
      const choice = question.choices.find(
        (item) => item.choiceId === selectedOption.optionKey
      );
  
      if (!choice?.branchScores) return;
  
      Object.keys(choice.branchScores).forEach((branchKey) => {
        branchKeys.push(branchKey);
      });
    });
  
    return branchKeys;
  }
  
  function resolveTieBranchKey(params: {
    test: TestData;
    answers: TestAnswers;
    tiedBranchKeys: string[];
  }) {
    const { test, answers, tiedBranchKeys } = params;
  
    for (const tieQuestionSuffix of DEFAULT_TIE_BREAK_ORDER) {
      const question = test.questions.find((item) =>
        item.questionId.endsWith(`_${tieQuestionSuffix}`)
      );
  
      if (!question) continue;
  
      const selectedBranchKeys = getChoiceBranchKeys(
        test,
        question.questionId,
        answers
      );
  
      const matchedBranchKey = selectedBranchKeys.find((branchKey) =>
        tiedBranchKeys.includes(branchKey)
      );
  
      if (matchedBranchKey) {
        return matchedBranchKey;
      }
    }
  
    return tiedBranchKeys[0] ?? null;
  }
  
  export function getTopBranchResult(params: {
    test: TestData;
    answers: TestAnswers;
    branchScores: ScoreMap;
    results: TestResult[];
  }): ResolvedTestResult {
    const { test, answers, branchScores, results } = params;
  
    const sortedBranchKeys = getSortedBranchKeys(branchScores);
    const tiedTopBranchKeys = getTopScoreBranchKeys(branchScores);
  
    const mainBranchKey =
      tiedTopBranchKeys.length > 1
        ? resolveTieBranchKey({
            test,
            answers,
            tiedBranchKeys: tiedTopBranchKeys,
          })
        : tiedTopBranchKeys[0] ?? null;
  
    const subBranchKey =
      sortedBranchKeys.find((branchKey) => branchKey !== mainBranchKey) ?? null;
  
    const result =
      results.find((item) => item.resultKey === mainBranchKey) ?? null;
  
    return {
      mainBranchKey,
      subBranchKey,
      result,
    };
  }