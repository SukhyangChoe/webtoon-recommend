"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type GenreKey =
  | "fantasy"
  | "murim"
  | "romance_ropan"
  | "thriller_horror"
  | "drama_daily";

type Scores = Partial<Record<GenreKey, number>>;

type Option = {
  optionKey: string;
  text: string;
  scores: Scores;
};

type Question = {
  id: number;
  title: string;
  body: string;
  options: Option[];
};

const GENRE_LABELS: Record<GenreKey, string> = {
  fantasy: "판타지",
  murim: "무협",
  romance_ropan: "로맨스/로판",
  thriller_horror: "스릴러/공포",
  drama_daily: "드라마/일상",
};

const GENRE_ORDER: GenreKey[] = [
  "fantasy",
  "murim",
  "romance_ropan",
  "thriller_horror",
  "drama_daily",
];

const QUESTIONS: Question[] = [
  {
    id: 1,
    title: "Q1. 첫 페이지",
    body: `첫 페이지가 열립니다.
아직 주인공도, 사건의 이름도 나오지 않았습니다.
대사 없는 첫 장면 하나가 이 이야기가 시작될 세계를 보여줍니다.

첫 페이지에 그려진 장면은 무엇인가요?`,
    options: [
      {
        optionKey: "genre_q1_a",
        text: "새벽의 도시 위로, 아무도 보지 못한 균열이 조용히 열린다.",
        scores: { fantasy: 3, thriller_horror: 2 },
      },
      {
        optionKey: "genre_q1_b",
        text: "눈 덮인 산길 끝, 오래된 문 앞에서 부러진 검을 든 인물이 숨을 고른다.",
        scores: { fantasy: 1, murim: 3, drama_daily: 1 },
      },
      {
        optionKey: "genre_q1_c",
        text: "샹들리에가 빛나는 연회장, 모두가 웃고 있지만 한 사람의 이름만 속삭인다.",
        scores: { fantasy: 1, romance_ropan: 3, thriller_horror: 1, drama_daily: 1 },
      },
      {
        optionKey: "genre_q1_d",
        text: "비 오는 골목 끝, 꺼진 가로등 아래에서 낯선 발소리가 멈춘다.",
        scores: { thriller_horror: 3, drama_daily: 2 },
      },
      {
        optionKey: "genre_q1_e",
        text: "평범한 하루의 끝, 작은 카페 창가에 놓인 편지 한 장이 눈에 들어온다.",
        scores: { romance_ropan: 2, drama_daily: 3 },
      },
    ],
  },
  {
    id: 2,
    title: "Q2. 인물 등장",
    body: `몇 컷 뒤, 이야기의 중심에 설 인물이 모습을 드러냅니다.
아직 아무 말도 하지 않았지만,
이 인물이 첫 화의 흐름을 바꿀 것 같습니다.

그는 어떤 사람인가요?`,
    options: [
      {
        optionKey: "genre_q2_a",
        text: "모두가 무시하지만, 혼자만 이 세계의 이상함을 눈치챈 사람.",
        scores: { fantasy: 3, murim: 1, thriller_horror: 2 },
      },
      {
        optionKey: "genre_q2_b",
        text: "가진 것은 없지만, 무너진 자리에서 다시 일어서려는 사람.",
        scores: { fantasy: 1, murim: 2, drama_daily: 2 },
      },
      {
        optionKey: "genre_q2_c",
        text: "이미 강하지만, 아직 아무도 그 진짜 힘을 모르는 사람.",
        scores: { fantasy: 2, murim: 2 },
      },
      {
        optionKey: "genre_q2_d",
        text: "웃고 있지만, 속으로는 모두의 말과 표정을 계산하고 있는 사람.",
        scores: { fantasy: 1, murim: 1, romance_ropan: 2, thriller_horror: 2 },
      },
      {
        optionKey: "genre_q2_e",
        text: "평범해 보이지만, 누군가를 지키기 위해 조용히 버티는 사람.",
        scores: { romance_ropan: 1, drama_daily: 3 },
      },
    ],
  },
  {
    id: 3,
    title: "Q3. 첫 사건",
    body: `조용하던 장면이 갑자기 흔들립니다.
주인공은 더 이상 가만히 있을 수 없는 상황에 놓이고,
첫 사건이 이야기의 방향을 정하기 시작합니다.

이 사건은 어떻게 흘러가나요?`,
    options: [
      {
        optionKey: "genre_q3_a",
        text: "모두가 끝났다고 생각한 순간, 주인공이 판을 뒤집기 시작한다.",
        scores: { fantasy: 2, murim: 2, thriller_horror: 1 },
      },
      {
        optionKey: "genre_q3_b",
        text: "아무도 모르게 준비한 계획이 하나씩 맞아떨어진다.",
        scores: { fantasy: 1, murim: 1, romance_ropan: 1, thriller_horror: 2 },
      },
      {
        optionKey: "genre_q3_c",
        text: "잃어버린 자리와 사람을 되찾기 위해, 주인공이 움직이기 시작한다.",
        scores: { fantasy: 1, murim: 2, romance_ropan: 1, drama_daily: 2 },
      },
      {
        optionKey: "genre_q3_d",
        text: "적인지 아군인지 알 수 없는 인물과 위험한 약속을 맺는다.",
        scores: { fantasy: 1, romance_ropan: 2, thriller_horror: 2 },
      },
      {
        optionKey: "genre_q3_e",
        text: "작은 오해 하나로, 가까워질 리 없던 두 사람이 엮이기 시작한다.",
        scores: { romance_ropan: 3, drama_daily: 2 },
      },
    ],
  },
  {
    id: 4,
    title: "Q4. 마지막 장면",
    body: `첫 화의 마지막 컷이 지나갑니다.
사건은 끝난 것 같지만,
화면이 어두워진 뒤에도 한 가지 생각이 머릿속에 남습니다.

어떤 생각이었나요?`,
    options: [
      {
        optionKey: "genre_q4_a",
        text: "“이 세계에는 아직 숨겨진 게 많다.”",
        scores: { fantasy: 3, murim: 1, thriller_horror: 2 },
      },
      {
        optionKey: "genre_q4_b",
        text: "“이 인물이 어디까지 올라갈지 보고 싶다.”",
        scores: { fantasy: 2, murim: 2, drama_daily: 1 },
      },
      {
        optionKey: "genre_q4_c",
        text: "“두 사람의 관계가 쉽게 끝나지 않을 것 같다.”",
        scores: { romance_ropan: 3, drama_daily: 2 },
      },
      {
        optionKey: "genre_q4_d",
        text: "“아직 진짜 적은 드러나지 않은 것 같다.”",
        scores: { fantasy: 1, romance_ropan: 1, thriller_horror: 3 },
      },
      {
        optionKey: "genre_q4_e",
        text: "“평범해 보였던 장면이 이상하게 마음에 남는다.”",
        scores: { romance_ropan: 1, thriller_horror: 1, drama_daily: 3 },
      },
    ],
  },
  {
    id: 5,
    title: "Q5. 다음 화",
    body: `분명 첫 화만 보고 끝내려 했습니다.
그런데 어느새 다음 화를 계속 넘기고 있습니다.

왜 계속 넘기게 되었나요?`,
    options: [
      {
        optionKey: "genre_q5_a",
        text: "숨겨진 힘이 조금씩 드러나면서 판이 커져서.",
        scores: { fantasy: 2, murim: 2 },
      },
      {
        optionKey: "genre_q5_b",
        text: "주인공의 선택이 예상하지 못한 결과로 이어져서.",
        scores: { fantasy: 1, murim: 1, romance_ropan: 1, thriller_horror: 2, drama_daily: 1 },
      },
      {
        optionKey: "genre_q5_c",
        text: "감춰진 비밀이 하나씩 풀리며 진실에 가까워져서.",
        scores: { fantasy: 2, thriller_horror: 3 },
      },
      {
        optionKey: "genre_q5_d",
        text: "두 사람의 관계가 대화 하나로 조금씩 바뀌어서.",
        scores: { romance_ropan: 3, drama_daily: 2 },
      },
      {
        optionKey: "genre_q5_e",
        text: "불리했던 상황이 하나씩 뒤집히기 시작해서.",
        scores: { fantasy: 2, murim: 2, thriller_horror: 1 },
      },
    ],
  },
];

