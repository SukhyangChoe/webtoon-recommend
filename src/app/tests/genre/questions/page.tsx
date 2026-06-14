"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { GENRE_PREFERENCE_QUESTIONS } from "@/data/tests/genrePreference";
import {
  buildGenrePreferenceResult,
  buildUserTasteProfile,
  type GenrePreferenceAnswerMap,
} from "@/lib/scoring/genrePreference";

function getOrCreateAnonymousId() {
  const storageKey = "webtoon_anonymous_id";
  const savedId = localStorage.getItem(storageKey);

  if (savedId) return savedId;

  const newId = `anon_${crypto.randomUUID()}`;
  localStorage.setItem(storageKey, newId);

  return newId;
}

export default function GenreQuestionsPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<GenrePreferenceAnswerMap>({});

  const currentQuestion = GENRE_PREFERENCE_QUESTIONS[currentIndex];
  const selectedOptionKey = answers[currentQuestion.id];

  const progress = useMemo(
    () =>
      Math.round(
        ((currentIndex + 1) / GENRE_PREFERENCE_QUESTIONS.length) * 100
      ),
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

    if (currentIndex < GENRE_PREFERENCE_QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    const anonymousId = getOrCreateAnonymousId();
    const result = buildGenrePreferenceResult({
      answers,
      anonymousId,
    });
    const userTasteProfile = buildUserTasteProfile(result);

    localStorage.setItem(
      "webtoon_genre_preference_result",
      JSON.stringify(result)
    );

    localStorage.setItem(
      "webtoon_user_taste_profile",
      JSON.stringify(userTasteProfile)
    );

    router.push("/tests/genre/result");
  };

  return (
    <main className="wt-page">
      <section className="wt-container wt-section-center max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/tests/genre" className="wt-button-secondary px-4 py-2 text-sm">
            ← 소개로
          </Link>

          <p className="text-sm text-white/45">
            {currentIndex + 1} / {GENRE_PREFERENCE_QUESTIONS.length}
          </p>
        </div>

        <div className="mb-8 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="wt-card p-7 sm:p-10">
          <p className="wt-eyebrow">웹툰 장르 취향 테스트</p>

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
              className="wt-button-secondary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-30"
            >
              이전
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={!selectedOptionKey}
              className="wt-button-primary px-6 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-30"
            >
              {currentIndex === GENRE_PREFERENCE_QUESTIONS.length - 1
                ? "결과 보기"
                : "다음 장면"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}