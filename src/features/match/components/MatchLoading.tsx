/** Indeterminate: network completion percentages are not observable. */
export function MatchLoading({ message = '화면을 준비하고 있어요…', compact = false }: { message?: string; compact?: boolean }) {
  return <div className={`wm-loading${compact ? ' wm-loading--compact' : ''}`} role="status" aria-live="polite">
    <p>{message}</p>
    <div className="wm-loading-track" role="progressbar" aria-label={message}><span /></div>
  </div>;
}
