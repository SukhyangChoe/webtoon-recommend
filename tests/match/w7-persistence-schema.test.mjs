import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const migrationPath = new URL("../../supabase/migrations/202609110001_webtoon_match_persistence.sql", import.meta.url);
const resultStorePath = new URL("../../src/features/match/server/resultStore.ts", import.meta.url);
const challengeStorePath = new URL("../../src/features/match/server/challengeStore.ts", import.meta.url);
const databasePath = new URL("../../src/features/match/server/database.ts", import.meta.url);

const migration = readFileSync(migrationPath, "utf8");
const resultStore = readFileSync(resultStorePath, "utf8");
const challengeStore = readFileSync(challengeStorePath, "utf8");
const database = readFileSync(databasePath, "utf8");

test("W7 migration defines every permanent webtoon-match table", () => {
  const tables = [
    "match_profiles",
    "match_taste_snapshots",
    "match_challenges",
    "match_compatibility_results",
    "match_challenge_entries",
    "match_challenge_entry_history",
  ];

  for (const table of tables) {
    assert.match(migration, new RegExp(`create table public\\.${table}\\b`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`));
  }
});

test("W7 migration enforces one active link and one ranking row per challenger", () => {
  assert.match(migration, /create unique index match_challenges_one_active_per_owner_idx[\s\S]*where status = 'active'/);
  assert.match(migration, /unique \(challenge_id, challenger_profile_id\)/);
  assert.match(migration, /owner_manage_token_hash char\(64\) not null/);
});

test("W7 server stores use the server-only Postgres client instead of process Maps", () => {
  assert.match(database, /import "server-only"/);
  assert.match(database, /process\.env\[MATCH_DATABASE_ENV\]/);
  assert.match(database, /max: 1/);
  assert.match(database, /prepare: false/);
  assert.match(database, /ssl: "require"/);

  for (const store of [resultStore, challengeStore]) {
    assert.match(store, /getMatchDatabase/);
    assert.doesNotMatch(store, /new Map\s*\(/);
    assert.doesNotMatch(store, /JSON\.stringify\([^\n]+\)::jsonb/);
  }

  assert.match(resultStore, /sql\.json\(snapshotData\(snapshot\)\)/);
  assert.match(challengeStore, /sql\.json\(result\.band\)/);
  assert.match(challengeStore, /sql\.json\(result\.sharedGenres\)/);
});
