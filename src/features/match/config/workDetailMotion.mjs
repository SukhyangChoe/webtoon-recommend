/** Interaction constants and geometry from the approved v0.2.7 detail demo. */
export const WORK_SHEET_GESTURE = Object.freeze({ threshold: 64, axisLock: 8, dominance: 1.15 });

export function workSheetGeometry({ height, summary, footer, handle = 44 }) {
  const maximum = Math.max(150, height - (height < 440 ? 48 : 76));
  const collapsed = Math.min(maximum, Math.ceil(summary + footer + handle + 2));
  // Both tabs share one expanded frame; switching content must not resize it.
  return { collapsed: Math.round(collapsed), reasons: Math.round(maximum), info: Math.round(maximum), hero: Math.round(Math.max(68, height - collapsed + 25)) };
}

export function workSheetMorph(progress, opening) {
  const t = Math.max(0, Math.min(1, progress));
  const p = t * t * (3 - 2 * t);
  const clamp = value => Math.max(0, Math.min(1, value));
  return opening
    ? { summaryOpacity: clamp(1 - p * 1.35), summaryY: -7 * p, readingOpacity: clamp((p - .10) / .90), readingY: 14 * (1 - p), header: p }
    : { summaryOpacity: clamp((p - .12) / .88), summaryY: 12 * (1 - p), readingOpacity: clamp(1 - p * 1.28), readingY: 7 * p, header: 1 - p };
}
