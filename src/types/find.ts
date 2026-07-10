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