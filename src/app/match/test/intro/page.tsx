import { MatchIntroActions } from "@/features/match/components/MatchIntroActions";

export default function MatchIntroPage() {
  return (
    <main className="match-page match-intro-page">
      <section className="match-card">
        <p className="match-eyebrow">시작하기</p>
        <h1>먼저 사용할<br />닉네임을 정해 주세요</h1>
        <p>결과와 궁합 랭킹에 표시될 이름이에요.</p>
        <MatchIntroActions />
        <div className="match-intro-guides"><div className="match-mini-guide"><span>1</span><p><strong>평소의 취향대로 골라 주세요</strong><br />정답이 없는 질문이에요.</p></div><div className="match-mini-guide"><span>2</span><p><strong>추천작으로 취향을 더할 수 있어요</strong><br />결과를 보고 좋아하는 작품을 등록해요.</p></div><aside className="match-soft-note">사람 사이의 관계나 성격이 아닌,<br />웹툰 취향을 비교하는 테스트예요.</aside></div>
      </section>
    </main>
  );
}
