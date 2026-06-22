export type ScoreMap = Record<string, number>;

export type TestChoice = {
  choiceId: string;
  text: string;
  branchScores?: ScoreMap;
  tagScores?: ScoreMap;
  avoidanceTagScores?: ScoreMap;
};

export type TestQuestion = {
  questionId: string;
  order: number;
  questionTitle: string;
  questionText: string;
  choices: TestChoice[];
};

export type SelectedOptionAnswer = {
  optionKey: string;
  rank: 1 | 2;
  weight: number;
};

export type TestAnswer = {
  questionKey: string;
  selectedOptions: SelectedOptionAnswer[];
};

export type TestAnswers = TestAnswer[];

export type TestData = {
  testId?: string;
  testKey?: string;
  testName: string;
  genreKey: string;
  route: string;
  questionCount: number;
  choiceCountPerQuestion?: number;
  resultCount?: number;
  version: string;
  scoreMode: string;
  intro: {
    title: string;
    description: string;
    startButtonText: string;
  };
  questions: TestQuestion[];
};

export type CalculatedScores = {
  branchScores: ScoreMap;
  tagScores: ScoreMap;
  avoidanceTagScores: ScoreMap;
};

export type TestResult = {
  testKey: string;
  resultKey: string;
  resultName: string;
  oneLineDescription: string;
  displayTags: string[];
  tagScoreKeys: string[];
  imageKey: string;
  shareText: string;
};

export type ResolvedTestResult = {
  mainBranchKey: string | null;
  subBranchKey: string | null;
  result: TestResult | null;
};