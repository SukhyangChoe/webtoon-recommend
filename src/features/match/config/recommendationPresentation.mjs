export const recommendationGenreLabels = {
  fantasy: "판타지", murim: "무협", romance: "로맨스", ropan: "로판",
  romance_ropan: "로맨스·로판", action: "액션", thriller_horror: "스릴러·공포",
  drama_daily: "드라마·일상", comedy: "코미디", sports: "스포츠",
};

export function recommendationGenreLabel(key) {
  return recommendationGenreLabels[key] ?? key ?? "웹툰";
}

export function safeWorkCoverUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function workCoverSources(value) {
  const src = safeWorkCoverUrl(value);
  // Only our immutable, paired import paths have a guaranteed 320px sibling.
  const paired = /^https:\/\/[a-z0-9]{20}\.supabase\.co\/storage\/v1\/object\/public\/webtoon-covers\/v1\/wt_[a-z0-9_]+\/[a-f0-9]{64}-w640-q82-v1\.webp$/.test(src ?? '');
  return { src, srcSet: paired ? `${src.replace('-w640-', '-w320-')} 320w, ${src} 640w` : undefined };
}

export function appendRecommendationReason(comment, reason, maxLength = 80) {
  const next = [comment?.trim(), reason?.trim()].filter(Boolean).join(" ");
  return [...next].length <= maxLength ? next : null;
}

export function reorderRecommendation(items, sourceId, targetId) {
  const from = items.findIndex(item => item.canonicalWebtoonId === sourceId);
  const to = items.findIndex(item => item.canonicalWebtoonId === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const RECOMMENDATION_TITLE_PIXELS_PER_SECOND = 48;
export const RECOMMENDATION_TITLE_START_HOLD_SECONDS = .5;
export const RECOMMENDATION_TITLE_END_HOLD_SECONDS = 1;

/** Half-second start hold, fixed pixel speed, one-second end hold, instant reset. */
export function recommendationTitleMotion(distance) {
  const travel = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  const moveDuration = travel / RECOMMENDATION_TITLE_PIXELS_PER_SECOND;
  const startHoldDuration = RECOMMENDATION_TITLE_START_HOLD_SECONDS;
  const holdDuration = RECOMMENDATION_TITLE_END_HOLD_SECONDS;
  const duration = startHoldDuration + moveDuration + holdDuration;
  return { travel, duration, moveDuration, startHoldDuration, holdDuration, moveStartPercent: startHoldDuration / duration * 100, moveEndPercent: (startHoldDuration + moveDuration) / duration * 100 };
}

export function recommendationScrollTarget(left, viewport, content, key) {
  const max = Math.max(0, content - viewport);
  const target = key === 'Home' ? 0 : key === 'End' ? max : left + (key === 'ArrowRight' ? 80 : -80);
  return Math.max(0, Math.min(max, target));
}
