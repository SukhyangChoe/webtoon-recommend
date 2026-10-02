import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  RECOMMENDATION_COMMENT_MAX_LENGTH,
  normalizeRecommendationComment,
} from "../../src/features/match/config/recommendationPolicy.mjs";

const migrationPath = new URL("../../supabase/migrations/202609110001_webtoon_match_persistence.sql", import.meta.url);
const catalogMigrationPath = new URL("../../supabase/migrations/202609220001_webtoon_catalog_profile_recommendations.sql", import.meta.url);
const nicknameRepairMigrationPath = new URL("../../supabase/migrations/202609230001_allow_same_profile_nickname.sql", import.meta.url);
const selfChallengeRepairMigrationPath = new URL("../../supabase/migrations/202609230002_remove_self_challenge_entries.sql", import.meta.url);
const reciprocalEntriesMigrationPath = new URL("../../supabase/migrations/202609230003_reciprocal_match_entries.sql", import.meta.url);
const duplicateNicknameMigrationPath = new URL("../../supabase/migrations/202609240001_allow_duplicate_match_nicknames.sql", import.meta.url);
const recommendationSocialMigrationPath = new URL("../../supabase/migrations/202610010001_recommendation_comments_likes.sql", import.meta.url);
const resultStorePath = new URL("../../src/features/match/server/resultStore.ts", import.meta.url);
const challengeStorePath = new URL("../../src/features/match/server/challengeStore.ts", import.meta.url);
const catalogStorePath = new URL("../../src/features/match/server/webtoonCatalogStore.ts", import.meta.url);
const recommendationLikeRoutePath = new URL("../../src/app/api/v1/results/[profilePublicId]/recommendations/[canonicalWebtoonId]/like/route.ts", import.meta.url);
const databasePath = new URL("../../src/features/match/server/database.ts", import.meta.url);

const migration = readFileSync(migrationPath, "utf8");
const catalogMigration = readFileSync(catalogMigrationPath, "utf8");
const nicknameRepairMigration = readFileSync(nicknameRepairMigrationPath, "utf8");
const selfChallengeRepairMigration = readFileSync(selfChallengeRepairMigrationPath, "utf8");
const reciprocalEntriesMigration = readFileSync(reciprocalEntriesMigrationPath, "utf8");
const duplicateNicknameMigration = readFileSync(duplicateNicknameMigrationPath, "utf8");
const recommendationSocialMigration = readFileSync(recommendationSocialMigrationPath, "utf8");
const resultStore = readFileSync(resultStorePath, "utf8");
const challengeStore = readFileSync(challengeStorePath, "utf8");
const catalogStore = readFileSync(catalogStorePath, "utf8");
const recommendationLikeRoute = readFileSync(recommendationLikeRoutePath, "utf8");
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

