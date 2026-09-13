"use client";

import { useEffect, useRef, useState } from "react";
import { trackMatchEvent } from "../analytics/client";
import { pairArchetypeFor } from "../share/shareArchetypes.mjs";

type PairResult = { ownerNickname: string; challengerNickname: string; score: number; band: { label: string; subcopy: string }; sharedGenres: string[]; differentGenres: string[]; sharedTasteLabels: string[]; trustSentence: string; rank: number; entryCount: number };

export function PairResultView({ challengeCode, resultId }: { challengeCode: string; resultId: string }) {
  const [result, setResult] = useState<PairResult | null>(null);
  const [error, setError] = useState("");
  const resultTracked = useRef(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/v1/challenges/${challengeCode}/results/${resultId}`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error();
      if (active) {
        setResult(body);
        if (!resultTracked.current) {
          resultTracked.current = true;
          trackMatchEvent("wm_pair_result_view", { challengeCode, scoreBand: body.band?.label ?? "", rank: body.rank ?? 0 });
        }
      }
    }).catch(() => active && setError("이 궁합 결과를 찾지 못했어요."));
    return () => { active = false; };
  }, [challengeCode, resultId]);

  if (error) return <main className="match-page"><section className="match-card match-hero"><h1>{error}</h1><a className="match-button" href={`/match/c/${challengeCode}`}>초대 화면으로</a></section></main>;
  if (!result) return <main className="match-page"><section className="match-card match-hero"><p>둘의 궁합을 불러오는 중이에요…</p></section></main>;
  const archetype = pairArchetypeFor(result.score);

  return <main className="match-page match-pair-page"><section className={`match-pair-hero is-${archetype.theme}`}><p className="match-eyebrow">{result.ownerNickname} × {result.challengerNickname}</p><h1>웹툰궁합</h1><div className="match-score-ring"><strong>{result.score}</strong><span>%</span></div><strong className="match-pair-type-badge">{result.band.label}</strong><p className="match-pair-type-label">우리의 웹툰 관계 타입</p><h2>{archetype.name}</h2><p className="match-pair-archetype-copy">{archetype.description}</p></section><PairSection title="같이 달릴 장르" items={result.sharedGenres} empty="서로의 새 장르를 개척해 봐요" /><PairSection title="각자 영업할 장르" items={result.differentGenres} empty="장르 분포까지 거의 한마음이에요" /><PairSection title="함께 맞는 취향" items={result.sharedTasteLabels} empty="세부 취향은 각자 다른 매력이 있어요" /><section className="match-result-section match-trust-card"><h2>이 사람 추천, 믿어도 될까?</h2><p>{result.trustSentence}</p></section><section className="match-result-section match-rank-summary"><span>현재 순위</span><strong>{result.rank}위</strong><small>도전자 {result.entryCount}명 중</small></section><p className="match-disclaimer">웹툰궁합은 이 테스트 응답으로 본 취향 비교 결과이며, 사람 사이의 관계나 성격을 평가하지 않아요.</p><div className="match-result-actions"><a className="match-button" href={`/match/share/pair?challengeCode=${challengeCode}&resultId=${resultId}`}>관계 타입 카드 공유하기</a><a className="match-button match-button--secondary" href={`/match/c/${challengeCode}/ranking`}>전체 랭킹 보기 · 현재 {result.rank}위</a><a className="match-button match-button--secondary" href="/match/challenge/new">친구에게 보낼 초대 링크 만들기</a><a className="match-button match-button--secondary" href={`/match/c/${challengeCode}`}>초대 링크로 돌아가기</a></div></main>;
}

function PairSection({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <section className="match-result-section"><h2>{title}</h2>{items.length ? <div className="match-labels">{items.map((item) => <span key={item}>{item}</span>)}</div> : <p className="match-empty-label">{empty}</p>}</section>;
}
