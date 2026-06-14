"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  GENRE_LABELS,
  GENRE_ORDER,
  type GenreKey,
} from "@/data/tests/genrePreference";
import type { GenrePreferenceResult } from "@/lib/scoring/genrePreference";

const SINGLE_DESCRIPTIONS: Record<GenreKey, string> = {
  fantasy: "숨겨진 규칙과 확장되는 세계관에 끌리는 편이에요.",
  murim: "무공을 갈고닦아 한계를 넘는 이야기에 끌려요.",
  romance_ropan: "관계의 판이 바뀌고, 감정선이 깊어지는 이야기에 끌려요.",
  thriller_horror: "감춰진 단서와 불안한 진실을 따라가는 이야기에 끌려요.",
  drama_daily: "인물의 마음과 잔잔한 여운이 남는 이야기에 끌려요.",
};

const LINKED_DESCRIPTIONS: Record<string, string> = {
  "fantasy+murim": "성장과 세계관 확장이 함께 살아 있는 이야기에 끌려요.",
  "fantasy+romance_ropan": "낯선 세계 속에서 관계의 판이 바뀌는 이야기에 끌려요.",
  "fantasy+thriller_horror":
    "확장되는 세계관과 감춰진 단서를 함께 따라가는 이야기에 끌려요.",
  "fantasy+drama_daily":
    "신비로운 세계 속에서도 인물의 감정이 오래 남는 이야기에 끌려요.",
  "murim+romance_ropan":
    "강해지는 흐름 속에서 관계의 변화가 깊어지는 이야기에 끌려요.",
  "murim+thriller_horror":
    "한계를 넘는 성장과 숨겨진 진실이 함께 움직이는 이야기에 끌려요.",
  "murim+drama_daily": "버티고 성장하는 인물의 여정과 여운에 끌리는 편이에요.",
  "romance_ropan+thriller_horror":
    "관계의 긴장감과 감춰진 진실이 함께 얽히는 이야기에 끌려요.",
  "romance_ropan+drama_daily":
    "감정선의 깊이와 관계 변화가 오래 남는 이야기에 끌려요.",
  "thriller_horror+drama_daily":
    "조용한 일상 아래 감춰진 비밀을 따라가는 이야기에 끌려요.",
};

function getLinkedKey(first: GenreKey, second: GenreKey) {
  return [first, second]
    .sort((a, b) => GENRE_ORDER.indexOf(a) - GENRE_ORDER.indexOf(b))
    .join("+");
}

function getResultDescription(result: GenrePreferenceResult) {
  if (result.resultType === "balanced") {
    return "한쪽으로 치우치기보다 여러 세계를 두루 탐색하는 편이에요.";
  }

  if (
    result.resultType === "linked" &&
    result.primaryGenreKey &&
    result.secondaryGenreKey
  ) {
    const linkedKey = getLinkedKey(
      result.primaryGenreKey,
      result.secondaryGenreKey
    );

    return (
      LINKED_DESCRIPTIONS[linkedKey] ??
      "두 가지 세계가 함께 강하게 열린 결과예요."
    );
  }

  if (result.primaryGenreKey) {
    return SINGLE_DESCRIPTIONS[result.primaryGenreKey];
  }

  return "아직 충분한 결과를 찾지 못했어요.";
}