test("catalog migration supports profile nicknames, unique link names, and ten ordered recommendations", () => {
  assert.match(catalogMigration, /add column if not exists display_name text/);
  assert.match(catalogMigration, /create unique index if not exists match_challenge_entries_unique_nickname_idx/);
  assert.match(catalogMigration, /row_number\(\) over/);
  assert.match(catalogMigration, /set challenger_nickname = candidate/);
  assert.match(catalogMigration, /match_challenge_nickname_owner_conflict/);
  assert.match(catalogMigration, /owner_profile_id <> new\.challenger_profile_id/);
  assert.match(nicknameRepairMigration, /challenger_profile_id <> new\.owner_profile_id/);
  assert.match(selfChallengeRepairMigration, /where entries\.challenger_profile_id = challenges\.owner_profile_id/);
  assert.match(selfChallengeRepairMigration, /match_challenge_self_entry_forbidden/);
  assert.match(catalogMigration, /create table public\.webtoons/);
  assert.match(catalogMigration, /raw_data jsonb not null/);
  assert.match(catalogMigration, /create table public\.match_profile_recommendations/);
  assert.match(catalogMigration, /sort_order between 1 and 10/);
  for (const table of ["webtoons", "match_profile_recommendations"]) {
    assert.match(catalogMigration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(catalogMigration, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`));
  }
});

test("catalog store searches server-side and preserves recommendation rows while updating a bounded owner list", () => {
  assert.match(catalogStore, /import "server-only"/);
  assert.match(catalogStore, /const boundedLimit = Math\.max\(1, Math\.min\(30, limit\)\)/);
  assert.match(catalogStore, /replaceAll\(" ", ""\)/);
  assert.match(catalogStore, /replace\(normalized_title, ' ', ''\) like/);
  assert.match(catalogStore, /limit \$\{boundedLimit\}/);
  assert.match(catalogStore, /input\.recommendations\.length > 10/);
  assert.match(catalogStore, /delete from public\.match_profile_recommendations/);
  assert.match(catalogStore, /on conflict \(profile_id, canonical_webtoon_id\) do update set/);
  assert.match(catalogStore, /recommendation_comment = excluded\.recommendation_comment/);
  assert.match(catalogStore, /RESULT_OWNER_MISMATCH/);
});

test("recommendation comments are optional, normalized, and limited to 80 characters", () => {
  assert.equal(RECOMMENDATION_COMMENT_MAX_LENGTH, 80);
  assert.equal(normalizeRecommendationComment(undefined), undefined);
  assert.equal(normalizeRecommendationComment(null), null);
  assert.equal(normalizeRecommendationComment("  장면이   정말 좋아요  "), "장면이 정말 좋아요");
  assert.equal(normalizeRecommendationComment(" \n\t "), null);
  assert.throws(() => normalizeRecommendationComment("가".repeat(81)), /INVALID_RECOMMENDATION_COMMENT/);
  assert.throws(() => normalizeRecommendationComment(42), /INVALID_RECOMMENDATION_COMMENT/);
});

test("recommendation social migration stores comments and one profile like per recommendation", () => {
  assert.match(recommendationSocialMigration, /add column if not exists recommendation_comment text/);
  assert.match(recommendationSocialMigration, /char_length\(recommendation_comment\) between 1 and 80/);
  assert.match(recommendationSocialMigration, /create table public\.match_profile_recommendation_likes/);
  assert.match(recommendationSocialMigration, /primary key \(recommender_profile_id, canonical_webtoon_id, liker_profile_id\)/);
  assert.match(recommendationSocialMigration, /references public\.match_profile_recommendations\(profile_id, canonical_webtoon_id\)[\s\S]*on delete cascade/);
  assert.match(recommendationSocialMigration, /recommender_profile_id <> liker_profile_id/);
  assert.match(recommendationSocialMigration, /unique \(profile_id, sort_order\)[\s\S]*deferrable initially deferred/);
  assert.match(recommendationSocialMigration, /alter table public\.match_profile_recommendation_likes enable row level security/);
  assert.match(recommendationSocialMigration, /revoke all on table public\.match_profile_recommendation_likes from anon, authenticated/);
});

test("recommendation likes require a completed anonymous profile and cannot like oneself", () => {
  assert.match(recommendationLikeRoute, /isAnonymousId\(body\.anonymousId\)/);
  assert.match(catalogStore, /LIKE_PROFILE_REQUIRED/);
  assert.match(catalogStore, /SELF_RECOMMENDATION_LIKE_FORBIDDEN/);
  assert.match(catalogStore, /on conflict do nothing/);
  assert.match(catalogStore, /match_profile_recommendation_likes/);
});

test("reciprocal rankings only carry forward a directly viewed match from the same taste snapshot", () => {
  assert.match(reciprocalEntriesMigration, /entry_origin text not null default 'direct'/);
  assert.match(reciprocalEntriesMigration, /entry_origin in \('direct', 'reciprocal'\)/);
  assert.match(reciprocalEntriesMigration, /source_result_id text/);
  assert.match(challengeStore, /previous_entries\.challenger_snapshot_id = \$\{ownerSnapshot\.snapshotId\}::uuid/);
  assert.match(challengeStore, /previous_entries\.entry_origin = 'direct'/);
  assert.match(challengeStore, /'reciprocal', \$\{reciprocalEntry\.sourceResultId\}/);
  assert.match(challengeStore, /isReciprocal: entry\.entryOrigin === "reciprocal"/);
});

test("display nicknames may be duplicated while profiles remain internally distinct", () => {
  assert.match(duplicateNicknameMigration, /drop trigger if exists match_challenge_entry_nickname_conflict/);
  assert.match(duplicateNicknameMigration, /drop trigger if exists match_challenge_owner_nickname_conflict/);
  assert.match(duplicateNicknameMigration, /drop index if exists public\.match_challenge_entries_unique_nickname_idx/);
  assert.match(duplicateNicknameMigration, /drop function if exists public\.enforce_match_challenge_nickname_conflict\(\)/);
  assert.doesNotMatch(challengeStore, /isChallengeNicknameAvailable|match_nickname_key|NICKNAME_ALREADY_USED/);
});
