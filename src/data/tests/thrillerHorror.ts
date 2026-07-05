import type { DetailTestBranch, DetailTestData } from "@/types/detailTest";

export const thrillerHorrorBranches = [
  {
    branchKey: "thriller_mystery_chaser",
    branchName: "추리·단서 추적형",
  },
  {
    branchKey: "thriller_survival_escape",
    branchName: "생존 탈출형",
  },
  {
    branchKey: "thriller_occult_uncanny",
    branchName: "오컬트·괴이형",
  },
  {
    branchKey: "thriller_crime_revenge",
    branchName: "범죄·응징형",
  },
  {
    branchKey: "thriller_psychological_tension",
    branchName: "심리 압박형",
  },
  {
    branchKey: "thriller_conspiracy_twist",
    branchName: "음모·반전형",
  },
] satisfies DetailTestBranch[];

export const thrillerHorrorTest = {
  testId: "thriller_horror_detail",
  testKey: "thriller_horror_detail",
  testName: "스릴러·공포 웹툰 취향 테스트",
  displayName: "스릴러·공포 웹툰 취향 테스트",
  genreKey: "thriller_horror",
  typeScoreKey: "thrillerTypeScores",

  route: "/tests/thriller-horror",

  questionCount: 6,
  choiceCountPerQuestion: 5,
  choiceCount: 30,
  resultCount: 6,

  version: "v0.3.2",
  testVersion: "v0.3.2",

  scoreMode: "branch_tag_avoidance",
  selectMode: "ranked_multi_select",
  maxSelect: 2,

  startTitle: "제목 없는 스릴러·공포 원고가 도착했습니다.",
  startDescription:
    "당신이 고르는 장면들이 모여\n오래 머물 긴장의 방향을 만들어갑니다.",
  startButtonText: "첫 장면 확인하기",

  intro: {
    title: "제목 없는 스릴러·공포 원고가 도착했습니다.",
    description:
      "당신이 고르는 장면들이 모여\n오래 머물 긴장의 방향을 만들어갑니다.",
    startButtonText: "첫 장면 확인하기",
  },

  rankWeights: {
    single: [{ rank: 1, weight: 1.0 }],
    double: [
      { rank: 1, weight: 0.7 },
      { rank: 2, weight: 0.3 },
    ],
  },

  tieBreakQuestionOrder: [
    "thriller_q4",
    "thriller_q5",
    "thriller_q2",
    "thriller_q3",
    "thriller_q1",
  ],

  excludeFromBranchResult: ["thriller_q6"],

  branches: thrillerHorrorBranches,

  questions: [
    {
      questionKey: "thriller_q1",
      questionId: "thriller_q1",
      order: 1,
      questionOrder: 1,
      questionTitle: "첫 페이지",
      title: "첫 페이지",
      questionText: "첫 화에서 더 끌리는 시작 장면을 골라주세요.",
      legacyQuestionText:
        "첫 장면이 열립니다. 아직 사건의 이름도, 위험의 정체도 나오지 않았지만, 이상하게 다음 컷이 불안해지는 시작이 있습니다. 첫 페이지에 그려진 장면은 무엇인가요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      cardType: "image",
      choices: [
        {
          optionKey: "thriller_q1_a1",
          choiceId: "thriller_q1_a1",
          choiceOrder: 1,
          label: "오컬트·괴이형",
          text: "낡은 사진 속 집 창문에, 찍힐 때는 없었던 얼굴 하나가 희미하게 비친다.",
          shortDescription:
            "낡은 사진 속 집 창문에, 찍힐 때는 없었던 얼굴 하나가 희미하게 비친다.",
          imageKey: "thriller_q1_a1_old_photo_window",
          branchScores: {
            thriller_occult_uncanny: 1,
          },
          tagScores: {
            world_mystery: 1,
            magic: 1,
            survival_tension: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q1_a2",
          choiceId: "thriller_q1_a2",
          choiceOrder: 2,
          label: "추리·단서 추적형",
          text: "새벽의 아파트 복도, 사라진 사람의 우산만 젖은 채 문 앞에 세워져 있다.",
          shortDescription:
            "새벽의 아파트 복도, 사라진 사람의 우산만 젖은 채 문 앞에 세워져 있다.",
          imageKey: "thriller_q1_a2_missing_umbrella",
          branchScores: {
            thriller_mystery_chaser: 1,
          },
          tagScores: {
            mystery_investigation: 1,
            world_mystery: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q1_a3",
          choiceId: "thriller_q1_a3",
          choiceOrder: 3,
          label: "심리 압박형",
          text: "가족사진에서 내가 지워진 집, 낯선 사람이 가족들과 웃고 있다.",
          shortDescription:
            "가족사진에서 내가 지워진 집, 낯선 사람이 가족들과 웃고 있다.",
          imageKey: "thriller_q1_a3_erased_family",
          branchScores: {
            thriller_psychological_tension: 1,
          },
          tagScores: {
            survival_tension: 1,
            emotional_depth: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q1_a4",
          choiceId: "thriller_q1_a4",
          choiceOrder: 4,
          label: "생존 탈출형",
          text: "불 꺼진 지하 주차장, 출입문이 잠기고 안내 방송은 남은 시간을 반복한다.",
          shortDescription:
            "불 꺼진 지하 주차장, 출입문이 잠기고 안내 방송은 남은 시간을 반복한다.",
          imageKey: "thriller_q1_a4_locked_parking_exit",
          branchScores: {
            thriller_survival_escape: 1,
          },
          tagScores: {
            survival_tension: 1,
            action_catharsis: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q1_a5",
          choiceId: "thriller_q1_a5",
          choiceOrder: 5,
          label: "음모·반전형",
          text: "서로 다른 사건처럼 보였던 사진들이, 뒤집어 보자 하나의 큰 그림으로 맞물린다.",
          shortDescription:
            "서로 다른 사건처럼 보였던 사진들이, 뒤집어 보자 하나의 큰 그림으로 맞물린다.",
          imageKey: "thriller_q1_a5_hidden_symbol_photos",
          branchScores: {
            thriller_conspiracy_twist: 1,
          },
          tagScores: {
            world_mystery: 1,
            mystery_investigation: 1,
            strategy_powerplay: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionKey: "thriller_q2",
      questionId: "thriller_q2",
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
          optionKey: "thriller_q2_a1",
          choiceId: "thriller_q2_a1",
          choiceOrder: 1,
          label: "심리 압박형",
          text: "사람들의 말보다 숨기는 감정과 미묘한 반응을 더 예민하게 살피는 사람.",
          shortDescription:
            "사람들의 말보다 숨기는 감정과 미묘한 반응을 더 예민하게 살피는 사람.",
          branchScores: {
            thriller_psychological_tension: 1,
          },
          tagScores: {
            survival_tension: 1,
            emotional_depth: 1,
            relationship_bond: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q2_a2",
          choiceId: "thriller_q2_a2",
          choiceOrder: 2,
          label: "범죄·응징형",
          text: "피해자가 남긴 작은 흔적을 따라, 끝까지 가해자의 얼굴을 찾아가는 사람.",
          shortDescription:
            "피해자가 남긴 작은 흔적을 따라, 끝까지 가해자의 얼굴을 찾아가는 사람.",
          branchScores: {
            thriller_crime_revenge: 1,
          },
          tagScores: {
            revenge: 1,
            mystery_investigation: 1,
            action_catharsis: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q2_a3",
          choiceId: "thriller_q2_a3",
          choiceOrder: 3,
          label: "생존 탈출형",
          text: "겁이 나도 멈추지 않고, 닫힌 공간에서 빠져나갈 길부터 찾는 사람.",
          shortDescription:
            "겁이 나도 멈추지 않고, 닫힌 공간에서 빠져나갈 길부터 찾는 사람.",
          branchScores: {
            thriller_survival_escape: 1,
          },
          tagScores: {
            survival_tension: 1,
            action_catharsis: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q2_a4",
          choiceId: "thriller_q2_a4",
          choiceOrder: 4,
          label: "음모·반전형",
          text: "눈앞의 사건보다, 누가 이 상황을 만들었는지를 먼저 의심하는 사람.",
          shortDescription:
            "눈앞의 사건보다, 누가 이 상황을 만들었는지를 먼저 의심하는 사람.",
          branchScores: {
            thriller_conspiracy_twist: 1,
          },
          tagScores: {
            world_mystery: 1,
            mystery_investigation: 1,
            strategy_powerplay: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q2_a5",
          choiceId: "thriller_q2_a5",
          choiceOrder: 5,
          label: "추리·단서 추적형",
          text: "모두가 지나친 말 속의 모순을 눈치채고 끝까지 기억해 두는 사람.",
          shortDescription:
            "모두가 지나친 말 속의 모순을 눈치채고 끝까지 기억해 두는 사람.",
          branchScores: {
            thriller_mystery_chaser: 1,
          },
          tagScores: {
            mystery_investigation: 1,
            strategy_powerplay: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionKey: "thriller_q3",
      questionId: "thriller_q3",
      order: 3,
      questionOrder: 3,
      questionTitle: "다가오는 사건",
      title: "다가오는 사건",
      questionText:
        "첫 화의 중반, 평온해 보이던 장면에 균열이 생깁니다. 어떤 사건이 다가오고 있나요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      cardType: "text",
      choices: [
        {
          optionKey: "thriller_q3_a1",
          choiceId: "thriller_q3_a1",
          choiceOrder: 1,
          label: "음모·반전형",
          text: "사건을 기록한 파일들이 누군가에 의해 같은 방식으로 고쳐져 있었다.",
          shortDescription:
            "사건을 기록한 파일들이 누군가에 의해 같은 방식으로 고쳐져 있었다.",
          branchScores: {
            thriller_conspiracy_twist: 1,
          },
          tagScores: {
            world_mystery: 1,
            mystery_investigation: 1,
            strategy_powerplay: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q3_a2",
          choiceId: "thriller_q3_a2",
          choiceOrder: 2,
          label: "심리 압박형",
          text: "주인공이 분명히 본 장면을, 가까운 사람들이 하나같이 없었던 일처럼 말하기 시작한다.",
          shortDescription:
            "주인공이 분명히 본 장면을, 가까운 사람들이 하나같이 없었던 일처럼 말하기 시작한다.",
          branchScores: {
            thriller_psychological_tension: 1,
          },
          tagScores: {
            survival_tension: 1,
            emotional_depth: 1,
            relationship_bond: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q3_a3",
          choiceId: "thriller_q3_a3",
          choiceOrder: 3,
          label: "추리·단서 추적형",
          text: "별것 아닌 영수증 한 장이, 몇 년 전 실종 사건의 동선과 맞물리기 시작한다.",
          shortDescription:
            "별것 아닌 영수증 한 장이, 몇 년 전 실종 사건의 동선과 맞물리기 시작한다.",
          branchScores: {
            thriller_mystery_chaser: 1,
          },
          tagScores: {
            mystery_investigation: 1,
            world_mystery: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q3_a4",
          choiceId: "thriller_q3_a4",
          choiceOrder: 4,
          label: "오컬트·괴이형",
          text: "같은 시간마다 벽 너머에서 들리던 소리가, 이번에는 주인공의 이름을 또렷하게 부른다.",
          shortDescription:
            "같은 시간마다 벽 너머에서 들리던 소리가, 이번에는 주인공의 이름을 또렷하게 부른다.",
          branchScores: {
            thriller_occult_uncanny: 1,
          },
          tagScores: {
            world_mystery: 1,
            magic: 1,
            survival_tension: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q3_a5",
          choiceId: "thriller_q3_a5",
          choiceOrder: 5,
          label: "범죄·응징형",
          text: "사라진 피해자의 휴대폰에서, 가해자가 아직 가까이에 있다는 흔적이 발견된다.",
          shortDescription:
            "사라진 피해자의 휴대폰에서, 가해자가 아직 가까이에 있다는 흔적이 발견된다.",
          branchScores: {
            thriller_crime_revenge: 1,
          },
          tagScores: {
            revenge: 1,
            mystery_investigation: 1,
            survival_tension: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionKey: "thriller_q4",
      questionId: "thriller_q4",
      order: 4,
      questionOrder: 4,
      questionTitle: "기억에 남는 장면",
      title: "기억에 남는 장면",
      questionText:
        "이야기를 넘기던 중, 한 장면이 오래 머릿속에 남습니다. 어떤 장면이면 가장 오래 기억에 남을까요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      cardType: "image",
      choices: [
        {
          optionKey: "thriller_q4_a1",
          choiceId: "thriller_q4_a1",
          choiceOrder: 1,
          label: "불안한 복도 연출",
          text: "아무 일도 일어나지 않았는데, 어두운 복도와 멈춘 시선만으로 불안이 전해지는 장면.",
          shortDescription:
            "아무 일도 일어나지 않았는데, 어두운 복도와 멈춘 시선만으로 불안이 전해지는 장면.",
          imageKey: "thriller_q4_a1_image",
          branchScores: {},
          tagScores: {
            visual_appeal: 1,
            survival_tension: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q4_a2",
          choiceId: "thriller_q4_a2",
          choiceOrder: 2,
          label: "긴 침묵의 심리 압박",
          text: "평범한 대화가 이어지는데, 눈을 피하는 순간과 긴 침묵이 더 무섭게 남는 장면.",
          shortDescription:
            "평범한 대화가 이어지는데, 눈을 피하는 순간과 긴 침묵이 더 무섭게 남는 장면.",
          imageKey: "thriller_q4_a2_image",
          branchScores: {
            thriller_psychological_tension: 1,
          },
          tagScores: {
            survival_tension: 1,
            emotional_depth: 1,
            relationship_bond: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q4_a3",
          choiceId: "thriller_q4_a3",
          choiceOrder: 3,
          label: "생존 탈출형",
          text: "불 꺼진 지하 주차장, 떨어진 손전등과 열쇠를 뒤로한 채 출구를 향해 달린다.",
          shortDescription:
            "불 꺼진 지하 주차장, 떨어진 손전등과 열쇠를 뒤로한 채 출구를 향해 달린다.",
          imageKey: "thriller_q4_a3_image",
          branchScores: {
            thriller_survival_escape: 1,
          },
          tagScores: {
            survival_tension: 1,
            action_catharsis: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q4_a4",
          choiceId: "thriller_q4_a4",
          choiceOrder: 4,
          label: "마지막 표식과 복수 방향",
          text: "피해자가 남긴 마지막 표식이, 주인공의 복수 방향을 조용히 정하는 장면.",
          shortDescription:
            "피해자가 남긴 마지막 표식이, 주인공의 복수 방향을 조용히 정하는 장면.",
          imageKey: "thriller_q4_a4_image",
          branchScores: {
            thriller_crime_revenge: 1,
          },
          tagScores: {
            revenge: 1,
            mystery_investigation: 1,
            emotional_depth: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q4_a5",
          choiceId: "thriller_q4_a5",
          choiceOrder: 5,
          label: "거울 속 어긋난 배경",
          text: "거울 속 배경만 한 박자 늦게 움직이고, 방 안의 공기가 달라지는 장면.",
          shortDescription:
            "거울 속 배경만 한 박자 늦게 움직이고, 방 안의 공기가 달라지는 장면.",
          imageKey: "thriller_q4_a5_image",
          branchScores: {
            thriller_occult_uncanny: 1,
          },
          tagScores: {
            world_mystery: 1,
            magic: 1,
            survival_tension: 1,
            visual_appeal: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionKey: "thriller_q5",
      questionId: "thriller_q5",
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
          optionKey: "thriller_q5_a1",
          choiceId: "thriller_q5_a1",
          choiceOrder: 1,
          label: "범죄·응징형",
          text: "피해자의 흔적을 따라갈수록, 가해자를 향한 추적과 반격이 선명해지는 흐름.",
          shortDescription:
            "피해자의 흔적을 따라갈수록, 가해자를 향한 추적과 반격이 선명해지는 흐름.",
          branchScores: {
            thriller_crime_revenge: 1,
          },
          tagScores: {
            revenge: 1,
            mystery_investigation: 1,
            action_catharsis: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q5_a2",
          choiceId: "thriller_q5_a2",
          choiceOrder: 2,
          label: "음모·반전형",
          text: "처음 본 장면의 의미가 뒤집히고, 사건 뒤의 더 큰 판이 드러나는 흐름.",
          shortDescription:
            "처음 본 장면의 의미가 뒤집히고, 사건 뒤의 더 큰 판이 드러나는 흐름.",
          branchScores: {
            thriller_conspiracy_twist: 1,
          },
          tagScores: {
            world_mystery: 1,
            mystery_investigation: 1,
            strategy_powerplay: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q5_a3",
          choiceId: "thriller_q5_a3",
          choiceOrder: 3,
          label: "생존 탈출형",
          text: "숨을 곳은 줄어들고, 열 수 있는 문도 하나씩 사라지는 흐름.",
          shortDescription:
            "숨을 곳은 줄어들고, 열 수 있는 문도 하나씩 사라지는 흐름.",
          branchScores: {
            thriller_survival_escape: 1,
          },
          tagScores: {
            survival_tension: 1,
            action_catharsis: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q5_a4",
          choiceId: "thriller_q5_a4",
          choiceOrder: 4,
          label: "추리·단서 추적형",
          text: "흩어진 단서들이 하나씩 맞물리고, 사라진 밤의 동선이 조금씩 드러나는 흐름.",
          shortDescription:
            "흩어진 단서들이 하나씩 맞물리고, 사라진 밤의 동선이 조금씩 드러나는 흐름.",
          branchScores: {
            thriller_mystery_chaser: 1,
          },
          tagScores: {
            mystery_investigation: 1,
            world_mystery: 1,
            strategy_powerplay: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "thriller_q5_a5",
          choiceId: "thriller_q5_a5",
          choiceOrder: 5,
          label: "오컬트·괴이형",
          text: "처음엔 괴담처럼 들렸던 말들이, 실제 장면으로 하나씩 되돌아오는 흐름.",
          shortDescription:
            "처음엔 괴담처럼 들렸던 말들이, 실제 장면으로 하나씩 되돌아오는 흐름.",
          branchScores: {
            thriller_occult_uncanny: 1,
          },
          tagScores: {
            world_mystery: 1,
            magic: 1,
            survival_tension: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionKey: "thriller_q6",
      questionId: "thriller_q6",
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
          optionKey: "thriller_q6_a1",
          choiceId: "thriller_q6_a1",
          choiceOrder: 1,
          label: "무거운 분위기",
          text: "분위기가 너무 무겁고 피로해서 계속 보기 어려웠다.",
          shortDescription:
            "분위기가 너무 무겁고 피로해서 계속 보기 어려웠다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            heavy_tone: 1,
            progression_fatigue: 1,
          },
        },
        {
          optionKey: "thriller_q6_a2",
          choiceId: "thriller_q6_a2",
          choiceOrder: 2,
          label: "설정 진입장벽",
          text: "단서보다 설정과 인물 관계가 복잡하게 쏟아져 초반에 따라가기 어려웠다.",
          shortDescription:
            "단서보다 설정과 인물 관계가 복잡하게 쏟아져 초반에 따라가기 어려웠다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            entry_barrier: 1,
            weak_immersion: 1,
          },
        },
        {
          optionKey: "thriller_q6_a3",
          choiceId: "thriller_q6_a3",
          choiceOrder: 3,
          label: "잔혹한 장면",
          text: "잔혹하거나 혐오스러운 장면이 예상보다 부담스러웠다.",
          shortDescription:
            "잔혹하거나 혐오스러운 장면이 예상보다 부담스러웠다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            graphic_intensity: 1,
            visual_barrier: 1,
          },
        },
        {
          optionKey: "thriller_q6_a4",
          choiceId: "thriller_q6_a4",
          choiceOrder: 4,
          label: "답답한 선택",
          text: "인물이 위험을 알면서도 답답한 선택을 반복해서 몰입이 깨졌다.",
          shortDescription:
            "인물이 위험을 알면서도 답답한 선택을 반복해서 몰입이 깨졌다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            character_frustration: 1,
            progression_fatigue: 1,
          },
        },
        {
          optionKey: "thriller_q6_a5",
          choiceId: "thriller_q6_a5",
          choiceOrder: 5,
          label: "결말 불안",
          text: "끝까지 따라가도 결말이 흐지부지될 것 같아 불안했다.",
          shortDescription:
            "끝까지 따라가도 결말이 흐지부지될 것 같아 불안했다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            ending_risk: 1,
            weak_immersion: 1,
          },
        },
      ],
    },
  ],
} satisfies DetailTestData;

export type ThrillerHorrorTest = typeof thrillerHorrorTest;