import Link from "next/link";

const genres = [
  { name: "판타지", description: "숨겨진 규칙과 확장되는 세계관" },
  { name: "무협", description: "수련, 복수, 강호의 판세" },
  { name: "로맨스/로판", description: "관계 변화와 깊어지는 감정선" },
  { name: "스릴러/공포", description: "불안한 단서와 감춰진 진실" },
  { name: "드라마/일상", description: "인물의 마음과 잔잔한 여운" },
];

export default function GenreTestIntroPage() {
  return (
    <main className="min-h-screen bg-[#101014] text-white">
      <section className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
        <Link
          href="/"
          className="mb-10 inline-flex w-fit rounded-full border border-white/15 px-4 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
        >
          ← 처음으로
        </Link>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl sm:p-12">
          <p className="text-sm font-semibold text-white/50">
            웹툰 장르 취향 테스트
          </p>

          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            아직 제목도, 장르도 정해지지 않은
            <br />
            웹툰 한 편이 열립니다.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">
            당신이 고른 장면들이 모여, 먼저 끌리는 웹툰 세계를
            보여줍니다. 결과는 작품 추천이 아니라{" "}
            <span className="font-semibold text-white">
              내 웹툰 세계관 지도
            </span>
            로 나타납니다.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-5">
            {genres.map((genre) => (
              <div
                key={genre.name}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <h2 className="font-bold">{genre.name}</h2>
                <p className="mt-2 text-sm leading-5 text-white/45">
                  {genre.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/tests/genre/questions"
              className="rounded-2xl bg-white px-6 py-4 text-center font-semibold text-[#101014] transition hover:bg-white/90"
            >
              테스트 시작하기
            </Link>

            <Link
              href="/"
              className="rounded-2xl border border-white/15 px-6 py-4 text-center font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              나중에 하기
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          다음 단계에서 5개의 장면형 질문 화면을 연결합니다.
        </p>
      </section>
    </main>
  );
}