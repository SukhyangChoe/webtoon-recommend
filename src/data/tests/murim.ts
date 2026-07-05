import type { DetailTestBranch, DetailTestData } from "@/types/detailTest";

export const murimBranches = [
  {
    branchKey: "murim_growth_training",
    branchName: "초식 수련자",
  },
  {
    branchKey: "murim_absolute_power",
    branchName: "천하 군림자",
  },
  {
    branchKey: "murim_revenge_recovery",
    branchName: "몰락한 후계자",
  },
  {
    branchKey: "murim_sect_politics",
    branchName: "강호 책략가",
  },
  {
    branchKey: "murim_wanderer_justice",
    branchName: "길 위의 협객",
  },
] satisfies DetailTestBranch[];

export const murimTest = {
  testId: "murim_detail",
  testKey: "murim_detail",
  testName: "무협 웹툰 취향 테스트",
  displayName: "무협 웹툰 취향 테스트",
  genreKey: "murim",
  typeScoreKey: "murimTypeScores",

  route: "/tests/murim",

  questionCount: 6,
  choiceCountPerQuestion: 5,
  choiceCount: 30,
  resultCount: 5,

  version: "v0.5",
  testVersion: "v0.5",

  scoreMode: "branch_tag_avoidance",
  selectMode: "ranked_multi_select",
  maxSelect: 2,

  startTitle: "낡은 강호의 기록 한 권이 펼쳐졌습니다.",
  startDescription:
    "당신이 고르는 장면들이 모여\n이 강호에서 오래 머물 이야기를 만들어갑니다.",
  startButtonText: "강호의 첫 장 넘기기",

  intro: {
    title: "낡은 강호의 기록 한 권이 펼쳐졌습니다.",
    description:
      "당신이 고르는 장면들이 모여\n이 강호에서 오래 머물 이야기를 만들어갑니다.",
    startButtonText: "강호의 첫 장 넘기기",
  },

  rankWeights: {
    single: [{ rank: 1, weight: 1.0 }],
    double: [
      { rank: 1, weight: 0.7 },
      { rank: 2, weight: 0.3 },
    ],
  },

  tieBreakQuestionOrder: [
    "murim_q4",
    "murim_q5",
    "murim_q2",
    "murim_q3",
    "murim_q1",
  ],

  excludeFromBranchResult: ["murim_q6"],

  branches: murimBranches,

  questions: [
    {
      questionKey: "murim_q1",
      questionId: "murim_q1",
      order: 1,
      questionOrder: 1,
      questionTitle: "시작 장면",
      title: "시작 장면",
      questionText: "첫 화에서 더 끌리는 시작 장면을 골라주세요.",
      legacyQuestionText:
        "첫 장이 열립니다. 아직 이름 붙지 않은 강호의 풍경 속, 가장 먼저 보이는 장면은 무엇인가요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      cardType: "image",
      choices: [
        {
          optionKey: "murim_q1_a1",
          choiceId: "murim_q1_a1",
          choiceOrder: 1,
          label: "몰락한 후계자",
          text: "무너진 현판 아래, 살아남은 제자가 사라진 문파의 이름을 바라본다.",
          shortDescription:
            "무너진 현판 아래, 살아남은 제자가 사라진 문파의 이름을 바라본다.",
          imageKey: "murim_q1_a1_image",
          branchScores: {
            murim_revenge_recovery: 1,
          },
          tagScores: {
            revenge: 1,
            emotional_depth: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q1_a2",
          choiceId: "murim_q1_a2",
          choiceOrder: 2,
          label: "초식 수련자",
          text: "새벽 안개 속, 한 소년이 피 묻은 손으로 다시 목봉을 들어 올린다.",
          shortDescription:
            "새벽 안개 속, 한 소년이 피 묻은 손으로 다시 목봉을 들어 올린다.",
          imageKey: "murim_q1_a2_image",
          branchScores: {
            murim_growth_training: 1,
          },
          tagScores: {
            growth: 1,
            emotional_depth: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q1_a3",
          choiceId: "murim_q1_a3",
          choiceOrder: 3,
          label: "강호 책략가",
          text: "정파와 사파의 깃발이 마주 선 자리에서, 한 장의 밀서가 판세를 뒤흔든다.",
          shortDescription:
            "정파와 사파의 깃발이 마주 선 자리에서, 한 장의 밀서가 판세를 뒤흔든다.",
          imageKey: "murim_q1_a3_image",
          branchScores: {
            murim_sect_politics: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            world_mystery: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q1_a4",
          choiceId: "murim_q1_a4",
          choiceOrder: 4,
          label: "길 위의 협객",
          text: "낡은 주막 앞, 떠돌이 무인이 약자를 괴롭히는 무리 앞에 조용히 일어선다.",
          shortDescription:
            "낡은 주막 앞, 떠돌이 무인이 약자를 괴롭히는 무리 앞에 조용히 일어선다.",
          imageKey: "murim_q1_a4_image",
          branchScores: {
            murim_wanderer_justice: 1,
          },
          tagScores: {
            relationship_bond: 1,
            action_catharsis: 1,
            emotional_depth: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q1_a5",
          choiceId: "murim_q1_a5",
          choiceOrder: 5,
          label: "천하 군림자",
          text: "모두가 숨을 죽인 대전 한가운데, 누구도 막지 못할 인물이 천천히 걸어 들어온다.",
          shortDescription:
            "모두가 숨을 죽인 대전 한가운데, 누구도 막지 못할 인물이 천천히 걸어 들어온다.",
          imageKey: "murim_q1_a5_image",
          branchScores: {
            murim_absolute_power: 1,
          },
          tagScores: {
            action_catharsis: 1,
            survival_tension: 1,
            visual_appeal: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionKey: "murim_q2",
      questionId: "murim_q2",
      order: 2,
      questionOrder: 2,
      questionTitle: "인물",
      title: "인물",
      questionText: "더 따라가고 싶은 인물을 골라주세요.",
      legacyQuestionText:
        "몇 장을 넘기자, 강호의 한 인물이 또렷하게 모습을 드러냅니다. 그는 어떤 인물인가요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      cardType: "text",
      choices: [
        {
          optionKey: "murim_q2_a1",
          choiceId: "murim_q2_a1",
          choiceOrder: 1,
          label: "판세를 읽는 사람",
          text: "칼을 뽑기 전에 세력의 흐름과 사람의 속내를 먼저 읽는 사람.",
          shortDescription:
            "칼을 뽑기 전에 세력의 흐름과 사람의 속내를 먼저 읽는 사람.",
          branchScores: {
            murim_sect_politics: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q2_a2",
          choiceId: "murim_q2_a2",
          choiceOrder: 2,
          label: "정체를 숨긴 강자",
          text: "이미 강하지만, 진짜 정체를 숨긴 채 강호를 조용히 내려다보는 사람.",
          shortDescription:
            "이미 강하지만, 진짜 정체를 숨긴 채 강호를 조용히 내려다보는 사람.",
          branchScores: {
            murim_absolute_power: 1,
          },
          tagScores: {
            hidden_identity_power: 1,
            action_catharsis: 1,
            special_ability: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q2_a3",
          choiceId: "murim_q2_a3",
          choiceOrder: 3,
          label: "약자를 지나치지 않는 사람",
          text: "강해지는 것보다, 억울한 사람을 그냥 지나치지 못하는 사람.",
          shortDescription:
            "강해지는 것보다, 억울한 사람을 그냥 지나치지 못하는 사람.",
          branchScores: {
            murim_wanderer_justice: 1,
          },
          tagScores: {
            relationship_bond: 1,
            emotional_depth: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q2_a4",
          choiceId: "murim_q2_a4",
          choiceOrder: 4,
          label: "반복하는 수련자",
          text: "재능은 부족하지만, 같은 초식을 천 번 넘게 반복하는 사람.",
          shortDescription:
            "재능은 부족하지만, 같은 초식을 천 번 넘게 반복하는 사람.",
          branchScores: {
            murim_growth_training: 1,
          },
          tagScores: {
            growth: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q2_a5",
          choiceId: "murim_q2_a5",
          choiceOrder: 5,
          label: "잊지 않는 후계자",
          text: "모든 것을 잃고도, 자신을 무너뜨린 이름을 끝내 잊지 않는 사람.",
          shortDescription:
            "모든 것을 잃고도, 자신을 무너뜨린 이름을 끝내 잊지 않는 사람.",
          branchScores: {
            murim_revenge_recovery: 1,
          },
          tagScores: {
            revenge: 1,
            emotional_depth: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionKey: "murim_q3",
      questionId: "murim_q3",
      order: 3,
      questionOrder: 3,
      questionTitle: "사건 전개",
      title: "사건 전개",
      questionText: "더 보고 싶은 사건 전개를 골라주세요.",
      legacyQuestionText:
        "강호는 오래 조용하지 않습니다. 이제 첫 번째 사건이 다가옵니다. 어떤 사건이 다가오고 있나요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      cardType: "text",
      choices: [
        {
          optionKey: "murim_q3_a1",
          choiceId: "murim_q3_a1",
          choiceOrder: 1,
          label: "길을 되돌리는 의리",
          text: "지나치려던 마을에서 억울한 죽음이 벌어지고, 주인공이 길을 되돌린다.",
          shortDescription:
            "지나치려던 마을에서 억울한 죽음이 벌어지고, 주인공이 길을 되돌린다.",
          branchScores: {
            murim_wanderer_justice: 1,
          },
          tagScores: {
            relationship_bond: 1,
            emotional_depth: 1,
            action_catharsis: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q3_a2",
          choiceId: "murim_q3_a2",
          choiceOrder: 2,
          label: "패배 뒤 수련",
          text: "작은 비무에서 처참히 패배한 주인공이, 다시 수련장으로 돌아간다.",
          shortDescription:
            "작은 비무에서 처참히 패배한 주인공이, 다시 수련장으로 돌아간다.",
          branchScores: {
            murim_growth_training: 1,
          },
          tagScores: {
            growth: 1,
            action_catharsis: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q3_a3",
          choiceId: "murim_q3_a3",
          choiceOrder: 3,
          label: "원수의 흔적",
          text: "사부를 죽인 자의 흔적이 적힌 낡은 서찰이 발견된다.",
          shortDescription:
            "사부를 죽인 자의 흔적이 적힌 낡은 서찰이 발견된다.",
          branchScores: {
            murim_revenge_recovery: 1,
          },
          tagScores: {
            revenge: 1,
            mystery_investigation: 1,
            emotional_depth: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q3_a4",
          choiceId: "murim_q3_a4",
          choiceOrder: 4,
          label: "단 한 수의 압도감",
          text: "모두가 무시하던 인물이 단 한 수로 장내를 얼어붙게 만든다.",
          shortDescription:
            "모두가 무시하던 인물이 단 한 수로 장내를 얼어붙게 만든다.",
          branchScores: {
            murim_absolute_power: 1,
          },
          tagScores: {
            action_catharsis: 1,
            hidden_identity_power: 1,
            survival_tension: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q3_a5",
          choiceId: "murim_q3_a5",
          choiceOrder: 5,
          label: "문파의 배신",
          text: "한 문파의 배신이 드러나며, 강호 전체가 편을 가르기 시작한다.",
          shortDescription:
            "한 문파의 배신이 드러나며, 강호 전체가 편을 가르기 시작한다.",
          branchScores: {
            murim_sect_politics: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            world_mystery: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionKey: "murim_q4",
      questionId: "murim_q4",
      order: 4,
      questionOrder: 4,
      questionTitle: "연출",
      title: "연출",
      questionText: "볼 때 더 중요하게 느끼는 연출을 골라주세요.",
      legacyQuestionText:
        "이야기를 넘기던 중, 한 장면 때문에 스크롤이 잠시 멈춥니다. 어떤 장면이었나요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      cardType: "image",
      choices: [
        {
          optionKey: "murim_q4_a1",
          choiceId: "murim_q4_a1",
          choiceOrder: 1,
          label: "숨겨온 힘의 공개",
          text: "숨겨왔던 힘이 드러나자, 방금 전까지 비웃던 이들이 침묵하는 장면.",
          shortDescription:
            "숨겨왔던 힘이 드러나자, 방금 전까지 비웃던 이들이 침묵하는 장면.",
          imageKey: "murim_q4_a1_image", branchScores: {
            murim_absolute_power: 1,
          },
          tagScores: {
            hidden_identity_power: 1,
            action_catharsis: 1,
            visual_appeal: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q4_a2",
          choiceId: "murim_q4_a2",
          choiceOrder: 2,
          label: "동맹과 배신의 역전",
          text: "짧은 말 한마디로 동맹과 배신의 판도가 뒤집히는 장면.",
          shortDescription:
            "짧은 말 한마디로 동맹과 배신의 판도가 뒤집히는 장면.",
          imageKey: "murim_q4_a2_image", branchScores: {
            murim_sect_politics: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q4_a3",
          choiceId: "murim_q4_a3",
          choiceOrder: 3,
          label: "초식의 깨달음",
          text: "지겹도록 반복한 초식이 처음으로 강적의 빈틈을 찌르는 장면.",
          shortDescription:
            "지겹도록 반복한 초식이 처음으로 강적의 빈틈을 찌르는 장면.",
          imageKey: "murim_q4_a3_image", branchScores: {
            murim_growth_training: 1,
          },
          tagScores: {
            growth: 1,
            action_catharsis: 1,
            emotional_depth: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q4_a4",
          choiceId: "murim_q4_a4",
          choiceOrder: 4,
          label: "다시 여는 칼집",
          text: "떠나려던 무인이 약자를 지키기 위해 다시 칼집을 여는 장면.",
          shortDescription:
            "떠나려던 무인이 약자를 지키기 위해 다시 칼집을 여는 장면.",
          imageKey: "murim_q4_a4_image", branchScores: {
            murim_wanderer_justice: 1,
          },
          tagScores: {
            relationship_bond: 1,
            action_catharsis: 1,
            emotional_depth: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q4_a5",
          choiceId: "murim_q4_a5",
          choiceOrder: 5,
          label: "문파 이름의 복원",
          text: "무너진 문파의 이름을 원수 앞에서 다시 꺼내는 장면.",
          shortDescription:
            "무너진 문파의 이름을 원수 앞에서 다시 꺼내는 장면.",
          imageKey: "murim_q4_a5_image", branchScores: {
            murim_revenge_recovery: 1,
          },
          tagScores: {
            revenge: 1,
            emotional_depth: 1,
            action_catharsis: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionKey: "murim_q5",
      questionId: "murim_q5",
      order: 5,
      questionOrder: 5,
      questionTitle: "다음 화 흐름",
      title: "다음 화 흐름",
      questionText: "다음 화까지 보고 싶게 만드는 흐름을 골라주세요.",
      legacyQuestionText:
        "분명 한 화만 더 보려 했습니다. 그런데 어느새 계속 넘기고 있습니다. 어떤 흐름이었을까요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      cardType: "text",
      choices: [
        {
          optionKey: "murim_q5_a1",
          choiceId: "murim_q5_a1",
          choiceOrder: 1,
          label: "패배마다 쌓이는 수련",
          text: "패배할 때마다 단련하고 깨달으며 조금씩 강해지는 흐름.",
          shortDescription:
            "패배할 때마다 단련하고 깨달으며 조금씩 강해지는 흐름.",
          branchScores: {
            murim_growth_training: 1,
          },
          tagScores: {
            growth: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q5_a2",
          choiceId: "murim_q5_a2",
          choiceOrder: 2,
          label: "문파 간 선택과 거래",
          text: "문파 간 선택과 거래가 쌓이며 강호의 판세가 바뀌는 흐름.",
          shortDescription:
            "문파 간 선택과 거래가 쌓이며 강호의 판세가 바뀌는 흐름.",
          branchScores: {
            murim_sect_politics: 1,
          },
          tagScores: {
            strategy_powerplay: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q5_a3",
          choiceId: "murim_q5_a3",
          choiceOrder: 3,
          label: "두려움으로 바뀌는 시선",
          text: "주인공이 힘을 드러낼수록 강호가 그를 두려워하기 시작하는 흐름.",
          shortDescription:
            "주인공이 힘을 드러낼수록 강호가 그를 두려워하기 시작하는 흐름.",
          branchScores: {
            murim_absolute_power: 1,
          },
          tagScores: {
            action_catharsis: 1,
            hidden_identity_power: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
        {
          optionKey: "murim_q5_a4",
          choiceId: "murim_q5_a4",
          choiceOrder: 4,
          label: "진실과 복수의 접근",
          text: "잃어버린 사람과 문파의 진실을 쫓아 원수에게 가까워지는 흐름.",
          shortDescription:
            "잃어버린 사람과 문파의 진실을 쫓아 원수에게 가까워지는 흐름.",
          branchScores: {
            murim_revenge_recovery: 1,
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
          optionKey: "murim_q5_a5",
          choiceId: "murim_q5_a5",
          choiceOrder: 5,
          label: "길 위의 만남과 의리",
          text: "길 위의 만남과 의리가 다음 사건을 불러오는 흐름.",
          shortDescription:
            "길 위의 만남과 의리가 다음 사건을 불러오는 흐름.",
          branchScores: {
            murim_wanderer_justice: 1,
          },
          tagScores: {
            relationship_bond: 1,
            emotional_depth: 1,
            light_healing: 1,
            story_immersion: 1,
          },
          avoidanceTagScores: {},
        },
      ],
    },
    {
      questionKey: "murim_q6",
      questionId: "murim_q6",
      order: 6,
      questionOrder: 6,
      questionTitle: "부담 요소",
      title: "부담 요소",
      questionText: "덜 보고 싶은 부담 요소를 골라주세요.",
      legacyQuestionText:
        "처음엔 더 볼 생각이 있었습니다. 그런데 어느 순간 손이 멈추고, 뒤로가기를 눌렀습니다. 어떤 이유였을까요?",
      selectMode: "ranked_multi_select",
      maxSelect: 2,
      cardType: "text",
      isAvoidanceQuestion: true,
      choices: [
        {
          optionKey: "murim_q6_a1",
          choiceId: "murim_q6_a1",
          choiceOrder: 1,
          label: "관계·문파 진입장벽",
          text: "문파와 인물이 너무 많이 나오는데, 누가 왜 싸우는지 잡히지 않았다.",
          shortDescription:
            "문파와 인물이 너무 많이 나오는데, 누가 왜 싸우는지 잡히지 않았다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            entry_barrier: 1,
            relationship_stress: 1,
          },
        },
        {
          optionKey: "murim_q6_a2",
          choiceId: "murim_q6_a2",
          choiceOrder: 2,
          label: "납득 안 되는 급성장",
          text: "별다른 수련이나 대가 없이 갑자기 강해져서 납득되지 않았다.",
          shortDescription:
            "별다른 수련이나 대가 없이 갑자기 강해져서 납득되지 않았다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            weak_immersion: 1,
            tone_mismatch: 1,
          },
        },
        {
          optionKey: "murim_q6_a3",
          choiceId: "murim_q6_a3",
          choiceOrder: 3,
          label: "흐릿한 동기",
          text: "떠도는 분위기는 좋은데, 주인공이 왜 움직이는지 점점 흐릿해졌다.",
          shortDescription:
            "떠도는 분위기는 좋은데, 주인공이 왜 움직이는지 점점 흐릿해졌다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            weak_immersion: 1,
            progression_fatigue: 1,
          },
        },
        {
          optionKey: "murim_q6_a4",
          choiceId: "murim_q6_a4",
          choiceOrder: 4,
          label: "사라진 위기감",
          text: "주인공이 너무 쉽게 이겨서 위기감이 거의 사라졌다.",
          shortDescription:
            "주인공이 너무 쉽게 이겨서 위기감이 거의 사라졌다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            progression_fatigue: 1,
            weak_immersion: 1,
          },
        },
        {
          optionKey: "murim_q6_a5",
          choiceId: "murim_q6_a5",
          choiceOrder: 5,
          label: "쌓이지 않은 복수 감정",
          text: "복수의 이유는 큰데, 분노와 상실감이 충분히 쌓이지 않았다.",
          shortDescription:
            "복수의 이유는 큰데, 분노와 상실감이 충분히 쌓이지 않았다.",
          branchScores: {},
          tagScores: {},
          avoidanceTagScores: {
            weak_immersion: 1,
            tone_mismatch: 1,
          },
        },
      ],
    },
  ],
} satisfies DetailTestData;

export type MurimTest = typeof murimTest;