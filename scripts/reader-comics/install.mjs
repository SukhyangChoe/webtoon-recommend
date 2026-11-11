import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { COMIC_JOBS } from './jobs.mjs';

const [key, source] = process.argv.slice(2);
const job = COMIC_JOBS.find(item => item.key === key);
if (!job || !source) throw Error('Expected an existing episode key and generated image path');
const metadata = await sharp(source).metadata();
if (!metadata.width || !metadata.height || Math.abs(metadata.width / metadata.height - 1) > .03) throw Error('Comic must be a square four-panel page');
const target = path.join(process.cwd(), 'public', job.src);
await fs.mkdir(path.dirname(target), { recursive: true });
await sharp(source).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toFile(target);
const recordDirectory = path.join(process.cwd(), '.qa-tmp/reader-comics');
await fs.mkdir(recordDirectory, { recursive: true });
await fs.writeFile(path.join(recordDirectory, `${key}.json`), JSON.stringify({ key, source, src: job.src, sourceScene: job.sourceScene, panels: job.panels }));
console.log(JSON.stringify({ key, src: job.src, bytes: (await fs.stat(target)).size }));
