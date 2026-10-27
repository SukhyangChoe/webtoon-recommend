import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

// Optional, explicit import of assets supplied in the user's earlier standalone demo.
// Never execute the HTML and never download arbitrary external images.
const index = process.argv.indexOf('--source');
if (index < 0 || !process.argv[index + 1]) throw new Error('--source path/to/user-provided-demo.html is required');
const sourcePath = path.resolve(process.argv[index + 1]);
const html = await readFile(sourcePath, 'utf8');
const json = html.match(/<script type="application\/json" id="demoData">([\s\S]*?)<\/script>/)?.[1];
if (!json) throw new Error('DEMO_DATA_NOT_FOUND');
const demo = JSON.parse(json);
const catalog = new Map(JSON.parse(await readFile('src/data/webtoons/webtoons_seed_current.json', 'utf8')).map(item => [item.canonicalWebtoonId, item]));
const candidates = demo.works.filter(work => {
  const canonical = catalog.get(work.id);
  return canonical && canonical.title === work.title && canonical.platform === work.platform && canonical.recommendationEligible
    && !work.linkReviewRequired && !work.reviewNote && /^wt_[a-z0-9_]+$/.test(work.id) && /^data:image\/webp;base64,/.test(work.cover?.src);
});
if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({ mode:'dry-run', matches:candidates.map(work=>({id:work.id,title:work.title})) },null,2));
} else {
  const url = process.env.WEBTOON_MATCH_DATABASE_URL?.trim();
  if (!url) throw new Error('WEBTOON_MATCH_DATABASE_URL required');
  const folder = path.resolve('public/match/covers');
  await mkdir(folder, { recursive:true });
  for (const work of candidates) {
    const bytes = Buffer.from(work.cover.src.split(',')[1], 'base64');
    if (bytes.length > 2_000_000 || bytes.toString('ascii',0,4)!=='RIFF' || bytes.toString('ascii',8,12)!=='WEBP') throw new Error(`INVALID_WEBP:${work.id}`);
    const destination = path.join(folder, `${work.id}.webp`);
    try { await writeFile(destination, bytes, { flag:'wx' }); }
    catch (error) { if(error.code!=='EEXIST' || !bytes.equals(await readFile(destination))) throw error; }
  }
  const sql=postgres(url,{max:1,prepare:false,ssl:'require',connect_timeout:10,onnotice:()=>{}});
  try {
    await sql.begin(async tx=>{
      for (const work of candidates) {
        const creators=(work.creators??[]).map(creator=>({name:creator.name,roles:creator.roles??[]}));
        await tx`update public.webtoon_details set
          cover_url=coalesce(cover_url,${`/match/covers/${work.id}.webp`}),
          creators=case when jsonb_array_length(creators)=0 then ${tx.json(creators)} else creators end,
          source_refs=source_refs || ${tx.json({userProvidedDemo:{file:path.basename(sourcePath),canonicalId:work.id}})},updated_at=now()
          where canonical_webtoon_id=${work.id}`;
      }
    });
    console.log(JSON.stringify({mode:'applied',works:candidates.length,titles:candidates.map(work=>work.title)},null,2));
  } finally { await sql.end(); }
}
