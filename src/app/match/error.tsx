"use client";

export default function MatchError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="match-page">
      <section className="match-card" role="alert">
        <p className="match-eyebrow">잠시 문제가 생겼어요</p>
        <h1>화면을 불러오지 못했어요</h1>
        <p>저장된 응답은 그대로 두었어요. 다시 시도해 주세요.</p>
        <button className="match-button" type="button" onClick={reset}>다시 시도</button>
        <a className="match-text-link" href="/match">웹툰궁합 처음으로</a>
      </section>
    </main>
  );
}
