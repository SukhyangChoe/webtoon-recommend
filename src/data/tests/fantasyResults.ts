import type { DetailTestResult } from "@/types/detailTest";

export const fantasyResults = [
  {
    testKey: "fantasy_detail",
    resultKey: "fantasy_system_successor",
    branchKey: "fantasy_system_successor",
    resultName: "시스템 계승자",
    name: "시스템 계승자",
    oneLineDescription:
      "주어진 규칙과 보상을 읽고, 가장 유리한 성장 루트를 찾아가는 판타지에 끌립니다.",
    staySceneText:
      "남들이 지나친 규칙 한 줄을 해석하고, 숨겨진 보상과 성장 루트를 열어가는 장면에 오래 머뭅니다.",
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
    imageKey: "fantasy_system_window",
    shareText: "규칙을 읽고 성장 루트를 찾아가는 시스템 계승자",
  },
  {
    testKey: "fantasy_detail",
    resultKey: "fantasy_hidden_power",
    branchKey: "fantasy_hidden_power",
    resultName: "힘숨찐",
    name: "힘숨찐",
    oneLineDescription:
      "평범해 보이던 주인공이 결정적인 순간 숨겨둔 힘으로 분위기를 뒤집는 전개에 끌립니다.",
    staySceneText:
      "평범해 보이던 인물이 결정적인 순간 숨겨온 힘을 드러내고, 판을 뒤집는 장면에 오래 머뭅니다.",
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
    shareText: "결정적인 순간 숨겨둔 힘으로 분위기를 뒤집는 힘숨찐",
  },
  {
    testKey: "fantasy_detail",
    resultKey: "fantasy_limit_breaker",
    branchKey: "fantasy_limit_breaker",
    resultName: "한계 돌파자",
    name: "한계 돌파자",
    oneLineDescription:
      "약한 시작과 실패를 지나, 한계를 하나씩 넘으며 강해지는 성장 서사에 끌립니다.",
    staySceneText:
      "무너졌던 주인공이 다시 일어나, 실패 끝에 닿지 못하던 한계를 처음 넘어서는 장면에 오래 머뭅니다.",
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
    shareText: "실패를 지나 한계를 하나씩 돌파하는 한계 돌파자",
  },
  {
    testKey: "fantasy_detail",
    resultKey: "fantasy_truth_chaser",
    branchKey: "fantasy_truth_chaser",
    resultName: "진실 추적자",
    name: "진실 추적자",
    oneLineDescription:
      "숨겨진 단서와 진실이 하나씩 연결되며, 세계의 진짜 그림이 드러나는 판타지에 끌립니다.",
    staySceneText:
      "금지된 기록과 오래된 단서가 이어지고, 세계의 비밀이 한 겹씩 벗겨지는 장면에 오래 머뭅니다.",
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
    imageKey: "fantasy_truth_map",
    shareText: "단서와 진실을 따라 세계의 진짜 그림을 맞추는 진실 추적자",
  },
  {
    testKey: "fantasy_detail",
    resultKey: "fantasy_survival_commander",
    branchKey: "fantasy_survival_commander",
    resultName: "생존 지휘관",
    name: "생존 지휘관",
    oneLineDescription:
      "무너지는 상황 속에서도 사람들과 거점을 지키며 끝까지 버티는 전개에 끌립니다.",
    staySceneText:
      "무너지는 거점 안에서 사람들을 지휘하고, 남은 자원으로 끝까지 버티는 장면에 오래 머뭅니다.",
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
    shareText: "무너지는 상황에서도 사람들과 거점을 지키는 생존 지휘관",
  },
  {
    testKey: "fantasy_detail",
    resultKey: "fantasy_kingdom_strategist",
    branchKey: "fantasy_kingdom_strategist",
    resultName: "왕국 전략가",
    name: "왕국 전략가",
    oneLineDescription:
      "전투보다 세력, 동맹, 판세를 읽고 왕국의 흐름을 바꾸는 이야기에 끌립니다.",
    staySceneText:
      "작은 선택 하나가 전쟁과 세력의 판도를 바꾸고, 숨은 계산이 드러나는 장면에 오래 머뭅니다.",
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
    imageKey: "fantasy_strategy_board",
    shareText: "세력과 판세를 읽고 왕국의 흐름을 바꾸는 왕국 전략가",
  },
] satisfies DetailTestResult[];

export type FantasyResult = (typeof fantasyResults)[number];