import type { DetailTestResult } from "@/types/detailTest";

export const thrillerHorrorResults = [
  {
    testKey: "thriller_horror_detail",
    resultKey: "thriller_mystery_chaser",
    branchKey: "thriller_mystery_chaser",
    resultName: "추리·단서 추적형",
    name: "추리·단서 추적형",
    oneLineDescription:
      "사건의 작은 모순과 남겨진 단서를 따라가며, 숨겨진 진실에 가까워지는 스릴러·공포에 끌립니다.",
    staySceneText:
      "젖은 우산, 오래된 영수증, 사라진 밤의 동선이 하나씩 맞물리며 진실의 윤곽이 드러나는 장면에 오래 머뭅니다.",
    displayTags: [
      "#단서추적",
      "#사건의진실",
      "#실종미스터리",
      "#복선회수",
      "#추리몰입",
      "#숨겨진기록",
    ],
    tagScoreKeys: [
      "mystery_investigation",
      "world_mystery",
      "story_immersion",
      "strategy_powerplay",
    ],
    imageKey: "thriller_mystery_clue",
    shareText: "작은 단서와 모순을 따라 숨겨진 진실에 가까워지는 추리·단서 추적형",
  },
  {
    testKey: "thriller_horror_detail",
    resultKey: "thriller_survival_escape",
    branchKey: "thriller_survival_escape",
    resultName: "생존 탈출형",
    name: "생존 탈출형",
    oneLineDescription:
      "닫힌 공간과 줄어드는 시간 속에서, 살아남고 빠져나갈 길을 찾는 스릴러·공포에 끌립니다.",
    staySceneText:
      "불 꺼진 지하 주차장과 깜박이는 비상구 앞에서, 남은 시간이 줄어드는 탈출의 순간에 오래 머뭅니다.",
    displayTags: [
      "#폐쇄공간",
      "#제한시간",
      "#탈출",
      "#생존긴장",
      "#위기돌파",
      "#숨막히는전개",
    ],
    tagScoreKeys: [
      "survival_tension",
      "story_immersion",
      "action_catharsis",
      "relationship_bond",
    ],
    imageKey: "thriller_locked_exit",
    shareText: "닫힌 공간과 줄어드는 시간 속에서 탈출구를 찾는 생존 탈출형",
  },
  {
    testKey: "thriller_horror_detail",
    resultKey: "thriller_occult_uncanny",
    branchKey: "thriller_occult_uncanny",
    resultName: "오컬트·괴이형",
    name: "오컬트·괴이형",
    oneLineDescription:
      "설명되지 않는 현상과 금기의 흔적이 현실을 조금씩 어긋나게 만드는 스릴러·공포에 끌립니다.",
    staySceneText:
      "낡은 사진 속 얼굴, 벽 너머의 목소리, 거울 속 어긋난 움직임처럼 현실의 규칙이 살짝 무너지는 장면에 오래 머뭅니다.",
    displayTags: [
      "#오컬트",
      "#괴담",
      "#저주",
      "#금기",
      "#초자연공포",
      "#불길한징조",
    ],
    tagScoreKeys: [
      "world_mystery",
      "magic",
      "survival_tension",
      "story_immersion",
    ],
    imageKey: "thriller_old_photo",
    shareText: "설명되지 않는 현상이 현실을 흔드는 오컬트·괴이형",
  },
  {
    testKey: "thriller_horror_detail",
    resultKey: "thriller_crime_revenge",
    branchKey: "thriller_crime_revenge",
    resultName: "범죄·응징형",
    name: "범죄·응징형",
    oneLineDescription:
      "피해자의 흔적을 따라 가해자를 좇고, 어두운 진실과 응징이 선명해지는 스릴러·공포에 끌립니다.",
    staySceneText:
      "피해자가 남긴 마지막 흔적이 가해자를 향한 추적과 복수의 방향을 정하는 장면에 오래 머뭅니다.",
    displayTags: [
      "#범죄추적",
      "#가해자추적",
      "#복수서사",
      "#어두운사이다",
      "#피해자의흔적",
      "#진실추적",
    ],
    tagScoreKeys: [
      "revenge",
      "mystery_investigation",
      "survival_tension",
      "action_catharsis",
      "story_immersion",
    ],
    imageKey: "thriller_crime_trace",
    shareText: "피해자의 흔적을 따라 가해자를 좇는 범죄·응징형",
  },
  {
    testKey: "thriller_horror_detail",
    resultKey: "thriller_psychological_tension",
    branchKey: "thriller_psychological_tension",
    resultName: "심리 압박형",
    name: "심리 압박형",
    oneLineDescription:
      "가까운 사람의 말과 표정이 흔들리고, 의심과 불신이 관계를 압박하는 스릴러·공포에 끌립니다.",
    staySceneText:
      "가족사진에서 내가 지워지고, 모두가 아무렇지 않게 웃는 평범한 집 안의 침묵에 오래 머뭅니다.",
    displayTags: [
      "#심리압박",
      "#불신관계",
      "#가스라이팅",
      "#침묵의긴장",
      "#관계균열",
      "#불안한시선",
    ],
    tagScoreKeys: [
      "survival_tension",
      "emotional_depth",
      "relationship_bond",
      "story_immersion",
    ],
    imageKey: "thriller_silent_room",
    shareText: "말과 표정 사이의 균열이 불안을 키우는 심리 압박형",
  },
  {
    testKey: "thriller_horror_detail",
    resultKey: "thriller_conspiracy_twist",
    branchKey: "thriller_conspiracy_twist",
    resultName: "음모·반전형",
    name: "음모·반전형",
    oneLineDescription:
      "사건 뒤의 조작된 진실과 큰 판이 드러나며, 처음 본 장면의 의미가 뒤집히는 스릴러·공포에 끌립니다.",
    staySceneText:
      "처음 본 장면의 의미가 뒤집히고, 사건 뒤에 숨어 있던 조작된 판이 드러나는 장면에 오래 머뭅니다.",
    displayTags: [
      "#음모",
      "#반전",
      "#조작된진실",
      "#숨겨진조직",
      "#큰판",
      "#의미뒤집힘",
    ],
    tagScoreKeys: [
      "world_mystery",
      "mystery_investigation",
      "strategy_powerplay",
      "story_immersion",
    ],
    imageKey: "thriller_conspiracy_file",
    shareText: "조작된 진실과 큰 판이 드러나며 의미가 뒤집히는 음모·반전형",
  },
] satisfies DetailTestResult[];

export type ThrillerHorrorResult = (typeof thrillerHorrorResults)[number];