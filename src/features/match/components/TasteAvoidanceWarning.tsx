import { MatchIcon } from './MatchIcon';

export type AvoidanceWarning = { key: string; label: string };
export function TasteAvoidanceWarning({ warnings, compact = false }: { warnings: AvoidanceWarning[]; compact?: boolean }) {
  if (!warnings.length) return null;
  return <aside className={`wm-avoidance-warning${compact ? ' is-compact' : ''}`} role="note" aria-label="내 기피 요소 경고">
    <MatchIcon name="warning" />
    <div><strong>주의! 내가 피하고 싶은 요소가 있어요</strong>
      <p>{warnings.map(item => item.label).join(' · ')}</p>
      {!compact ? <span>테스트에서 선택한 기피 요소와 겹칩니다. 핏 점수가 높아도 감상 전에 꼭 확인하세요.</span> : null}
    </div>
  </aside>;
}
