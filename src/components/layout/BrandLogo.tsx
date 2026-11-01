import { BRAND_LOGO, brandLogoContents } from './brandIdentity.mjs';

export function BrandLogo() {
  return <svg className="brand-logo" width={BRAND_LOGO.width} height={BRAND_LOGO.height} viewBox={BRAND_LOGO.viewBox} aria-hidden="true" dangerouslySetInnerHTML={{ __html: brandLogoContents() }} />;
}
