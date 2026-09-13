import { isMatchEventName, sanitizeMatchEventProperties } from "./policy.mjs";

export const MATCH_EVENT_QUEUE_KEY = "webtoon-match:event-queue:v1";
export const MATCH_EVENT_BATCH_SIZE = 20;

function readQueue(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(MATCH_EVENT_QUEUE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(storage, queue) {
  storage?.setItem(MATCH_EVENT_QUEUE_KEY, JSON.stringify(queue.slice(-200)));
}

export function recordMatchEvent(storage, eventName, properties = {}, now = () => new Date().toISOString(), createId = () => crypto.randomUUID()) {
  if (!isMatchEventName(eventName)) return false;
  const queue = readQueue(storage);
  queue.push({
    eventId: createId(),
    eventName,
    properties: sanitizeMatchEventProperties(eventName, properties),
    occurredAt: now(),
  });
  writeQueue(storage, queue);
  return true;
}

export async function flushMatchEvents(storage, anonymousId, fetcher = globalThis.fetch) {
  const batch = readQueue(storage).slice(0, MATCH_EVENT_BATCH_SIZE);
  if (!batch.length || typeof fetcher !== "function" || typeof anonymousId !== "string") return { sent: 0, pending: batch.length };

  let response;
  try {
    response = await fetcher("/api/v1/match-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ anonymousId, events: batch }),
      keepalive: true,
    });
  } catch {
    return { sent: 0, pending: readQueue(storage).length };
  }

  if (!response.ok && (response.status >= 500 || response.status === 429)) {
    return { sent: 0, pending: readQueue(storage).length };
  }

  const processedIds = new Set(batch.map((event) => event.eventId));
  const remaining = readQueue(storage).filter((event) => !processedIds.has(event.eventId));
  writeQueue(storage, remaining);
  return { sent: response.ok ? batch.length : 0, pending: remaining.length };
}
