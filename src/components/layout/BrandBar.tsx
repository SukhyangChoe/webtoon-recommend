import Link from "next/link";
import { BrandLogo } from './BrandLogo';

export function BrandBar() {
  return (
    <header className="brand-bar">
      <div className="brand-bar__inner">
        <Link className="brand-bar__logo" href="/match" aria-label="웹툰핏 홈으로 이동">
          <BrandLogo />
        </Link>
      </div>
    </header>
  );
}
