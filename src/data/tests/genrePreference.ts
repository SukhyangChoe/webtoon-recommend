export const GENRE_PREFERENCE_TEST_KEY = "genre_preference";
export const GENRE_PREFERENCE_TEST_VERSION = "v1.1";

export type GenreKey =
  | "fantasy"
  | "murim"
  | "romance_ropan"
  | "thriller_horror"
  | "drama_daily";

export type OptionGenreScores = Partial<Record<GenreKey, number>>;

export type GenrePreferenceOption = {
  optionKey: string;
  text: string;
  optionGenreScores: OptionGenreScores;
  tagScores: string[];
};

export type GenrePreferenceQuestion = {
  id: number;
  questionKey: string;
  title: string;
  body: string;
  options: GenrePreferenceOption[];
};

export const GENRE_LABELS: Record<GenreKey, string> = {
  fantasy: "판타지",
  murim: "무협",
  romance_ropan: "로맨스/로판",
  thriller_horror: "스릴러/공포",
  drama_daily: "드라마/일상",
};

export const GENRE_ORDER: GenreKey[] = [
  "fantasy",
  "murim",
  "romance_ropan",
  "thriller_horror",
  "drama_daily",
];

export const GENRE_PREFERENCE_QUESTIONS: GenrePreferenceQuestion[] = [
  {
    id: 1,
    questionKey: "genre_q1",
    title: "Q1. 첫 페이지",
    body: `첫 페이지가 열립니다.
아직 주인공도, 사건의 이름도 나오지 않았습니다.
대사 없는 첫 장면 하나가 이 이야기가 시작될 세계를 보여줍니다.

첫 페이지에 그려진 장면은 무엇인가요?`,
    options: [
      {
        optionKey: "genre_q1_a",
        text: "새벽의 도시 위로, 아무도 보지 못한 균열이 조용히 열린다.",
        optionGenreScores: { fantasy: 3, thriller_horror: 2 },
        tagScores: [
          "world_mystery",
          "mystery_investigation",
          "survival_tension",
        ],
      },
      {
        optionKey: "genre_q1_b",
        text: "눈 덮인 산길 끝, 오래된 문 앞에서 부러진 검을 든 인물이 숨을 고른다.",
        optionGenreScores: {
          fantasy: 1,
          murim: 3,
          thriller_horror: 1,
          drama_daily: 1,
        },
        tagScores: ["growth", "revenge", "emotional_depth"],
      },
      {
        optionKey: "genre_q1_c",
        text: "샹들리에가 빛나는 연회장, 모두가 웃고 있지만 한 사람의 이름만 속삭인다.",
        optionGenreScores: {
          fantasy: 1,
          romance_ropan: 3,
          thriller_horror: 1,
          drama_daily: 1,
        },
        tagScores: [
          "relationship_bond",
          "strategy_powerplay",
          "romance_chemistry",
        ],
      },
      {
        optionKey: "genre_q1_d",
        text: "비 오는 골목 끝, 꺼진 가로등 아래에서 낯선 발소리가 멈춘다.",
        optionGenreScores: { thriller_horror: 3, drama_daily: 2 },
        tagScores: [
          "mystery_investigation",
          "survival_tension",
          "world_mystery",
        ],
      },
      {
        optionKey: "genre_q1_e",
        text: "평범한 하루의 끝, 작은 카페 창가에 놓인 편지 한 장이 눈에 들어온다.",
        optionGenreScores: { romance_ropan: 2, drama_daily: 3 },
        tagScores: [
          "emotional_depth",
          "story_immersion",
          "relationship_bond",
        ],
      },
    ],
  },
  {
    id: 2,
    questionKey: "genre_q2",
    title: "Q2. 인물 등장",
    body: `몇 컷 뒤, 이야기의 중심에 설 인물이 모습을 드러냅니다.
아직 아무 말도 하지 않았지만,
이 인물이 첫 화의 흐름을 바꿀 것 같습니다.

그는 어떤 사람인가요?`,
    options: [
      {
        optionKey: "genre_q2_a",
        text: "모두가 무시하지만, 혼자만 이 세계의 이상함을 눈치챈 사람.",
        optionGenreScores: { fantasy: 3, murim: 1, thriller_horror: 2 },
        tagScores: [
          "strategy_powerplay",
          "mystery_investigation",
          "world_mystery",
        ],
      },
      {
        optionKey: "genre_q2_b",
        text: "가진 것은 없지만, 무너진 자리에서 다시 일어서려는 사람.",
        optionGenreScores: { fantasy: 1, murim: 2, drama_daily: 2 },
        tagScores: ["growth", "revenge", "second_chance"],
      },
      {
        optionKey: "genre_q2_c",
        text: "이미 강하지만, 아직 아무도 그 진짜 힘을 모르는 사람.",
        optionGenreScores: { fantasy: 2, murim: 2 },
        tagScores: [
          "hidden_identity_power",
          "action_catharsis",
          "story_immersion",
        ],
      },
      {
        optionKey: "genre_q2_d",
        text: "웃고 있지만, 속으로는 모두의 말과 표정을 계산하고 있는 사람.",
        optionGenreScores: {
          murim: 1,
          romance_ropan: 2,
          thriller_horror: 2,
        },
        tagScores: [
          "strategy_powerplay",
          "survival_tension",
          "story_immersion",
        ],
      },
      {
        optionKey: "genre_q2_e",
        text: "평범해 보이지만, 누군가를 지키기 위해 조용히 버티는 사람.",
        optionGenreScores: { romance_ropan: 1, drama_daily: 3 },
        tagScores: [
          "relationship_bond",
          "emotional_depth",
          "story_immersion",
        ],
      },
    ],
  },
  {
    id: 3,
    questionKey: "genre_q3",
    title: "Q3. 첫 사건",
    body: `조용하던 장면이 갑자기 흔들립니다.
주인공은 더 이상 가만히 있을 수 없는 상황에 놓이고,
첫 사건이 이야기의 방향을 정하기 시작합니다.

이 사건은 어떻게 흘러가나요?`,
    options: [
      {
        optionKey: "genre_q3_a",
        text: "모두가 끝났다고 생각한 순간, 주인공이 판을 뒤집기 시작한다.",
        optionGenreScores: { fantasy: 2, murim: 2, thriller_horror: 1 },
        tagScores: [
          "strategy_powerplay",
          "action_catharsis",
          "story_immersion",
        ],
      },
      {
        optionKey: "genre_q3_b",
        text: "아무도 모르게 준비한 계획이 하나씩 맞아떨어진다.",
        optionGenreScores: {
          fantasy: 1,
          murim: 1,
          romance_ropan: 1,
          thriller_horror: 2,
        },
        tagScores: [
          "strategy_powerplay",
          "mystery_investigation",
          "story_immersion",
        ],
      },
      {
        optionKey: "genre_q3_c",
        text: "잃어버린 자리와 사람을 되찾기 위해, 주인공이 움직이기 시작한다.",
        optionGenreScores: {
          fantasy: 1,
          murim: 2,
          romance_ropan: 1,
          drama_daily: 2,
        },
        tagScores: ["revenge", "growth", "relationship_bond"],
      },
      {
        optionKey: "genre_q3_d",
        text: "적인지 아군인지 알 수 없는 인물과 위험한 약속을 맺는다.",
        optionGenreScores: {
          fantasy: 1,
          romance_ropan: 2,
          thriller_horror: 2,
        },
        tagScores: [
          "relationship_bond",
          "survival_tension",
          "mystery_investigation",
        ],
      },
      {
        optionKey: "genre_q3_e",
        text: "작은 오해 하나로, 가까워질 리 없던 두 사람이 엮이기 시작한다.",
        optionGenreScores: { romance_ropan: 3, drama_daily: 2 },
        tagScores: [
          "relationship_bond",
          "romance_chemistry",
          "emotional_depth",
        ],
      },
    ],
  },
  {
    id: 4,
    questionKey: "genre_q4",
    title: "Q4. 마지막 장면",
    body: `첫 화의 마지막 컷이 지나갑니다.
사건은 끝난 것 같지만,
화면이 어두워진 뒤에도 한 가지 생각이 머릿속에 남습니다.

어떤 생각이었나요?`,
    options: [
      {
        optionKey: "genre_q4_a",
        text: "“이 세계에는 아직 숨겨진 게 많다.”",
        optionGenreScores: { fantasy: 3, murim: 1, thriller_horror: 2 },
        tagScores: [
          "world_mystery",
          "mystery_investigation",
          "story_immersion",
        ],
      },
      {
        optionKey: "genre_q4_b",
        text: "“이 인물이 어디까지 올라갈지 보고 싶다.”",
        optionGenreScores: { fantasy: 2, murim: 2, drama_daily: 1 },
        tagScores: ["growth", "action_catharsis", "story_immersion"],
      },
      {
        optionKey: "genre_q4_c",
        text: "“두 사람의 관계가 쉽게 끝나지 않을 것 같다.”",
        optionGenreScores: { romance_ropan: 3, drama_daily: 2 },
        tagScores: [
          "relationship_bond",
          "romance_chemistry",
          "emotional_depth",
        ],
      },
      {
        optionKey: "genre_q4_d",
        text: "“아직 진짜 적은 드러나지 않은 것 같다.”",
        optionGenreScores: {
          fantasy: 1,
          romance_ropan: 1,
          thriller_horror: 3,
        },
        tagScores: [
          "mystery_investigation",
          "survival_tension",
          "world_mystery",
        ],
      },
      {
        optionKey: "genre_q4_e",
        text: "“평범해 보였던 장면이 이상하게 마음에 남는다.”",
        optionGenreScores: {
          romance_ropan: 1,
          thriller_horror: 1,
          drama_daily: 3,
        },
        tagScores: ["emotional_depth", "life_realism", "story_immersion"],
      },
    ],
  },
  {
    id: 5,
    questionKey: "genre_q5",
    title: "Q5. 다음 화",
    body: `분명 첫 화만 보고 끝내려 했습니다.
그런데 어느새 다음 화를 계속 넘기고 있습니다.

왜 계속 넘기게 되었나요?`,
    options: [
      {
        optionKey: "genre_q5_a",
        text: "숨겨진 힘이 조금씩 드러나면서 판이 커져서.",
        optionGenreScores: { fantasy: 2, murim: 2 },
        tagScores: [
          "hidden_identity_power",
          "world_mystery",
          "action_catharsis",
        ],
      },
      {
        optionKey: "genre_q5_b",
        text: "주인공의 선택이 예상하지 못한 결과로 이어져서.",
        optionGenreScores: {
          fantasy: 1,
          murim: 1,
          romance_ropan: 1,
          thriller_horror: 2,
          drama_daily: 1,
        },
        tagScores: [
          "strategy_powerplay",
          "story_immersion",
          "mystery_investigation",
        ],
      },
      {
        optionKey: "genre_q5_c",
        text: "감춰진 비밀이 하나씩 풀리며 진실에 가까워져서.",
        optionGenreScores: { fantasy: 2, thriller_horror: 3 },
        tagScores: [
          "mystery_investigation",
          "world_mystery",
          "survival_tension",
        ],
      },
      {
        optionKey: "genre_q5_d",
        text: "두 사람의 관계가 대화 하나로 조금씩 바뀌어서.",
        optionGenreScores: { romance_ropan: 3, drama_daily: 2 },
        tagScores: [
          "relationship_bond",
          "romance_chemistry",
          "emotional_depth",
        ],
      },
      {
        optionKey: "genre_q5_e",
        text: "불리했던 상황이 하나씩 뒤집히기 시작해서.",
        optionGenreScores: { fantasy: 2, murim: 2, thriller_horror: 1 },
        tagScores: [
          "strategy_powerplay",
          "action_catharsis",
          "story_immersion",
        ],
      },
    ],
  },
];