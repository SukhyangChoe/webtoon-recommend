import Link from "next/link";

export default function DetailTestListCard({
  title,
  description,
  route,
  hasStoredResult,
  storageChecked,
}: {
  title: string;
  description: string;
  route: string;
  hasStoredResult: boolean;
  storageChecked: boolean;
}) {
  const actionLabel = !storageChecked
    ? "결과 확인 중"
    : hasStoredResult
      ? "결과 보기"
      : "시작하기";

  return (
    <article className="detail-test-card">
      <div className="detail-test-card__topline">
        <span className="detail-test-card__genre">{title}</span>
        {storageChecked && hasStoredResult ? (
          <span className="test-hub-badge test-hub-badge--complete">완료</span>
        ) : null}
      </div>

      <p className="detail-test-card__description">{description}</p>

      <div className="detail-test-card__meta">
        <span>6문항</span>
        <span aria-hidden="true">·</span>
        <span>예상 시간 약 1분</span>
      </div>

      <div className="detail-test-card__actions">
        <Link
          href={route}
          className="detail-test-card__primary"
          aria-disabled={!storageChecked}
        >
          {actionLabel}
        </Link>

        {storageChecked && hasStoredResult ? (
          <Link href={route} className="detail-test-card__restart">
            다시 테스트하기
          </Link>
        ) : null}
      </div>
    </article>
  );
}