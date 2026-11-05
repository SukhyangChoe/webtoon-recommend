'use strict';
// Only preload in the isolated upstream child. Never patch the Next.js process.
const path = require('node:path');
if (process.platform !== 'win32') {
  for (const name of ['join', 'resolve']) {
    const original = path[name];
    path[name] = (...values) => original(...values.map(value => typeof value === 'string' ? value.replace(/\\/g, '/') : value));
  }
}
