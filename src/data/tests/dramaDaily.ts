import type { DetailTestBranch, DetailTestData } from "@/types/detailTest";

export const dramaDailyBranches = [
  {
    branchKey: "drama_life_realism",
    branchName: "현실 공감형",
  },
  {
    branchKey: "drama_youth_growth",
    branchName: "청춘 성장형",
  },
  {
    branchKey: "drama_healing_daily",
    branchName: "힐링 일상형",
  },
  {
    branchKey: "drama_family_relationship",
    branchName: "가족·관계형",
  },
  {
    branchKey: "drama_emotional_afterglow",
    branchName: "감정 여운형",
  },
  {
    branchKey: "drama_comedy_life",
    branchName: "유쾌한 생활형",
  },
] satisfies DetailTestBranch[];

export const dramaDailyTest = {
  testId: "drama_daily_detail",
  testKey: "drama_daily_detail",
  testName: "드라마·일상 웹툰 취향 테스트",
  displayName: "드라마·일상 웹툰 취향 테스트",
  genreKey: "drama_daily",
  typeScoreKey: "dramaTypeScores",

  route: "/tests/drama-daily",

  questionCount: 6,
  choiceCountPerQuestion: 5,
  choiceCount: 30,
  resultCount: 6,

  version: "v0.2",
  testVersion: "v0.2",

  scoreMode: "branch_tag_avoidance",
  selectMode: "ranked_multi_select",
  maxSelect: 2,

  startTitle: "제목 없는 드라마·일상 원고가 도착했습니다.",
  startDescription:
    "당신이 고르는 장면들이 모여\n오래 머물 일상의 온도를 만들어갑니다.",
  startButtonText: "첫 장면 열기",

  intro: {
    title: "제목 없는 드라마·일상 원고가 도착했습니다.",
    description:
      "당신이 고르는 장면들이 모여\n오래 머물 일상의 온도를 만들어갑니다.",
    startButtonText: "첫 장면 열기",
  },

  rankWeights: {
    single: [{ rank: 1, weight: 1.0 }],
    double: [
      { rank: 1, weight: 0.7 },
      { rank: 2, weight: 0.3 },
    ],
  },

  tieBreakQuestionOrder: [
    "drama_q4",
    "drama_q5",
    "drama_q2",
    "drama_q3",
    "drama_q1",
  ],

  excludeFromBranchResult: ["drama_q6"],

  branches: dramaDailyBranches,

  questions: [
    {
      questionKey: "drama_q1",
      questionId: "drama_q1",
      order: 1,
      questionOrder: 1,
      questionTitle: "첫 페이지",
      title: "첫 페이지",
      questionText:
        "첫 장면이 열립니다. 아직 큰 사건도, 특별한 설명도 나오지 않았지만, 이상하게 이 하루의 온도가 느껴지는 시작이 있습니다. 첫 페이지에 그려진 장면은 무엇인가요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      cardType: "image",
      choices: [
        {
          optionKey: "drama_q1_a1",
          choiceId: "drama_q1_a1",
          choiceOrder: 1,
          label: "현실 공감형",
          text: "이른 아침 버스 창가, 졸린 얼굴의 사람들이 각자의 하루를 안고 같은 방향으로 흔들린다.",
          shortDescription:
            "이른 아침 버스 창가, 졸린 얼굴의 사람들이 각자의 하루를 안고 같은 방향으로 흔들린다.",
          imageKey: "drama_q1_a1_image",
          branchScores: {
            drama_life_realism: 1,
          },
          tagScores: {
            life_realism: 1,
            emotional_depth: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q1_a2",
          choiceId: "drama_q1_a2",
          choiceOrder: 2,
          label: "청춘 성장형",
          text: "낡은 운동화 끈을 다시 묶은 인물이, 망설이다가 처음 지원서를 손에 쥔다.",
          shortDescription:
            "낡은 운동화 끈을 다시 묶은 인물이, 망설이다가 처음 지원서를 손에 쥔다.",
          imageKey: "drama_q1_a2_image",
          branchScores: {
            drama_youth_growth: 1,
          },
          tagScores: {
            growth: 1,
            emotional_depth: 1,
            life_realism: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q1_a3",
          choiceId: "drama_q1_a3",
          choiceOrder: 3,
          label: "힐링 일상형",
          text: "골목 끝 작은 카페에 아침 햇살이 들어오고, 막 내린 커피 향이 조용히 퍼진다.",
          shortDescription:
            "골목 끝 작은 카페에 아침 햇살이 들어오고, 막 내린 커피 향이 조용히 퍼진다.",
          imageKey: "drama_q1_a3_image",
          branchScores: {
            drama_healing_daily: 1,
          },
          tagScores: {
            light_healing: 1,
            life_realism: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q1_a4",
          choiceId: "drama_q1_a4",
          choiceOrder: 4,
          label: "가족·관계형",
          text: "저녁 식탁 한쪽에 빈 의자가 남아 있고, 냉장고 문에는 “오늘은 같이 밥 먹자”는 가족의 메모가 붙어 있다.",
          shortDescription:
            "저녁 식탁 한쪽에 빈 의자가 남아 있고, 냉장고 문에는 “오늘은 같이 밥 먹자”는 가족의 메모가 붙어 있다.",
          imageKey: "drama_q1_a4_image",
          branchScores: {
            drama_family_relationship: 1,
          },
          tagScores: {
            relationship_bond: 1,
            emotional_depth: 1,
            life_realism: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q1_a5",
          choiceId: "drama_q1_a5",
          choiceOrder: 5,
          label: "감정 여운형",
          text: "계절이 지난 편지 한 장이 서랍 안에서 발견되고, 접힌 자국마다 말하지 못한 마음이 남아 있다.",
          shortDescription:
            "계절이 지난 편지 한 장이 서랍 안에서 발견되고, 접힌 자국마다 말하지 못한 마음이 남아 있다.",
          imageKey: "drama_q1_a5_image",
          branchScores: {
            drama_emotional_afterglow: 1,
          },
          tagScores: {
            emotional_depth: 1,
            relationship_bond: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionKey: "drama_q2",
      questionId: "drama_q2",
      order: 2,
      questionOrder: 2,
      questionTitle: "모습을 드러낸 인물",
      title: "모습을 드러낸 인물",
      questionText:
        "몇 컷 뒤, 카메라는 이 이야기의 중심에 설 인물을 따라가기 시작합니다. 이 인물은 어떤 사람인가요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      cardType: "text",
      choices: [
        {
          optionKey: "drama_q2_a1",
          choiceId: "drama_q2_a1",
          choiceOrder: 1,
          label: "유쾌한 생활형",
          text: "사소한 실수도 웃음으로 넘기고, 어색해진 분위기를 말 한마디로 풀어내는 사람.",
          shortDescription:
            "사소한 실수도 웃음으로 넘기고, 어색해진 분위기를 말 한마디로 풀어내는 사람.",
          branchScores: {
            drama_comedy_life: 1,
          },
          tagScores: {
            humor_comedy: 1,
            life_realism: 1,
            relationship_bond: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q2_a2",
          choiceId: "drama_q2_a2",
          choiceOrder: 2,
          label: "가족·관계형",
          text: "표현은 서툴지만, 가족이나 오래된 친구가 힘든 걸 가장 먼저 알아차리고 곁에 남는 사람.",
          shortDescription:
            "표현은 서툴지만, 가족이나 오래된 친구가 힘든 걸 가장 먼저 알아차리고 곁에 남는 사람.",
          branchScores: {
            drama_family_relationship: 1,
          },
          tagScores: {
            relationship_bond: 1,
            emotional_depth: 1,
            light_healing: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q2_a3",
          choiceId: "drama_q2_a3",
          choiceOrder: 3,
          label: "현실 공감형",
          text: "버거운 하루를 티 내지 않으려 애쓰며, 그래도 자기 몫을 끝까지 해내는 사람.",
          shortDescription:
            "버거운 하루를 티 내지 않으려 애쓰며, 그래도 자기 몫을 끝까지 해내는 사람.",
          branchScores: {
            drama_life_realism: 1,
          },
          tagScores: {
            life_realism: 1,
            emotional_depth: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q2_a4",
          choiceId: "drama_q2_a4",
          choiceOrder: 4,
          label: "힐링 일상형",
          text: "서두르지 않고, 작은 말과 행동으로 주변의 공기를 천천히 따뜻하게 바꾸는 사람.",
          shortDescription:
            "서두르지 않고, 작은 말과 행동으로 주변의 공기를 천천히 따뜻하게 바꾸는 사람.",
          branchScores: {
            drama_healing_daily: 1,
          },
          tagScores: {
            light_healing: 1,
            relationship_bond: 1,
            life_realism: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q2_a5",
          choiceId: "drama_q2_a5",
          choiceOrder: 5,
          label: "청춘 성장형",
          text: "아직 서툴고 자주 흔들리지만, 실패한 자리에서 조금씩 다시 배우는 사람.",
          shortDescription:
            "아직 서툴고 자주 흔들리지만, 실패한 자리에서 조금씩 다시 배우는 사람.",
          branchScores: {
            drama_youth_growth: 1,
          },
          tagScores: {
            growth: 1,
            emotional_depth: 1,
            life_realism: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionKey: "drama_q3",
      questionId: "drama_q3",
      order: 3,
      questionOrder: 3,
      questionTitle: "다가오는 사건",
      title: "다가오는 사건",
      questionText:
        "평범해 보이던 하루에 작은 변화가 생깁니다. 어떤 일이 이야기를 움직이기 시작하나요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      cardType: "text",
      choices: [
        {
          optionKey: "drama_q3_a1",
          choiceId: "drama_q3_a1",
          choiceOrder: 1,
          label: "청춘 성장형",
          text: "포기한 줄 알았던 꿈 앞에서, 인물이 처음으로 다른 선택지를 고민하기 시작한다.",
          shortDescription:
            "포기한 줄 알았던 꿈 앞에서, 인물이 처음으로 다른 선택지를 고민하기 시작한다.",
          branchScores: {
            drama_youth_growth: 1,
          },
          tagScores: {
            growth: 1,
            emotional_depth: 1,
            life_realism: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q3_a2",
          choiceId: "drama_q3_a2",
          choiceOrder: 2,
          label: "감정 여운형",
          text: "오래 묻어둔 이름 하나가 우연히 들리고, 잊은 줄 알았던 마음이 다시 떠오른다.",
          shortDescription:
            "오래 묻어둔 이름 하나가 우연히 들리고, 잊은 줄 알았던 마음이 다시 떠오른다.",
          branchScores: {
            drama_emotional_afterglow: 1,
          },
          tagScores: {
            emotional_depth: 1,
            relationship_bond: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q3_a3",
          choiceId: "drama_q3_a3",
          choiceOrder: 3,
          label: "유쾌한 생활형",
          text: "동네 가게의 작은 이벤트에 우연히 끌려 들어가고, 사람들의 농담과 반응이 이어지며 하루가 유쾌하게 흘러간다.",
          shortDescription:
            "동네 가게의 작은 이벤트에 우연히 끌려 들어가고, 사람들의 농담과 반응이 이어지며 하루가 유쾌하게 흘러간다.",
          branchScores: {
            drama_comedy_life: 1,
          },
          tagScores: {
            humor_comedy: 1,
            life_realism: 1,
            relationship_bond: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q3_a4",
          choiceId: "drama_q3_a4",
          choiceOrder: 4,
          label: "현실 공감형",
          text: "월급날 전날의 통장 잔고와 밀린 할 일이, 평범한 하루를 갑자기 무겁게 만든다.",
          shortDescription:
            "월급날 전날의 통장 잔고와 밀린 할 일이, 평범한 하루를 갑자기 무겁게 만든다.",
          branchScores: {
            drama_life_realism: 1,
          },
          tagScores: {
            life_realism: 1,
            emotional_depth: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q3_a5",
          choiceId: "drama_q3_a5",
          choiceOrder: 5,
          label: "가족·관계형",
          text: "오랫동안 피하던 가족 모임에서, 아무렇지 않은 한마디가 묵혀둔 서운함을 꺼내 놓는다.",
          shortDescription:
            "오랫동안 피하던 가족 모임에서, 아무렇지 않은 한마디가 묵혀둔 서운함을 꺼내 놓는다.",
          branchScores: {
            drama_family_relationship: 1,
          },
          tagScores: {
            relationship_bond: 1,
            emotional_depth: 1,
            life_realism: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionKey: "drama_q4",
      questionId: "drama_q4",
      order: 4,
      questionOrder: 4,
      questionTitle: "기억에 남는 장면",
      title: "기억에 남는 장면",
      questionText:
        "이야기를 넘기던 중, 한 장면이 오래 마음에 남습니다. 어떤 장면이면 가장 오래 기억에 남을까요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      cardType: "image",
      choices: [
        {
          optionKey: "drama_q4_a1",
          choiceId: "drama_q4_a1",
          choiceOrder: 1,
          label: "감정 여운형",
          text: "하고 싶던 말을 삼킨 사람이, 닫힌 문 앞에서 한참 동안 같은 자리에 서 있는 장면.",
          shortDescription:
            "하고 싶던 말을 삼킨 사람이, 닫힌 문 앞에서 한참 동안 같은 자리에 서 있는 장면.",
          imageKey: "drama_q4_a1_image",
          branchScores: {
            drama_emotional_afterglow: 1,
          },
          tagScores: {
            emotional_depth: 1,
            relationship_bond: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q4_a2",
          choiceId: "drama_q4_a2",
          choiceOrder: 2,
          label: "창가의 빛과 여백",
          text: "특별한 대사 없이도 창가의 빛, 표정, 컷의 여백만으로 하루의 감정이 전해지는 장면.",
          shortDescription:
            "특별한 대사 없이도 창가의 빛, 표정, 컷의 여백만으로 하루의 감정이 전해지는 장면.",
          imageKey: "drama_q4_a2_image",
          branchScores: {},
          tagScores: {
            visual_appeal: 1,
            emotional_depth: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q4_a3",
          choiceId: "drama_q4_a3",
          choiceOrder: 3,
          label: "유쾌한 생활형",
          text: "아무렇지 않게 던진 대사 한마디와 옆 사람의 표정만으로 웃음이 터지는 장면.",
          shortDescription:
            "아무렇지 않게 던진 대사 한마디와 옆 사람의 표정만으로 웃음이 터지는 장면.",
          imageKey: "drama_q4_a3_image",
          branchScores: {
            drama_comedy_life: 1,
          },
          tagScores: {
            humor_comedy: 1,
            life_realism: 1,
            relationship_bond: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q4_a4",
          choiceId: "drama_q4_a4",
          choiceOrder: 4,
          label: "힐링 일상형",
          text: "비가 그친 저녁, 작은 동네 식당 창가에서 따뜻한 국 한 그릇 앞에 하루의 긴장이 풀리는 장면.",
          shortDescription:
            "비가 그친 저녁, 작은 동네 식당 창가에서 따뜻한 국 한 그릇 앞에 하루의 긴장이 풀리는 장면.",
          imageKey: "drama_q4_a4_image",
          branchScores: {
            drama_healing_daily: 1,
          },
          tagScores: {
            light_healing: 1,
            life_realism: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q4_a5",
          choiceId: "drama_q4_a5",
          choiceOrder: 5,
          label: "가족·관계형",
          text: "오래 서운했던 사람이 직접 말하지 못한 마음을 작은 물건 하나로 건네는 장면.",
          shortDescription:
            "오래 서운했던 사람이 직접 말하지 못한 마음을 작은 물건 하나로 건네는 장면.",
          imageKey: "drama_q4_a5_image",
          branchScores: {
            drama_family_relationship: 1,
          },
          tagScores: {
            relationship_bond: 1,
            emotional_depth: 1,
            light_healing: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionKey: "drama_q5",
      questionId: "drama_q5",
      order: 5,
      questionOrder: 5,
      questionTitle: "계속 넘기게 된 흐름",
      title: "계속 넘기게 된 흐름",
      questionText:
        "분명 한 화만 더 보려 했습니다. 그런데 어느새 계속 넘기고 있습니다. 어떤 흐름이었을까요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      cardType: "text",
      choices: [
        {
          optionKey: "drama_q5_a1",
          choiceId: "drama_q5_a1",
          choiceOrder: 1,
          label: "힐링 일상형",
          text: "큰 사건은 없지만, 카페의 아침과 동네 산책, 조용한 저녁처럼 마음이 쉬는 장면들이 이어지는 흐름.",
          shortDescription:
            "큰 사건은 없지만, 카페의 아침과 동네 산책, 조용한 저녁처럼 마음이 쉬는 장면들이 이어지는 흐름.",
          branchScores: {
            drama_healing_daily: 1,
          },
          tagScores: {
            light_healing: 1,
            life_realism: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q5_a2",
          choiceId: "drama_q5_a2",
          choiceOrder: 2,
          label: "유쾌한 생활형",
          text: "소소한 사건마다 주고받는 농담과 반응이 이어져, 가볍게 웃으며 계속 보게 되는 흐름.",
          shortDescription:
            "소소한 사건마다 주고받는 농담과 반응이 이어져, 가볍게 웃으며 계속 보게 되는 흐름.",
          branchScores: {
            drama_comedy_life: 1,
          },
          tagScores: {
            humor_comedy: 1,
            life_realism: 1,
            relationship_bond: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q5_a3",
          choiceId: "drama_q5_a3",
          choiceOrder: 3,
          label: "청춘 성장형",
          text: "실패와 망설임을 지나, 인물이 조금씩 자기 길을 찾아가는 흐름.",
          shortDescription:
            "실패와 망설임을 지나, 인물이 조금씩 자기 길을 찾아가는 흐름.",
          branchScores: {
            drama_youth_growth: 1,
          },
          tagScores: {
            growth: 1,
            emotional_depth: 1,
            life_realism: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q5_a4",
          choiceId: "drama_q5_a4",
          choiceOrder: 4,
          label: "감정 여운형",
          text: "감정이 서두르지 않고 쌓이다가, 마지막 컷에서 오래 남는 마음으로 이어지는 흐름.",
          shortDescription:
            "감정이 서두르지 않고 쌓이다가, 마지막 컷에서 오래 남는 마음으로 이어지는 흐름.",
          branchScores: {
            drama_emotional_afterglow: 1,
          },
          tagScores: {
            emotional_depth: 1,
            relationship_bond: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "drama_q5_a5",
          choiceId: "drama_q5_a5",
          choiceOrder: 5,
          label: "현실 공감형",
          text: "해결되지 않는 현실 문제를 견디며, 인물이 오늘 하루를 어떻게든 지나가는 흐름.",
          shortDescription:
            "해결되지 않는 현실 문제를 견디며, 인물이 오늘 하루를 어떻게든 지나가는 흐름.",
          branchScores: {
            drama_life_realism: 1,
          },
          tagScores: {
            life_realism: 1,
            emotional_depth: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionKey: "drama_q6",
      questionId: "drama_q6",
      order: 6,
      questionOrder: 6,
      questionTitle: "뒤로가기를 누른 이유",
      title: "뒤로가기를 누른 이유",
      questionText:
        "처음엔 더 볼 생각이 있었습니다. 그런데 어느 순간 손이 멈추고, 뒤로가기를 눌렀습니다. 어떤 이유였을까요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      cardType: "text",
      isAvoidanceQuestion: true,
      choices: [
        {
          optionKey: "drama_q6_a1",
          choiceId: "drama_q6_a1",
          choiceOrder: 1,
          label: "약한 몰입감",
          text: "너무 잔잔해서 다음 화가 궁금해지기 전에 몰입이 약해졌다.",
          shortDescription:
            "너무 잔잔해서 다음 화가 궁금해지기 전에 몰입이 약해졌다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            weak_immersion: 1,
            progression_fatigue: 1,
          },
        },
        {
          optionKey: "drama_q6_a2",
          choiceId: "drama_q6_a2",
          choiceOrder: 2,
          label: "무거운 현실감",
          text: "현실적인 문제를 계속 보고 있자니 마음이 무거워지고 피로해졌다.",
          shortDescription:
            "현실적인 문제를 계속 보고 있자니 마음이 무거워지고 피로해졌다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            heavy_tone: 1,
            tone_mismatch: 1,
          },
        },
        {
          optionKey: "drama_q6_a3",
          choiceId: "drama_q6_a3",
          choiceOrder: 3,
          label: "답답한 선택 반복",
          text: "인물이 같은 고민 앞에서 답답한 선택을 반복해서 응원하기 어려웠다.",
          shortDescription:
            "인물이 같은 고민 앞에서 답답한 선택을 반복해서 응원하기 어려웠다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            character_frustration: 1,
            progression_fatigue: 1,
          },
        },
        {
          optionKey: "drama_q6_a4",
          choiceId: "drama_q6_a4",
          choiceOrder: 4,
          label: "관계 감정 소모",
          text: "관계 갈등과 감정 소모가 길게 이어져 편하게 보기 어려웠다.",
          shortDescription:
            "관계 갈등과 감정 소모가 길게 이어져 편하게 보기 어려웠다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            relationship_stress: 1,
            heavy_tone: 1,
          },
        },
        {
          optionKey: "drama_q6_a5",
          choiceId: "drama_q6_a5",
          choiceOrder: 5,
          label: "맞지 않는 작화·연출",
          text: "작화나 연출의 분위기가 취향과 맞지 않아 감정 장면이 잘 와닿지 않았다.",
          shortDescription:
            "작화나 연출의 분위기가 취향과 맞지 않아 감정 장면이 잘 와닿지 않았다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            visual_barrier: 1,
            weak_immersion: 1,
          },
        },
      ],
    },
  ],
} satisfies DetailTestData;

export type DramaDailyTest = typeof dramaDailyTest;