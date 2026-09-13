import { MatchBootstrap } from "@/features/match/components/MatchBootstrap";
import { loadMatchConfig } from "@/features/match/config";

export default function MatchHomePage() {
  const config = loadMatchConfig();
  return (
    <main className="match-page">
      <section className="match-card match-hero">
        <p className="match-eyebrow">웹툰궁합</p>
        <div className="match-star-cluster" aria-label="웹툰 취향별">✦ ✦ ✦<br />✦ ✦</div>
        <h1>우리, 웹툰 취향은<br />얼마나 닮았을까?</h1>
        <p>짧은 취향 테스트로 내 웹툰 취향을 찾고, 친구와 1:1 궁합을 비교해 보세요.</p>
        <MatchBootstrap />
        <small className="match-version">pilot · {config.versions.questions}</small>
      </section>
    </main>
  );
}
