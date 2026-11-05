import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const contract = require('./runtime-contract.cjs');
const repo = fileURLToPath(new URL('../../', import.meta.url));
const archive = process.argv[process.argv.indexOf('--archive') + 1];
if (!process.argv.includes('--archive') || !archive) throw Error('Usage: node scripts/daily-recommendation/install-runtime.mjs --archive /absolute/path/to/02.zip');
const target = path.join(repo, '.private-daily-recommendations/runtime');
try {
  await fs.access(target);
  console.log(JSON.stringify({ status: 'ALREADY_INSTALLED', ...contract.verify(target) }));
  process.exit(0);
} catch (error) { if (error.code !== 'ENOENT') throw error; }
let bytes = await fs.readFile(path.resolve(archive));
if (contract.hash(bytes) !== contract.ARCHIVE_SHA256) {
  const members = execFileSync('unzip', ['-Z1', path.resolve(archive)], { encoding: 'utf8' }).trim().split(/\r?\n/);
  const nested = members.filter(name => name.endsWith('/webtoon_fit_recommendation_handoff_current_20261104_verified.zip'));
  if (nested.length !== 1) throw Error('CURRENT_RUNTIME_02_ARCHIVE_REQUIRED');
  bytes = execFileSync('unzip', ['-p', path.resolve(archive), nested[0]], { maxBuffer: 32 * 1024 * 1024 });
}
if (contract.hash(bytes) !== contract.ARCHIVE_SHA256) throw Error('CURRENT_RUNTIME_02_ARCHIVE_MISMATCH');
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'webtoon-runtime02-install-'));
const zip = path.join(scratch, 'verified.zip');
await fs.writeFile(zip, bytes);
execFileSync('unzip', ['-q', zip, '-d', scratch]);
const source = path.join(scratch, 'webtoon_fit_recommendation_handoff_current_20261104');
contract.verify(source, { complete: true });
await fs.mkdir(path.dirname(target), { recursive: true });
// Fresh staging path + atomic rename. Never overwrite another installed version.
const stage = await fs.mkdtemp(path.join(path.dirname(target), 'install-'));
for (const file of contract.entries(source).filter(file => !contract.excluded(file.name))) {
  const destination = path.join(stage, file.name);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(path.join(source, file.name), destination);
}
await fs.copyFile(path.join(source, 'SHA256SUMS.txt'), path.join(stage, 'SHA256SUMS.txt'));
const report = contract.verify(stage);
await fs.rename(stage, target);
// Scratch artifacts are deliberately left recoverable in the OS temp directory.
console.log(JSON.stringify({ status: 'INSTALLED', ...report, originalArchiveVerified: true, savedUserRunsInstalled: false }));
