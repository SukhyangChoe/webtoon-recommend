import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { COMIC_JOBS } from './jobs.mjs';

const catalog = {};
const catalogPath = 'src/features/match/data/readerComicCatalog.v1.json';
const previousCatalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
for (const job of COMIC_JOBS) {
  const asset = path.join(process.cwd(), 'public', job.src);
  try {
    const metadata = await sharp(asset).metadata();
    const previous = previousCatalog[job.key];
    if (previous && (previous.sourceScene !== job.sourceScene || JSON.stringify(previous.panels) !== JSON.stringify(job.panels))) {
      const record = JSON.parse(await fs.readFile(`.qa-tmp/reader-comics/${job.key}.json`, 'utf8'));
      if (record.sourceScene !== job.sourceScene || JSON.stringify(record.panels) !== JSON.stringify(job.panels)) throw Error('Regenerate the comic for the changed episode');
    }
    catalog[job.key] = { src: job.src, width: metadata.width, height: metadata.height, sourceScene: job.sourceScene, panels: job.panels };
  } catch (error) {
    if (!process.argv.includes('--partial')) throw Error(`Missing comic asset: ${job.key}`, { cause: error });
  }
}
await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(JSON.stringify({ installed: Object.keys(catalog).length, expected: COMIC_JOBS.length }));
