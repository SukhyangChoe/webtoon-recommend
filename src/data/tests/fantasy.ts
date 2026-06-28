import type { TestData } from "@/lib/testEngine/types";

export const fantasyBranches = [
  {
    branchKey: "fantasy_system_successor",
    branchName: "시스템 계승자",
    genreKey: "fantasy",
    coreTaste: "시스템·전략·조건 공략",
    defaultTagKeys: [
      "system_game",
      "strategy_powerplay",
      "growth",
      "dungeon_adventure",
      "story_immersion",
    ],
    order: 1,
  },
  {
    branchKey: "fantasy_hidden_power",
    branchName: "힘숨찐",
    genreKey: "fantasy",
    coreTaste: "숨은 힘·먼치킨·정체 숨김",
    defaultTagKeys: [
      "hidden_identity_power",
      "action_catharsis",
      "special_ability",
      "visual_appeal",
      "story_immersion",
    ],
    order: 2,
  },
  {
    branchKey: "fantasy_limit_breaker",
    branchName: "한계 돌파자",
    genreKey: "fantasy",
    coreTaste: "성장·회복·재도전",
    defaultTagKeys: [
      "growth",
      "action_catharsis",
      "emotional_depth",
      "second_chance",
      "story_immersion",
    ],
    order: 3,
  },
  {
    branchKey: "fantasy_truth_chaser",
    branchName: "진실 추적자",
    genreKey: "fantasy",
    coreTaste: "숨겨진 설정·비밀·떡밥",
    defaultTagKeys: [
      "world_mystery",
      "mystery_investigation",
      "story_immersion",
      "emotional_depth",
    ],
    order: 4,
  },
  {
    branchKey: "fantasy_survival_commander",
    branchName: "생존 지휘관",
    genreKey: "fantasy",
    coreTaste: "생존·전쟁·거점 방어",
    defaultTagKeys: [
      "survival_tension",
      "strategy_powerplay",
      "relationship_bond",
      "action_catharsis",
      "story_immersion",
    ],
    order: 5,
  },
  {
    branchKey: "fantasy_kingdom_strategist",
    branchName: "왕국 전략가",
    genreKey: "fantasy",
    coreTaste: "세력·정치·판세 읽기",
    defaultTagKeys: [
      "strategy_powerplay",
      "management_crafting",
      "world_mystery",
      "story_immersion",
    ],
    order: 6,
  },
];

