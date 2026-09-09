export const MATCH_ANONYMOUS_COOKIE = "wm_aid";
export const MATCH_ANONYMOUS_STORAGE_KEY = "webtoon-match:anonymous-id:v1";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAnonymousId(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function readCookie(cookieText, name = MATCH_ANONYMOUS_COOKIE) {
  const prefix = `${encodeURIComponent(name)}=`;
  const item = cookieText.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

export function ensureAnonymousId({ cookieText = "", storage, createId = () => crypto.randomUUID() }) {
  const cookieId = readCookie(cookieText);
  if (isAnonymousId(cookieId)) {
    storage?.setItem(MATCH_ANONYMOUS_STORAGE_KEY, cookieId);
    return { anonymousId: cookieId, source: "cookie", created: false };
  }

  const storedId = storage?.getItem(MATCH_ANONYMOUS_STORAGE_KEY) ?? null;
  if (isAnonymousId(storedId)) {
    return { anonymousId: storedId, source: "localStorage", created: false };
  }

  const anonymousId = createId();
  if (!isAnonymousId(anonymousId)) throw new Error("Anonymous identity generator returned an invalid UUID");
  storage?.setItem(MATCH_ANONYMOUS_STORAGE_KEY, anonymousId);
  return { anonymousId, source: "generated", created: true };
}

export function persistAnonymousCookie(anonymousId, secure = false) {
  if (!isAnonymousId(anonymousId)) return null;
  return `${MATCH_ANONYMOUS_COOKIE}=${encodeURIComponent(anonymousId)}; Path=/match; Max-Age=31536000; SameSite=Lax${secure ? "; Secure" : ""}`;
}
