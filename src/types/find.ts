export type RecommendationMode =
  | "similar_work"
  | "instant_recommendation";

export type RecommendationVectorSource =
  | "selected_webtoons"
  | "user_taste_profile"
  | "detail_test_result";

export type RecommendationFeedbackAction = "already_read" | "not_my_taste";

export type RecommendationItemActionState = {
  canonicalWebtoonId: string;
  isSaved: boolean;
  openedOfficialAt?: string;
  feedbackAction?: RecommendationFeedbackAction;
  feedbackCreatedAt?: string;
};

export type RecommendationItemActionStateMap = Record<
  string,
  RecommendationItemActionState
>;

export type RecommendationDisplaySection =
  | "main_display"
  | "expansion_display";

export type RecommendationDisplaySlot = {
  section: RecommendationDisplaySection;
  slot: number;
  currentWebtoonId: string | null;
  replacementCount: number;
};