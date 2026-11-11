import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withReaderComic } from '../../src/features/match/server/readerComics.mjs';
import { COMIC_JOBS } from '../../scripts/reader-comics/jobs.mjs';

test('every everyday episode has its own installed comic and four dialogue beats', () => {
  assert.equal(COMIC_JOBS.length, 109);
  const paths = new Set();
  for (const job of COMIC_JOBS) {
    const explanation = { genreKey: job.genre, sceneKey: job.key, scene: job.sourceScene };
    const result = withReaderComic(explanation);
    assert.equal(result.comic?.src, job.src, job.key);
    assert.equal(result.comic.panels.length, 4);
    assert.ok(fs.existsSync(new URL('../../public' + job.src, import.meta.url)));
    assert.ok(result.comic.width > 0 && result.comic.height > 0);
    assert.equal(explanation.comic, undefined, 'saved explanations remain immutable');
    paths.add(result.comic.src);
  }
  assert.equal(paths.size, 109);
});

test('old saved explanations resolve by exact scene; stale or unknown copy has no mismatched image', () => {
  const job = COMIC_JOBS[0];
  assert.ok(withReaderComic({ genreKey: job.genre, sceneKey: job.key, scene: job.sourceScene }).comic);
  assert.equal(withReaderComic({ genreKey: job.genre, sceneKey: job.key, scene: '다른 에피소드' }).comic, undefined);
  assert.equal(withReaderComic({ sceneKey: '../../bad', scene: job.sourceScene, comic: { src: 'javascript:bad' } }).comic, undefined);
  assert.equal(withReaderComic(undefined), undefined);
  const common = COMIC_JOBS.at(-1);
  assert.equal(withReaderComic({ genreKey: 'other', sceneKey: 'other.growth', scene: common.sourceScene }).comic.src, common.src);
});
