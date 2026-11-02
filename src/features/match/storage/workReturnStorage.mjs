import { safeWorkReturnPath } from '../config/workDetailPresentation.mjs';

export const WORK_RETURN_KEY = 'webtoon-match:work-return:v1';
const RAIL_PREFIX = 'webtoon-match:rail-pixels:v2:';
const MAX_AGE = 30 * 60 * 1000;

export function readRailOffset(storage, key) {
  try {
    const value = Number(storage?.getItem(RAIL_PREFIX + key));
    return Number.isFinite(value) && value >= 0 && value <= 100000 ? value : 0;
  } catch { return 0; }
}
export function writeRailOffset(storage, key, left) {
  if (!key || !Number.isFinite(left) || left < 0) return;
  try { storage?.setItem(RAIL_PREFIX + key, String(left)); } catch { /* Optional storage. */ }
}
export function clearWorkReturn(storage) {
  try { storage?.removeItem(WORK_RETURN_KEY); } catch { /* Optional storage. */ }
}
export function writeWorkReturn(storage, snapshot, now = Date.now()) {
  try { storage?.setItem(WORK_RETURN_KEY, JSON.stringify({ ...snapshot, at: now })); } catch { /* Optional storage. */ }
}
export function readWorkReturn(storage, now = Date.now()) {
  try {
    const saved = JSON.parse(storage?.getItem(WORK_RETURN_KEY) ?? 'null');
    if (!saved || !Number.isFinite(saved.at) || now < saved.at || now-saved.at > MAX_AGE
      || typeof saved.from !== 'string' || safeWorkReturnPath(saved.from) !== saved.from
      || typeof saved.href !== 'string' || !/^\/match\/work\/[\w-]+\?/.test(saved.href) || saved.href.length > 2200
      || typeof saved.railKey !== 'string' || !saved.railKey || saved.railKey.length > 4000
      || !Number.isFinite(saved.offset) || Math.abs(saved.offset) > 100000
      || !Number.isFinite(saved.left) || saved.left < 0 || saved.left > 100000) return null;
    return saved;
  } catch { return null; }
}
