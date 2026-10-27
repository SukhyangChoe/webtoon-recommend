import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { gzipSync, gunzipSync } from 'node:zlib';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import postgres from 'postgres';
import { COVER_BUCKET, coverObjectPath, coverProvenance, planCoverImport } from './webtoon-cover-policy.mjs';

const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1]; };
const archive = option('--archive');
if (!archive) throw new Error('--archive path/to/user-supplied.zip is required');
const archivePath = path.resolve(archive);
const apply = args.includes('--apply');
if (apply && !args.includes('--publish-as-requested')) throw new Error('EXPLICIT_PUBLICATION_REQUEST_REQUIRED');
const python = process.env.WEBTOON_PYTHON || 'python3';
const helper = path.resolve('scripts/read-webtoon-covers.py');
const index = JSON.parse(execFileSync(python, [helper, archivePath, 'index'], { maxBuffer: 12_000_000, encoding: 'utf8' }));
const catalog = JSON.parse(await readFile('src/data/webtoons/webtoons_seed_current.json', 'utf8'));
const plan = planCoverImport(index, catalog);
const summary = { source: path.basename(archivePath), sourceCovers: index.records.length, accepted: plan.accepted.length, held: plan.held, eligibleWithoutCover: plan.eligibleWithoutCover, rightsStateRetained: true };
if (!apply && !args.includes('--prepare')) { console.log(JSON.stringify({ mode: 'dry-run', ...summary }, null, 2)); process.exit(0); }

const folder = option('--prepared') ? path.resolve(option('--prepared')) : await mkdtemp(path.join(os.tmpdir(), 'webtoon-covers-'));
const manifestPath = path.join(folder, 'prepared.json');
const digest = data => createHash('sha256').update(data).digest('hex');
const archiveHasher = createHash('sha256');
for await (const chunk of createReadStream(archivePath)) archiveHasher.update(chunk);
const archiveSha256 = archiveHasher.digest('hex');
let prepared;
if (option('--prepared')) {
  prepared = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (prepared.archiveSha256 !== archiveSha256 || JSON.stringify(prepared.items.map(item => item.id)) !== JSON.stringify(plan.accepted.map(item => item.canonicalWebtoonId))) throw new Error('PREPARED_SOURCE_MISMATCH');
} else {
  const recordsPath = path.join(folder, 'accepted.json');
  await writeFile(recordsPath, JSON.stringify(plan.accepted), { flag: 'wx', mode: 0o600 });
  execFileSync(python, [helper, archivePath, 'extract', recordsPath, folder], { stdio: ['ignore', 'pipe', 'pipe'] });
  const items = [];
  for (let i = 0; i < plan.accepted.length; i++) {
    const record = plan.accepted[i];
    const input = path.join(folder, record.integratedRelativePath);
    const meta = await sharp(input, { limitInputPixels: 40_000_000, failOn: 'error' }).metadata();
    if (!['jpeg', 'png', 'webp'].includes(meta.format) || meta.pages > 1 || !meta.width || !meta.height) throw new Error(`INVALID_IMAGE:${record.canonicalWebtoonId}`);
    const variants = [];
    for (const width of [320, 640]) {
      const bytes = await sharp(input, { limitInputPixels: 40_000_000, failOn: 'error' }).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer();
      const objectPath = coverObjectPath(record.canonicalWebtoonId, record.sha256, width);
      const file = path.join('optimized', objectPath);
      await mkdir(path.dirname(path.join(folder, file)), { recursive: true });
      await writeFile(path.join(folder, file), bytes, { flag: 'wx' });
      variants.push({ width, objectPath, file, bytes: bytes.length, sha256: digest(bytes) });
    }
    items.push({ id: record.canonicalWebtoonId, title: record.title, platform: record.platformStored, variants, provenance: coverProvenance(record, path.basename(archivePath), archiveSha256, variants.map(({ width, objectPath, bytes, sha256 }) => ({ width, objectPath, bytes, sha256 }))) });
    if ((i + 1) % 100 === 0) console.log(JSON.stringify({ stage: 'optimized', completed: i + 1, total: plan.accepted.length }));
  }
  prepared = { archiveSha256, ...summary, items };
  await writeFile(manifestPath, JSON.stringify(prepared), { flag: 'wx', mode: 0o600 });
}
const optimizedBytes = prepared.items.flatMap(item => item.variants).reduce((sum, variant) => sum + variant.bytes, 0);
for (const [i, item] of prepared.items.entries()) {
  const record = plan.accepted[i];
  if (item.title !== record.title || item.platform !== record.platformStored || JSON.stringify(item.variants.map(v => v.width)) !== '[320,640]') throw new Error('INVALID_PREPARED_ITEM');
  for (const variant of item.variants) {
    if (variant.objectPath !== coverObjectPath(item.id, record.sha256, variant.width) || variant.file !== path.join('optimized', variant.objectPath) || !/^[a-f0-9]{64}$/.test(variant.sha256)) throw new Error('INVALID_PREPARED_VARIANT');
  }
  item.provenance = coverProvenance(record, path.basename(archivePath), archiveSha256, item.variants.map(({ width, objectPath, bytes, sha256 }) => ({ width, objectPath, bytes, sha256 })));
}
console.log(JSON.stringify({ stage: 'prepared', folder, works: prepared.items.length, files: prepared.items.length * 2, originalBytes: plan.accepted.reduce((sum, item) => sum + item.byteSize, 0), optimizedBytes }));
if (!apply) process.exit(0);