export const fantasyTest: TestData = {
  testId: "fantasy_detail",
  testKey: "fantasy_detail",
  testName: "판타지 웹툰 취향 테스트",
  genreKey: "fantasy",
  route: "/tests/fantasy",
  questionCount: 6,
  choiceCountPerQuestion: 5,
  choiceCount: 30,
  resultCount: 6,
  version: "v0.5",
  scoreMode: "branch_tag_avoidance",
  selectMode: "ranked_multi_select",
  maxSelect: 2,
  intro: {
    title: "제목 없는 판타지 웹툰 원고가 도착했습니다.",
    description:
      "당신이 고르는 장면들이 모여\n오래 머물 판타지의 방향을 만들어갑니다.",
    startButtonText: "첫 페이지 넘기기",
  },
  questions: [
    {
      questionId: "fantasy_q1",
      order: 1,
      questionTitle: "시작 장면",
      questionText: "첫 화에서 더 끌리는 시작 장면을 골라주세요.",
      legacyQuestionText:
        "첫 페이지가 열립니다. 아직 아무 설명도 없지만, 이상하게 다음 컷이 궁금해지는 장면이 있습니다. 첫 페이지에 그려진 장면은 무엇인가요?",
      choices: [
        {
          choiceId: "fantasy_q1_a1",
          choiceOrder: 1,
          label: "진실 추적자",
          text: "오래된 도서관 깊은 곳에서, 금지된 책 한 권이 스스로 펼쳐진다.",
          shortDescription:
            "오래된 도서관 깊은 곳에서, 금지된 책 한 권이 스스로 펼쳐진다.",
          imageKey: "fantasy_q1_a1_image",
          branchScores: {
            fantasy_truth_chaser: 1,
          },
          tagScores: {
            world_mystery: 1,
            mystery_investigation: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q1_a2",
          choiceOrder: 2,
          label: "시스템 계승자",
          text: "허공에 떠오른 규칙 한 줄을 주인공만 읽고, 모두와 다른 선택지를 보게 된다.",
          shortDescription:
            "허공에 떠오른 규칙 한 줄을 주인공만 읽고, 모두와 다른 선택지를 보게 된다.",
          imageKey: "fantasy_q1_a2_image",
          branchScores: {
            fantasy_system_successor: 1,
          },
          tagScores: {
            system_game: 1,
            strategy_powerplay: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q1_a3",
          choiceOrder: 3,
          label: "생존 지휘관",
          text: "무너진 성벽 아래, 살아남은 사람들이 마지막 방어선을 세운다.",
          shortDescription:
            "무너진 성벽 아래, 살아남은 사람들이 마지막 방어선을 세운다.",
          imageKey: "fantasy_q1_a3_image",
          branchScores: {
            fantasy_survival_commander: 1,
          },
          tagScores: {
            survival_tension: 1,
            relationship_bond: 1,
            strategy_powerplay: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q1_a4",
          choiceOrder: 4,
          label: "힘숨찐",
          text: "평범해 보이던 인물의 그림자 뒤로, 숨겨진 힘의 기척이 조용히 번진다.",
          shortDescription:
            "평범해 보이던 인물의 그림자 뒤로, 숨겨진 힘의 기척이 조용히 번진다.",
          imageKey: "fantasy_q1_a4_image",
          branchScores: {
            fantasy_hidden_power: 1,
          },
          tagScores: {
            hidden_identity_power: 1,
            special_ability: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q1_a5",
          choiceOrder: 5,
          label: "왕국 전략가",
          text: "왕국의 지도 위에 찍힌 표식 하나가 회의장의 침묵을 깨뜨린다.",
          shortDescription:
            "왕국의 지도 위에 찍힌 표식 하나가 회의장의 침묵을 깨뜨린다.",
          imageKey: "fantasy_q1_a5_image",
          branchScores: {
            fantasy_kingdom_strategist: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            world_mystery: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionId: "fantasy_q2",
      order: 2,
      questionTitle: "인물",
      questionText: "더 따라가고 싶은 인물을 골라주세요.",
      legacyQuestionText:
        "몇 컷 뒤, 카메라는 한 인물을 따라가기 시작합니다. 그는 어떤 인물인가요?",
      choices: [
        {
          choiceId: "fantasy_q2_a1",
          choiceOrder: 1,
          label: "숨은 강자",
          text: "이미 강하지만, 진짜 힘을 숨긴 채 상황을 지켜보는 사람.",
          shortDescription:
            "이미 강하지만, 진짜 힘을 숨긴 채 상황을 지켜보는 사람.",
          branchScores: {
            fantasy_hidden_power: 1,
          },
          tagScores: {
            hidden_identity_power: 1,
            action_catharsis: 1,
            special_ability: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q2_a2",
          choiceOrder: 2,
          label: "지키는 리더",
          text: "모두가 흩어지는 순간에도, 지켜야 할 사람들을 뒤에 세우는 사람.",
          shortDescription:
            "모두가 흩어지는 순간에도, 지켜야 할 사람들을 뒤에 세우는 사람.",
          branchScores: {
            fantasy_survival_commander: 1,
          },
          tagScores: {
            survival_tension: 1,
            relationship_bond: 1,
            emotional_depth: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q2_a3",
          choiceOrder: 3,
          label: "규칙 해석자",
          text: "모두가 지나친 이상 현상을 혼자 눈치채고, 그 의미를 파고드는 사람.",
          shortDescription:
            "모두가 지나친 이상 현상을 혼자 눈치채고, 그 의미를 파고드는 사람.",
          branchScores: {
            fantasy_system_successor: 1,
          },
          tagScores: {
            system_game: 1,
            mystery_investigation: 1,
            strategy_powerplay: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q2_a4",
          choiceOrder: 4,
          label: "판세를 읽는 사람",
          text: "불리한 상황에서도 감정보다 계산으로 판을 뒤집는 사람.",
          shortDescription:
            "불리한 상황에서도 감정보다 계산으로 판을 뒤집는 사람.",
          branchScores: {
            fantasy_kingdom_strategist: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q2_a5",
          choiceOrder: 5,
          label: "다시 시작하는 사람",
          text: "가진 것 하나 없이 무너진 자리에서 다시 시작하는 사람.",
          shortDescription:
            "가진 것 하나 없이 무너진 자리에서 다시 시작하는 사람.",
          branchScores: {
            fantasy_limit_breaker: 1,
          },
          tagScores: {
            growth: 1,
            second_chance: 1,
            emotional_depth: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionId: "fantasy_q3",
      order: 3,
      questionTitle: "사건 전개",
      questionText: "더 보고 싶은 사건 전개를 골라주세요.",
      legacyQuestionText:
        "첫 화의 중반, 평온하던 분위기가 갑자기 바뀝니다. 어떤 사건이 다가오고 있나요?",
      choices: [
        {
          choiceId: "fantasy_q3_a1",
          choiceOrder: 1,
          label: "전장으로 바뀐 장소",
          text: "주인공이 지키던 장소가 하룻밤 사이에 전장으로 바뀐다.",
          shortDescription:
            "주인공이 지키던 장소가 하룻밤 사이에 전장으로 바뀐다.",
          branchScores: {
            fantasy_survival_commander: 1,
          },
          tagScores: {
            survival_tension: 1,
            action_catharsis: 1,
            relationship_bond: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q3_a2",
          choiceOrder: 2,
          label: "맞아떨어진 계획",
          text: "실패한 줄 알았던 계획이 마지막 순간에 정확히 맞아떨어진다.",
          shortDescription:
            "실패한 줄 알았던 계획이 마지막 순간에 정확히 맞아떨어진다.",
          branchScores: {
            fantasy_kingdom_strategist: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q3_a3",
          choiceOrder: 3,
          label: "세계의 비밀",
          text: "적인지 아군인지 모를 인물이 주인공에게 세계의 비밀을 건넨다.",
          shortDescription:
            "적인지 아군인지 모를 인물이 주인공에게 세계의 비밀을 건넨다.",
          branchScores: {
            fantasy_truth_chaser: 1,
          },
          tagScores: {
            world_mystery: 1,
            mystery_investigation: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q3_a4",
          choiceOrder: 4,
          label: "새로운 선택지",
          text: "모두가 도망치는 순간, 주인공 앞에만 새로운 선택지가 열린다.",
          shortDescription:
            "모두가 도망치는 순간, 주인공 앞에만 새로운 선택지가 열린다.",
          branchScores: {
            fantasy_system_successor: 1,
          },
          tagScores: {
            system_game: 1,
            survival_tension: 1,
            strategy_powerplay: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q3_a5",
          choiceOrder: 5,
          label: "잃어버린 이름의 퀘스트",
          text: "오래전 잃어버린 이름이 적힌 퀘스트가 갑자기 시작된다.",
          shortDescription:
            "오래전 잃어버린 이름이 적힌 퀘스트가 갑자기 시작된다.",
          branchScores: {
            fantasy_limit_breaker: 1,
          },
          tagScores: {
            system_game: 1,
            growth: 1,
            emotional_depth: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionId: "fantasy_q4",
      order: 4,
      questionTitle: "연출",
      questionText: "볼 때 더 중요하게 느끼는 연출을 골라주세요.",
      legacyQuestionText:
        "이야기를 넘기던 중, 한 컷이 오래 눈에 남습니다. 어떤 컷이면 가장 오래 기억에 남을까요?",
      choices: [
        {
          choiceId: "fantasy_q4_a1",
          choiceOrder: 1,
          label: "세계의 크기",
          text: "대사 없이도 구도와 분위기만으로 세계의 크기가 느껴지는 컷.",
          shortDescription:
            "대사 없이도 구도와 분위기만으로 세계의 크기가 느껴지는 컷.",
          branchScores: {},
          tagScores: {
            visual_appeal: 1,
            world_mystery: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q4_a2",
          choiceOrder: 2,
          label: "숨겨진 힘의 공개",
          text: "숨겨진 힘이 드러나고, 모두의 표정이 한순간에 바뀌는 컷.",
          shortDescription:
            "숨겨진 힘이 드러나고, 모두의 표정이 한순간에 바뀌는 컷.",
          branchScores: {
            fantasy_hidden_power: 1,
          },
          tagScores: {
            hidden_identity_power: 1,
            action_catharsis: 1,
            visual_appeal: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q4_a3",
          choiceOrder: 3,
          label: "동맹과 배신의 역전",
          text: "짧은 말 한마디로 동맹과 배신의 판도가 뒤집히는 컷.",
          shortDescription:
            "짧은 말 한마디로 동맹과 배신의 판도가 뒤집히는 컷.",
          branchScores: {
            fantasy_kingdom_strategist: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q4_a4",
          choiceOrder: 4,
          label: "한계 돌파",
          text: "무너졌던 주인공이 처음으로 자신의 한계를 넘어서는 컷.",
          shortDescription:
            "무너졌던 주인공이 처음으로 자신의 한계를 넘어서는 컷.",
          branchScores: {
            fantasy_limit_breaker: 1,
          },
          tagScores: {
            growth: 1,
            emotional_depth: 1,
            action_catharsis: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q4_a5",
          choiceOrder: 5,
          label: "단서의 결합",
          text: "흩어진 규칙과 단서들이 하나의 진실로 맞물리는 컷.",
          shortDescription:
            "흩어진 규칙과 단서들이 하나의 진실로 맞물리는 컷.",
          branchScores: {
            fantasy_truth_chaser: 1,
          },
          tagScores: {
            world_mystery: 1,
            mystery_investigation: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionId: "fantasy_q5",
      order: 5,
      questionTitle: "다음 화 흐름",
      questionText: "다음 화까지 보고 싶게 만드는 흐름을 골라주세요.",
      legacyQuestionText:
        "분명 한 화만 더 보려 했습니다. 그런데 어느새 계속 넘기고 있습니다. 어떤 흐름이었을까요?",
      choices: [
        {
          choiceId: "fantasy_q5_a1",
          choiceOrder: 1,
          label: "실패와 재도전",
          text: "실패와 재도전을 거듭할수록 주인공이 한계를 넘어서며 강해지는 흐름.",
          shortDescription:
            "실패와 재도전을 거듭할수록 주인공이 한계를 넘어서며 강해지는 흐름.",
          branchScores: {
            fantasy_limit_breaker: 1,
          },
          tagScores: {
            growth: 1,
            story_immersion: 1,
            action_catharsis: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q5_a2",
          choiceOrder: 2,
          label: "버티는 생존전",
          text: "위기와 방어가 이어지며, 끝까지 버틸 방법을 찾아가는 흐름.",
          shortDescription:
            "위기와 방어가 이어지며, 끝까지 버틸 방법을 찾아가는 흐름.",
          branchScores: {
            fantasy_survival_commander: 1,
          },
          tagScores: {
            survival_tension: 1,
            strategy_powerplay: 1,
            relationship_bond: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q5_a3",
          choiceOrder: 3,
          label: "퀘스트와 보상",
          text: "퀘스트가 열리고, 보상을 확인하며 다음 길을 고르는 흐름.",
          shortDescription:
            "퀘스트가 열리고, 보상을 확인하며 다음 길을 고르는 흐름.",
          branchScores: {
            fantasy_system_successor: 1,
          },
          tagScores: {
            system_game: 1,
            growth: 1,
            dungeon_adventure: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q5_a4",
          choiceOrder: 4,
          label: "시선이 바뀌는 힘",
          text: "숨겨둔 힘이 조금씩 드러날수록, 주변의 시선이 바뀌는 흐름.",
          shortDescription:
            "숨겨둔 힘이 조금씩 드러날수록, 주변의 시선이 바뀌는 흐름.",
          branchScores: {
            fantasy_hidden_power: 1,
          },
          tagScores: {
            hidden_identity_power: 1,
            action_catharsis: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          choiceId: "fantasy_q5_a5",
          choiceOrder: 5,
          label: "깊어지는 세계",
          text: "처음엔 조용하지만, 규칙과 단서가 쌓일수록 세계가 깊어지는 흐름.",
          shortDescription:
            "처음엔 조용하지만, 규칙과 단서가 쌓일수록 세계가 깊어지는 흐름.",
          branchScores: {
            fantasy_truth_chaser: 1,
          },
          tagScores: {
            world_mystery: 1,
            mystery_investigation: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionId: "fantasy_q6",
      order: 6,
      questionTitle: "부담 요소",
      questionText: "덜 보고 싶은 부담 요소를 골라주세요.",
      legacyQuestionText:
        "처음엔 더 볼 생각이 있었습니다. 그런데 어느 순간 손이 멈추고, 뒤로가기를 눌렀습니다. 어떤 이유였을까요?",
      choices: [
        {
          choiceId: "fantasy_q6_a1",
          choiceOrder: 1,
          label: "감정 연결 부족",
          text: "설정은 큰데 감정적으로 붙잡을 인물이 보이지 않았다.",
          shortDescription:
            "설정은 큰데 감정적으로 붙잡을 인물이 보이지 않았다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            weak_immersion: 1,
          },
        },
        {
          choiceId: "fantasy_q6_a2",
          choiceOrder: 2,
          label: "초반 진입장벽",
          text: "설명은 많은데 사건이 늦게 시작돼 초반부터 집중이 풀렸다.",
          shortDescription:
            "설명은 많은데 사건이 늦게 시작돼 초반부터 집중이 풀렸다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            entry_barrier: 1,
            weak_immersion: 1,
          },
        },
        {
          choiceId: "fantasy_q6_a3",
          choiceOrder: 3,
          label: "작화·연출 흔들림",
          text: "초반에 강했던 작화와 연출이 뒤로 갈수록 크게 흔들렸다.",
          shortDescription:
            "초반에 강했던 작화와 연출이 뒤로 갈수록 크게 흔들렸다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            visual_barrier: 1,
            weak_immersion: 1,
          },
        },
        {
          choiceId: "fantasy_q6_a4",
          choiceOrder: 4,
          label: "답답한 반복 선택",
          text: "주인공이 같은 실수와 답답한 선택을 반복해서 따라가기 힘들었다.",
          shortDescription:
            "주인공이 같은 실수와 답답한 선택을 반복해서 따라가기 힘들었다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            character_frustration: 1,
            progression_fatigue: 1,
          },
        },
        {
          choiceId: "fantasy_q6_a5",
          choiceOrder: 5,
          label: "반복되는 장면",
          text: "전투와 보상은 계속 나오지만 장면이 비슷해서 새로움이 줄었다.",
          shortDescription:
            "전투와 보상은 계속 나오지만 장면이 비슷해서 새로움이 줄었다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            progression_fatigue: 1,
          },
        },
      ],
    },
  ],
};