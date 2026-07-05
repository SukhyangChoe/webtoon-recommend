import type { DetailTestResult } from "@/types/detailTest";

export const murimResults = [
  {
    testKey: "murim_detail",
    resultKey: "murim_growth_training",
    branchKey: "murim_growth_training",
    resultName: "초식 수련자",
    name: "초식 수련자",
    oneLineDescription:
      "반복되는 수련과 작은 깨달음이 쌓여, 한 수씩 강해지는 무협에 끌립니다.",
    displayTags: [
      "#수련",
      "#초식",
      "#성장무협",
      "#깨달음",
      "#서사탄탄",
      "#정주행안정감",
    ],
    tagScoreKeys: [
      "growth",
      "action_catharsis",
      "emotional_depth",
      "story_immersion",
    ],
    imageKey: "murim_growth_training",
    shareText: "반복되는 수련과 깨달음이 쌓이는 초식 수련자",
  },
  {
    testKey: "murim_detail",
    resultKey: "murim_absolute_power",
    branchKey: "murim_absolute_power",
    resultName: "천하 군림자",
    name: "천하 군림자",
    oneLineDescription:
      "등장만으로 모두의 시선과 강호의 분위기를 바꾸는 압도적 강자 서사에 끌립니다.",
    displayTags: [
      "#절대강자",
      "#천마",
      "#먼치킨무협",
      "#압도감",
      "#사이다",
      "#빠른전개",
    ],
    tagScoreKeys: [
      "action_catharsis",
      "hidden_identity_power",
      "special_ability",
      "survival_tension",
      "story_immersion",
    ],
    imageKey: "murim_absolute_power",
    shareText: "등장만으로 강호의 분위기를 바꾸는 천하 군림자",
  },
  {
    testKey: "murim_detail",
    resultKey: "murim_revenge_recovery",
    branchKey: "murim_revenge_recovery",
    resultName: "몰락한 후계자",
    name: "몰락한 후계자",
    oneLineDescription:
      "무너진 문파나 가문의 흔적을 붙잡고, 복수와 재기를 향해 다시 일어서는 무협에 끌립니다.",
    displayTags: [
      "#복수",
      "#재기",
      "#몰락문파",
      "#후계자",
      "#감정선",
      "#서사개연성",
    ],
    tagScoreKeys: [
      "revenge",
      "second_chance",
      "emotional_depth",
      "growth",
      "story_immersion",
    ],
    imageKey: "murim_revenge_recovery",
    shareText: "무너진 문파의 흔적을 붙잡고 다시 일어서는 몰락한 후계자",
  },
  {
    testKey: "murim_detail",
    resultKey: "murim_sect_politics",
    branchKey: "murim_sect_politics",
    resultName: "강호 책략가",
    name: "강호 책략가",
    oneLineDescription:
      "칼보다 먼저 문파의 판세와 사람의 속내를 읽는 두뇌형 무협에 끌립니다.",
    displayTags: [
      "#문파정치",
      "#책략",
      "#세력전",
      "#두뇌싸움",
      "#설정탄탄",
      "#서사개연성",
    ],
    tagScoreKeys: [
      "strategy_powerplay",
      "world_mystery",
      "relationship_bond",
      "story_immersion",
    ],
    imageKey: "murim_sect_politics",
    shareText: "칼보다 먼저 판세와 사람의 속내를 읽는 강호 책략가",
  },
  {
    testKey: "murim_detail",
    resultKey: "murim_wanderer_justice",
    branchKey: "murim_wanderer_justice",
    resultName: "길 위의 협객",
    name: "길 위의 협객",
    oneLineDescription:
      "강해지는 것보다, 길 위에서 만난 사람과 약속을 외면하지 못하는 무협에 끌립니다.",
    displayTags: [
      "#협객",
      "#강호여정",
      "#의리",
      "#약속",
      "#감정선",
      "#잔잔한몰입",
    ],
    tagScoreKeys: [
      "relationship_bond",
      "emotional_depth",
      "light_healing",
      "action_catharsis",
      "story_immersion",
    ],
    imageKey: "murim_wanderer_justice",
    shareText: "길 위에서 만난 사람과 약속을 외면하지 못하는 길 위의 협객",
  },
] satisfies DetailTestResult[];

export type MurimResult = (typeof murimResults)[number];