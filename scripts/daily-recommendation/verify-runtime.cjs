'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { verify } = require('./runtime-contract.cjs');
const root = path.join(process.cwd(), '.private-daily-recommendations/runtime');
if (fs.existsSync(root)) {
  console.log(JSON.stringify({ check: 'private-daily-runtime', ...verify(root), ok: true }));
} else if (process.env.VERCEL === '1') {
  console.error('Verified private daily runtime missing. Deploy with the documented private-runtime CLI workflow; do not publish a broken recommendation endpoint.');
  process.exitCode = 1;
}
