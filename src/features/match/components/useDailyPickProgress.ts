'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DAILY_PROGRESS_MESSAGES, isDailyRecalculationStage } from '../config/dailyPicksPresentation.mjs';

export type DailyPickProgressStage = keyof typeof DAILY_PROGRESS_MESSAGES;

/** Briefly hold observed stages so fast server events remain readable.
 * Completion always wins immediately; this never delays the selected works. */
export function useDailyPickProgress() {
  const [progress,setProgress] = useState<{stage:DailyPickProgressStage;recalculating:boolean}>({stage:'loading',recalculating:false});
  const queue = useRef<DailyPickProgressStage[]>([]);
  const shown = useRef<DailyPickProgressStage>('loading');
  const shownAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef(false);
  const recalculating = useRef(false);
  const finish = useCallback(() => {
    running.current = false; queue.current = [];
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const start = useCallback((continuing: boolean) => {
    running.current = true;
    if (!continuing) {
      queue.current = []; recalculating.current = false; shown.current = 'loading';
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
      setProgress({stage:'loading',recalculating:false});
    }
  }, []);
  useEffect(() => finish, [finish]);
  const onProgress = useCallback((next: DailyPickProgressStage) => {
    if (!running.current) return;
    if (!recalculating.current) {
      if (!isDailyRecalculationStage(next)) return;
      // Confirmed cache misses appear immediately; preliminary reads stay quiet.
      recalculating.current = true; shown.current = next; shownAt.current = Date.now();
      setProgress({stage:next,recalculating:true});
      return;
    }
    if (next === 'loading' || next === 'checking' || (queue.current.at(-1) ?? shown.current) === next) return;
    queue.current.push(next);
    if (timer.current !== null) return;
    const advance = () => {
      timer.current = null;
      if (!running.current) return;
      const nextStage = queue.current.shift();
      if (!nextStage) return;
      shown.current = nextStage; shownAt.current = Date.now(); setProgress({stage:nextStage,recalculating:true});
      if (queue.current.length) timer.current = setTimeout(advance, 650);
    };
    timer.current = setTimeout(advance, Math.max(0, 650 - (Date.now() - shownAt.current)));
  }, []);
  return { message: DAILY_PROGRESS_MESSAGES[progress.stage], recalculating:progress.recalculating, start, finish, onProgress };
}
