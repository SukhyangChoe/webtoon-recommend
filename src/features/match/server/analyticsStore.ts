import { MATCH_ANALYTICS_VERSION, isMatchEventName, sanitizeMatchEventProperties } from "../analytics/policy.mjs";
import { getMatchDatabase } from "./database";

const MAX_BATCH_SIZE = 20;
const MAX_EVENTS_PER_HOUR = 1_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AnalyticsEventInput = {
  eventId?: unknown;
  eventName?: unknown;
  occurredAt?: unknown;
  properties?: unknown;
};

type StoredAnalyticsEvent = {
  eventId: string;
  eventName: string;
  occurredAt: string;
  properties: Record<string, string | number | boolean>;
};

function normalizeEvent(input: AnalyticsEventInput, now: number): StoredAnalyticsEvent | null {
  if (!UUID_PATTERN.test(String(input.eventId ?? "")) || !isMatchEventName(input.eventName)) return null;
  const eventName = String(input.eventName);
  const occurredAt = typeof input.occurredAt === "string" ? new Date(input.occurredAt) : null;
  if (!occurredAt || !Number.isFinite(occurredAt.getTime())) return null;
  if (occurredAt.getTime() < now - 30 * 24 * 60 * 60 * 1_000 || occurredAt.getTime() > now + 10 * 60 * 1_000) return null;
  return {
    eventId: String(input.eventId),
    eventName,
    occurredAt: occurredAt.toISOString(),
    properties: sanitizeMatchEventProperties(eventName, input.properties as object | undefined) as Record<string, string | number | boolean>,
  };
}

export async function storeMatchAnalyticsEvents(anonymousId: string, inputs: unknown) {
  if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > MAX_BATCH_SIZE) {
    throw new Error("INVALID_ANALYTICS_INPUT");
  }

  const now = Date.now();
  const events = inputs.map((input) => normalizeEvent(input as AnalyticsEventInput, now));
  if (events.some((event) => !event)) throw new Error("INVALID_ANALYTICS_INPUT");
  const normalized = events as StoredAnalyticsEvent[];
  const database = getMatchDatabase();

  const recentRows = await database<{ count: string }[]>`
    select count(*)::text as count
    from public.match_analytics_events
    where anonymous_id = ${anonymousId}::uuid
      and received_at >= now() - interval '1 hour'
  `;
  if (Number(recentRows[0]?.count ?? 0) + normalized.length > MAX_EVENTS_PER_HOUR) {
    throw new Error("RATE_LIMITED");
  }

  await database.begin(async (sql) => {
    for (const event of normalized) {
      await sql`
        insert into public.match_analytics_events (
          event_id,
          anonymous_id,
          event_name,
          event_version,
          occurred_at,
          properties
        ) values (
          ${event.eventId}::uuid,
          ${anonymousId}::uuid,
          ${event.eventName},
          ${MATCH_ANALYTICS_VERSION},
          ${event.occurredAt}::timestamptz,
          ${sql.json(event.properties)}
        )
        on conflict (event_id) do nothing
      `;
    }
  });

  return { processedEventIds: normalized.map((event) => event.eventId) };
}
