"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";

import { FindRecommendationResult } from "@/components/find/FindRecommendationResult";
import webtoonSeedData from "@/data/webtoons/webtoons_seed_v0_1.json";
import {
  createSimilarWorkSelectionResult,
  getGenreLabel,
  getStatusLabel,
  matchesSearchQuery,
  normalizeSearchText,
  normalizeWebtoonSeedData,
} from "@/lib/recommendation/similarWorkRecommendation";

import type {
  SimilarWorkSelectionResult,
  WebtoonSeedItem,
} from "@/lib/recommendation/similarWorkRecommendation";

type FindMode = "entry" | "similar_work" | "scene_pick";

const WEBTOONS = normalizeWebtoonSeedData(webtoonSeedData);

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#020617",
  color: "#0f172a",
  padding: "48px 20px",
};

const shellStyle: CSSProperties = {
  width: "100%",
  maxWidth: 980,
  margin: "0 auto",
  borderRadius: 32,
  background: "#ffffff",
  padding: "clamp(28px, 6vw, 56px)",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.28)",
};

const eyebrowStyle: CSSProperties = {
  margin: "0 0 12px",
  color: "#4f46e5",
  fontSize: 15,
  fontWeight: 900,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(36px, 7vw, 64px)",
  lineHeight: 1.05,
  letterSpacing: "-0.05em",
};

const descriptionStyle: CSSProperties = {
  margin: "22px 0 0",
  color: "#334155",
  fontSize: 18,
  lineHeight: 1.75,
};

const cardGridStyle: CSSProperties = {
  marginTop: 34,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
};

const cardButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 230,
  textAlign: "left",
  borderRadius: 24,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  padding: 24,
  cursor: "pointer",
};

const primaryCardButtonStyle: CSSProperties = {
  ...cardButtonStyle,
  background: "#eef2ff",
  border: "1px solid #c7d2fe",
};

const cardBadgeStyle: CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  background: "#ffffff",
  color: "#4f46e5",
  padding: "6px 10px",
  fontSize: 13,
  fontWeight: 900,
  marginBottom: 14,
};

const modePanelStyle: CSSProperties = {
  marginTop: 32,
  borderRadius: 24,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  padding: "clamp(22px, 5vw, 34px)",
};

const backButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  borderRadius: 999,
  border: "1px solid #c7d2fe",
  background: "#ffffff",
  color: "#4338ca",
  padding: "10px 14px",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
};

const disabledButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 48,
  borderRadius: 14,
  border: "none",
  background: "#cbd5e1",
  color: "#ffffff",
  padding: "12px 16px",
  fontSize: 15,
  fontWeight: 900,
  cursor: "not-allowed",
};

const enabledButtonStyle: CSSProperties = {
  ...disabledButtonStyle,
  background: "#4f46e5",
  cursor: "pointer",
};

const linkButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  borderRadius: 14,
  border: "1px solid #c7d2fe",
  background: "#ffffff",
  color: "#4338ca",
  padding: "12px 16px",
  fontSize: 15,
  fontWeight: 900,
  textDecoration: "none",
};

const selectedChipStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  borderRadius: 18,
  border: "1px solid #c7d2fe",
  background: "#eef2ff",
  padding: 14,
};

export default function FindPage() {
  const [mode, setMode] = useState<FindMode>("entry");

  return (
    <main style={pageStyle}>
      <section style={shellStyle}>
        <p style={eyebrowStyle}>지금 볼 웹툰 찾기</p>

        {mode === "entry" ? (
          <FindEntryScreen
            onSelectSimilarWork={() => setMode("similar_work")}
            onSelectScenePick={() => setMode("scene_pick")}
          />
        ) : null}

        {mode === "similar_work" ? (
          <SimilarWorkSearchScreen onBack={() => setMode("entry")} />
        ) : null}

        {mode === "scene_pick" ? (
          <ScenePickReadyScreen onBack={() => setMode("entry")} />
        ) : null}
      </section>
    </main>
  );
}

