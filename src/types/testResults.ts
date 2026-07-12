export type ScoreMap = Record<string, number>;

export type DetailTestKey =
  | "fantasy_detail"
  | "murim_detail"
  | "romance_ropan_detail"
  | "thriller_horror_detail"
  | "drama_daily_detail";

export type GenrePreferenceTestKey = "genre_preference";

export type TestKey = GenrePreferenceTestKey | DetailTestKey;

export type PairChoiceSide = "left" | "draw" | "right";

export type GenrePreferenceResultType = "single" | "linked" | "balanced";

export type GenreVisualState = "open" | "faint" | "dormant";

export type DetailSelectedOption = {
  optionKey: string;
  rank: 1 | 2;
  weight: number;
};

export type StoredDetailAnswer = {
  questionKey: string;
  selectedOptions: DetailSelectedOption[];
};

export type StoredGenrePreferenceAnswer = {
  questionKey: string;
  selectedSide: PairChoiceSide;
};

export type FinalGenrePercentage = {
  genreKey: string;
  genreName: string;
  score: number;
  percentage: number;
  roundedPercentage: number;
  rank: number;
  visualState: GenreVisualState;
};

export type GenreMapNode = {
  genreKey: string;
  genreName: string;
  percentage: number;
  roundedPercentage: number;
  rank: number;
  visualState: GenreVisualState;
  isPathActive: boolean;
};

export type GenreMapState = {
  resultType: GenrePreferenceResultType;
  centerGenreKeys: string[];
  nodes: GenreMapNode[];
};

export type StoredGenrePreferenceResult = {
  schemaVersion: "0.1";
  testKey: "genre_preference";
  testVersion: "v1.4_pair_league_image_card";
  resultName: "내 웹툰 세계관 지도";
  completedAt: string;
  answers: StoredGenrePreferenceAnswer[];
  positiveGenreScores: ScoreMap;
  genreAvoidanceScores: ScoreMap;
  finalGenreScores: ScoreMap;
  finalGenrePercentages: FinalGenrePercentage[];
  resultType: GenrePreferenceResultType;
  primaryGenreKey: string;
  secondaryGenreKey: string | null;
  topGenreKeys: string[];
  mapState: GenreMapState;

  /**
   * 이전 구현 또는 개발 확인용 데이터와의 호환 필드.
   * genre_preference v1.4 계산에는 사용하지 않는다.
   */
  tagScores?: ScoreMap;
  avoidanceTagScores?: ScoreMap;
  totalFinalGenreScore?: number;
};

export type StoredDetailTestResult = {
  schemaVersion: "0.2" | "0.1" | string;
  testKey: DetailTestKey;
  testVersion: string;
  completedAt: string;
  answers: StoredDetailAnswer[];
  branchScores: ScoreMap;
  tagScores: ScoreMap;
  avoidanceTagScores: ScoreMap;
  mainBranchKey: string;
  subBranchKey: string | null;
  resultKey: string;
  resultName: string;
  oneLineDescription: string;
  staySceneText?: string;
  displayTags: string[];
  imageKey: string;
  shareText: string;

  /**
   * 장르 확장 과정에서 필요한 경우만 사용한다.
   * 사용자 화면에 직접 노출하지 않는다.
   */
  genreKey?: string;

  /**
   * 실제 테스트 결과에 존재할 때만 추천 입력으로 전달한다.
   * 값이 없으면 빈 점수로 만들지 않는다.
   */
  artStyleScores?: ScoreMap;
};

export type StoredTestResult =
  | StoredGenrePreferenceResult
  | StoredDetailTestResult;

export function isGenrePreferenceResult(
  result: StoredTestResult | null
): result is StoredGenrePreferenceResult {
  return result?.testKey === "genre_preference";
}

export function isDetailTestResult(
  result: StoredTestResult | null
): result is StoredDetailTestResult {
  return Boolean(result && result.testKey !== "genre_preference");
}