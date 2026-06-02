export default function HeatMap({ risks = [] }) {
  // 5x5 grid: Y = Impact (5..1 top-to-bottom), X = Probability (1..5 left-to-right)
  const grid = Array(5).fill(null).map(() => Array(5).fill(0));

  risks.forEach(r => {
    const pIdx = Math.min(Math.floor((r.probability || 0) * 5), 4);
    const iIdx = Math.min(Math.floor((r.impact || 0) * 5), 4);
    grid[4 - iIdx][pIdx]++;
  });

  const getLevel = (row, col) => {
    const score = (col + 1) * (5 - row);
    if (score >= 20) return 'level-5';
    if (score >= 15) return 'level-4';
    if (score >= 10) return 'level-3';
    if (score >= 5) return 'level-2';
    if (score >= 2) return 'level-1';
    return 'level-0';
  };

  return (
    <div className="heat-map-grid">
      {/* Y-axis label */}
      <div className="heat-map-label y-axis" style={{ gridRow: '1 / 6', gridColumn: '1' }}>
        IMPACT →
      </div>

      {/* Cells */}
      {grid.map((row, ri) =>
        row.map((count, ci) => (
          <div
            key={`${ri}-${ci}`}
            className={`heat-map-cell ${getLevel(ri, ci)}`}
            style={{ gridRow: ri + 1, gridColumn: ci + 2 }}
            title={`P=${((ci + 1) * 20)}% I=${((5 - ri) * 20)}% — ${count} risk(s)`}
          >
            {count || ''}
          </div>
        ))
      )}

      {/* X-axis label */}
      <div className="heat-map-label" style={{ gridRow: '6', gridColumn: '2 / 7' }}>
        PROBABILITY →
      </div>
    </div>
  );
}
