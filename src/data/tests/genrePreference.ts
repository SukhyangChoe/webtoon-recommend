export type GenreKey =
  | "fantasy"
  | "murim"
  | "romance_ropan"
  | "thriller_horror"
  | "drama_daily";

export type PairChoiceSide = "left" | "draw" | "right";

export type GenrePreferenceTestMeta = {
  testKey: "genre_preference";
  testType: "genre_map";
  testVersion: "v1.4_pair_league_image_card";
  displayName: "웹툰 장르 취향 테스트";
  resultName: "내 웹툰 세계관 지도";
  questionCount: 10;
  genreCount: 5;
  pairCount: 10;
  resultMode: "genre_map";
  selectMode: "pair_choice_with_draw";
  maxSelect: 1;
  recommendationListOnResult: false;
};

export type GenreDefinition = {
  genreKey: GenreKey;
  label: string;
  displayOrder: number;
};

export type GenrePreferenceCard = {
  genreKey: GenreKey;
  genreName: string;
  label: string;
  imageKey: string;
  imagePath: string;
};

export type GenrePreferenceQuestion = {
  questionKey: string;
  questionOrder: number;
  questionText: string;
  left: GenrePreferenceCard;
  right: GenrePreferenceCard;
};

export const GENRE_PREFERENCE_STORAGE_KEY =
  "webtoon_genre_preference_result";

export const genrePreferenceTest: GenrePreferenceTestMeta = {
  testKey: "genre_preference",
  testType: "genre_map",
  testVersion: "v1.4_pair_league_image_card",
  displayName: "웹툰 장르 취향 테스트",
  resultName: "내 웹툰 세계관 지도",
  questionCount: 10,
  genreCount: 5,
  pairCount: 10,
  resultMode: "genre_map",
  selectMode: "pair_choice_with_draw",
  maxSelect: 1,
  recommendationListOnResult: false,
};

export const genrePreferenceStartCopy = {
  title: "웹툰 장르 취향 테스트",
  descriptionLines: [
    "짧은 질문 10번만 답하면,",
    "내가 어떤 웹툰 장르에 더 끌리는지 알 수 있어요.",
    "",
    "매번 두 장면 중 지금 더 보고 싶은 쪽을 고르세요.",
    "둘 다 비슷하면 가운데를 선택해도 됩니다.",
    "",
    "정답은 없고, 오래 고민하지 않아도 괜찮아요.",
  ],
  helperText: "소요 시간 약 1분",
  buttonText: "시작하기",
};

export const genrePreferenceGenres: GenreDefinition[] = [
  {
    genreKey: "fantasy",
    label: "판타지",
    displayOrder: 1,
  },
  {
    genreKey: "murim",
    label: "무협",
    displayOrder: 2,
  },
  {
    genreKey: "romance_ropan",
    label: "로맨스·로판",
    displayOrder: 3,
  },
  {
    genreKey: "thriller_horror",
    label: "스릴러·공포",
    displayOrder: 4,
  },
  {
    genreKey: "drama_daily",
    label: "드라마·일상",
    displayOrder: 5,
  },
];

