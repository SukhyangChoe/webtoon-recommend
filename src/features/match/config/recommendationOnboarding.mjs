import { safeWorkReturnPath } from './workDetailPresentation.mjs';

export const RECOMMENDATION_PROMPT_KEY = 'webtoon-match:recommendation-prompt:v1';
const validId = value => typeof value === 'string' && /^[\w-]{1,100}$/.test(value);

/** Repeat on normal result/discovery navigation, never home, testing or editing. */
export function showRecommendationNudge(path) {
  if (typeof path !== 'string') return false;
  const pathname = path.split('?')[0];
  return pathname.startsWith('/match/') && pathname !== '/match/'
    && !/^\/match\/test(?:\/|$)/.test(pathname) && pathname !== '/match/result/building'
    && !/\/recommendations\/?$/.test(pathname);
}

/** Only a personal result, pair result or work detail can be a post-registration destination. */
export function recommendationReturnPath(value, profileId) {
  const fallback = `/match/result/${encodeURIComponent(profileId)}`;
  const safe = safeWorkReturnPath(value);
  const url = new URL(safe, 'https://webtoonfit.invalid');
  return url.pathname === fallback || /^\/match\/c\/[\w-]{1,100}\/match\/[\w-]{1,100}$/.test(url.pathname) || /^\/match\/work\/[\w-]{1,100}$/.test(url.pathname) ? url.pathname + url.search : fallback;
}

export function recommendationReturnLabel(path) {
  return path.startsWith('/match/c/') ? '궁합' : path.startsWith('/match/work/') ? '작품 상세' : '내 취향 결과';
}

export function recommendationManagerHref(profileId, destination) {
  const path = `/match/result/${encodeURIComponent(profileId)}/recommendations`;
  return destination ? `${path}?${new URLSearchParams({ returnTo: recommendationReturnPath(destination, profileId) })}` : path;
}

export function queueRecommendationPrompt(session, profileId, destination, now = Date.now()) {
  if (!validId(profileId)) return false;
  try {
    session.setItem(RECOMMENDATION_PROMPT_KEY, JSON.stringify({ profileId, destination: recommendationReturnPath(destination, profileId), savedAt: now }));
    return true;
  } catch { return false; }
}

export function readRecommendationPrompt(session, currentPath, now = Date.now()) {
  try {
    const item = JSON.parse(session?.getItem(RECOMMENDATION_PROMPT_KEY) ?? 'null');
    if (!item || !validId(item.profileId) || !Number.isFinite(item.savedAt) || now < item.savedAt || now - item.savedAt > 24 * 60 * 60 * 1000) return null;
    const destination = recommendationReturnPath(item.destination, item.profileId);
    if (destination !== item.destination || currentPath !== destination) return null;
    return { profileId: item.profileId, destination };
  } catch { return null; }
}

export function dismissRecommendationPrompt(session) {
  try { session?.removeItem(RECOMMENDATION_PROMPT_KEY); } catch { /* Optional onboarding never blocks a completed result. */ }
}
