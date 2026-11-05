export const DAILY_SELECTION_VERSION = 'runtime02-r9-v183-daily-v3-current-taste';
export const DAILY_INPUT_VERSION = 'question-seed-v04-current-genres-v2';
export const DAILY_TIME_ZONE = 'Asia/Seoul';
export const DAILY_MAX_WORKS = 3;
export const DAILY_INPUT_MAPPING_APPROVED = true;

/** Explicitly approved: KST midnight OR changed answers/registered works; no cooldown. */
export function dailyWindow(now = new Date()) {
  const time = new Date(now).getTime();
  if (!Number.isFinite(time)) throw Error('INVALID_DAILY_CLOCK');
  const shifted = time + 9 * 60 * 60 * 1000;
  const day = new Date(shifted).toISOString().slice(0, 10);
  const expiresAt = new Date(Date.parse(`${day}T00:00:00+09:00`) + 24 * 60 * 60 * 1000).toISOString();
  return { day, timeZone: DAILY_TIME_ZONE, expiresAt };
}
