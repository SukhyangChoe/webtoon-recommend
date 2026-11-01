import { tasteFeatureIconFor } from '../config/tasteFeatureIcons.mjs';

/** Hand-drawn narrative motifs matched to the actual taste value. */
export function TasteFeatureIcon({ value, category }: { value: string; category: string }) {
  const icon = tasteFeatureIconFor(value, category);
  return <svg className="wm-taste-icon" data-taste-feature={icon.key} width="32" height="32" viewBox="-2 -2 36 36" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon.path} /></svg>;
}
