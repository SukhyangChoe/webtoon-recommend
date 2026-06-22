import type {
  CalculatedScores,
  ScoreMap,
  TestAnswers,
  TestData,
} from "./types";

function addWeightedScores(
  target: ScoreMap,
  source: ScoreMap | undefined,
  weight: number
) {
  if (!source) return;

  Object.entries(source).forEach(([key, value]) => {
    target[key] = (target[key] ?? 0) + value * weight;
  });
}

function getAnswerByQuestionKey(answers: TestAnswers, questionKey: string) {
  return answers.find((answer) => answer.questionKey === questionKey);
}

export function calculateScores(
  test: TestData,
  answers: TestAnswers
): CalculatedScores {
  const branchScores: ScoreMap = {};
  const tagScores: ScoreMap = {};
  const avoidanceTagScores: ScoreMap = {};

  test.questions.forEach((question) => {
    const answer = getAnswerByQuestionKey(answers, question.questionId);
    if (!answer) return;

    const isAvoidanceQuestion = question.questionId.endsWith("_q6");

    answer.selectedOptions.forEach((selectedOption) => {
      const choice = question.choices.find(
        (item) => item.choiceId === selectedOption.optionKey
      );

      if (!choice) return;

      if (isAvoidanceQuestion) {
        addWeightedScores(
          avoidanceTagScores,
          choice.avoidanceTagScores,
          selectedOption.weight
        );
        return;
      }

      addWeightedScores(branchScores, choice.branchScores, selectedOption.weight);
      addWeightedScores(tagScores, choice.tagScores, selectedOption.weight);
    });
  });

  return {
    branchScores,
    tagScores,
    avoidanceTagScores,
  };
}