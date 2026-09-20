import { MatchIntroActions } from "@/features/match/components/MatchIntroActions";

export default function MatchIntroPage() {
  return (
    <main className="match-page">
      <section className="match-card">
        <p className="match-eyebrow">시작하기 전에</p>
        <h1>먼저 사용할 닉네임을 정해 주세요</h1>
        <ul className="match-guide-list">
          <li>닉네임을 저장한 다음 바로 취향 테스트가 시작돼요.</li>
          <li>성격 검사가 아니라 실제 웹툰 감상 취향을 봐요.</li>
          <li>유명 작품을 몰라도 답할 수 있어요.</li>
          <li>먼저 손이 가는 쪽을 가볍게 골라 주세요.</li>
        </ul>
        <MatchIntroActions />
      </section>
    </main>
  );
}
