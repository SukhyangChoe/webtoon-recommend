import type { ReactNode } from 'react';

/** Shared compact label/value rhythm for personal and pair taste summaries. */
export function TastePointRow({ title, icon, muted = false, headingLevel = 'h2', children }: {
  title: string;
  icon: string;
  muted?: boolean;
  headingLevel?: 'h2' | 'h3';
  children: ReactNode;
}) {
  const Heading = headingLevel;
  return <div className={`wm-taste-group wm-taste-summary-row${muted ? ' is-muted' : ''}`}>
    <Heading className="wm-taste-summary-label"><span aria-hidden="true">{icon}</span>{title}</Heading>
    {children}
  </div>;
}