function FindEntryScreen({
  onSelectSimilarWork,
  onSelectScenePick,
}: {
  onSelectSimilarWork: () => void;
  onSelectScenePick: () => void;
}) {
  return (
    <>
      <h1 style={titleStyle}>
        비슷하게 볼 웹툰을
        <br />
        찾아볼게요.
      </h1>

      <p style={descriptionStyle}>
        재밌게 본 작품이 있다면 먼저 골라주세요.
        <br />
        비슷한 취향 포인트를 가진 작품을 추천해드려요.
        <br />
        작품명이 바로 안 떠오르면, 몇 가지만 골라서 후보를 좁혀볼게요.
      </p>

      <div style={cardGridStyle}>
        <button
          type="button"
          onClick={onSelectSimilarWork}
          style={primaryCardButtonStyle}
        >
          <span style={cardBadgeStyle}>Primary</span>

          <h2
            style={{
              margin: 0,
              fontSize: 26,
              lineHeight: 1.25,
              letterSpacing: "-0.04em",
            }}
          >
            재밌게 본 작품으로 찾기
          </h2>

          <p
            style={{
              margin: "12px 0 0",
              color: "#475569",
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            최근 재밌게 본 웹툰을 기준으로 비슷하거나 잘 맞는 작품을
            찾아요.
          </p>

          <p
            style={{
              margin: "18px 0 0",
              color: "#4f46e5",
              fontSize: 14,
              fontWeight: 900,
            }}
          >
            작품 1~3개 선택
          </p>
        </button>

        <button type="button" onClick={onSelectScenePick} style={cardButtonStyle}>
          <span
            style={{
              ...cardBadgeStyle,
              color: "#0f766e",
              background: "#ccfbf1",
            }}
          >
            Secondary
          </span>

          <h2
            style={{
              margin: 0,
              fontSize: 26,
              lineHeight: 1.25,
              letterSpacing: "-0.04em",
            }}
          >
            지금 끌리는 분위기 고르기
          </h2>

          <p
            style={{
              margin: "12px 0 0",
              color: "#475569",
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            작품명이 바로 안 떠오르면, 분위기와 장면을 몇 가지만 골라
            오늘 볼 후보를 좁혀요.
          </p>

          <p
            style={{
              margin: "18px 0 0",
              color: "#0f766e",
              fontSize: 14,
              fontWeight: 900,
            }}
          >
            분위기 → 장면 → 감상 리듬 3단계
          </p>
        </button>
      </div>

      <div
        style={{
          marginTop: 28,
          borderRadius: 20,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          padding: 18,
          color: "#64748b",
          fontSize: 14,
          lineHeight: 1.7,
        }}
      >
        D+25에서는 Primary 추천 결과를 TOP1~5 기본, TOP6~10 더보기
        구조로 정리합니다. Secondary는 기존 후보 좁히기 준비 화면을
        유지합니다.
      </div>

      <div
        style={{
          marginTop: 24,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link href="/tests" style={linkButtonStyle}>
          테스트 목록 보기
        </Link>

        <Link href="/" style={linkButtonStyle}>
          홈으로 돌아가기
        </Link>
      </div>
    </>
  );
}

function SimilarWorkSearchScreen({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedWebtoons, setSelectedWebtoons] = useState<WebtoonSeedItem[]>(
    []
  );
  const [selectionResult, setSelectionResult] =
    useState<SimilarWorkSelectionResult | null>(null);

  const searchResults = useMemo(() => {
    if (!normalizeSearchText(query)) return [];

    return WEBTOONS.filter((webtoon) => matchesSearchQuery(webtoon, query)).slice(
      0,
      10
    );
  }, [query]);

  const selectedIdSet = useMemo(() => {
    return new Set(
      selectedWebtoons.map((webtoon) => webtoon.canonicalWebtoonId)
    );
  }, [selectedWebtoons]);

  const canSubmit = selectedWebtoons.length >= 1 && selectedWebtoons.length <= 3;

  function handleSelectWebtoon(webtoon: WebtoonSeedItem) {
    setSelectionResult(null);

    if (selectedIdSet.has(webtoon.canonicalWebtoonId)) return;
    if (selectedWebtoons.length >= 3) return;

    setSelectedWebtoons((current) => [...current, webtoon]);
  }

  function handleRemoveWebtoon(canonicalWebtoonId: string) {
    setSelectionResult(null);

    setSelectedWebtoons((current) =>
      current.filter((webtoon) => {
        return webtoon.canonicalWebtoonId !== canonicalWebtoonId;
      })
    );
  }

  function handleSubmitSelection() {
    if (!canSubmit) return;

    setSelectionResult(
      createSimilarWorkSelectionResult({
        selectedWebtoons,
        allWebtoons: WEBTOONS,
        limit: 10,
      })
    );
  }

  return (
    <>
      <button type="button" onClick={onBack} style={backButtonStyle}>
        ← 찾기 방식 다시 고르기
      </button>

      <section style={modePanelStyle}>
        <p style={eyebrowStyle}>Primary · similar_work</p>

        <h1 style={titleStyle}>
          재밌게 본 작품으로
          <br />
          찾아볼게요.
        </h1>

        <p style={descriptionStyle}>
          최근 재밌게 본 웹툰을 1~3개 골라주세요.
          <br />
          선택한 작품의 장르, 세부 취향, 태그를 기준으로 비슷한 작품을
          찾아볼게요.
        </p>

        <div
          style={{
            marginTop: 28,
            display: "grid",
            gap: 14,
          }}
        >
          <label
            htmlFor="liked-work-search"
            style={{
              color: "#0f172a",
              fontSize: 15,
              fontWeight: 900,
            }}
          >
            작품명 검색
          </label>

          <input
            id="liked-work-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectionResult(null);
            }}
            placeholder="예: 전지적 독자 시점, 나 혼자만 레벨업, 화산귀환"
            style={{
              width: "100%",
              minHeight: 52,
              borderRadius: 14,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#0f172a",
              padding: "0 16px",
              fontSize: 16,
              boxSizing: "border-box",
            }}
          />

          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            작품명, 플랫폼, 대표 장르로 검색할 수 있어요. 쉼표나 특수문자가
            있어도 단어 기준으로 찾아요. 초성 검색은 이후 단계에서
            연결합니다.
          </p>

          <SearchResultList
            query={query}
            searchResults={searchResults}
            selectedIdSet={selectedIdSet}
            selectedCount={selectedWebtoons.length}
            onSelectWebtoon={handleSelectWebtoon}
          />

          <SelectedWebtoonList
            selectedWebtoons={selectedWebtoons}
            onRemoveWebtoon={handleRemoveWebtoon}
          />

          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmitSelection}
            style={canSubmit ? enabledButtonStyle : disabledButtonStyle}
          >
            이 작품들로 추천받기
          </button>

          {selectionResult ? (
            <FindRecommendationResult selectionResult={selectionResult} />
          ) : null}
        </div>
      </section>
    </>
  );
}

function SearchResultList({
  query,
  searchResults,
  selectedIdSet,
  selectedCount,
  onSelectWebtoon,
}: {
  query: string;
  searchResults: WebtoonSeedItem[];
  selectedIdSet: Set<string>;
  selectedCount: number;
  onSelectWebtoon: (webtoon: WebtoonSeedItem) => void;
}) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return (
      <div
        style={{
          borderRadius: 18,
          border: "1px dashed #cbd5e1",
          background: "#ffffff",
          padding: 18,
          color: "#64748b",
          fontSize: 14,
          lineHeight: 1.7,
        }}
      >
        작품명을 1글자 이상 입력하면 DB seed에 있는 작품을 검색합니다.
      </div>
    );
  }

  if (searchResults.length === 0) {
    return (
      <div
        style={{
          borderRadius: 18,
          border: "1px dashed #cbd5e1",
          background: "#ffffff",
          padding: 18,
          color: "#64748b",
          fontSize: 14,
          lineHeight: 1.7,
        }}
      >
        검색 결과가 없어요. 현재는 DB seed에 있는 작품명 기준으로만
        검색합니다.
      </div>
    );
  }

  return (
    <section
      style={{
        display: "grid",
        gap: 10,
      }}
      aria-label="작품 검색 결과"
    >
      <h2
        style={{
          margin: "4px 0 0",
          fontSize: 18,
          letterSpacing: "-0.03em",
        }}
      >
        검색 결과
      </h2>

      {searchResults.map((webtoon) => {
        const isSelected = selectedIdSet.has(webtoon.canonicalWebtoonId);
        const isMaxSelected = selectedCount >= 3;
        const isDisabled = isSelected || isMaxSelected;

        return (
          <article
            key={webtoon.canonicalWebtoonId}
            style={{
              display: "grid",
              gap: 12,
              borderRadius: 18,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              padding: 16,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  lineHeight: 1.35,
                  letterSpacing: "-0.03em",
                }}
              >
                {webtoon.title}
              </h3>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                {webtoon.platform} · {getGenreLabel(webtoon.mainGenre)} ·{" "}
                {getStatusLabel(webtoon.metadata.status)}
              </p>
            </div>

            <button
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectWebtoon(webtoon)}
              style={{
                minHeight: 42,
                borderRadius: 12,
                border: isSelected ? "1px solid #bbf7d0" : "none",
                background: isSelected
                  ? "#dcfce7"
                  : isMaxSelected
                    ? "#cbd5e1"
                    : "#4f46e5",
                color: isSelected ? "#15803d" : "#ffffff",
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 900,
                cursor: isDisabled ? "not-allowed" : "pointer",
              }}
            >
              {isSelected
                ? "선택됨"
                : isMaxSelected
                  ? "최대 3개 선택"
                  : "선택"}
            </button>
          </article>
        );
      })}
    </section>
  );
}