function calculateGenreScores(answers: Record<number, string>) {
  const genreScores: Record<GenreKey, number> = {
    fantasy: 0,
    murim: 0,
    romance_ropan: 0,
    thriller_horror: 0,
    drama_daily: 0,
  };

  Object.entries(answers).forEach(([questionId, optionKey]) => {
    const question = QUESTIONS.find((item) => item.id === Number(questionId));
    const option = question?.options.find((item) => item.optionKey === optionKey);

    if (!option) return;

    Object.entries(option.scores).forEach(([genreKey, score]) => {
      genreScores[genreKey as GenreKey] += score ?? 0;
    });
  });

  return genreScores;
}

function calculateRatios(genreScores: Record<GenreKey, number>) {
  const total = Object.values(genreScores).reduce((sum, score) => sum + score, 0);

  return GENRE_ORDER.map((genreKey) => ({
    genreKey,
    label: GENRE_LABELS[genreKey],
    score: genreScores[genreKey],
    ratio: total === 0 ? 0 : Math.round((genreScores[genreKey] / total) * 100),
  })).sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    if (b.score !== a.score) return b.score - a.score;
    return GENRE_ORDER.indexOf(a.genreKey) - GENRE_ORDER.indexOf(b.genreKey);
  });
}

export default function GenreQuestionsPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const currentQuestion = QUESTIONS[currentIndex];
  const selectedOptionKey = answers[currentQuestion.id];
  const progress = useMemo(
    () => Math.round(((currentIndex + 1) / QUESTIONS.length) * 100),
    [currentIndex]
  );

  const handleSelect = (optionKey: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionKey,
    }));
  };

  const handleNext = () => {
    if (!selectedOptionKey) return;

    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    const genreScores = calculateGenreScores(answers);
    const genreRatios = calculateRatios(genreScores);
    const topGenres = genreRatios.slice(0, 3);

    const result = {
      schemaVersion: 1,
      testKey: "genre_preference",
      testVersion: "v1.0",
      completedAt: new Date().toISOString(),
      answers,
      genreScores,
      genreRatios,
      topGenres,
      primaryGenreKey: topGenres[0]?.genreKey ?? null,
      secondaryGenreKey: topGenres[1]?.genreKey ?? null,
    };

    localStorage.setItem(
      "webtoon_genre_preference_result",
      JSON.stringify(result)
    );

    router.push("/tests/genre/result");
  };

  return (
    <main className="min-h-screen bg-[#101014] text-white">
      <section className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/tests/genre"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            ← 소개로
          </Link>

          <p className="text-sm text-white/45">
            {currentIndex + 1} / {QUESTIONS.length}
          </p>
        </div>

        <div className="mb-8 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 shadow-2xl sm:p-10">
          <p className="text-sm font-semibold text-white/45">
            웹툰 장르 취향 테스트
          </p>

          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            {currentQuestion.title}
          </h1>

          <p className="mt-6 whitespace-pre-line text-base leading-8 text-white/70">
            {currentQuestion.body}
          </p>

          <div className="mt-8 grid gap-3">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedOptionKey === option.optionKey;

              return (
                <button
                  key={option.optionKey}
                  type="button"
                  onClick={() => handleSelect(option.optionKey)}
                  className={`rounded-2xl border p-5 text-left text-base leading-7 transition ${
                    isSelected
                      ? "border-white bg-white text-[#101014]"
                      : "border-white/10 bg-black/20 text-white/75 hover:border-white/30 hover:bg-white/[0.07]"
                  }`}
                >
                  {option.text}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentIndex === 0}
              className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-white/60 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
            >
              이전
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={!selectedOptionKey}
              className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-[#101014] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {currentIndex === QUESTIONS.length - 1
                ? "결과 보기"
                : "다음 장면"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}