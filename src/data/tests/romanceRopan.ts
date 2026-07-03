export const romanceRopanTest = {
  testKey: "romance_ropan_detail",
  testName: "로맨스·로판 웹툰 취향 테스트",
  displayName: "로맨스·로판 웹툰 취향 테스트",
  genreKey: "romance_ropan",
  typeScoreKey: "romanceTypeScores",

  route: "/tests/romance-ropan",

  questionCount: 6,
  choiceCount: 30,
  resultCount: 6,

  scoreMode: "branch_tag_avoidance",
  selectMode: "ranked_multi_select",
  maxSelect: 2,

  version: "v0.2",
  testVersion: "v0.2",

  rankWeights: {
    single: [{ rank: 1, weight: 1.0 }],
    double: [
      { rank: 1, weight: 0.7 },
      { rank: 2, weight: 0.3 },
    ],
  },

  tieBreakQuestionOrder: [
    "romance_q4",
    "romance_q5",
    "romance_q2",
    "romance_q3",
    "romance_q1",
  ],

  excludeFromBranchResult: ["romance_q6"],

  branches: [
    {
      branchKey: "romance_contract_possession",
      branchName: "계약·빙의 설정형",
    },
    {
      branchKey: "romance_power_reversal",
      branchName: "주도권 역전형",
    },
    {
      branchKey: "romance_emotional_growth",
      branchName: "감정선 성장형",
    },
    {
      branchKey: "romance_court_politics",
      branchName: "궁정·가문 권력형",
    },
    {
      branchKey: "romance_direct_chemistry",
      branchName: "직진 케미형",
    },
    {
      branchKey: "romance_healing_companion",
      branchName: "힐링 동행형",
    },
  ],

  questions: [
    {
      questionKey: "romance_q1",
      questionId: "romance_q1",
      questionOrder: 1,
      title: "첫 페이지",
      questionTitle: "첫 페이지",
      questionText: "첫 화에서 더 끌리는 시작 장면을 골라주세요.",
      legacyQuestionText:
        "첫 장면이 열립니다. 아직 주인공의 이름도, 이 관계가 시작된 이유도 나오지 않았지만, 이상하게 다음 컷이 궁금해지는 시작이 있습니다. 첫 페이지에 그려진 장면은 무엇인가요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      options: [
        {
          optionKey: "romance_q1_a1",
          choiceId: "romance_q1_a1",
          choiceOrder: 1,
          label: "궁정·가문 권력형",
          text: "왕궁 회의장 위, 혼인 명단에 적힌 이름 하나가 가문들의 표정을 바꾼다.",
          shortDescription:
            "왕궁 회의장 위, 혼인 명단에 적힌 이름 하나가 가문들의 표정을 바꾼다.",
          branchScores: {
            romance_court_politics: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            world_mystery: 1,
            relationship_bond: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
          imageKey: "romance_q1_a1_image",
        },
        {
          optionKey: "romance_q1_a2",
          choiceId: "romance_q1_a2",
          choiceOrder: 2,
          label: "계약·빙의 설정형",
          text: "눈을 뜨자, 낯선 방의 책상 위에 혼인계약서가 놓여 있고 누군가가 주인공을 공작부인이라 부른다.",
          shortDescription:
            "눈을 뜨자, 낯선 방의 책상 위에 혼인계약서가 놓여 있고 누군가가 주인공을 공작부인이라 부른다.",
          branchScores: {
            romance_contract_possession: 1,
          },
          tagScores: {
            second_chance: 1,
            romance_chemistry: 1,
            world_mystery: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
          imageKey: "romance_q1_a2_image",
        },
        {
          optionKey: "romance_q1_a3",
          choiceId: "romance_q1_a3",
          choiceOrder: 3,
          label: "힐링 동행형",
          text: "작은 저택의 부엌, 말없이 건넨 따뜻한 차 한 잔에 얼어 있던 공기가 조금 풀린다.",
          shortDescription:
            "작은 저택의 부엌, 말없이 건넨 따뜻한 차 한 잔에 얼어 있던 공기가 조금 풀린다.",
          branchScores: {
            romance_healing_companion: 1,
          },
          tagScores: {
            light_healing: 1,
            emotional_depth: 1,
            relationship_bond: 1,
            life_realism: 1,
          },
          avoidanceTagScores: {},
          imageKey: "romance_q1_a3_image",
        },
        {
          optionKey: "romance_q1_a4",
          choiceId: "romance_q1_a4",
          choiceOrder: 4,
          label: "주도권 역전형",
          text: "연회장 한가운데, 늘 주인공을 내려다보던 사람이 처음으로 그녀의 대답을 기다린다.",
          shortDescription:
            "연회장 한가운데, 늘 주인공을 내려다보던 사람이 처음으로 그녀의 대답을 기다린다.",
          branchScores: {
            romance_power_reversal: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            romance_chemistry: 1,
            emotional_depth: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
          imageKey: "romance_q1_a4_image",
        },
        {
          optionKey: "romance_q1_a5",
          choiceId: "romance_q1_a5",
          choiceOrder: 5,
          label: "감정선 성장형",
          text: "비가 그친 정원에서, 서로에게 등을 돌린 두 사람이 같은 상처를 바라보고 선다.",
          shortDescription:
            "비가 그친 정원에서, 서로에게 등을 돌린 두 사람이 같은 상처를 바라보고 선다.",
          branchScores: {
            romance_emotional_growth: 1,
          },
          tagScores: {
            emotional_depth: 1,
            relationship_bond: 1,
            romance_chemistry: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
          imageKey: "romance_q1_a5_image",
        },
      ],
    },

    {
      questionKey: "romance_q2",
      questionId: "romance_q2",
      questionOrder: 2,
      title: "모습을 드러낸 인물",
      questionTitle: "모습을 드러낸 인물",
      questionText: "더 따라가고 싶은 인물을 골라주세요.",
      legacyQuestionText:
        "몇 컷 뒤, 카메라는 이야기의 중심에 설 인물을 따라가기 시작합니다. 이 인물은 어떤 사람인가요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      options: [
        {
          optionKey: "romance_q2_a1",
          choiceId: "romance_q2_a1",
          choiceOrder: 1,
          label: "직진 케미형",
          text: "망설이는 대신 먼저 다가가고, 어색한 침묵도 가벼운 농담으로 풀어내는 사람.",
          shortDescription:
            "망설이는 대신 먼저 다가가고, 어색한 침묵도 가벼운 농담으로 풀어내는 사람.",
          branchScores: {
            romance_direct_chemistry: 1,
          },
          tagScores: {
            romance_chemistry: 1,
            humor_comedy: 1,
            relationship_bond: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q2_a2",
          choiceId: "romance_q2_a2",
          choiceOrder: 2,
          label: "감정선 성장형",
          text: "상처를 들키지 않으려 애쓰지만, 누군가의 작은 다정함에는 오래 흔들리는 사람.",
          shortDescription:
            "상처를 들키지 않으려 애쓰지만, 누군가의 작은 다정함에는 오래 흔들리는 사람.",
          branchScores: {
            romance_emotional_growth: 1,
          },
          tagScores: {
            emotional_depth: 1,
            relationship_bond: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q2_a3",
          choiceId: "romance_q2_a3",
          choiceOrder: 3,
          label: "계약·빙의 설정형",
          text: "자신이 들어온 이야기의 결말을 알고, 계약 결혼이 시작되는 순간부터 다른 선택을 하는 사람.",
          shortDescription:
            "자신이 들어온 이야기의 결말을 알고, 계약 결혼이 시작되는 순간부터 다른 선택을 하는 사람.",
          branchScores: {
            romance_contract_possession: 1,
          },
          tagScores: {
            second_chance: 1,
            strategy_powerplay: 1,
            world_mystery: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q2_a4",
          choiceId: "romance_q2_a4",
          choiceOrder: 4,
          label: "힐링 동행형",
          text: "누군가의 아픈 마음을 서두르지 않고, 곁에서 천천히 기다려주는 사람.",
          shortDescription:
            "누군가의 아픈 마음을 서두르지 않고, 곁에서 천천히 기다려주는 사람.",
          branchScores: {
            romance_healing_companion: 1,
          },
          tagScores: {
            light_healing: 1,
            emotional_depth: 1,
            relationship_bond: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q2_a5",
          choiceId: "romance_q2_a5",
          choiceOrder: 5,
          label: "주도권 역전형",
          text: "밀려난 자리에서도 웃음을 잃지 않고, 상대의 다음 수를 조용히 읽는 사람.",
          shortDescription:
            "밀려난 자리에서도 웃음을 잃지 않고, 상대의 다음 수를 조용히 읽는 사람.",
          branchScores: {
            romance_power_reversal: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            emotional_depth: 1,
            romance_chemistry: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },

    {
      questionKey: "romance_q3",
      questionId: "romance_q3",
      questionOrder: 3,
      title: "다가오는 사건",
      questionTitle: "다가오는 사건",
      questionText: "더 보고 싶은 사건 전개를 골라주세요.",
      legacyQuestionText:
        "첫 화의 중반, 평온해 보이던 관계와 구도가 갑자기 흔들립니다. 어떤 사건이 다가오고 있나요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      options: [
        {
          optionKey: "romance_q3_a1",
          choiceId: "romance_q3_a1",
          choiceOrder: 1,
          label: "주도권 역전형",
          text: "늘 명령하던 사람이 처음으로 주인공의 도움을 구하며 손을 내민다.",
          shortDescription:
            "늘 명령하던 사람이 처음으로 주인공의 도움을 구하며 손을 내민다.",
          branchScores: {
            romance_power_reversal: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            romance_chemistry: 1,
            emotional_depth: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q3_a2",
          choiceId: "romance_q3_a2",
          choiceOrder: 2,
          label: "궁정·가문 권력형",
          text: "가문을 흔드는 소문이 퍼지고, 약혼 하나가 왕궁의 판세를 바꾸기 시작한다.",
          shortDescription:
            "가문을 흔드는 소문이 퍼지고, 약혼 하나가 왕궁의 판세를 바꾸기 시작한다.",
          branchScores: {
            romance_court_politics: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            world_mystery: 1,
            relationship_bond: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q3_a3",
          choiceId: "romance_q3_a3",
          choiceOrder: 3,
          label: "직진 케미형",
          text: "모두가 보는 앞에서, 상대가 더는 마음을 숨기지 않겠다고 말한다.",
          shortDescription:
            "모두가 보는 앞에서, 상대가 더는 마음을 숨기지 않겠다고 말한다.",
          branchScores: {
            romance_direct_chemistry: 1,
          },
          tagScores: {
            romance_chemistry: 1,
            relationship_bond: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q3_a4",
          choiceId: "romance_q3_a4",
          choiceOrder: 4,
          label: "감정선 성장형",
          text: "오해로 멀어졌던 두 사람이, 같은 상처의 진실을 마주하게 된다.",
          shortDescription:
            "오해로 멀어졌던 두 사람이, 같은 상처의 진실을 마주하게 된다.",
          branchScores: {
            romance_emotional_growth: 1,
          },
          tagScores: {
            emotional_depth: 1,
            relationship_bond: 1,
            romance_chemistry: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q3_a5",
          choiceId: "romance_q3_a5",
          choiceOrder: 5,
          label: "계약·빙의 설정형",
          text: "혼인 계약으로 묶인 두 사람이, 처음부터 함께 숨겨야 할 비밀을 떠안게 된다.",
          shortDescription:
            "혼인 계약으로 묶인 두 사람이, 처음부터 함께 숨겨야 할 비밀을 떠안게 된다.",
          branchScores: {
            romance_contract_possession: 1,
          },
          tagScores: {
            romance_chemistry: 1,
            strategy_powerplay: 1,
            world_mystery: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },

    {
      questionKey: "romance_q4",
      questionId: "romance_q4",
      questionOrder: 4,
      title: "기억에 남는 장면",
      questionTitle: "기억에 남는 장면",
      questionText: "볼 때 더 중요하게 느끼는 연출을 골라주세요.",
      legacyQuestionText:
        "이야기를 넘기던 중, 한 장면이 오래 눈에 남습니다. 어떤 장면이면 가장 오래 기억에 남을까요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      options: [
        {
          optionKey: "romance_q4_a1",
          choiceId: "romance_q4_a1",
          choiceOrder: 1,
          label: "감정 전달 연출",
          text: "대사 없이도 눈빛과 구도만으로 두 사람 사이의 감정이 전해지는 장면.",
          shortDescription:
            "대사 없이도 눈빛과 구도만으로 두 사람 사이의 감정이 전해지는 장면.",
          branchScores: {},
          tagScores: {
            visual_appeal: 1,
            emotional_depth: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q4_a2",
          choiceId: "romance_q4_a2",
          choiceOrder: 2,
          label: "힐링 동행형",
          text: "지친 하루 끝, 아무 말 없이 옆자리를 비워두고 기다려주는 장면.",
          shortDescription:
            "지친 하루 끝, 아무 말 없이 옆자리를 비워두고 기다려주는 장면.",
          branchScores: {
            romance_healing_companion: 1,
          },
          tagScores: {
            light_healing: 1,
            emotional_depth: 1,
            relationship_bond: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q4_a3",
          choiceId: "romance_q4_a3",
          choiceOrder: 3,
          label: "궁정·가문 권력형",
          text: "짧은 초대장 한 장이 도착하자, 연회장의 미소들이 전부 계산적으로 보이는 장면.",
          shortDescription:
            "짧은 초대장 한 장이 도착하자, 연회장의 미소들이 전부 계산적으로 보이는 장면.",
          branchScores: {
            romance_court_politics: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            world_mystery: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q4_a4",
          choiceId: "romance_q4_a4",
          choiceOrder: 4,
          label: "주도권 역전형",
          text: "늘 주도권을 쥐던 사람이 처음으로 대답을 기다리고, 주인공이 한 걸음 물러서는 장면.",
          shortDescription:
            "늘 주도권을 쥐던 사람이 처음으로 대답을 기다리고, 주인공이 한 걸음 물러서는 장면.",
          branchScores: {
            romance_power_reversal: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            emotional_depth: 1,
            romance_chemistry: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q4_a5",
          choiceId: "romance_q4_a5",
          choiceOrder: 5,
          label: "직진 케미형",
          text: "참다못한 사람이 손목을 잡는 대신, 눈을 맞추고 솔직하게 마음을 말하는 장면.",
          shortDescription:
            "참다못한 사람이 손목을 잡는 대신, 눈을 맞추고 솔직하게 마음을 말하는 장면.",
          branchScores: {
            romance_direct_chemistry: 1,
          },
          tagScores: {
            romance_chemistry: 1,
            relationship_bond: 1,
            emotional_depth: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },

    {
      questionKey: "romance_q5",
      questionId: "romance_q5",
      questionOrder: 5,
      title: "계속 넘기게 된 흐름",
      questionTitle: "계속 넘기게 된 흐름",
      questionText: "다음 화까지 보고 싶게 만드는 흐름을 골라주세요.",
      legacyQuestionText:
        "분명 한 화만 더 보려 했습니다. 그런데 어느새 계속 넘기고 있습니다. 어떤 흐름이었을까요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      options: [
        {
          optionKey: "romance_q5_a1",
          choiceId: "romance_q5_a1",
          choiceOrder: 1,
          label: "계약·빙의 설정형",
          text: "형식뿐인 계약 결혼이, 함께 지키는 비밀과 작은 예외들 때문에 진심에 가까워지는 흐름.",
          shortDescription:
            "형식뿐인 계약 결혼이, 함께 지키는 비밀과 작은 예외들 때문에 진심에 가까워지는 흐름.",
          branchScores: {
            romance_contract_possession: 1,
          },
          tagScores: {
            second_chance: 1,
            romance_chemistry: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q5_a2",
          choiceId: "romance_q5_a2",
          choiceOrder: 2,
          label: "감정선 성장형",
          text: "감정이 급하게 폭발하기보다, 오해가 풀릴 때마다 조금씩 깊어지는 흐름.",
          shortDescription:
            "감정이 급하게 폭발하기보다, 오해가 풀릴 때마다 조금씩 깊어지는 흐름.",
          branchScores: {
            romance_emotional_growth: 1,
          },
          tagScores: {
            emotional_depth: 1,
            relationship_bond: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q5_a3",
          choiceId: "romance_q5_a3",
          choiceOrder: 3,
          label: "궁정·가문 권력형",
          text: "연회, 서신, 가문 회의가 이어지며 누가 누구의 편인지 조금씩 드러나는 흐름.",
          shortDescription:
            "연회, 서신, 가문 회의가 이어지며 누가 누구의 편인지 조금씩 드러나는 흐름.",
          branchScores: {
            romance_court_politics: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            world_mystery: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q5_a4",
          choiceId: "romance_q5_a4",
          choiceOrder: 4,
          label: "직진 케미형",
          text: "가벼운 농담과 직진이 이어지고, 한 장면마다 두 사람의 거리가 가까워지는 흐름.",
          shortDescription:
            "가벼운 농담과 직진이 이어지고, 한 장면마다 두 사람의 거리가 가까워지는 흐름.",
          branchScores: {
            romance_direct_chemistry: 1,
          },
          tagScores: {
            romance_chemistry: 1,
            humor_comedy: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "romance_q5_a5",
          choiceId: "romance_q5_a5",
          choiceOrder: 5,
          label: "힐링 동행형",
          text: "작은 일상을 함께 보내며, 서로의 상처가 천천히 편안해지는 흐름.",
          shortDescription:
            "작은 일상을 함께 보내며, 서로의 상처가 천천히 편안해지는 흐름.",
          branchScores: {
            romance_healing_companion: 1,
          },
          tagScores: {
            light_healing: 1,
            emotional_depth: 1,
            relationship_bond: 1,
            life_realism: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },

    {
      questionKey: "romance_q6",
      questionId: "romance_q6",
      questionOrder: 6,
      title: "뒤로가기를 누른 이유",
      questionTitle: "뒤로가기를 누른 이유",
      questionText: "덜 보고 싶은 부담 요소를 골라주세요.",
      legacyQuestionText:
        "처음엔 더 볼 생각이 있었습니다. 그런데 어느 순간 손이 멈추고, 뒤로가기를 눌렀습니다. 어떤 이유였을까요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      isAvoidanceQuestion: true,
      options: [
        {
          optionKey: "romance_q6_a1",
          choiceId: "romance_q6_a1",
          choiceOrder: 1,
          label: "감정 소모",
          text: "오해와 질투, 삼각관계가 길게 이어져 감정 소모가 피로했다.",
          shortDescription:
            "오해와 질투, 삼각관계가 길게 이어져 감정 소모가 피로했다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            relationship_stress: 1,
            progression_fatigue: 1,
          },
        },
        {
          optionKey: "romance_q6_a2",
          choiceId: "romance_q6_a2",
          choiceOrder: 2,
          label: "진입 장벽",
          text: "가문 이름과 설정, 인물 관계가 한꺼번에 쏟아져 초반에 따라가기 어려웠다.",
          shortDescription:
            "가문 이름과 설정, 인물 관계가 한꺼번에 쏟아져 초반에 따라가기 어려웠다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            entry_barrier: 1,
            weak_immersion: 1,
          },
        },
        {
          optionKey: "romance_q6_a3",
          choiceId: "romance_q6_a3",
          choiceOrder: 3,
          label: "답답한 반복",
          text: "주인공이나 상대가 같은 실수와 답답한 선택을 반복해서 응원하기 힘들었다.",
          shortDescription:
            "주인공이나 상대가 같은 실수와 답답한 선택을 반복해서 응원하기 힘들었다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            character_frustration: 1,
            progression_fatigue: 1,
          },
        },
        {
          optionKey: "romance_q6_a4",
          choiceId: "romance_q6_a4",
          choiceOrder: 4,
          label: "무거운 분위기",
          text: "기대한 설렘보다 분위기가 너무 무겁고 피로해서 로맨스에 몰입하기 어려웠다.",
          shortDescription:
            "기대한 설렘보다 분위기가 너무 무겁고 피로해서 로맨스에 몰입하기 어려웠다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            heavy_tone: 1,
            tone_mismatch: 1,
          },
        },
        {
          optionKey: "romance_q6_a5",
          choiceId: "romance_q6_a5",
          choiceOrder: 5,
          label: "작화 장벽",
          text: "작화, 표정, 의상 연출이 취향과 맞지 않아 감정 장면이 잘 와닿지 않았다.",
          shortDescription:
            "작화, 표정, 의상 연출이 취향과 맞지 않아 감정 장면이 잘 와닿지 않았다.",
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
};

export type RomanceRopanTest = typeof romanceRopanTest;