const connection = process.env.WEBTOON_MATCH_DATABASE_URL?.trim();
if (!connection) throw new Error('WEBTOON_MATCH_DATABASE_URL required');
const ref = (await readFile('supabase/.temp/project-ref', 'utf8')).trim();
if (!/^[a-z0-9]{20}$/.test(ref)) throw new Error('INVALID_PROJECT_REF');
const databaseUrl = new URL(connection);
if (databaseUrl.hostname !== `db.${ref}.supabase.co` && !decodeURIComponent(databaseUrl.username).endsWith(`.${ref}`)) throw new Error('STORAGE_AND_DATABASE_PROJECT_MISMATCH');
// Keep privileged CLI credentials only in memory; never write or log key values.
let keys;
try { keys = JSON.parse(execFileSync('npx', ['supabase', 'projects', 'api-keys', '--project-ref', ref, '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1_000_000 })); }
catch { throw new Error('SUPABASE_CLI_AUTH_REQUIRED'); }
const key = keys.find(item => item.name === 'service_role')?.api_key;
if (!key) throw new Error('STORAGE_SERVICE_KEY_REQUIRED');
const origin = `https://${ref}.supabase.co`;
const headers = { apikey: key, authorization: `Bearer ${key}` };
const sql = postgres(connection, { max: 1, prepare: false, ssl: 'require', connect_timeout: 10, onnotice: () => {} });
const fingerprint = async tx => (await tx`
  select (select md5(string_agg(md5(raw_data::text),'' order by canonical_webtoon_id)) from public.webtoons) as vectors,
  (select md5(string_agg(to_jsonb(r)::text,'' order by profile_id,canonical_webtoon_id)) from public.match_profile_recommendations r) as recommendations,
  (select md5(string_agg(to_jsonb(l)::text,'' order by recommender_profile_id,canonical_webtoon_id,liker_profile_id)) from public.match_profile_recommendation_likes l) as likes`)[0];
try {
  const ids = prepared.items.map(item => item.id);
  const live = await sql`select canonical_webtoon_id,title,platform,catalog_status from public.webtoons where canonical_webtoon_id=any(${ids}::text[])`;
  const byId = new Map(live.map(item => [item.canonical_webtoon_id, item]));
  for (const item of prepared.items) {
    const work = byId.get(item.id);
    if (!work || work.title !== item.title || work.platform !== item.platform || work.catalog_status !== 'active') throw new Error(`LIVE_DB_MISMATCH:${item.id}`);
  }
  const before = await sql`select * from public.webtoon_details where canonical_webtoon_id=any(${ids}::text[]) order by canonical_webtoon_id`;
  if (before.length !== ids.length) throw new Error('DETAIL_ROWS_MISSING');
  const backupPath = path.join(folder, 'details-before.json.gz');
  try { await writeFile(backupPath, gzipSync(JSON.stringify(before)), { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST' || JSON.stringify(JSON.parse(gunzipSync(await readFile(backupPath)))) !== JSON.stringify(before)) throw new Error('PREVIOUS_BACKUP_DIFFERS_FROM_LIVE_DB');
  }

  let response = await fetch(`${origin}/storage/v1/bucket/${COVER_BUCKET}`, { headers, signal: AbortSignal.timeout(30000) });
  if (response.status === 404 || response.status === 400) {
    response = await fetch(`${origin}/storage/v1/bucket`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ id: COVER_BUCKET, name: COVER_BUCKET, public: true, file_size_limit: 2_000_000, allowed_mime_types: ['image/webp'] }), signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`BUCKET_CREATE_FAILED:${response.status}`);
  } else {
    if (!response.ok) throw new Error(`BUCKET_READ_FAILED:${response.status}`);
    const bucket = await response.json();
    if (!bucket.public || bucket.allowed_mime_types?.length !== 1 || bucket.allowed_mime_types[0] !== 'image/webp') throw new Error('EXISTING_BUCKET_CONFIGURATION_MISMATCH');
  }
  const tasks = prepared.items.flatMap(item => item.variants);
  let next = 0, uploaded = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (next < tasks.length) {
      const task = tasks[next++];
      const bytes = await readFile(path.join(folder, task.file));
      if (digest(bytes) !== task.sha256 || bytes.length !== task.bytes || bytes.length > 2_000_000 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error('PREPARED_IMAGE_CHANGED');
      let done = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const url = `${origin}/storage/v1/object/${COVER_BUCKET}/${task.objectPath}`;
          const upload = await fetch(url, { method: 'POST', headers: { ...headers, 'content-type': 'image/webp', 'cache-control': 'max-age=31536000', 'x-upsert': 'false' }, body: bytes, signal: AbortSignal.timeout(30000) });
          if (upload.ok) { done = true; break; }
          const body = await upload.json().catch(() => ({}));
          if (upload.status === 409 || body.error === 'Duplicate' || body.statusCode === '409') {
            const existing = await fetch(`${origin}/storage/v1/object/public/${COVER_BUCKET}/${task.objectPath}`, { signal: AbortSignal.timeout(30000) });
            if (!existing.ok || digest(Buffer.from(await existing.arrayBuffer())) !== task.sha256) throw new Error('EXISTING_OBJECT_BYTES_DIFFER');
            done = true; break;
          }
          if (upload.status !== 429 && upload.status < 500) throw new Error(`STORAGE_REJECTED:${upload.status}`);
        } catch (error) {
          if (attempt === 3 || error.message.startsWith('EXISTING_OBJECT') || error.message.startsWith('STORAGE_REJECTED')) throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
      }
      if (!done) throw new Error('STORAGE_RETRIES_EXHAUSTED');
      uploaded++;
      if (uploaded % 100 === 0) console.log(JSON.stringify({ stage: 'uploaded', completed: uploaded, total: tasks.length }));
    }
  }));
  // Check public access without API keys before changing any live cover URLs.
  for (const task of tasks.filter((_, i) => i % 400 === 0 || i === tasks.length - 1)) {
    const publicImage = await fetch(`${origin}/storage/v1/object/public/${COVER_BUCKET}/${task.objectPath}`, { signal: AbortSignal.timeout(30000) });
    if (!publicImage.ok || digest(Buffer.from(await publicImage.arrayBuffer())) !== task.sha256) throw new Error('PUBLIC_IMAGE_VERIFICATION_FAILED');
  }
  const updates = prepared.items.map(item => ({ canonical_webtoon_id: item.id, cover_url: `${origin}/storage/v1/object/public/${COVER_BUCKET}/${item.variants.find(variant => variant.width === 640).objectPath}`, provenance: item.provenance }));
  await sql.begin(async tx => {
    await tx`select pg_advisory_xact_lock(240797)`;
    const initial = await fingerprint(tx);
    const locked = await tx`select canonical_webtoon_id,cover_url,source_refs from public.webtoon_details where canonical_webtoon_id=any(${ids}::text[]) order by canonical_webtoon_id for update`;
    const comparable = list => JSON.stringify(list.map(({ canonical_webtoon_id, cover_url, source_refs }) => ({ canonical_webtoon_id, cover_url, source_refs })));
    if (comparable(locked) !== comparable(before)) throw new Error('CONCURRENT_DETAIL_EDIT_ABORT');
    for (let offset = 0; offset < updates.length; offset += 100) {
      await tx`update public.webtoon_details d set cover_url=i.cover_url,
        source_refs=d.source_refs || jsonb_build_object('userProvidedCovers',i.provenance),updated_at=now()
        from jsonb_to_recordset(${tx.json(updates.slice(offset, offset + 100))}) as i(canonical_webtoon_id text,cover_url text,provenance jsonb)
        where d.canonical_webtoon_id=i.canonical_webtoon_id`;
    }
    if (JSON.stringify(initial) !== JSON.stringify(await fingerprint(tx))) throw new Error('USER_OR_VECTOR_DATA_CHANGED_ABORT');
  });
  const report = { ...summary, applied: updates.length, uploadedFiles: uploaded, optimizedBytes, bucket: COVER_BUCKET, archiveSha256, appliedAt: new Date().toISOString() };
  await writeFile(path.join(folder, 'applied.json'), JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ mode: 'applied', works: updates.length, files: uploaded, optimizedBytes, held: plan.held.length, folder, userDataPreserved: true, rightsStateNotUpgraded: true }));
} finally { await sql.end(); }
