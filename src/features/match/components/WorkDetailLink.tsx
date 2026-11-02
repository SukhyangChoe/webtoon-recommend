"use client";

import Link from 'next/link';
import type { ReactNode } from 'react';
import { workDetailHref } from '../config/workDetailPresentation.mjs';
import { clearWorkReturn, writeWorkReturn } from '../storage/workReturnStorage.mjs';

export function WorkDetailLink({ id, returnTo, children, className, label, newTab = false, onOpen }: {
  id: string; returnTo: string; children: ReactNode;
  className?: string; label?: string; newTab?: boolean; onOpen?: () => void;
}) {
  const href = workDetailHref(id, returnTo);
  return <Link href={href} className={className} aria-label={label} prefetch={false}
    target={newTab ? '_blank' : undefined} rel={newTab ? 'noopener noreferrer' : undefined}
    onClick={event => {
      if (event.defaultPrevented || newTab || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      onOpen?.();
      try {
        sessionStorage.setItem('wm-work-entry', JSON.stringify({ href, at: Date.now() }));
        const rail=event.currentTarget.closest<HTMLOListElement>('[data-recommendation-rail]');
        if (rail) writeWorkReturn(sessionStorage, { href, from:location.pathname+location.search, railKey:rail.dataset.recommendationRail, offset:rail.getBoundingClientRect().top, left:rail.scrollLeft });
        else clearWorkReturn(sessionStorage);
      } catch { /* Storage is optional. */ }
    }}>{children}</Link>;
}
