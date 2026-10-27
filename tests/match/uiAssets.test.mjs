import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('all match layout stylesheet imports resolve to nonempty files', () => {
  const layoutUrl = new URL('../../src/app/match/layout.tsx', import.meta.url);
  const source = readFileSync(layoutUrl, 'utf8');
  const stylesheets = [...source.matchAll(/^import\s+["'](\.\/[^"']+\.css)["'];/gm)];
  assert.ok(stylesheets.length > 0);
  for (const [, path] of stylesheets) {
    assert.ok(readFileSync(new URL(path, layoutUrl), 'utf8').trim().length > 0, `${path} must exist and contain styles`);
  }
});

test('the approved bubble font is locally bundled with its license', () => {
  const font = readFileSync(new URL('../../public/match/fonts/NanumGothic-Bold.ttf', import.meta.url));
  assert.equal(font.readUInt32BE(0), 0x00010000, 'valid TrueType font');
  assert.ok(font.length > 100_000);
  const license = readFileSync(new URL('../../public/match/fonts/OFL.txt', import.meta.url), 'utf8');
  assert.match(license, /SIL OPEN FONT LICENSE/);
  const css = readFileSync(new URL('../../src/app/match/pair-ui.css', import.meta.url), 'utf8');
  assert.match(css, /url\('\/match\/fonts\/NanumGothic-Bold\.ttf'\)/);
});
