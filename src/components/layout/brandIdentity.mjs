// One vector drawing for every site header and the exported compatibility card.
// All markup is static; never interpolate user-controlled text here.
export const BRAND_LOGO = Object.freeze({ width: 110, height: 32, viewBox: '0 0 110 32' });
export function brandLogoContents(fontFamily = 'WebtoonFit Brand') {
  return `<path d="M12 3H17C23 3 27 7 27 13V15C27 20 24 23 20 24L17 29L11 25H12C5 25 1.5 21 1.5 15V13C1.5 7 5 3 12 3Z" fill="none" stroke="#17324d" stroke-width="2.2" stroke-linejoin="round"/><circle cx="18" cy="11" r="3.3" fill="#53d8bd"/><text x="36" y="22" fill="#17324d" style="font-family:'${fontFamily}',sans-serif;font-size:20px;font-weight:700;letter-spacing:-1.1px">웹툰핏</text>`;
}
