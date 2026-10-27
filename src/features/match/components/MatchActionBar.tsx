import type { ReactNode } from "react";

/** Shared, safe-area-aware bottom actions for result and relationship screens. */
export function MatchActionBar({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  return <footer className={`wm-action-bar ${className}`} aria-label={label}>{children}</footer>;
}
