export default function Home() {
  return (
    <main className="min-h-screen bg-[#101014] text-white">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70">
          웹툰 추천 서비스 MVP
        </div>

        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          지금 내 취향에 맞는
          <br />
          웹툰 세계를 찾아볼까요?
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-8 text-white/65 sm:text-lg">
          장르를 직접 고르지 않아도 괜찮아요.  
          몇 가지 장면을 고르면, 당신이 먼저 끌리는 웹툰 세계와
          지금 보기 좋은 작품 방향을 찾아볼게요.
        </p>

        <div className="mt-10 flex w-full max-w-xl flex-col gap-4 sm:flex-row sm:justify-center">
          <a
            href="/tests/genre"
            className="rounded-2xl bg-white px-6 py-4 text-base font-semibold text-[#101014] transition hover:bg-white/90"
          >
            웹툰 장르 취향 테스트
          </a>

          <a
            href="/now"
            className="rounded-2xl border border-white/20 bg-white/5 px-6 py-4 text-base font-semibold text-white transition hover:bg-white/10"
          >
            지금 볼 웹툰 찾기
          </a>
        </div>

        <div className="mt-14 grid w-full gap-4 text-left sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-semibold text-white">1단계</p>
            <h2 className="mt-2 text-lg font-bold">장면을 고르기</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              직접 장르를 묻지 않고, 웹툰 첫 화처럼 장면을 고릅니다.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-semibold text-white">2단계</p>
            <h2 className="mt-2 text-lg font-bold">취향 지도 만들기</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              선택한 장면을 바탕으로 판타지, 무협, 로맨스/로판 등
              장르 취향을 계산합니다.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-semibold text-white">3단계</p>
            <h2 className="mt-2 text-lg font-bold">추천으로 연결</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              취향 결과를 바탕으로 나중에 지금 볼 웹툰 추천까지
              이어집니다.
            </p>
          </div>
        </div>

        <p className="mt-10 text-xs text-white/35">
          현재 화면은 개발용 첫 랜딩 페이지입니다.
        </p>
      </section>
    </main>
  );
}