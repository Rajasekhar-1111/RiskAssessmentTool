import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { engineAPI } from '../api';

export default function NLPPage() {
  const { projectId } = useParams();
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('input');

  const sampleText = `1. The system should be user-friendly and easy to use.
2. The application shall process login requests within 2 seconds.
3. Users may upload files in various formats.
4. The system must encrypt all sensitive data using AES-256 encryption.
5. The notification module should probably send alerts.
6. Performance should be adequate for normal usage.
7. The system shall support real-time data synchronization across distributed nodes.
8. [TBD] - Authentication mechanism to be determined.
9. The admin dashboard must display analytics with appropriate charts.
10. Integration with third-party payment gateway is required.
11. The system could use some sort of caching mechanism.
12. Error handling should be robust and flexible.
13. The system shall maintain 99.9% uptime during business hours.
14. The search functionality should return results quickly.
15. TODO: Define the exact file size limit for uploads.
16. The system must comply with GDPR and store data securely.
17. Given a logged-in user, when they click "Export", then the system shall generate a CSV file within 5 seconds.
18. The application should handle several concurrent users efficiently.
19. Legacy system migration must be completed before Phase 2.
20. The reporting module may need some modifications later.`;

  const runAnalysis = async () => {
    if (!text.trim()) { alert('Enter requirement text'); return; }
    setLoading(true);
    try {
      const res = await engineAPI.nlpAnalyze(projectId, { text, document_name: 'requirements.txt' });
      setResult(res.data);
      setActiveTab('results');
    } catch (err) {
      alert('Analysis failed: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  const getSeverityColor = (severity) => {
    const colors = { error: 'var(--risk-critical)', warning: 'var(--risk-medium)', info: 'var(--accent-secondary)' };
    return colors[severity] || 'var(--text-secondary)';
  };

  const getRiskColor = (level) => {
    const colors = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
    return colors[level] || '#6366f1';
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">📝 NLP Requirement Analyzer</h1>
        <p className="page-subtitle">ISO/IEC/IEEE 29148:2018 compliance check — detects ambiguity, incompleteness, and complexity risks</p>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'input' ? 'active' : ''}`} onClick={() => setActiveTab('input')}>📄 Input</button>
        <button className={`tab ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')} disabled={!result}>📊 Results</button>
        <button className={`tab ${activeTab === 'findings' ? 'active' : ''}`} onClick={() => setActiveTab('findings')} disabled={!result}>🔍 Findings</button>
      </div>

      {activeTab === 'input' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Enter Requirements</div>
              <div className="card-subtitle">Paste your SRS, user stories, or requirement document text</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setText(sampleText)}>📋 Load Sample</button>
          </div>
          <textarea
            className="form-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste your requirements here... (one requirement per line)"
            style={{ minHeight: '350px', fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.8' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {text.split('\n').filter(l => l.trim()).length} lines • {text.split(/\s+/).filter(w => w).length} words
            </span>
            <button className="btn btn-primary btn-lg" onClick={runAnalysis} disabled={loading || !text.trim()}>
              {loading ? '⏳ Analyzing...' : '🔍 Analyze Requirements'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'results' && result && (
        <div className="slide-up">
          {/* Quality Score */}
          <div className="grid-4" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: `${getRiskColor(result.risk_level)}22` }}>📊</div>
              <div>
                <div className="stat-value" style={{ color: getRiskColor(result.risk_level) }}>{result.quality_score.toFixed(0)}</div>
                <div className="stat-label">Quality Score</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange">⚠</div>
              <div>
                <div className="stat-value" style={{ color: 'var(--risk-medium)' }}>{result.ambiguity_count}</div>
                <div className="stat-label">Ambiguous Terms</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--risk-critical-bg)' }}>❌</div>
              <div>
                <div className="stat-value" style={{ color: 'var(--risk-critical)' }}>{result.incompleteness_count}</div>
                <div className="stat-label">Incomplete Requirements</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon cyan">🧩</div>
              <div>
                <div className="stat-value" style={{ color: 'var(--accent-secondary)' }}>{result.summary?.complexity_count || 0}</div>
                <div className="stat-label">Complexity Indicators</div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            {/* Score Gauge */}
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-title" style={{ marginBottom: '20px' }}>Requirement Quality Score</div>
              <div className="score-gauge">
                <svg className="score-gauge-ring" width="180" height="180" viewBox="0 0 180 180">
                  <circle cx="90" cy="90" r="76" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                  <circle cx="90" cy="90" r="76" fill="none"
                    stroke={getRiskColor(result.risk_level)} strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={`${(result.quality_score / 100) * 478} 478`}
                  />
                </svg>
                <div className="score-gauge-value">
                  <div className="score-gauge-number" style={{ color: getRiskColor(result.risk_level) }}>
                    {result.quality_score.toFixed(0)}
                  </div>
                  <div className="score-gauge-label">/ 100</div>
                </div>
              </div>
              <span className={`risk-badge ${result.risk_level}`} style={{ marginTop: '12px', fontSize: '13px', padding: '6px 18px' }}>
                {result.risk_level.toUpperCase()} RISK
              </span>
            </div>

            {/* Recommendations */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: '16px' }}>💡 Recommendations</div>
              {result.recommendations?.length > 0 ? result.recommendations.map((rec, idx) => (
                <div key={idx} className={`rec-card ${rec.priority}`}>
                  <span className="rec-icon">{rec.priority === 'critical' ? '🚨' : rec.priority === 'high' ? '⚡' : '📋'}</span>
                  <div>
                    <div className="rec-text">{rec.message}</div>
                    <div className="rec-factor">{rec.type}</div>
                  </div>
                </div>
              )) : (
                <div className="rec-card medium">
                  <span className="rec-icon">✅</span>
                  <div className="rec-text">Requirements look good! Continue with regular reviews.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'findings' && result && (
        <div className="slide-up">
          <div className="card">
            <div className="card-header">
              <div className="card-title">🔍 Detailed Findings ({result.findings.length})</div>
            </div>
            {result.findings.length > 0 ? result.findings.map((finding, idx) => (
              <div key={idx} className={`finding-item ${finding.severity}`}>
                <div className="finding-type" style={{ color: getSeverityColor(finding.severity) }}>
                  {finding.type} • Line {finding.line}
                  {finding.keyword && <span> • "{finding.keyword}"</span>}
                </div>
                <div className="finding-text">"{finding.text}"</div>
                <div className="finding-message">{finding.message}</div>
                {finding.suggestion && <div className="finding-suggestion">💡 {finding.suggestion}</div>}
              </div>
            )) : (
              <div className="empty-state" style={{ padding: '40px' }}>
                <p>No issues found — requirements meet quality standards! 🎉</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
