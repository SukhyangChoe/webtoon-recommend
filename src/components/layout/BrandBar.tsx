import Link from "next/link";

export function BrandBar() {
  return (
    <header className="brand-bar">
      <div className="brand-bar__inner">
        <Link className="brand-bar__logo" href="/match" aria-label="웹툰궁합 홈으로 이동">
          <span className="brand-bar__mark" aria-hidden="true">
            <span className="brand-bar__mint-dot" />
          </span>
          <span className="brand-bar__wordmark">웹툰핏</span>
        </Link>
      </div>
    </header>
  );
}
