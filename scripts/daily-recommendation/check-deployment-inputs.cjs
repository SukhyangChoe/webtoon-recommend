'use strict';
const fs = require('node:fs');
const { entries, excluded } = require('./runtime-contract.cjs');
const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const files = new Set(report.files.map(file => file.path));
const root = '.private-daily-recommendations/runtime';
const required = [...entries(root).filter(file => !excluded(file.name)).map(file => `${root}/${file.name}`), `${root}/SHA256SUMS.txt`];
const missing = required.filter(file => !files.has(file));
const forbidden = [...files].filter(file => /^(?:\.env[^/]*|\.git\/|\.private-backups\/|\.qa-tmp\/|node_modules\/)/.test(file));
if (missing.length || forbidden.length) {
  console.error(JSON.stringify({ ok: false, missing, forbidden }));
  process.exitCode = 1;
} else console.log(JSON.stringify({ ok: true, check: 'deployment-inputs', verifiedRuntimeFiles: required.length,
  fileCount: report.fileCount, totalSize: report.totalSize, secretsAndBackupsExcluded: true }));
