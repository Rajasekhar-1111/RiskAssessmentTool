const ICONS = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };

export default function RiskBadge({ level }) {
  const l = (level || 'low').toLowerCase();
  return (
    <span className={`risk-badge ${l}`}>
      {ICONS[l] || '⚪'} {l}
    </span>
  );
}
