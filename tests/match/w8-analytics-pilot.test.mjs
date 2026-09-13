import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  MATCH_EVENT_BATCH_SIZE,
  MATCH_EVENT_QUEUE_KEY,
  flushMatchEvents,
  recordMatchEvent,
} from "../../src/features/match/analytics/events.mjs";
import {
  MATCH_EVENT_NAMES,
  sanitizeMatchEventProperties,
} from "../../src/features/match/analytics/policy.mjs";

const migrationPath = new URL("../../supabase/migrations/202609130001_webtoon_match_analytics.sql", import.meta.url);
const analyticsStorePath = new URL("../../src/features/match/server/analyticsStore.ts", import.meta.url);
const apiErrorsPath = new URL("../../src/features/match/server/apiErrors.ts", import.meta.url);

const migration = readFileSync(migrationPath, "utf8");
const analyticsStore = readFileSync(analyticsStorePath, "utf8");
const apiErrors = readFileSync(apiErrorsPath, "utf8");

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

function eventId(index) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

test("analytics accepts only event-specific aggregate properties", () => {
  assert.deepEqual(sanitizeMatchEventProperties("wm_test_complete", {
    durationMs: 9_999_999,
    topGenre: " romance ",
    settingSelectionCount: -3,
    nickname: "수집 금지",
    rawAnswers: { secret: true },
    unknown: "drop",
  }), {
    durationMs: 1_800_000,
    topGenre: "romance",
    settingSelectionCount: 0,
  });
  assert.deepEqual(sanitizeMatchEventProperties("not_allowed", { topGenre: "romance" }), {});
});

test("analytics transport sends twenty at a time and keeps the remainder", async () => {
  const storage = memoryStorage();
  for (let index = 1; index <= MATCH_EVENT_BATCH_SIZE + 5; index += 1) {
    recordMatchEvent(
      storage,
      "wm_section_view",
      { sectionKey: `section-${index}`, elapsedMs: index },
      () => "2026-09-13T00:00:00.000Z",
      () => eventId(index),
    );
  }

  let posted;
  const result = await flushMatchEvents(storage, "00000000-0000-4000-8000-000000000999", async (_url, init) => {
    posted = JSON.parse(init.body);
    return { ok: true, status: 202 };
  });

  assert.equal(posted.events.length, MATCH_EVENT_BATCH_SIZE);
  assert.equal(result.sent, MATCH_EVENT_BATCH_SIZE);
  assert.equal(result.pending, 5);
  assert.equal(JSON.parse(storage.getItem(MATCH_EVENT_QUEUE_KEY)).length, 5);
});

test("temporary analytics failures retain queued events", async () => {
  const storage = memoryStorage();
  recordMatchEvent(storage, "wm_landing_view", {}, () => "2026-09-13T00:00:00.000Z", () => eventId(1));
  const result = await flushMatchEvents(storage, "00000000-0000-4000-8000-000000000999", async () => ({ ok: false, status: 503 }));
  assert.equal(result.sent, 0);
  assert.equal(result.pending, 1);
  assert.equal(JSON.parse(storage.getItem(MATCH_EVENT_QUEUE_KEY)).length, 1);
});

test("analytics migration and policy keep the same event contract", () => {
  assert.match(migration, /create table public\.match_analytics_events/);
  assert.match(migration, /alter table public\.match_analytics_events enable row level security/);
  assert.match(migration, /revoke all on table public\.match_analytics_events from anon, authenticated/);
  for (const eventName of MATCH_EVENT_NAMES) assert.match(migration, new RegExp(`'${eventName}'`));

  const views = [
    "match_pilot_daily_funnel",
    "match_pilot_section_metrics",
    "match_pilot_choice_distribution",
    "match_pilot_result_distribution",
    "match_pilot_accuracy_feedback",
  ];
  for (const view of views) {
    assert.match(migration, new RegExp(`create view public\\.${view}`));
  }
  assert.match(analyticsStore, /sql\.json\(event\.properties\)/);
  assert.doesNotMatch(analyticsStore, /JSON\.stringify\([^)]+\)::jsonb/);
  assert.match(apiErrors, /MATCH_SERVICE_UNAVAILABLE/);
  assert.match(apiErrors, /ANALYTICS_STORE_FAILED|fallbackCode/);
});
