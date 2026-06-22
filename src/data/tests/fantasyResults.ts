import type { TestResult } from "@/lib/testEngine/types";

export const fantasyResults: TestResult[] = [
  {
    testKey: "fantasy_detail",
    resultKey: "fantasy_system_successor",
    resultName: "시스템 계승자",
    oneLineDescription:
      "주어진 규칙과 보상을 읽고, 가장 유리한 성장 루트를 찾아가는 판타지에 끌립니다.",
    displayTags: [
      "#시스템",
      "#퀘스트",
      "#조건공략",
      "#성장루트",
      "#정보우위",
      "#빠른전개",
    ],
    tagScoreKeys: [
      "system_game",
      "strategy_powerplay",
      "growth",
      "dungeon_adventure",
      "story_immersion",
    ],
    imageKey: "fantasy_magic_book",
    shareText:
      "나는 규칙을 읽고 성장 루트를 찾아가는 시스템 계승자 타입입니다.",
  },
  {
    testKey: "fantasy_detail",
    resultKey: "fantasy_hidden_power",
    resultName: "힘숨찐",
    oneLineDescription:
      "평범해 보이던 주인공이 결정적인 순간 숨겨둔 힘으로 분위기를 뒤집는 전개에 끌립니다.",
    displayTags: [
      "#힘숨찐",
      "#먼치킨",
      "#정체숨김",
      "#사이다",
      "#압도감",
      "#빠른전개",
    ],
    tagScoreKeys: [
      "hidden_identity_power",
      "action_catharsis",
      "special_ability",
      "visual_appeal",
      "story_immersion",
    ],
    imageKey: "fantasy_hidden_aura",
    shareText:
      "나는 결정적인 순간 숨겨둔 힘으로 분위기를 뒤집는 힘숨찐 타입입니다.",
  },
  {
    testKey: "fantasy_detail",
    resultKey: "fantasy_limit_breaker",
    resultName: "한계 돌파자",
    oneLineDescription:
      "약한 시작과 실패를 지나, 한계를 하나씩 넘으며 강해지는 성장 서사에 끌립니다.",
    displayTags: [
      "#성장형주인공",
      "#재도전",
      "#한계돌파",
      "#수련",
      "#서사탄탄",
      "#감정선",
    ],
    tagScoreKeys: [
      "growth",
      "second_chance",
      "action_catharsis",
      "emotional_depth",
      "story_immersion",
    ],
    imageKey: "fantasy_limit_break",
    shareText:
      "나는 실패를 지나 한계를 하나씩 돌파하는 한계 돌파자 타입입니다.",
  },
  {
    testKey: "fantasy_detail",
    resultKey: "fantasy_truth_chaser",
    resultName: "진실 추적자",
    oneLineDescription:
      "숨겨진 단서와 진실이 하나씩 연결되며, 세계의 진짜 그림이 드러나는 판타지에 끌립니다.",
    displayTags: [
      "#떡밥회수",
      "#숨겨진진실",
      "#복선",
      "#세계관몰입",
      "#설정탄탄",
      "#장기서사",
    ],
    tagScoreKeys: [
      "world_mystery",
      "mystery_investigation",
      "story_immersion",
      "emotional_depth",
    ],
    imageKey: "fantasy_mystery_book",
    shareText:
      "나는 단서와 진실을 따라 세계의 진짜 그림을 맞추는 진실 추적자 타입입니다.",
  },
  {
    testKey: "fantasy_detail",
    resultKey: "fantasy_survival_commander",
    resultName: "생존 지휘관",
    oneLineDescription:
      "무너지는 상황 속에서도 사람들과 거점을 지키며 끝까지 버티는 전개에 끌립니다.",
    displayTags: [
      "#생존",
      "#전쟁",
      "#거점방어",
      "#리더십",
      "#긴장감",
      "#몰입도",
    ],
    tagScoreKeys: [
      "survival_tension",
      "strategy_powerplay",
      "relationship_bond",
      "action_catharsis",
      "story_immersion",
    ],
    imageKey: "fantasy_battle_fortress",
    shareText:
      "나는 무너지는 상황에서도 사람들과 거점을 지키는 생존 지휘관 타입입니다.",
  },
  {
    testKey: "fantasy_detail",
    resultKey: "fantasy_kingdom_strategist",
    resultName: "왕국 전략가",
    oneLineDescription:
      "전투보다 세력, 동맹, 판세를 읽고 왕국의 흐름을 바꾸는 이야기에 끌립니다.",
    displayTags: [
      "#왕국운영",
      "#세력전",
      "#정치판타지",
      "#전략",
      "#두뇌싸움",
      "#설정탄탄",
    ],
    tagScoreKeys: [
      "strategy_powerplay",
      "management_crafting",
      "world_mystery",
      "story_immersion",
    ],
    imageKey: "fantasy_kingdom_map",
    shareText:
      "나는 세력과 판세를 읽고 왕국의 흐름을 바꾸는 왕국 전략가 타입입니다.",
  },
];