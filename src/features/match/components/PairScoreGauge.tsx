import type { CSSProperties } from 'react';

/** One visual scale for the pair detail and its relationship-map preview. */
export function PairScoreGauge({ score, compact = false }: { score: number; compact?: boolean }) {
  const style = { '--pair-score-angle': `${Math.max(0, Math.min(100, score)) * 3.6}deg` } as CSSProperties;
  return <div className={`wm-pair-score${compact ? ' wm-pair-score--compact' : ''}`} style={style} role="img" aria-label={`궁합 점수 ${score}%`}><strong>{score}<small>%</small></strong></div>;
}
