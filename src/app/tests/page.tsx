"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import DetailTestListCard from "@/components/tests/DetailTestListCard";
import TestHeroCard from "@/components/tests/TestHeroCard";
import { loadAllKnownTestResults } from "@/lib/storage/resultRepository";
import type { StoredTestResult, TestKey } from "@/types/testResults";

type DetailTestCard = {
  testKey: TestKey;
  title: string;
  description: string;
  route: string;
};

const DETAIL_TEST_CARDS: DetailTestCard[] = [
  {
    testKey: "fantasy_detail",
    title: "판타지",
    description: "시스템·성장·생존·왕국 전략 중 오래 머물 취향을 찾아봐요.",
    route: "/tests/fantasy",
  },
  {
    testKey: "murim_detail",
    title: "무협",
    description: "수련·절대강자·복수·문파 정치·협객 취향을 확인해요.",
    route: "/tests/murim",
  },
  {
    testKey: "romance_ropan_detail",
    title: "로맨스·로판",
    description: "감정선·관계 주도권·궁정 권력·힐링 동행 취향을 찾아봐요.",
    route: "/tests/romance-ropan",
  },
  {
    testKey: "thriller_horror_detail",
    title: "스릴러·공포",
    description: "추리·생존·오컬트·심리 압박·반전 취향을 확인해요.",
    route: "/tests/thriller-horror",
  },
  {
    testKey: "drama_daily_detail",
    title: "드라마·일상",
    description: "현실 공감·청춘 성장·힐링·가족·생활 코미디 취향을 찾아봐요.",
    route: "/tests/drama-daily",
  },
];

export default function TestsPage() {
  const [storedResults, setStoredResults] = useState<
    Partial<Record<TestKey, StoredTestResult>>
  >({});
  const [storageChecked, setStorageChecked] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStoredResults(loadAllKnownTestResults());
      setStorageChecked(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <main className="tests-hub-page">
      <PageContainer className="tests-hub-page__container">
        <header className="tests-hub-header">
          <p className="tests-hub-header__eyebrow">웹툰 취향 테스트</p>
          <h1>내가 좋아하는 웹툰의 결을 찾아봐요</h1>
          <p>
            전체 장르 지도를 먼저 확인하거나, 지금 궁금한 장르부터 더 깊게
            알아볼 수 있어요.
          </p>
        </header>

        <section aria-label="대표 장르 취향 테스트">
          <TestHeroCard
            storageChecked={storageChecked}
            hasStoredResult={Boolean(storedResults.genre_preference)}
          />
        </section>

        <section
          className="detail-test-section"
          aria-labelledby="detail-test-section-title"
        >
          <div className="detail-test-section__heading">
            <div>
              <p>장르를 더 자세히</p>
              <h2 id="detail-test-section-title">장르별 세부 취향 테스트</h2>
            </div>
            <p>
              이미 좋아하는 장르가 있다면 이야기·인물·전개 중 어떤 부분에
              더 끌리는지 확인해보세요.
            </p>
          </div>

          <div className="detail-test-grid">
            {DETAIL_TEST_CARDS.map((card) => (
              <DetailTestListCard
                key={card.testKey}
                title={card.title}
                description={card.description}
                route={card.route}
                storageChecked={storageChecked}
                hasStoredResult={Boolean(storedResults[card.testKey])}
              />
            ))}
          </div>
        </section>
      </PageContainer>
    </main>
  );
}