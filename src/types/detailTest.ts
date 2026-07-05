export type ScoreMap = Record<string, number>;

export type DetailTestKey =
  | "fantasy_detail"
  | "murim_detail"
  | "romance_ropan_detail"
  | "thriller_horror_detail"
  | "drama_daily_detail";

export type DetailTestRoute =
  | "/tests/fantasy"
  | "/tests/murim"
  | "/tests/romance-ropan"
  | "/tests/thriller-horror"
  | "/tests/drama-daily"
  | (string & {});

export type DetailTestSelectMode = "ranked_multi_select";

export type DetailTestScoreMode = "branch_tag_avoidance";

export type DetailTestRankWeight = {
  rank: 1 | 2;
  weight: number;
};

export type DetailTestRankWeights = {
  single: DetailTestRankWeight[];
  double: DetailTestRankWeight[];
};

export type DetailTestBranch = {
  branchKey: string;
  branchName: string;

  // 기존 fantasy/murim seed에서 사용하는 필드 허용
  genreKey?: string;
  coreTaste?: string;
  defaultTagKeys?: string[];

  // 기존 seed/결과 파일에서 다른 이름을 쓰는 경우를 안전하게 허용
  name?: string;
  displayName?: string;
  description?: string;
  order?: number;
  displayOrder?: number;

  // 장르별 seed가 추가 메타 필드를 가져도 막지 않기 위한 확장 허용
  [key: string]: unknown;
};

export type DetailTestOption = {
  optionKey: string;

  // 기존 파일 혼용 대응
  choiceId?: string;
  id?: string;

  choiceOrder?: number;
  order?: number;
  displayOrder?: number;

  label?: string;
  text?: string;
  shortDescription?: string;
  description?: string;

  branchScores?: ScoreMap;
  tagScores?: ScoreMap;
  avoidanceTagScores?: ScoreMap;

  // Q1 이미지 카드 전용. Q2~Q6에는 없어도 됨.
  imageKey?: string;

  // 이전 seed 추적용
  legacyText?: string;
  legacyDescription?: string;

  // 장르별 seed가 임시 필드를 더 가져도 막지 않기 위한 확장 허용
  [key: string]: unknown;
};

export type DetailTestQuestion = {
  questionKey: string;

  // 기존 파일 혼용 대응
  questionId?: string;
  id?: string;

  questionOrder?: number;
  order?: number;
  displayOrder?: number;

  questionTitle?: string;
  title?: string;

  questionText?: string;
  text?: string;
  description?: string;
  legacyQuestionText?: string;

  selectMode?: DetailTestSelectMode;
  maxSelect?: number;

  // 최신 구조
  options?: DetailTestOption[];

  // 기존 구조 호환
  choices?: DetailTestOption[];

  // Q1 이미지 카드 / Q2~Q6 텍스트 카드 구분용 선택 필드
  cardType?: "image" | "text";

  // Q6 회피 문항 표시용
  isAvoidanceQuestion?: boolean;

  [key: string]: unknown;
};

export type DetailTestData = {
  testKey: DetailTestKey;
  testName: string;

  genreKey?: string;
  typeScoreKey?: string;

  questionCount?: number;
  choiceCount?: number;
  resultCount?: number;

  scoreMode: DetailTestScoreMode;
  selectMode: DetailTestSelectMode;
  maxSelect: number;

  version?: string;
  testVersion?: string;

  branches?: DetailTestBranch[];
  questions: DetailTestQuestion[];

  rankWeights?: DetailTestRankWeights;

  // 장르별 seed가 임시 필드를 더 가져도 막지 않기 위한 확장 허용
  [key: string]: unknown;
};

export type DetailTestResult = {
  resultKey?: string;
  branchKey: string;

  // 기존 파일 혼용 대응
  resultName?: string;
  name?: string;
  title?: string;

  oneLineDescription?: string;
  summary?: string;
  description?: string;

  staySceneText?: string;
  displayTags?: string[];

  imageKey?: string;
  imageAlt?: string;

  shareText?: string;

  // 추천 로직 연결용 후보 필드.
  // 화면 표시용 displayTags와 구분하기 위해 허용만 한다.
  tagScoreKeys?: string[];
  tagScores?: ScoreMap;

  [key: string]: unknown;
};

export type DetailTestConfig = {
  testKey: DetailTestKey;
  route: DetailTestRoute;
  testData: DetailTestData;
  results: DetailTestResult[];

  // 화면 표시 보조용
  displayName?: string;
  testName?: string;

  // D+15 resultRepository 기준:
  // storageKey는 config에 넣지 않는다.
};

export type RankedSelectedOption = {
  optionKey: string;
  rank: 1 | 2;
  weight: number;
};

export type DetailTestAnswer = {
  questionKey: string;
  selectedOptions: RankedSelectedOption[];
};

export type DetailTestAnswersByQuestion = Record<string, RankedSelectedOption[]>;

export type DetailTestCalculatedScores = {
  branchScores: ScoreMap;
  tagScores: ScoreMap;
  avoidanceTagScores: ScoreMap;
  mainBranchKey: string | null;
  subBranchKey: string | null;
};

export type NormalizedDetailTestResult = {
  testKey: DetailTestKey;
  testVersion?: string;
  completedAt: string;

  answers: DetailTestAnswer[];

  branchScores: ScoreMap;
  tagScores: ScoreMap;
  avoidanceTagScores: ScoreMap;

  mainBranchKey: string | null;
  subBranchKey: string | null;

  result: DetailTestResult | null;
};