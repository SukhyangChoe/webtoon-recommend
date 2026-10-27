"use client";

import Link from 'next/link';
import type { ReactNode } from 'react';
import { workDetailHref } from '../config/workDetailPresentation.mjs';

export function WorkDetailLink({ id, profileId, returnTo, children, className, label, newTab = false, onOpen }: {
  id: string; profileId?: string | null; returnTo: string; children: ReactNode;
  className?: string; label?: string; newTab?: boolean; onOpen?: () => void;
}) {
  const href = workDetailHref(id, profileId, returnTo);
  return <Link href={href} className={className} aria-label={label} prefetch={false}
    target={newTab ? '_blank' : undefined} rel={newTab ? 'noopener noreferrer' : undefined}
    onClick={event => {
      if (newTab || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      onOpen?.();
      try { sessionStorage.setItem('wm-work-entry', JSON.stringify({ href, at: Date.now() })); } catch { /* Storage is optional. */ }
    }}>{children}</Link>;
}
