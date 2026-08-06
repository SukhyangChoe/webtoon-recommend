type ProgressBarProps = {
    value: number;
    max?: number;
    label?: string;
  };
  
  export function ProgressBar({ value, max = 100, label }: ProgressBarProps) {
    const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
    const safeValue = Number.isFinite(value) ? value : 0;
    const percentage = Math.min(100, Math.max(0, (safeValue / safeMax) * 100));
    const accessibleLabel = label ?? `진행률 ${Math.round(percentage)}%`;
  
    return (
      <div
        className="progress-bar"
        role="progressbar"
        aria-label={accessibleLabel}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.min(safeMax, Math.max(0, safeValue))}
      >
        <div className="progress-bar__fill" style={{ width: `${percentage}%` }} />
      </div>
    );
  }