import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { engineAPI } from '../api';

export default function MLPredictPage() {
  const { projectId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    team_size: 5, budget: 100000, duration_months: 6,
    complexity: 'medium', team_experience: 5,
    technology_maturity: 5, requirement_stability: 5,
    methodology: 'agile'
  });

  const runPrediction = async () => {
    setLoading(true);
    try {
      const res = await engineAPI.mlPredict(projectId, form);
      setResult(res.data);
    } catch (err) {
      alert('Prediction failed: ' + (err.response?.data?.error || err.message));
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
        <h1 className="page-title">🤖 ML Risk Prediction</h1>
        <p className="page-subtitle">AI-powered risk prediction using Gradient Boosting (IEEE ICoDSE five-factor model)</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Project Parameters</div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Team Size</label>
              <input type="number" className="form-input" value={form.team_size} onChange={e => setForm({...form, team_size: +e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Budget ($)</label>
              <input type="number" className="form-input" value={form.budget} onChange={e => setForm({...form, budget: +e.target.value})} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Duration (months)</label>
              <input type="number" className="form-input" value={form.duration_months} onChange={e => setForm({...form, duration_months: +e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Methodology</label>
              <select className="form-select" value={form.methodology} onChange={e => setForm({...form, methodology: e.target.value})}>
                <option value="agile">Agile</option>
                <option value="waterfall">Waterfall</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Complexity</label>
            <select className="form-select" value={form.complexity} onChange={e => setForm({...form, complexity: e.target.value})}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="very_high">Very High</option>
            </select>
          </div>

          {['team_experience', 'technology_maturity', 'requirement_stability'].map(key => (
            <div key={key} style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0, textTransform: 'capitalize' }}>
                  {key.replace(/_/g, ' ')}
                </label>
                <span className="range-value">{form[key]}</span>
              </div>
              <input type="range" className="range-input" min="1" max="10" step="0.5" value={form[key]}
                onChange={e => setForm({...form, [key]: +e.target.value})} />
            </div>
          ))}

          <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '12px' }} onClick={runPrediction} disabled={loading}>
            {loading ? '⏳ Predicting...' : '🤖 Run ML Prediction'}
          </button>
        </div>

        <div>
          {result ? (
            <>
              {/* Main Prediction */}
              <div className="card" style={{ marginBottom: '20px', textAlign: 'center' }}>
                <div className="card-title" style={{ marginBottom: '20px' }}>Prediction Result</div>
                <div className="score-gauge">
                  <svg className="score-gauge-ring" width="180" height="180" viewBox="0 0 180 180">
                    <circle cx="90" cy="90" r="76" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                    <circle cx="90" cy="90" r="76" fill="none"
                      stroke={getRiskColor(result.risk_level)} strokeWidth="12" strokeLinecap="round"
                      strokeDasharray={`${(result.risk_score / 100) * 478} 478`}
                      style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                  </svg>
                  <div className="score-gauge-value">
                    <div className="score-gauge-number" style={{ color: getRiskColor(result.risk_level) }}>
                      {result.risk_score.toFixed(0)}
                    </div>
                    <div className="score-gauge-label">Risk Score</div>
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <span className={`risk-badge ${result.risk_level}`} style={{ fontSize: '14px', padding: '6px 20px' }}>
                    {result.risk_level.toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px' }}>
                  Model Confidence: <strong style={{ color: 'var(--text-primary)' }}>{(result.confidence * 100).toFixed(1)}%</strong>
                </p>
              </div>

              {/* Failure Probability */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="card-title">⚠ Failure Probability</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>IEEE ICoDSE threshold: 0.6</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: result.failure_probability > 0.6 ? '#ef4444' : '#22c55e' }}>
                      {(result.failure_probability * 100).toFixed(1)}%
                    </div>
                    {result.threshold_exceeded && (
                      <span className="risk-badge critical">THRESHOLD EXCEEDED</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Class Probabilities */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-title" style={{ marginBottom: '16px' }}>📊 Risk Class Probabilities</div>
                {Object.entries(result.class_probabilities).map(([cls, prob]) => (
                  <div key={cls} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{cls}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{(prob * 100).toFixed(1)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${cls}`} style={{ width: `${prob * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Feature Importance */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-title" style={{ marginBottom: '16px' }}>🔬 Feature Importance</div>
                {Object.entries(result.feature_importance).map(([feat, imp]) => (
                  <div key={feat} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{feat.replace(/_/g, ' ')}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-hover)' }}>{(imp * 100).toFixed(1)}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: '5px' }}>
                      <div style={{ height: '100%', width: `${imp * 100 * 4}%`, background: 'var(--accent-primary)', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendation */}
              <div className={`rec-card ${result.risk_level === 'critical' ? 'critical' : result.risk_level === 'high' ? 'high' : 'medium'}`}>
                <span className="rec-icon">💡</span>
                <div className="rec-text">{result.recommendation}</div>
              </div>
            </>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">🤖</div>
                <h3 className="empty-state-title">Ready for Prediction</h3>
                <p className="empty-state-text">Configure project parameters and run the Gradient Boosting ML model to predict risk level and failure probability.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
