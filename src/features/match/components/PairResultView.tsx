"use client";

import { useEffect, useState } from "react";

type PairResult = { ownerNickname: string; challengerNickname: string; score: number; band: { label: string; subcopy: string }; sharedGenres: string[]; differentGenres: string[]; sharedTasteLabels: string[]; trustSentence: string; rank: number; entryCount: number };

export function PairResultView({ challengeCode, resultId }: { challengeCode: string; resultId: string }) {
  const [result, setResult] = useState<PairResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch(`/api/v1/challenges/${challengeCode}/results/${resultId}`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error();
      if (active) setResult(body);
    }).catch(() => active && setError("이 궁합 결과를 찾지 못했어요."));
    return () => { active = false; };
  }, [challengeCode, resultId]);

  if (error) return <main className="match-page"><section className="match-card match-hero"><h1>{error}</h1><a className="match-button" href={`/match/c/${challengeCode}`}>초대 화면으로</a></section></main>;
  if (!result) return <main className="match-page"><section className="match-card match-hero"><p>둘의 궁합을 불러오는 중이에요…</p></section></main>;

  return <main className="match-page match-pair-page"><section className="match-pair-hero"><p className="match-eyebrow">{result.ownerNickname} × {result.challengerNickname}</p><h1>웹툰궁합</h1><div className="match-score-ring"><strong>{result.score}</strong><span>%</span></div><h2>{result.band.label}</h2><p>{result.band.subcopy}</p></section><PairSection title="둘 다 잘 보는 장르" items={result.sharedGenres} empty="딱 겹치는 주력 장르는 적어요" /><PairSection title="여기서 갈림" items={result.differentGenres} empty="장르 분포까지 거의 비슷해요" /><PairSection title="함께 맞는 취향" items={result.sharedTasteLabels} empty="세부 취향은 각자 다른 매력이 있어요" /><section className="match-result-section match-trust-card"><h2>이 사람 추천, 믿어도 될까?</h2><p>{result.trustSentence}</p></section><section className="match-result-section match-rank-summary"><span>현재 순위</span><strong>{result.rank}위</strong><small>도전자 {result.entryCount}명 중</small></section><p className="match-disclaimer">웹툰궁합은 이 테스트 응답으로 본 취향 비교 결과이며, 사람 사이의 관계나 성격을 평가하지 않아요.</p><div className="match-result-actions"><a className="match-button" href={`/match/c/${challengeCode}/ranking`}>전체 랭킹 보기 · 현재 {result.rank}위</a><a className="match-button match-button--secondary" href="/match/challenge/new">내 궁합 링크 만들기</a><a className="match-button match-button--secondary" href={`/match/c/${challengeCode}`}>초대 링크로 돌아가기</a></div></main>;
}

function PairSection({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <section className="match-result-section"><h2>{title}</h2>{items.length ? <div className="match-labels">{items.map((item) => <span key={item}>{item}</span>)}</div> : <p className="match-empty-label">{empty}</p>}</section>;
}
