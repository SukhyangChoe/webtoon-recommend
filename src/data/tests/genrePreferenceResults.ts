import type { GenreKey } from "./genrePreference";

export type GenrePreferenceResultCopy = {
  resultTitle: string;
  resultSubtitle: string;
  mapSectionTitle: string;
  interpretationTitle: string;
  tagSectionTitle: string;
  shareButtonText: string;
  recommendationCtaText: string;
  retakeButtonText: string;
  recommendationListOnResult: false;
};

export type GenreDisplayMeta = {
  genreKey: GenreKey;
  label: string;
  shortLabel: string;
  mapObjectLabel: string;
};

export const genrePreferenceResultCopy: GenrePreferenceResultCopy = {
  resultTitle: "내 웹툰 세계관 지도",
  resultSubtitle: "당신이 더 오래 머무를 웹툰 장르의 방향이에요.",
  mapSectionTitle: "세계관 지도",
  interpretationTitle: "결과 해석",
  tagSectionTitle: "이런 포인트에 끌려요",
  shareButtonText: "결과 공유하기",
  recommendationCtaText: "이 취향으로 웹툰 추천받기",
  retakeButtonText: "다시 테스트하기",
  recommendationListOnResult: false,
};

export const genreDisplayMetaMap: Record<GenreKey, GenreDisplayMeta> = {
  fantasy: {
    genreKey: "fantasy",
    label: "판타지",
    shortLabel: "판타지",
    mapObjectLabel: "마법서",
  },
  murim: {
    genreKey: "murim",
    label: "무협",
    shortLabel: "무협",
    mapObjectLabel: "검",
  },
  romance_ropan: {
    genreKey: "romance_ropan",
    label: "로맨스·로판",
    shortLabel: "로판",
    mapObjectLabel: "편지",
  },
  thriller_horror: {
    genreKey: "thriller_horror",
    label: "스릴러·공포",
    shortLabel: "스릴러",
    mapObjectLabel: "단서",
  },
  drama_daily: {
    genreKey: "drama_daily",
    label: "드라마·일상",
    shortLabel: "일상",
    mapObjectLabel: "찻잔",
  },
};

export function getGenreDisplayName(genreKey: GenreKey) {
  return genreDisplayMetaMap[genreKey]?.label ?? genreKey;
}