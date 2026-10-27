"use client";

import { useEffect, useRef, type RefObject } from "react";

// Genre rankings and both recommendation screens share one persistent indicator.
export function useHorizontalScrollIndicator(trackRef: RefObject<HTMLElement | null>, count: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    const bar = barRef.current;
    const thumb = thumbRef.current;
    if (!container || !track || !bar || !thumb) return;
    let idleTimer: number | undefined;
    const measure = () => {
      const total = track.scrollWidth;
      bar.hidden = total <= track.clientWidth + 1;
      if (!total) return;
      const left = Math.max(0, Math.min(track.scrollLeft, total - track.clientWidth));
      thumb.style.width = `${track.clientWidth / total * 100}%`;
      thumb.style.left = `${left / total * 100}%`;
    };
    const onScroll = () => {
      measure();
      container.dataset.scrolling = "true";
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => { container.dataset.scrolling = "false"; }, 650);
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(track);
    Array.from(track.children).forEach(child => resize.observe(child));
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      resize.disconnect();
      track.removeEventListener("scroll", onScroll);
      window.clearTimeout(idleTimer);
      delete container.dataset.scrolling;
    };
  }, [count, trackRef]);

  return { containerRef, barRef, thumbRef };
}
