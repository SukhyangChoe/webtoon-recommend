'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ARCHIVE_SHA256 = 'bbc65f42a75fe09d878013df896018a67cccd6fba48c172cdaab9fc87db12cc7';
const MANIFEST_SHA256 = '2ea0b26fd59cc7d2a6900140f67d9a17507d0a96aad8a87d6f96415eeee2e416';
const VERSION = 'runtime02-20261104-r9-v183-v8';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
// These contain saved people's runs/history, examples, or regression artifacts, not
// pipeline dependencies. Do not install them into the serving runtime.
const excluded = name => /^(?:README\.md$|recommendation_engine\/(?:runs|users|friend_history|examples|tests)\/|recommendation_engine\/(?:test_pipeline\.cjs|START_HERE\.txt|LUNA_GUIDE\.txt)$)/.test(name);
function entries(root) {
  const bytes = fs.readFileSync(path.join(root, 'SHA256SUMS.txt'));
  if (hash(bytes) !== MANIFEST_SHA256) throw Error('DAILY_RUNTIME_MANIFEST_MISMATCH');
  return bytes.toString('utf8').trim().split(/\r?\n/).map(line => {
    const match = line.match(/^([a-f0-9]{64})\s+\*?(.+)$/);
    if (!match) throw Error('DAILY_RUNTIME_MANIFEST_INVALID');
    const name = match[2].replace(/\\/g, '/');
    if (path.posix.isAbsolute(name) || name.split('/').includes('..')) throw Error('DAILY_RUNTIME_PATH_INVALID');
    return { name, sha256: match[1] };
  });
}
function verify(root, { complete = false } = {}) {
  const files = entries(root).filter(file => complete || !excluded(file.name));
  for (const file of files) {
    if (hash(fs.readFileSync(path.join(root, file.name))) !== file.sha256) throw Error('DAILY_RUNTIME_FILE_MISMATCH');
  }
  return { version: VERSION, files: files.length };
}
module.exports = { ARCHIVE_SHA256, MANIFEST_SHA256, VERSION, hash, excluded, entries, verify };
