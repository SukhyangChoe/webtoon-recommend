import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import os from 'node:os';
import path from 'node:path';
import postgres from 'postgres';
import { buildCatalogRows, catalogDiff, importedDetailData, CURRENT_CATALOG_VERSION } from './webtoon-catalog-import.mjs';

const args = process.argv.slice(2);
const sourceIndex = args.indexOf('--source');
const sourcePath = path.resolve(sourceIndex >= 0 ? args[sourceIndex + 1] : 'src/data/webtoons/webtoons_seed_current.json');
const source = JSON.parse(await readFile(sourcePath, 'utf8'));
const version = process.env.WEBTOON_CATALOG_VERSION?.trim() || CURRENT_CATALOG_VERSION;
const rows = buildCatalogRows(source, version);
const apply = args.includes('--apply') && !args.includes('--dry-run');
const connection = process.env.WEBTOON_MATCH_DATABASE_URL?.trim();
if (!connection) {
  if (apply) throw new Error('WEBTOON_MATCH_DATABASE_URL is required');
  console.log(JSON.stringify({ mode: 'validation-only', works: rows.length, eligible: rows.filter(row => row.recommendation_eligible).length, version }));
} else {
  const sql = postgres(connection, { max: 1, prepare: false, ssl: 'require', connect_timeout: 10, onnotice: () => {} });
  try {
    if (!apply) {
      const previous = await sql.begin('read only', async tx => await tx`select canonical_webtoon_id,raw_data,recommendation_eligible,catalog_status from public.webtoons`);
      console.log(JSON.stringify({ mode: 'dry-run', works: rows.length, eligible: rows.filter(row => row.recommendation_eligible).length, version, ...catalogDiff(rows, previous) }, null, 2));
    } else {
      const backupFolder = await mkdtemp(path.join(os.tmpdir(), 'webtoon-catalog-backup-'));
      const summary = await sql.begin(async tx => {
        await tx`select pg_advisory_xact_lock(240797)`;
        const previous = await tx`select * from public.webtoons`;
        const details = await tx`select * from public.webtoon_details`;
        const recommendations = await tx`select * from public.match_profile_recommendations order by profile_id,canonical_webtoon_id`;
        const likes = await tx`select * from public.match_profile_recommendation_likes order by recommender_profile_id,canonical_webtoon_id,liker_profile_id`;
        await writeFile(path.join(backupFolder, 'catalog-before.json.gz'), gzipSync(JSON.stringify({ version, webtoons: previous, details, recommendations, likes })));
        const diff = catalogDiff(rows, previous);
        if (diff.retired.length && !args.includes('--retire-missing')) throw new Error('RETIREMENT_REQUIRES_EXPLICIT_FLAG: inspect the dry-run and pass --retire-missing to retire the listed historical IDs');
        for (let offset = 0; offset < rows.length; offset += 100) {
          const batch = rows.slice(offset, offset + 100);
          await tx`
            insert into public.webtoons (
              canonical_webtoon_id,title,normalized_title,platform,official_url,main_genre,
              recommendation_eligible,catalog_status,raw_data,catalog_version,updated_at
            ) select canonical_webtoon_id,title,normalized_title,platform,official_url,main_genre,
              recommendation_eligible,catalog_status,raw_data,catalog_version,now()
            from jsonb_to_recordset(${tx.json(batch)}) as item(
              canonical_webtoon_id text,title text,normalized_title text,platform text,official_url text,main_genre text,
              recommendation_eligible boolean,catalog_status text,raw_data jsonb,catalog_version text
            ) on conflict(canonical_webtoon_id) do update set
              title=excluded.title,normalized_title=excluded.normalized_title,platform=excluded.platform,
              official_url=excluded.official_url,main_genre=excluded.main_genre,recommendation_eligible=excluded.recommendation_eligible,
              catalog_status=excluded.catalog_status,raw_data=excluded.raw_data,catalog_version=excluded.catalog_version,updated_at=now()
          `;
          const imported = batch.map(row => ({ canonical_webtoon_id: row.canonical_webtoon_id, imported_data: importedDetailData(row.raw_data) }));
          await tx`
            insert into public.webtoon_details(canonical_webtoon_id,imported_data)
            select canonical_webtoon_id,imported_data from jsonb_to_recordset(${tx.json(imported)}) as item(canonical_webtoon_id text,imported_data jsonb)
            on conflict(canonical_webtoon_id) do update set imported_data=excluded.imported_data,updated_at=now()
          `;
        }
        // Preserve historical IDs for references; never physically delete works or user data.
        await tx`update public.webtoons set catalog_status='retired',recommendation_eligible=false,updated_at=now()
          where not(canonical_webtoon_id=any(${rows.map(row => row.canonical_webtoon_id)}::text[])) and catalog_status<>'retired'`;
        const afterRecommendations = await tx`select * from public.match_profile_recommendations order by profile_id,canonical_webtoon_id`;
        const afterLikes = await tx`select * from public.match_profile_recommendation_likes order by recommender_profile_id,canonical_webtoon_id,liker_profile_id`;
        if (JSON.stringify(recommendations) !== JSON.stringify(afterRecommendations) || JSON.stringify(likes) !== JSON.stringify(afterLikes)) throw new Error('SOCIAL_DATA_CHANGED_ABORTING_IMPORT');
        return { works: rows.length, version, added: diff.added.length, vectorsChanged: diff.vectorsChanged.length,
          retired: diff.retired.length, preservedRecommendations: recommendations.length, preservedLikes: likes.length, backupFolder };
      });
      console.log(JSON.stringify({ mode: 'applied', ...summary }, null, 2));
    }
  } finally { await sql.end(); }
}
