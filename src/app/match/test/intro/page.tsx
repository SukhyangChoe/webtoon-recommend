import { MatchIntroActions } from "@/features/match/components/MatchIntroActions";

export default function MatchIntroPage() {
  return (
    <main className="match-page match-intro-page">
      <section className="match-card">
        <p className="match-eyebrow">시작하기</p>
        <h1>먼저 사용할<br />닉네임을 정해 주세요</h1>
        <p className="match-helper">결과·궁합 랭킹에 표시할 이름</p>
        <MatchIntroActions />
        <div className="match-intro-guides"><div className="match-mini-guide"><span>1</span><p><strong>평소 취향대로 선택</strong><br />정답 없는 취향 질문</p></div><div className="match-mini-guide"><span>2</span><p><strong>추천작으로 취향 보완</strong><br />결과 확인 후 좋아하는 작품 등록</p></div><aside className="match-soft-note">사람·성격 평가가 아닌,<br />웹툰 취향 비교 테스트</aside></div>
      </section>
    </main>
  );
}
