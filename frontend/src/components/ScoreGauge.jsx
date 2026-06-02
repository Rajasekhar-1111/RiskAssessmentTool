// ScoreGauge — displays risk score on a configurable scale (default 1-25)
export default function ScoreGauge({ score = 0, size = 180, label = 'Risk Score', max = 25 }) {
  const clampedScore = Math.min(Math.max(score, 0), max);
  const normalized = (clampedScore / max) * 100; // 0-100 for rendering
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  // 1-25 scale thresholds: >=16 critical, >=9 high, >=4 medium, else low
  const getColor = (s) => {
    if (s >= 16) return 'var(--risk-critical)';
    if (s >= 9)  return 'var(--risk-high)';
    if (s >= 4)  return 'var(--risk-medium)';
    return 'var(--risk-low)';
  };

  const color = getColor(clampedScore);

  return (
    <div className="score-gauge" style={{ width: size, height: size }}>
      <svg className="score-gauge-ring" width={size} height={size} viewBox="0 0 180 180">
        <circle
          cx="90" cy="90" r={radius}
          fill="none"
          stroke="var(--bg-input)"
          strokeWidth="10"
        />
        <circle
          cx="90" cy="90" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
        />
      </svg>
      <div className="score-gauge-value">
        <div className="score-gauge-number" style={{ color }}>
          {Math.round(clampedScore)}
        </div>
        <div className="score-gauge-label">{label}</div>
      </div>
    </div>
  );
}
