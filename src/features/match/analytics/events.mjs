export const MATCH_EVENT_QUEUE_KEY = "webtoon-match:event-queue:v1";

const SHARE_EVENTS = new Set(["wm_share_intent_click", "wm_share_fallback", "wm_ranking_share_click"]);
const BLOCKED_PROPERTY_PATTERN = /(nickname|answer|vector|raw|token)/i;

export function recordMatchEvent(storage, eventName, properties = {}, now = () => new Date().toISOString()) {
  if (!SHARE_EVENTS.has(eventName)) return false;
  const safeProperties = Object.fromEntries(Object.entries(properties).filter(([key, value]) => {
    return !BLOCKED_PROPERTY_PATTERN.test(key) && ["string", "number", "boolean"].includes(typeof value);
  }));
  let queue = [];
  try {
    const parsed = JSON.parse(storage?.getItem(MATCH_EVENT_QUEUE_KEY) ?? "[]");
    if (Array.isArray(parsed)) queue = parsed;
  } catch {}
  queue.push({ eventName, properties: safeProperties, occurredAt: now() });
  storage?.setItem(MATCH_EVENT_QUEUE_KEY, JSON.stringify(queue.slice(-200)));
  return true;
}