export const genrePreferenceQuestions: GenrePreferenceQuestion[] = [
  {
    questionKey: "genre_q1",
    questionOrder: 1,
    questionText: "둘 중 지금 더 보고 싶은 쪽은 어느 쪽인가요?",
    left: {
      genreKey: "fantasy",
      genreName: "판타지",
      label: "마법 쓰는 소년",
      imageKey: "genre_q1_left_fantasy_magic_boy",
      imagePath:
        "/images/genre-preference/genre_q1_left_fantasy_magic_boy.png",
    },
    right: {
      genreKey: "murim",
      genreName: "무협",
      label: "대나무숲 검객 액션",
      imageKey: "genre_q1_right_murim_bamboo_sword",
      imagePath:
        "/images/genre-preference/genre_q1_right_murim_bamboo_sword.png",
    },
  },
  {
    questionKey: "genre_q2",
    questionOrder: 2,
    questionText: "둘 중 지금 더 보고 싶은 쪽은 어느 쪽인가요?",
    left: {
      genreKey: "romance_ropan",
      genreName: "로맨스·로판",
      label: "햇살 아래 남녀 티타임",
      imageKey: "genre_q2_left_romance_sunlit_tea",
      imagePath:
        "/images/genre-preference/genre_q2_left_romance_sunlit_tea.png",
    },
    right: {
      genreKey: "fantasy",
      genreName: "판타지",
      label: "푸른 마법 카드·시스템 연출",
      imageKey: "genre_q2_right_fantasy_magic_cards",
      imagePath:
        "/images/genre-preference/genre_q2_right_fantasy_magic_cards.png",
    },
  },
  {
    questionKey: "genre_q3",
    questionOrder: 3,
    questionText: "둘 중 지금 더 보고 싶은 쪽은 어느 쪽인가요?",
    left: {
      genreKey: "fantasy",
      genreName: "판타지",
      label: "보랏빛 숲·마력 공간의 인물",
      imageKey: "genre_q3_left_fantasy_purple_forest",
      imagePath:
        "/images/genre-preference/genre_q3_left_fantasy_purple_forest.png",
    },
    right: {
      genreKey: "thriller_horror",
      genreName: "스릴러·공포",
      label: "어두운 계단과 비상구",
      imageKey: "genre_q3_right_thriller_dark_stairs",
      imagePath:
        "/images/genre-preference/genre_q3_right_thriller_dark_stairs.png",
    },
  },
  {
    questionKey: "genre_q4",
    questionOrder: 4,
    questionText: "둘 중 지금 더 보고 싶은 쪽은 어느 쪽인가요?",
    left: {
      genreKey: "drama_daily",
      genreName: "드라마·일상",
      label: "회사 사무실의 직장인",
      imageKey: "genre_q4_left_drama_office_worker",
      imagePath:
        "/images/genre-preference/genre_q4_left_drama_office_worker.png",
    },
    right: {
      genreKey: "fantasy",
      genreName: "판타지",
      label: "불길 속 전투 인물",
      imageKey: "genre_q4_right_fantasy_fire_battle",
      imagePath:
        "/images/genre-preference/genre_q4_right_fantasy_fire_battle.png",
    },
  },
  {
    questionKey: "genre_q5",
    questionOrder: 5,
    questionText: "둘 중 지금 더 보고 싶은 쪽은 어느 쪽인가요?",
    left: {
      genreKey: "murim",
      genreName: "무협",
      label: "어두운 숲속 검객 클로즈업",
      imageKey: "genre_q5_left_murim_dark_forest_swordsman",
      imagePath:
        "/images/genre-preference/genre_q5_left_murim_dark_forest_swordsman.png",
    },
    right: {
      genreKey: "romance_ropan",
      genreName: "로맨스·로판",
      label: "궁정 인물 군상",
      imageKey: "genre_q5_right_romance_palace_ensemble",
      imagePath:
        "/images/genre-preference/genre_q5_right_romance_palace_ensemble.png",
    },
  },
  {
    questionKey: "genre_q6",
    questionOrder: 6,
    questionText: "둘 중 지금 더 보고 싶은 쪽은 어느 쪽인가요?",
    left: {
      genreKey: "thriller_horror",
      genreName: "스릴러·공포",
      label: "사건 자료벽을 보는 인물",
      imageKey: "genre_q6_left_thriller_case_wall",
      imagePath:
        "/images/genre-preference/genre_q6_left_thriller_case_wall.png",
    },
    right: {
      genreKey: "murim",
      genreName: "무협",
      label: "바둑판 앞 책략가",
      imageKey: "genre_q6_right_murim_strategy_board",
      imagePath:
        "/images/genre-preference/genre_q6_right_murim_strategy_board.png",
    },
  },
  {
    questionKey: "genre_q7",
    questionOrder: 7,
    questionText: "둘 중 지금 더 보고 싶은 쪽은 어느 쪽인가요?",
    left: {
      genreKey: "murim",
      genreName: "무협",
      label: "압도적인 검은 군림자 실루엣",
      imageKey: "genre_q7_left_murim_black_ruler",
      imagePath:
        "/images/genre-preference/genre_q7_left_murim_black_ruler.png",
    },
    right: {
      genreKey: "drama_daily",
      genreName: "드라마·일상",
      label: "편의점 유쾌한 생활 장면",
      imageKey: "genre_q7_right_drama_convenience_comedy",
      imagePath:
        "/images/genre-preference/genre_q7_right_drama_convenience_comedy.png",
    },
  },
  {
    questionKey: "genre_q8",
    questionOrder: 8,
    questionText: "둘 중 지금 더 보고 싶은 쪽은 어느 쪽인가요?",
    left: {
      genreKey: "romance_ropan",
      genreName: "로맨스·로판",
      label: "밤의 궁정 로맨스 장면",
      imageKey: "genre_q8_left_romance_night_palace",
      imagePath:
        "/images/genre-preference/genre_q8_left_romance_night_palace.png",
    },
    right: {
      genreKey: "thriller_horror",
      genreName: "스릴러·공포",
      label: "복도 끝 웃는 남자",
      imageKey: "genre_q8_right_thriller_smiling_man_hallway",
      imagePath:
        "/images/genre-preference/genre_q8_right_thriller_smiling_man_hallway.png",
    },
  },
  {
    questionKey: "genre_q9",
    questionOrder: 9,
    questionText: "둘 중 지금 더 보고 싶은 쪽은 어느 쪽인가요?",
    left: {
      genreKey: "drama_daily",
      genreName: "드라마·일상",
      label: "집에서 반려동물과 쉬는 장면",
      imageKey: "genre_q9_left_drama_pet_home",
      imagePath:
        "/images/genre-preference/genre_q9_left_drama_pet_home.png",
    },
    right: {
      genreKey: "romance_ropan",
      genreName: "로맨스·로판",
      label: "보랏빛 로맨스 커플 장면",
      imageKey: "genre_q9_right_romance_purple_couple",
      imagePath:
        "/images/genre-preference/genre_q9_right_romance_purple_couple.png",
    },
  },
  {
    questionKey: "genre_q10",
    questionOrder: 10,
    questionText: "둘 중 지금 더 보고 싶은 쪽은 어느 쪽인가요?",
    left: {
      genreKey: "thriller_horror",
      genreName: "스릴러·공포",
      label: "촛불과 기괴한 벽의 인물",
      imageKey: "genre_q10_left_thriller_candle_uncanny",
      imagePath:
        "/images/genre-preference/genre_q10_left_thriller_candle_uncanny.png",
    },
    right: {
      genreKey: "drama_daily",
      genreName: "드라마·일상",
      label: "교실의 학생 두 명",
      imageKey: "genre_q10_right_drama_classroom_students",
      imagePath:
        "/images/genre-preference/genre_q10_right_drama_classroom_students.png",
    },
  },
];