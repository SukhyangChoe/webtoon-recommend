import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import postgres from "postgres";

const connectionString = process.env.WEBTOON_MATCH_DATABASE_URL?.trim();
if (!connectionString) throw new Error("WEBTOON_MATCH_DATABASE_URL is required");

const sourcePath = path.resolve(process.cwd(), "src/data/webtoons/webtoons_seed_current.json");
const catalogVersion = process.env.WEBTOON_CATALOG_VERSION?.trim() || "webtoons_seed_current";
const source = JSON.parse(await readFile(sourcePath, "utf8"));
if (!Array.isArray(source)) throw new Error("Webtoon catalog must be an array");

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTitle(value) {
  return text(value).normalize("NFC").replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

const seen = new Set();
const rows = source.map((item, index) => {
  const canonicalWebtoonId = text(item.canonicalWebtoonId);
  const title = text(item.title);
  const platform = text(item.platform);
  const mainGenre = text(item.mainGenre);
  if (!canonicalWebtoonId || !title || !platform || !mainGenre) throw new Error(`Missing required catalog field at index ${index}`);
  if (seen.has(canonicalWebtoonId)) throw new Error(`Duplicate canonicalWebtoonId: ${canonicalWebtoonId}`);
  seen.add(canonicalWebtoonId);
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

const sql = postgres(connectionString, { max: 1, prepare: false, ssl: "require", connect_timeout: 10 });
try {
  for (let offset = 0; offset < rows.length; offset += 200) {
    const batch = rows.slice(offset, offset + 200);
    await sql`
      insert into public.webtoons (
        canonical_webtoon_id, title, normalized_title, platform, official_url, main_genre,
        recommendation_eligible, catalog_status, raw_data, catalog_version, updated_at
      )
      select
        item.canonical_webtoon_id, item.title, item.normalized_title, item.platform, item.official_url,
        item.main_genre, item.recommendation_eligible, item.catalog_status, item.raw_data, item.catalog_version, now()
      from jsonb_to_recordset(${sql.json(batch)}) as item(
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
  process.stdout.write(`\nCatalog sync complete: ${rows.length} works (${catalogVersion})\n`);
} finally {
  await sql.end();
}
