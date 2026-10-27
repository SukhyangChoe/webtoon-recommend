import test from 'node:test';
import assert from 'node:assert/strict';
import { WORK_SHEET_GESTURE, workSheetGeometry, workSheetMorph } from '../../src/features/match/config/workDetailMotion.mjs';

test('sheet retains the original demo gesture thresholds', () => {
  assert.deepEqual(WORK_SHEET_GESTURE, { threshold:64, axisLock:8, dominance:1.15 });
});
test('sheet sizes preserve cover peek, footer space and a stable hero at every stage', () => {
  const size = workSheetGeometry({height:788,summary:265,footer:81});
  assert.equal(size.collapsed,392);
  assert.equal(size.reasons,712);
  assert.equal(size.info,712);
  assert.equal(size.hero,421);
  const short = workSheetGeometry({height:334,summary:265,footer:67});
  assert.equal(short.info,286);
  assert.equal(short.reasons,short.info);
});
test('drag content morphs progressively and clamps overshoot instead of flashing', () => {
  const closed = workSheetMorph(0,true), opened = workSheetMorph(1,true);
  assert.equal(closed.summaryOpacity,1); assert.equal(closed.readingOpacity,0); assert.equal(closed.header,0);
  assert.equal(opened.summaryOpacity,0); assert.equal(opened.readingOpacity,1); assert.equal(opened.header,1);
  const middle=workSheetMorph(.5,true);
  assert.ok(middle.summaryOpacity>0&&middle.summaryOpacity<1&&middle.readingOpacity>0&&middle.readingOpacity<1);
  assert.deepEqual(workSheetMorph(5,true),opened);
  assert.deepEqual(workSheetMorph(-1,true),closed);
  assert.equal(workSheetMorph(0,false).readingOpacity,1);
  assert.equal(workSheetMorph(1,false).summaryOpacity,1);
});