function SelectedWebtoonList({
  selectedWebtoons,
  onRemoveWebtoon,
}: {
  selectedWebtoons: WebtoonSeedItem[];
  onRemoveWebtoon: (canonicalWebtoonId: string) => void;
}) {
  return (
    <section
      style={{
        display: "grid",
        gap: 10,
      }}
      aria-label="선택한 작품"
    >
      <h2
        style={{
          margin: "8px 0 0",
          fontSize: 18,
          letterSpacing: "-0.03em",
        }}
      >
        선택한 작품 {selectedWebtoons.length} / 3
      </h2>

      {selectedWebtoons.length === 0 ? (
        <div
          style={{
            borderRadius: 18,
            border: "1px dashed #cbd5e1",
            background: "#ffffff",
            padding: 18,
            color: "#64748b",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          아직 선택한 작품이 없어요. 최소 1개를 선택하면 추천 준비를 할
          수 있어요.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {selectedWebtoons.map((webtoon) => (
            <article key={webtoon.canonicalWebtoonId} style={selectedChipStyle}>
              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: 16,
                    lineHeight: 1.4,
                  }}
                >
                  {webtoon.title}
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 4,
                    color: "#475569",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {webtoon.platform} · {getGenreLabel(webtoon.mainGenre)} ·{" "}
                  {getStatusLabel(webtoon.metadata.status)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onRemoveWebtoon(webtoon.canonicalWebtoonId)}
                style={{
                  width: "fit-content",
                  minHeight: 36,
                  borderRadius: 999,
                  border: "1px solid #c7d2fe",
                  background: "#ffffff",
                  color: "#4338ca",
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                삭제
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ScenePickReadyScreen({ onBack }: { onBack: () => void }) {
  return (
    <>
      <button type="button" onClick={onBack} style={backButtonStyle}>
        ← 찾기 방식 다시 고르기
      </button>

      <section style={modePanelStyle}>
        <p style={eyebrowStyle}>Secondary · scene_pick</p>

        <h1 style={titleStyle}>
          웹툰 후보를
          <br />
          좁히는 중
        </h1>

        <p style={descriptionStyle}>
          작품명을 몰라도 괜찮아요.
          <br />
          몇 가지만 고르면 지금 볼 만한 후보가 정리돼요.
        </p>

        <div
          style={{
            marginTop: 28,
            display: "grid",
            gap: 12,
          }}
        >
          <NarrowingStepCard
            progress="1 / 3"
            title="분위기 좁히기"
            legacyCategory="마음의 날씨"
            description="지금 필요한 에너지와 시작 분위기를 좁힙니다."
            questionExample="지금은 어떤 시작이 더 끌리나요?"
            optionExample="바로 사건이 터지는 시작 / 천천히 분위기가 스며드는 시작 / 성장 보상이 빨리 보이는 시작 / 관계가 먼저 궁금해지는 시작 / 기묘한 단서가 남는 시작"
            feedbackText="분위기를 기준으로 한 번 좁혔어요."
          />

          <NarrowingStepCard
            progress="2 / 3"
            title="장면 좁히기"
            legacyCategory="들어가고 싶은 장면"
            description="오늘 보고 싶은 세계와 상황을 좁힙니다."
            questionExample="어느 장면 쪽으로 더 들어가고 싶나요?"
            optionExample="던전·탑·마법 / 문파·비급·복수 / 궁정·계약·관계 / 사건 현장·폐쇄공간 / 회사·집·학교·동네"
            feedbackText="장면 취향까지 반영했어요."
          />

          <NarrowingStepCard
            progress="3 / 3"
            title="감상 리듬 좁히기"
            legacyCategory="머무는 방식"
            description="계속 볼 수 있는 전개 리듬을 좁힙니다."
            questionExample="오늘은 어떤 리듬이면 계속 볼 수 있을까요?"
            optionExample="빠르게 몰아치는 전개 / 떡밥을 따라가는 전개 / 감정이 쌓이는 전개 / 가볍게 넘기기 좋은 전개 / 한 장면이 오래 남는 전개"
            feedbackText="이제 오늘 볼 만한 후보만 남겨볼게요."
          />

          <div
            style={{
              borderRadius: 18,
              border: "1px dashed #cbd5e1",
              background: "#ffffff",
              padding: 18,
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            D+25에서는 Secondary 문항 선택과 추천 결과를 아직 구현하지
            않습니다. 다음 단계에서 기존 `scene_pick` answers 구조를
            유지하면서 후보 좁히기 UX를 연결합니다. 실제 후보 수 숫자와
            4단계 회피 문항은 MVP 즉시 반영이 아니라 후속 검토 항목입니다.
          </div>

          <button type="button" disabled style={disabledButtonStyle}>
            방금 고른 조건으로 추천 후보 정리하기
          </button>
        </div>
      </section>
    </>
  );
}

function NarrowingStepCard({
  progress,
  title,
  legacyCategory,
  description,
  questionExample,
  optionExample,
  feedbackText,
}: {
  progress: string;
  title: string;
  legacyCategory: string;
  description: string;
  questionExample: string;
  optionExample: string;
  feedbackText: string;
}) {
  return (
    <article
      style={{
        borderRadius: 18,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        padding: 18,
        display: "grid",
        gap: 8,
      }}
    >
      <span
        style={{
          color: "#4f46e5",
          fontSize: 13,
          fontWeight: 900,
        }}
      >
        {progress} · {title}
      </span>

      <h2
        style={{
          margin: 0,
          fontSize: 20,
          letterSpacing: "-0.03em",
        }}
      >
        {questionExample}
      </h2>

      <p
        style={{
          margin: 0,
          color: "#64748b",
          fontSize: 14,
          lineHeight: 1.7,
        }}
      >
        {description}
      </p>

      <div
        style={{
          borderRadius: 14,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          padding: 12,
          color: "#475569",
          fontSize: 13,
          lineHeight: 1.65,
        }}
      >
        <strong style={{ color: "#0f172a" }}>기존 카테고리:</strong>{" "}
        {legacyCategory}
        <br />
        <strong style={{ color: "#0f172a" }}>선택지 예시:</strong>{" "}
        {optionExample}
        <br />
        <strong style={{ color: "#0f172a" }}>단계 피드백:</strong>{" "}
        {feedbackText}
      </div>
    </article>
  );
}