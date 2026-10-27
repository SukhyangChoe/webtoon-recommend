"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MatchIcon } from "./MatchIcon";

/** Shared modal: focus trap, background inertness, Escape/backdrop closing and focus restoration. */
export function MatchDialog({ titleId, onClose, children, sheet = false, busy = false }: {
  titleId: string; onClose: () => void; children: ReactNode; sheet?: boolean; busy?: boolean;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { closeRef.current = onClose; busyRef.current = busy; }, [onClose, busy]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    const inertElements = Array.from(document.body.children).filter((child): child is HTMLElement => child instanceof HTMLElement && !child.contains(dialog));
    const priorInert = inertElements.map((element) => element.inert);
    inertElements.forEach((element) => { element.inert = true; });
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), [tabindex="0"]')).filter((element) => element.getClientRects().length > 0);
    (focusable()[0] ?? dialog).focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRef.current) { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) { event.preventDefault(); dialog?.focus(); return; }
      if (event.shiftKey && (document.activeElement === elements[0] || document.activeElement === dialog)) {
        event.preventDefault(); elements.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === elements.at(-1)) {
        event.preventDefault(); elements[0]?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      inertElements.forEach((element, index) => { element.inert = priorInert[index]; });
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(<div className={`wm-dialog-backdrop${sheet ? " is-sheet" : ""}`} onClick={(event) => {
    if (event.target === event.currentTarget && !busy) onClose();
  }}><section ref={dialogRef} className={`wm-dialog${sheet ? " wm-bottom-sheet" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy} tabIndex={-1}>
    <div className="wm-dialog-top" onPointerDown={(event) => {
      if (!sheet || event.target instanceof Element && event.target.closest("button")) return;
      gesture.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerUp={(event) => {
      if (sheet && gesture.current && event.clientY - gesture.current.y > 60 && Math.abs(event.clientX - gesture.current.x) < 70 && !busy) onClose();
      gesture.current = null;
    }} onPointerCancel={() => { gesture.current = null; }}>
      {sheet ? <span className="wm-sheet-handle" aria-hidden="true" /> : null}
      <button type="button" className="wm-dialog-close" aria-label="닫기" disabled={busy} onClick={onClose}><MatchIcon name="close" /></button>
    </div>
    {children}
  </section></div>, document.body);
}
