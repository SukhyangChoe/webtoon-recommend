import type { DetailTestResult } from "@/types/detailTest";

export const dramaDailyResults = [
  {
    testKey: "drama_daily_detail",
    resultKey: "drama_life_realism",
    branchKey: "drama_life_realism",
    resultName: "현실 공감형",
    name: "현실 공감형",
    oneLineDescription:
      "출근길, 학교, 생활의 고민처럼 현실적인 하루를 버티는 인물들의 이야기에 깊이 공감합니다.",
    staySceneText:
      "버거운 하루를 티 내지 않으려 애쓰며, 그래도 자기 몫을 끝까지 해내는 장면에 오래 머뭅니다.",
    displayTags: [
      "#현실공감",
      "#생활밀착",
      "#직장과학교",
      "#하루버티기",
      "#내이야기같은",
      "#작은버팀",
    ],
    tagScoreKeys: [
      "life_realism",
      "emotional_depth",
      "relationship_bond",
      "story_immersion",
    ],
    imageKey: "drama_commute_window",
    shareText: "현실적인 하루를 버티는 인물들에게 깊이 공감하는 현실 공감형",
  },
  {
    testKey: "drama_daily_detail",
    resultKey: "drama_youth_growth",
    branchKey: "drama_youth_growth",
    resultName: "청춘 성장형",
    name: "청춘 성장형",
    oneLineDescription:
      "서툰 실패와 망설임을 지나, 인물이 자기 길을 찾아가는 드라마·일상에 끌립니다.",
    staySceneText:
      "실패한 자리에서 다시 운동화 끈을 묶고, 망설이던 인물이 자기 길을 찾아가는 장면에 오래 머뭅니다.",
    displayTags: [
      "#청춘성장",
      "#첫도전",
      "#실패후재시작",
      "#자기발견",
      "#서툰인물",
      "#조금씩앞으로",
    ],
    tagScoreKeys: [
      "growth",
      "emotional_depth",
      "life_realism",
      "relationship_bond",
      "story_immersion",
    ],
    imageKey: "drama_worn_sneakers",
    shareText: "서툰 실패와 망설임을 지나 자기 길을 찾아가는 청춘 성장형",
  },
  {
    testKey: "drama_daily_detail",
    resultKey: "drama_healing_daily",
    branchKey: "drama_healing_daily",
    resultName: "힐링 일상형",
    name: "힐링 일상형",
    oneLineDescription:
      "자극적인 사건보다, 편안한 하루와 따뜻한 온도 속에서 마음이 쉬어가는 드라마·일상에 끌립니다.",
    staySceneText:
      "카페의 아침, 동네 산책, 따뜻한 음식처럼 마음이 천천히 풀리는 장면에 오래 머뭅니다.",
    displayTags: [
      "#힐링일상",
      "#따뜻한분위기",
      "#편안한감상",
      "#동네산책",
      "#쉬어가는이야기",
      "#잔잔한온도",
    ],
    tagScoreKeys: [
      "light_healing",
      "life_realism",
      "relationship_bond",
      "story_immersion",
    ],
    imageKey: "drama_warm_cafe",
    shareText: "편안한 하루와 따뜻한 온도 속에서 마음이 쉬어가는 힐링 일상형",
  },
  {
    testKey: "drama_daily_detail",
    resultKey: "drama_family_relationship",
    branchKey: "drama_family_relationship",
    resultName: "가족·관계형",
    name: "가족·관계형",
    oneLineDescription:
      "가족, 오래된 친구, 이웃처럼 가까운 관계 속에서 서운함이 풀리고 다시 이어지는 이야기에 끌립니다.",
    staySceneText:
      "오래 서운했던 마음이 작은 메모, 물건 하나, 조심스러운 한마디로 조금씩 풀리는 장면에 오래 머뭅니다.",
    displayTags: [
      "#가족관계",
      "#오래된친구",
      "#이웃과동네",
      "#관계회복",
      "#서운함해소",
      "#작은마음",
    ],
    tagScoreKeys: [
      "relationship_bond",
      "emotional_depth",
      "life_realism",
      "light_healing",
    ],
    imageKey: "drama_family_note",
    shareText: "가까운 관계 속 서운함이 풀리고 다시 이어지는 가족·관계형",
  },
  {
    testKey: "drama_daily_detail",
    resultKey: "drama_emotional_afterglow",
    branchKey: "drama_emotional_afterglow",
    resultName: "감정 여운형",
    name: "감정 여운형",
    oneLineDescription:
      "말하지 못한 마음과 지나간 계절처럼, 사건이 끝난 뒤에도 조용히 남는 감정선에 끌립니다.",
    staySceneText:
      "말하지 못한 마음이 표정과 침묵으로 남고, 닫힌 문 앞의 긴 시간이 오래 여운으로 남는 장면에 머뭅니다.",
    displayTags: [
      "#감정여운",
      "#말하지못한마음",
      "#오래된편지",
      "#조용한감정선",
      "#상처와그리움",
      "#마지막컷여운",
    ],
    tagScoreKeys: [
      "emotional_depth",
      "relationship_bond",
      "light_healing",
      "story_immersion",
    ],
    imageKey: "drama_old_letter",
    shareText: "말하지 못한 마음과 지나간 계절이 조용히 남는 감정 여운형",
  },
  {
    testKey: "drama_daily_detail",
    resultKey: "drama_comedy_life",
    branchKey: "drama_comedy_life",
    resultName: "유쾌한 생활형",
    name: "유쾌한 생활형",
    oneLineDescription:
      "소소한 사건과 주고받는 농담, 인물들의 반응이 이어지는 가벼운 생활 코미디에 끌립니다.",
    staySceneText:
      "사소한 사건마다 주고받는 농담과 반응이 이어지고, 표정 하나로 웃음이 터지는 장면에 오래 머뭅니다.",
    displayTags: [
      "#유쾌한생활",
      "#생활코미디",
      "#소소한사건",
      "#티키타카",
      "#가볍게웃는",
      "#부담없는흐름",
    ],
    tagScoreKeys: [
      "humor_comedy",
      "life_realism",
      "relationship_bond",
      "light_healing",
    ],
    imageKey: "drama_daily_laugh",
    shareText: "소소한 사건과 주고받는 농담으로 가볍게 웃게 되는 유쾌한 생활형",
  },
] satisfies DetailTestResult[];

export type DramaDailyResult = (typeof dramaDailyResults)[number];