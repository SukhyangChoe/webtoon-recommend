import { MatchBootstrap } from "@/features/match/components/MatchBootstrap";
import Image from "next/image";
import { MatchPanel } from "@/features/match/components/MatchUI";

export default function MatchHomePage() {
  return (
    <main className="match-page match-home-page">
      <MatchPanel className="match-home-hero">
        <p className="match-eyebrow">WEBTOON FIT · MATCH</p>
        <h1>우리, 웹툰 취향은<br />얼마나 닮았을까?</h1>
        <p>나의 웹툰 취향을 찾고,<br />친구와 얼마나 닮았는지 확인해 보세요.</p>
        <Image className="match-home-readers" src="/match/hero-cyan-readers.png" alt="웹툰을 읽으며 서로의 이야기를 나누는 두 사람" width={700} height={420} priority />
        <div className="match-mini-guide"><span>01</span><p><strong>1분 남짓, 가벼운 취향 테스트</strong><br />장르와 마음에 드는 장면을 골라요.</p></div>
        <div className="match-mini-guide"><span>02</span><p><strong>친구와 취향 비교</strong><br />링크를 나누고 서로의 추천작을 만나요.</p></div>
        <MatchBootstrap />
      </MatchPanel>
    </main>
  );
}
