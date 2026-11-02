import { safeWorkReturnPath } from './workDetailPresentation.mjs';

export const WORK_SEARCH_STATE_KEY = 'webtoon-match:work-search:is-adult-only-v3';

export function showFloatingSearch(path) {
  return (path === '/match' || path.startsWith('/match/')) && !path.startsWith('/match/test/') && path !== '/match/result/building';
}

export function searchBackPath(value) {
  const safe = safeWorkReturnPath(value);
  const path = safe.split(/[?#]/)[0];
  if (path === '/match/result/building') return '/match';
  return /^\/match\/(result\/[\w-]{1,100}(\/recommendations)?|c\/[\w-]{1,100}(\/ranking|\/match\/[\w-]{1,100})?|work\/[\w-]{1,100}|share\/(personal|pair|ranking)|challenge\/new)$/.test(path) ? safe : '/match';
}

export function workSearchHref(query = '', from = '/match') {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.normalize('NFC').trim().slice(0, 100));
  const back = searchBackPath(from);
  if (back !== '/match') params.set('from', back);
  return `/match/search${params.size ? `?${params}` : ''}`;
}

export function readWorkSearchState(storage, query, now = Date.now()) {
  try {
    const saved = JSON.parse(storage?.getItem(WORK_SEARCH_STATE_KEY) ?? 'null');
    if (!saved || saved.query !== query || !Number.isFinite(saved.savedAt) || now < saved.savedAt || now - saved.savedAt > 60 * 1000 || !Number.isInteger(saved.page) || saved.page < 1 || saved.page > 10000 || typeof saved.hasMore !== 'boolean' || !Number.isFinite(saved.scrollY) || saved.scrollY < 0 || !Array.isArray(saved.items) || saved.items.length > 1000) return null;
    if (!saved.items.every(item => item && typeof item.canonicalWebtoonId === 'string' && /^[\w-]{1,100}$/.test(item.canonicalWebtoonId) && typeof item.title === 'string' && typeof item.platform === 'string' && typeof item.mainGenre === 'string')) return null;
    return saved;
  } catch { return null; }
}
