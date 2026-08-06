import Link from "next/link";

export default function TestHeroCard({
  hasStoredResult,
  storageChecked,
}: {
  hasStoredResult: boolean;
  storageChecked: boolean;
}) {
  const primaryLabel = !storageChecked
    ? "결과 확인 중"
    : hasStoredResult
      ? "결과 보기"
      : "장르 취향 알아보기";

  return (
    <article className="test-hub-hero">
      <div className="test-hub-hero__content">
        <div className="test-hub-hero__badges">
          <span className="test-hub-badge test-hub-badge--primary">
            대표 테스트
          </span>
          {storageChecked && hasStoredResult ? (
            <span className="test-hub-badge test-hub-badge--complete">
              완료
            </span>
          ) : null}
        </div>

        <p className="test-hub-hero__eyebrow">내 웹툰 세계관부터 가볍게</p>
        <h2 className="test-hub-hero__title">웹툰 장르 취향 테스트</h2>
        <p className="test-hub-hero__description">
          두 장면 중 더 보고 싶은 쪽을 고르면 내가 어떤 웹툰 장르에
          끌리는지 확인할 수 있어요.
        </p>

        <div className="test-hub-hero__meta">
          <span>10문항</span>
          <span aria-hidden="true">·</span>
          <span>예상 시간 약 1분</span>
        </div>

        <div className="test-hub-hero__actions">
          <Link
            href="/genre-preference"
            className="test-hub-primary-link"
            aria-disabled={!storageChecked}
          >
            {primaryLabel}
          </Link>

          {storageChecked && hasStoredResult ? (
            <Link
              href="/genre-preference"
              className="test-hub-restart-link"
            >
              다시 테스트하기
            </Link>
          ) : null}
        </div>
      </div>

      <div className="test-hub-hero__visual" aria-hidden="true">
        <div className="test-hub-map-orbit test-hub-map-orbit--outer" />
        <div className="test-hub-map-orbit test-hub-map-orbit--inner" />
        <div className="test-hub-map-node test-hub-map-node--fantasy">
          판타지
        </div>
        <div className="test-hub-map-node test-hub-map-node--murim">무협</div>
        <div className="test-hub-map-node test-hub-map-node--romance">
          로판
        </div>
        <div className="test-hub-map-node test-hub-map-node--thriller">
          스릴러
        </div>
        <div className="test-hub-map-node test-hub-map-node--drama">일상</div>
        <div className="test-hub-map-center">웹툰핏</div>
      </div>
    </article>
  );
}