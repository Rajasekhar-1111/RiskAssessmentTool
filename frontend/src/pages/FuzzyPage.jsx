import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { engineAPI } from '../api';

export default function FuzzyPage() {
  const { projectId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [factors, setFactors] = useState({
    requirement_stability: 5,
    team_experience: 5,
    technology_maturity: 5,
    project_complexity: 5,
    schedule_pressure: 5,
    resource_availability: 5,
    stakeholder_involvement: 5,
    requirement_clarity: 5
  });

  const factorLabels = {
    requirement_stability: { label: 'Requirement Stability', icon: '📋', desc: '10 = Very Stable, 0 = Constantly Changing' },
    team_experience: { label: 'Team Experience', icon: '👥', desc: '10 = Highly Experienced, 0 = No Experience' },
    technology_maturity: { label: 'Technology Maturity', icon: '⚙️', desc: '10 = Proven Tech, 0 = Experimental' },
    project_complexity: { label: 'Project Complexity', icon: '🧩', desc: '0 = Simple, 10 = Extremely Complex' },
    schedule_pressure: { label: 'Schedule Pressure', icon: '⏰', desc: '0 = Relaxed, 10 = Extreme Pressure' },
    resource_availability: { label: 'Resource Availability', icon: '💼', desc: '10 = Fully Available, 0 = Scarce' },
    stakeholder_involvement: { label: 'Stakeholder Involvement', icon: '🤝', desc: '10 = Highly Involved, 0 = Absent' },
    requirement_clarity: { label: 'Requirement Clarity', icon: '🔍', desc: '10 = Crystal Clear, 0 = Very Vague' }
  };

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const res = await engineAPI.fuzzy(projectId, factors);
      setResult(res.data);
    } catch (err) {
      alert('Analysis failed: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  const getRiskColor = (level) => {
    const colors = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
    return colors[level] || '#6366f1';
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">🧠 Fuzzy Logic Risk Assessment</h1>
        <p className="page-subtitle">Assess project risks using fuzzy membership functions and IEEE-standard weighted factors</p>
      </div>

      <div className="grid-2">
        {/* Input Panel */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Input Risk Factors</div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Rate each factor on a scale of 0–10. The fuzzy engine uses triangular membership functions 
            with weighted factor analysis (based on SEI taxonomy importance).
          </p>

          {Object.entries(factors).map(([key, value]) => {
            const info = factorLabels[key];
            return (
              <div key={key} style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    {info.icon} {info.label}
                  </label>
                  <span className="range-value">{value}</span>
                </div>
                <input
                  type="range" className="range-input"
                  min="0" max="10" step="0.5" value={value}
                  onChange={e => setFactors({...factors, [key]: parseFloat(e.target.value)})}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{info.desc}</div>
              </div>
            );
          })}

          <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '12px' }} onClick={runAnalysis} disabled={loading}>
            {loading ? '⏳ Analyzing...' : '🧠 Run Fuzzy Analysis'}
          </button>
        </div>

        {/* Results Panel */}
        <div>
          {result ? (
            <>
              {/* Score Gauge */}
              <div className="card" style={{ marginBottom: '20px', textAlign: 'center' }}>
                <div className="card-title" style={{ marginBottom: '20px' }}>Overall Risk Assessment</div>
                <div className="score-gauge">
                  <svg className="score-gauge-ring" width="180" height="180" viewBox="0 0 180 180">
                    <circle cx="90" cy="90" r="76" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                    <circle cx="90" cy="90" r="76" fill="none"
                      stroke={getRiskColor(result.risk_level)}
                      strokeWidth="12" strokeLinecap="round"
                      strokeDasharray={`${(result.overall_risk_score / 100) * 478} 478`}
                      style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                  </svg>
                  <div className="score-gauge-value">
                    <div className="score-gauge-number" style={{ color: getRiskColor(result.risk_level) }}>
                      {result.overall_risk_score.toFixed(1)}
                    </div>
                    <div className="score-gauge-label">out of 100</div>
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <span className={`risk-badge ${result.risk_level}`} style={{ fontSize: '14px', padding: '6px 20px' }}>
                    {result.risk_level.toUpperCase()} RISK
                  </span>
                </div>
              </div>

              {/* Factor Analysis */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-title" style={{ marginBottom: '16px' }}>Factor Analysis</div>
                {Object.entries(result.factor_analysis).map(([key, data]) => (
                  <div key={key} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{factorLabels[key]?.label || key}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: getRiskColor(data.dominant_level === 'very_high' || data.dominant_level === 'high' ? 'high' : data.dominant_level === 'medium' ? 'medium' : 'low') }}>
                        {data.risk_score.toFixed(0)}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${data.risk_score >= 70 ? 'critical' : data.risk_score >= 50 ? 'high' : data.risk_score >= 30 ? 'medium' : 'low'}`}
                        style={{ width: `${data.risk_score}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {result.recommendations?.length > 0 && (
                <div className="card">
                  <div className="card-title" style={{ marginBottom: '16px' }}>💡 Recommendations</div>
                  {result.recommendations.map((rec, idx) => (
                    <div key={idx} className={`rec-card ${rec.priority}`}>
                      <span className="rec-icon">{rec.priority === 'critical' ? '🚨' : rec.priority === 'high' ? '⚡' : '📋'}</span>
                      <div>
                        <div className="rec-text">{rec.action}</div>
                        <div className="rec-factor">{rec.factor}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">🧠</div>
                <h3 className="empty-state-title">Ready for Analysis</h3>
                <p className="empty-state-text">Adjust the risk factors on the left and click "Run Fuzzy Analysis" to get AI-powered risk assessment using fuzzy logic inference.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
