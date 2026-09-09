import { MatchIntroActions } from "@/features/match/components/MatchIntroActions";

export default function MatchIntroPage() {
  return (
    <main className="match-page">
      <section className="match-card">
        <p className="match-eyebrow">시작하기 전에</p>
        <h1>오래 고민하지 않아도 괜찮아요</h1>
        <ul className="match-guide-list">
          <li>성격 검사가 아니라 실제 웹툰 감상 취향을 봐요.</li>
          <li>유명 작품을 몰라도 답할 수 있어요.</li>
          <li>먼저 손이 가는 쪽을 가볍게 골라 주세요.</li>
        </ul>
        <MatchIntroActions />
      </section>
    </main>
  );
}