export default function GenreResultPage() {
  const [result, setResult] = useState<GenrePreferenceResult | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading"
  );

  useEffect(() => {
    const savedResult = localStorage.getItem("webtoon_genre_preference_result");

    if (!savedResult) {
      setStatus("empty");
      return;
    }

    try {
      const parsedResult = JSON.parse(savedResult) as GenrePreferenceResult;
      setResult(parsedResult);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  const description = useMemo(() => {
    if (!result) return "";

    return getResultDescription(result);
  }, [result]);

  if (status === "loading") {
    return (
      <main className="wt-page">
        <section className="wt-container wt-section-center max-w-4xl">
          <div className="wt-card p-8 text-center">
            <p className="wt-description">결과를 불러오는 중입니다.</p>
          </div>
        </section>
      </main>
    );
  }

  if (status === "empty" || status === "error" || !result) {
    return (
      <main className="wt-page">
        <section className="wt-container wt-section-center max-w-4xl">
          <div className="wt-card p-8 text-center sm:p-12">
            <p className="wt-eyebrow">웹툰 장르 취향 테스트 결과</p>

            <h1 className="mt-4 wt-title-md">저장된 결과가 없어요.</h1>

            <p className="mt-5 wt-description">
              테스트를 완료하면 이곳에서 내 웹툰 세계관 지도를 확인할 수 있어요.
            </p>

            <Link
              href="/tests/genre/questions"
              className="wt-button-primary mt-8 px-6 py-4"
            >
              테스트 다시 하기
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="wt-page">
      <section className="wt-container py-12 sm:py-16">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/tests/genre" className="wt-button-secondary px-4 py-2 text-sm">
            ← 테스트 소개
          </Link>

          <p className="text-sm text-white/40">
            {result.testVersion} · {result.resultType}
          </p>
        </div>

        <div className="wt-card p-7 sm:p-10">
          <p className="wt-eyebrow">웹툰 장르 취향 테스트 결과</p>

          <h1 className="mt-4 wt-title-md">내 웹툰 세계관 지도</h1>

          <p className="mt-5 wt-description">{description}</p>

          <div className="mt-10 rounded-[2rem] border border-white/10 bg-black/20 p-5 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">세계관 지도</h2>
              <p className="text-sm text-white/40">임시 시각화</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-5">
              {GENRE_ORDER.map((genreKey) => {
                const mapItem = result.mapState[genreKey];
                const ratio = result.genrePercentages[genreKey] ?? 0;
                const isActive = mapItem?.lightPathActive;

                return (
                  <div
                    key={genreKey}
                    className={`rounded-3xl border p-4 transition ${
                      isActive
                        ? "border-white/35 bg-white/[0.08]"
                        : "border-white/10 bg-white/[0.025]"
                    }`}
                    style={{
                      opacity: mapItem?.opacity ?? 0.35,
                    }}
                  >
                    <p className="text-sm text-white/45">
                      {mapItem?.state ?? "inactive"}
                    </p>

                    <h3 className="mt-2 text-lg font-bold">
                      {GENRE_LABELS[genreKey]}
                    </h3>

                    <p className="mt-4 text-3xl font-black">{ratio}%</p>

                    <p className="mt-3 text-xs leading-5 text-white/45">
                      {isActive ? "중심 원으로 빛의 길 연결" : "안개 속 대기"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {result.topGenres.map((genre, index) => (
              <div key={genre.genreKey} className="wt-card-soft p-5">
                <p className="text-sm text-white/45">{index + 1}위 장르</p>

                <h2 className="mt-2 text-2xl font-bold">{genre.label}</h2>

                <p className="mt-4 text-4xl font-black">{genre.ratio}%</p>

                <p className="mt-3 text-sm text-white/45">
                  원점수 {genre.score}점
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-lg font-bold">상위 취향 태그</h2>

            <div className="mt-4 flex flex-wrap gap-2">
              {result.topTags.length > 0 ? (
                result.topTags.map((tagKey) => (
                  <span
                    key={tagKey}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/65"
                  >
                    {tagKey}
                  </span>
                ))
              ) : (
                <p className="text-sm text-white/45">저장된 태그가 없어요.</p>
              )}
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              className="wt-button-primary px-6 py-4"
              onClick={() => {
                alert("공유 기능은 다음 단계에서 연결할 예정입니다.");
              }}
            >
              결과 공유하기
            </button>

            <Link href="/tests/genre" className="wt-button-secondary px-6 py-4">
              장르 테스트 모음
            </Link>

            <Link href="/now" className="wt-button-secondary px-6 py-4">
              지금 볼 웹툰 찾기
            </Link>
          </div>

          <p className="mt-8 text-center text-xs leading-6 text-white/35">
            현재 결과 화면은 localStorage 저장과 결과 계산 확인을 위한 임시 화면입니다.
            작품 추천 리스트는 이 화면에 표시하지 않습니다.
          </p>
        </div>
      </section>
    </main>
  );
}