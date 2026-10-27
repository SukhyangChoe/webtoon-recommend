"use client";

import { useEffect, useRef, useState } from 'react';
import { WORK_SHEET_GESTURE, workSheetGeometry, workSheetMorph } from '../config/workDetailMotion.mjs';

type Stage = 'collapsed' | 'reasons' | 'info';
type Panel = Exclude<Stage, 'collapsed'>;

/** One persistent sheet: the handle owns expansion, the body owns ordinary reading. */
export function useWorkDetailSheet(enabled: boolean, firstPanel: Panel = 'reasons') {
  const [stage, setStage] = useState<Stage>('collapsed');
  const [compact, setCompact] = useState(false);
  const root = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLElement>(null);
  const footer = useRef<HTMLElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const actions = useRef<{ open: (next: Panel) => void; close: () => void }>({ open: () => {}, close: () => {} });

  useEffect(() => {
    const preview = root.current, panel = sheet.current, scroller = body.current, grip = handle.current;
    if (!enabled || !preview || !panel || !scroller || !grip) return;
    let current: Stage = 'collapsed';
    let geometry = { collapsed: 300, reasons: 500, info: 600, hero: 400 };
    let naturalHeader = 0;
    let reasonScroll = 0;
    let infoScroll = 0;
    let drag: { id: number; x: number; y: number; source: Stage; axis: '' | 'x' | 'y'; target: Stage | null; travel: number; scroll: number } | null = null;
    let settleTimer = 0, layoutFrame = 0, restoreFrame = 0;
    let settling = false;
    let disposed = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const setHeight = (height: number) => preview.style.setProperty('--work-sheet-height', `${height}px`);
    const morph = (progress: number, opening: boolean) => {
      const values = workSheetMorph(progress, opening);
      preview.style.setProperty('--summary-opacity', String(values.summaryOpacity));
      preview.style.setProperty('--summary-y', `${values.summaryY}px`);
      preview.style.setProperty('--reading-opacity', String(values.readingOpacity));
      preview.style.setProperty('--reading-y', `${values.readingY}px`);
      preview.style.setProperty('--header-opacity', String(values.readingOpacity));
      preview.style.setProperty('--work-header-height', `${naturalHeader * values.header}px`);
    };
    const clearMorph = () => {
      delete preview.dataset.morph;
      delete preview.dataset.dragging;
      delete preview.dataset.settling;
      for (const key of ['--summary-opacity', '--summary-y', '--reading-opacity', '--reading-y', '--header-opacity']) preview.style.removeProperty(key);
      preview.style.setProperty('--work-header-height', `${current === 'collapsed' ? 0 : naturalHeader}px`);
      settling = false;
    };
    const layout = () => {
      layoutFrame = 0;
      if (drag || settling) return;
      const height = preview.clientHeight;
      setCompact(height < 480);
      naturalHeader = header.current?.offsetHeight ?? 0;
      geometry = workSheetGeometry({ height, summary: summary.current?.offsetHeight ?? 0, footer: footer.current?.offsetHeight ?? 0 });
      preview.style.setProperty('--work-footer-height', `${footer.current?.offsetHeight ?? 0}px`);
      preview.style.setProperty('--work-hero-height', `${geometry.hero}px`);
      preview.style.setProperty('--work-header-height', `${current === 'collapsed' ? 0 : naturalHeader}px`);
      setHeight(geometry[current]);
    };
    const scheduleLayout = () => { if (!disposed && !layoutFrame) layoutFrame = requestAnimationFrame(layout); };
    const focusHeading = (next: Stage) => {
      const target = next === 'collapsed' ? summary.current?.querySelector<HTMLElement>('.wm-work-open') : next === 'info' ? info.current?.querySelector<HTMLElement>('h3') : header.current?.querySelector<HTMLElement>('h2');
      (target ?? grip).focus({ preventScroll: true });
    };
    const stageUI = (next: Stage) => {
      current = next;
      preview.dataset.stage = next;
      setStage(next);
      setHeight(geometry[next]);
      preview.style.setProperty('--work-header-height', `${next === 'collapsed' ? 0 : naturalHeader}px`);
    };
    const finish = (next: Stage, animate = true, sourceScroll?: number) => {
      clearTimeout(settleTimer);
      cancelAnimationFrame(restoreFrame);
      const previous = current;
      if (previous === 'reasons' && next !== 'reasons') reasonScroll = sourceScroll ?? scroller.scrollTop;
      if (previous === 'info' && next !== 'info') infoScroll = sourceScroll ?? scroller.scrollTop;
      stageUI(next);
      if (next === 'collapsed') scroller.scrollTop = 0;
      else if (next === 'reasons') scroller.scrollTop = reasonScroll;
      else scroller.scrollTop = infoScroll;
      if (animate && preview.dataset.morph) {
        delete preview.dataset.dragging;
        preview.dataset.settling = 'true';
        settling = true;
        // Flush the last finger-following frame before allowing CSS to settle.
        void panel.offsetHeight;
        morph(1, next !== 'collapsed');
        setHeight(geometry[next]);
        settleTimer = window.setTimeout(() => { clearMorph(); scheduleLayout(); }, reduced.matches ? 0 : 285);
      } else clearMorph();
      restoreFrame = requestAnimationFrame(() => {
        if (current !== next) return;
        scroller.scrollTop = next === 'collapsed' ? 0 : next === 'reasons' ? reasonScroll : infoScroll;
        focusHeading(next);
      });
    };
    const cancelDrag = () => {
      if (!drag) return;
      const source = drag.source, savedScroll = drag.scroll, wasMorphing = Boolean(preview.dataset.morph);
      drag = null;
      delete preview.dataset.dragging;
      if (wasMorphing) {
        preview.dataset.settling = 'true'; settling = true;
        morph(0, source === 'collapsed');
        setHeight(geometry[source]);
        settleTimer = window.setTimeout(() => { clearMorph(); scroller.scrollTop = savedScroll; scheduleLayout(); }, reduced.matches ? 0 : 285);
      }
    };
    const open = (next: Panel) => {
      cancelDrag(); clearTimeout(settleTimer); clearMorph();
      if (current === next) { setHeight(geometry[current]); return; }
      if (current === 'collapsed') {
        preview.dataset.morph = 'opening'; morph(0, true);
        void panel.offsetHeight;
      }
      finish(next);
    };
    const close = () => {
      cancelDrag(); clearTimeout(settleTimer); clearMorph();
      if (current === 'collapsed') return;
      preview.dataset.morph = 'closing'; morph(0, false);
      void panel.offsetHeight;
      finish('collapsed');
    };
    actions.current = { open, close };
    const down = (event: PointerEvent) => {
      if (drag) { cancelDrag(); return; }
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      clearTimeout(settleTimer); clearMorph();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, source: current, axis: '', target: null, travel: 0, scroll: scroller.scrollTop };
      grip.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= WORK_SHEET_GESTURE.axisLock) drag.axis = Math.abs(dy) >= Math.abs(dx) * WORK_SHEET_GESTURE.dominance ? 'y' : 'x';
      if (drag.axis !== 'y') return;
      const opening = drag.source === 'collapsed';
      const travel = Math.max(0, opening ? -dy : dy);
      if (!travel && !drag.target) return;
      event.preventDefault();
      drag.target = opening ? firstPanel : 'collapsed'; drag.travel = travel;
      preview.dataset.dragging = 'true'; preview.dataset.morph = opening ? 'opening' : 'closing';
      const distance = Math.abs(geometry[drag.target] - geometry[drag.source]);
      setHeight(geometry[drag.source] + (opening ? 1 : -1) * Math.min(travel, distance));
      morph(travel / WORK_SHEET_GESTURE.threshold, opening);
    };
    const up = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      move(event);
      if (!drag) return;
      const next = drag.target;
      if (next && drag.travel >= WORK_SHEET_GESTURE.threshold) { const savedScroll = drag.scroll; drag = null; finish(next, true, savedScroll); }
      else cancelDrag();
      if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
    };
    const click = (event: MouseEvent) => { if (event.detail === 0) { if (current === 'collapsed') open(firstPanel); else close(); } };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { if (drag) cancelDrag(); else close(); }
      if (current !== 'collapsed' && preview.contains(document.activeElement) && ['PageDown', 'PageUp', 'Home', 'End'].includes(event.key) && !(event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable]'))) {
        event.preventDefault();
        if (event.key === 'Home') scroller.scrollTop = 0;
        else if (event.key === 'End') scroller.scrollTop = scroller.scrollHeight;
        else scroller.scrollTop += (event.key === 'PageDown' ? 1 : -1) * scroller.clientHeight * .8;
      }
      if (event.target !== grip) return;
      if (['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); if (event.key === 'ArrowUp' && current === 'collapsed') open(firstPanel); else if (event.key === 'ArrowDown') close(); }
    };
    const cancel = () => cancelDrag();
    const hidden = () => { if (document.hidden) cancelDrag(); };
    const resize = () => { cancelDrag(); scheduleLayout(); };
    const multipointer = (event: PointerEvent) => { if (drag && event.pointerId !== drag.id) cancelDrag(); };
    // A tap on the exposed cover closes; a cover swipe remains a reading gesture.
    const cover = preview.querySelector<HTMLElement>('.wm-work-cover-close');
    let coverPress: { id: number; x: number; y: number; at: number } | null = null;
    const coverDown = (event: PointerEvent) => { coverPress = event.isPrimary ? { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now() } : null; };
    const coverUp = (event: PointerEvent) => { if (coverPress?.id === event.pointerId && Math.hypot(event.clientX - coverPress.x, event.clientY - coverPress.y) < 8 && performance.now() - coverPress.at < 650) close(); coverPress = null; };
    const coverClick = (event: MouseEvent) => { if (event.detail === 0) close(); };
    const coverCancel = () => { coverPress = null; };
    grip.addEventListener('pointerdown', down); grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', cancel); grip.addEventListener('lostpointercapture', cancel); grip.addEventListener('click', click);
    window.addEventListener('keydown', key); window.addEventListener('blur', cancel); window.addEventListener('resize', resize); window.addEventListener('pointerdown', multipointer, true);
    document.addEventListener('visibilitychange', hidden);
    cover?.addEventListener('pointerdown', coverDown); cover?.addEventListener('pointerup', coverUp); cover?.addEventListener('pointercancel', coverCancel); cover?.addEventListener('click', coverClick);
    const observer = new ResizeObserver(scheduleLayout);
    for (const element of [preview, summary.current, header.current, footer.current]) if (element) observer.observe(element);
    layout();
    void document.fonts.ready.then(scheduleLayout);
    return () => {
      disposed = true;
      clearTimeout(settleTimer); cancelAnimationFrame(layoutFrame); cancelAnimationFrame(restoreFrame); observer.disconnect();
      grip.removeEventListener('pointerdown', down); grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', cancel); grip.removeEventListener('lostpointercapture', cancel); grip.removeEventListener('click', click);
      window.removeEventListener('keydown', key); window.removeEventListener('blur', cancel); window.removeEventListener('resize', resize); window.removeEventListener('pointerdown', multipointer, true);
      document.removeEventListener('visibilitychange', hidden);
      cover?.removeEventListener('pointerdown', coverDown); cover?.removeEventListener('pointerup', coverUp); cover?.removeEventListener('pointercancel', coverCancel); cover?.removeEventListener('click', coverClick);
      actions.current = { open: () => {}, close: () => {} };
    };
  }, [enabled, firstPanel]);

  return { stage, compact, root, sheet, summary, header, body, info, footer, handle, openPanel: (next: Panel) => actions.current.open(next), closePanel: () => actions.current.close() };
}
