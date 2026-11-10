'use client';
import { useEffect, useLayoutEffect, useRef } from 'react';

export function useWorkSearchDropdown(open: boolean, onDismiss: () => void) {
  const anchor = useRef<HTMLDivElement>(null);
  const dismiss = useRef(onDismiss);
  useEffect(() => { dismiss.current = onDismiss; }, [onDismiss]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !anchor.current?.contains(event.target)) dismiss.current();
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useLayoutEffect(() => {
    const element = anchor.current;
    if (!open || !element) return;
    function measure() {
      if (!element) return;
      const rect = element.getBoundingClientRect(), viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0, bottom = top + (viewport?.height ?? window.innerHeight);
      const header = document.querySelector('.brand-bar')?.getBoundingClientRect().bottom ?? top;
      const below = bottom - rect.bottom - 12, above = rect.top - Math.max(top, header) - 12;
      const upwards = below < 180 && above > below;
      element.dataset.dropdownSide = upwards ? 'above' : 'below';
      element.style.setProperty('--wm-dropdown-height', `${Math.max(80, Math.min(420, upwards ? above : below))}px`);
    }
    const observer = new ResizeObserver(measure); observer.observe(element);
    window.addEventListener('resize',measure); window.addEventListener('scroll',measure,{passive:true});
    window.visualViewport?.addEventListener('resize',measure); window.visualViewport?.addEventListener('scroll',measure);
    measure();
    return () => {
      observer.disconnect(); window.removeEventListener('resize',measure); window.removeEventListener('scroll',measure);
      window.visualViewport?.removeEventListener('resize',measure); window.visualViewport?.removeEventListener('scroll',measure);
    };
  }, [open]);
  return anchor;
}
