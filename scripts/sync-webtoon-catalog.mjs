import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import postgres from "postgres";
import {
  CATALOG_GENRE_SCORE_KEYS,
  CATALOG_TYPE_PARENT_KEYS,
  PRESERVED_ACTION_GENRE_SCORE_EXCEPTIONS,
  isPreservedActionGenreScore,
} from "./webtoon-catalog-schema.mjs";

const connectionString = process.env.WEBTOON_MATCH_DATABASE_URL?.trim();
if (!connectionString) throw new Error("WEBTOON_MATCH_DATABASE_URL is required");

const sourcePath = path.resolve(process.cwd(), "src/data/webtoons/webtoons_seed_current.json");
const catalogVersion = process.env.WEBTOON_CATALOG_VERSION?.trim() || "webtoons_seed_v0_740";
const source = JSON.parse(await readFile(sourcePath, "utf8"));
if (!Array.isArray(source)) throw new Error("Webtoon catalog must be an array");

const GENRE_SCORE_MAX = 5;
const DETAIL_SCORE_MAX = 3;
const GENRE_SCORE_KEYS = new Set(CATALOG_GENRE_SCORE_KEYS);
const TYPE_PARENT_KEYS = new Set(CATALOG_TYPE_PARENT_KEYS);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTitle(value) {
  return text(value).normalize("NFC").replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateScoreMap(value, label, index, maximum, allowEmpty = true) {
  if (!isRecord(value)) throw new Error(`${label} must be an object at index ${index}`);
  if (!allowEmpty && !Object.keys(value).length) throw new Error(`${label} must not be empty at index ${index}`);
  for (const [key, score] of Object.entries(value)) {
    if (!key || !Number.isInteger(score) || score < 0 || score > maximum) {
      throw new Error(`Invalid ${label}.${key} score at index ${index}: ${score}`);
    }
  }
}

function validateRecommendation(item, index) {
  const recommendation = item.recommendation;
  const eligible = item.recommendationEligible === true;
  if (!isRecord(recommendation)) throw new Error(`recommendation must be an object at index ${index}`);
  validateScoreMap(recommendation.genreScores, "genreScores", index, GENRE_SCORE_MAX, !eligible);
  for (const genreKey of Object.keys(recommendation.genreScores)) {
    if (genreKey === "action" && isPreservedActionGenreScore(item)) continue;
    if (!GENRE_SCORE_KEYS.has(genreKey)) throw new Error(`Unknown genreScores key at index ${index}: ${genreKey}`);
  }
  if (!isRecord(recommendation.typeScores)) throw new Error(`typeScores must be an object at index ${index}`);
  if (eligible && !Object.values(recommendation.typeScores).some((scores) => isRecord(scores) && Object.keys(scores).length)) {
    throw new Error(`typeScores must not be empty for an eligible work at index ${index}`);
  }
  for (const [genreKey, scores] of Object.entries(recommendation.typeScores)) {
    if (!TYPE_PARENT_KEYS.has(genreKey)) throw new Error(`Unknown typeScores parent at index ${index}: ${genreKey}`);
    validateScoreMap(scores, `typeScores.${genreKey}`, index, DETAIL_SCORE_MAX);
  }
  for (const axisKey of ["tagScores", "avoidanceTagScores", "contentAxisScores", "artStyleScores"]) {
    if (recommendation[axisKey] === undefined) continue;
    validateScoreMap(recommendation[axisKey], axisKey, index, DETAIL_SCORE_MAX);
  }
}

const seen = new Set();
const normalizedMainGenres = [];
const preservedActionGenreScores = [];
const rows = source.map((item, index) => {
  const canonicalWebtoonId = text(item.canonicalWebtoonId);
  const title = text(item.title);
  const platform = text(item.platform);
  const mainGenre = text(item.mainGenre) || (item.recommendationEligible === false ? text(item.sourceDbGenre) : "");
  if (!canonicalWebtoonId || !title || !platform || !mainGenre) throw new Error(`Missing required catalog field at index ${index}`);
  if (seen.has(canonicalWebtoonId)) throw new Error(`Duplicate canonicalWebtoonId: ${canonicalWebtoonId}`);
  seen.add(canonicalWebtoonId);
  validateRecommendation(item, index);
  if (isPreservedActionGenreScore(item)) preservedActionGenreScores.push(item);
  if (!text(item.mainGenre) && mainGenre) normalizedMainGenres.push({ canonicalWebtoonId, mainGenre });
  return {
    canonical_webtoon_id: canonicalWebtoonId,
    title,
    normalized_title: normalizeTitle(title),
    platform,
    official_url: text(item.officialUrl) || null,
    main_genre: mainGenre,
    recommendation_eligible: item.recommendationEligible !== false,
    catalog_status: ["active", "hidden", "retired"].includes(item.catalogStatus) ? item.catalogStatus : "active",
    raw_data: item,
    catalog_version: catalogVersion,
  };
});

const expectedPreservedActionIds = Object.keys(PRESERVED_ACTION_GENRE_SCORE_EXCEPTIONS);
const missingPreservedActionIds = expectedPreservedActionIds.filter((canonicalWebtoonId) => (
  !preservedActionGenreScores.some((item) => item.canonicalWebtoonId === canonicalWebtoonId)
));
if (missingPreservedActionIds.length) {
  throw new Error(`Missing or changed preserved genreScores.action exceptions: ${missingPreservedActionIds.join(", ")}`);
}

const sql = postgres(connectionString, { max: 1, prepare: false, ssl: "require", connect_timeout: 10 });
try {
  await sql.begin(async (transaction) => {
    for (let offset = 0; offset < rows.length; offset += 200) {
      const batch = rows.slice(offset, offset + 200);
      await transaction`
        insert into public.webtoons (
          canonical_webtoon_id, title, normalized_title, platform, official_url, main_genre,
          recommendation_eligible, catalog_status, raw_data, catalog_version, updated_at
        )
        select
          item.canonical_webtoon_id, item.title, item.normalized_title, item.platform, item.official_url,
          item.main_genre, item.recommendation_eligible, item.catalog_status, item.raw_data, item.catalog_version, now()
        from jsonb_to_recordset(${transaction.json(batch)}) as item(
          canonical_webtoon_id text, title text, normalized_title text, platform text, official_url text,
          main_genre text, recommendation_eligible boolean, catalog_status text, raw_data jsonb, catalog_version text
        )
        on conflict (canonical_webtoon_id) do update set
          title = excluded.title,
          normalized_title = excluded.normalized_title,
          platform = excluded.platform,
          official_url = excluded.official_url,
          main_genre = excluded.main_genre,
          recommendation_eligible = excluded.recommendation_eligible,
          catalog_status = excluded.catalog_status,
          raw_data = excluded.raw_data,
          catalog_version = excluded.catalog_version,
          updated_at = now()
      `;
      process.stdout.write(`\rSynced ${Math.min(offset + batch.length, rows.length)} / ${rows.length}`);
    }

    await transaction`
      update public.webtoons
      set recommendation_eligible = false, catalog_status = 'retired', updated_at = now()
      where not (canonical_webtoon_id = any(${[...seen]}::text[]))
        and catalog_status <> 'retired'
    `;
  });
  process.stdout.write(`\nCatalog sync complete: ${rows.length} works (${catalogVersion})\n`);
  if (normalizedMainGenres.length) {
    process.stdout.write(`Normalized missing mainGenre from sourceDbGenre: ${normalizedMainGenres.length}\n`);
  }
  process.stdout.write(`Preserved non-canonical genreScores.action exceptions: ${preservedActionGenreScores.length}\n`);
} finally {
  await sql.end();
}
