export const MATCH_ROUTES = {
  home: "/match",
  intro: "/match/test/intro",
  genreShelf: (page: 1 | 2) => `/match/test/genre-shelf/${page}`,
  duel: (index: number) => `/match/test/duel/${index}`,
  setting: "/match/test/taste/setting",
  appeal: "/match/test/taste/appeal",
  characterRelationship: "/match/test/taste/character-relationship",
  avoidance: "/match/test/avoidance",
  building: "/match/result/building",
  result: (profilePublicId: string) => `/match/result/${profilePublicId}`,
  challengeNew: "/match/challenge/new",
  challenge: (challengeCode: string) => `/match/c/${challengeCode}`,
  pairResult: (challengeCode: string, resultId: string) =>
    `/match/c/${challengeCode}/match/${resultId}`,
  ranking: (challengeCode: string) => `/match/c/${challengeCode}/ranking`,
  share: (type: "personal" | "pair" | "ranking") => `/match/share/${type}`,
} as const;
