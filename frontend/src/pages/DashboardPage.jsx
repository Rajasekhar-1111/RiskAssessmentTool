import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ScoreGauge from '../components/ScoreGauge';
import RiskBadge from '../components/RiskBadge';
import HeatMap from '../components/HeatMap';
import { projectAPI } from '../api';

export default function DashboardPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!projectId) { navigate('/projects'); return; }
    loadDashboard();
  }, [projectId]);

  const loadDashboard = () => {
    setLoading(true);
    projectAPI.dashboard(projectId)
      .then(res => setDashboard(res.data))
      .catch(err => { console.error(err); alert('Failed to load dashboard'); })
      .finally(() => setLoading(false));
  };

  const handleAutoGenerate = async () => {
    if (!confirm("This will automatically suggest mitigation plans for your manually added risks and generate task schedules based on the project's modules. Your manually added risks will be preserved, and no new risks will be generated. Do you want to proceed?")) return;
    setGenerating(true);
    try {
      await projectAPI.autoGenerate(projectId);
      // Reload dashboard
      const res = await projectAPI.dashboard(projectId);
      setDashboard(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to auto-generate plan");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div><span>Loading dashboard...</span></div>;

  if (generating) {
    return (
      <div className="loading-container" style={{ flexDirection: 'column', gap: 20 }}>
        <div className="spinner" style={{ width: 60, height: 60, border: '4px solid rgba(99,102,241,0.1)', borderTopColor: 'var(--accent-hover)' }}></div>
        <h2 style={{ color: 'var(--text-heading)', fontWeight: 800 }}>🤖 AI Risk Assessor & Planner</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400 }}>
          Analyzing project modules, suggesting mitigation strategies for your manually added risks, and scheduling sequential development phases...
        </p>
      </div>
    );
  }

  if (!dashboard) return null;

  const { project, risk_summary, top_risks } = dashboard;
  const rd = risk_summary.risk_distribution;
  const total = risk_summary.total_risks || 1;

  const getRiskColor = (level) => {
    const map = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
    return map[level] || '#6366f1';
  };

  const avgScore = risk_summary.average_risk_score || 0;
  // 1-25 scale: >=16 critical, >=9 high, >=4 medium, else low
  const overallLevel = avgScore >= 16 ? 'critical' : avgScore >= 9 ? 'high' : avgScore >= 4 ? 'medium' : 'low';

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 className="page-title">📊 {project.name}</h1>
          <p className="page-subtitle">{project.description || 'Project Risk Dashboard'}</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            {project.methodology && <span style={{ fontSize: 12, padding: '3px 10px', background: 'rgba(99,102,241,0.1)', borderRadius: 20, color: 'var(--accent-hover)', fontWeight: 600 }}>{project.methodology.toUpperCase()}</span>}
            {project.complexity && <span style={{ fontSize: 12, padding: '3px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 20, color: 'var(--text-secondary)', fontWeight: 600 }}>Complexity: {project.complexity.replace('_', ' ')}</span>}
            {project.technology && <span style={{ fontSize: 12, padding: '3px 10px', background: 'rgba(6,182,212,0.08)', borderRadius: 20, color: '#06b6d4', fontWeight: 500 }}>{project.technology}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/projects/${projectId}/risks`)}>⚠️ Manage Risks</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/projects/${projectId}/wizard`)}>✨ Risk Wizard</button>
          <button className="btn btn-primary btn-sm" onClick={handleAutoGenerate} disabled={generating}>
            ✨ Auto-Generate Plan
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4 fade-in" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon purple">⚠️</div>
          <div>
            <div className="stat-value">{risk_summary.total_risks}</div>
            <div className="stat-label">Total Risks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>🔥</div>
          <div>
            <div className="stat-value" style={{ color: '#ef4444' }}>{risk_summary.critical_risks}</div>
            <div className="stat-label">Critical Risks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">📋</div>
          <div>
            <div className="stat-value">{project.task_count || 0}</div>
            <div className="stat-label">Tasks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">🔓</div>
          <div>
            <div className="stat-value">{risk_summary.open_risks}</div>
            <div className="stat-label">Open Risks</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Gauge + Distribution + Heat Map */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {/* Risk Score Gauge */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-header" style={{ justifyContent: 'center' }}>
            <div className="card-title">📊 Risk Score</div>
          </div>
          <ScoreGauge score={Math.round(avgScore)} label="Avg Score" />
          <div style={{ marginTop: 12 }}>
            <RiskBadge level={overallLevel} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Critical', count: rd.critical || 0, color: '#ef4444' },
              { label: 'High', count: rd.high || 0, color: '#f97316' },
              { label: 'Medium', count: rd.medium || 0, color: '#eab308' },
              { label: 'Low', count: rd.low || 0, color: '#22c55e' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 52, textAlign: 'right' }}>{item.label}</span>
                <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(item.count / total) * 100}%`, background: item.color, borderRadius: 3, transition: 'width 0.7s ease' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: item.color, minWidth: 16 }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🗂️ Category Breakdown</div>
          </div>
          {Object.keys(risk_summary.category_distribution || {}).length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div style={{ fontSize: 32 }}>🏷️</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>No risks added yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(risk_summary.category_distribution).map(([cat, count]) => {
                const icons = { technical: '⚙️', schedule: '📅', cost: '💰', resource: '👥', quality: '✅', external: '🌐', requirement: '📋' };
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{icons[cat] || '⚠️'} {cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-hover)' }}>{count}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${(count / risk_summary.total_risks) * 100}%`, background: 'var(--accent-gradient)', borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Risk Heat Map */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🗺️ Risk Heat Map</div>
          </div>
          {risk_summary.heat_map ? (
            <HeatMap matrix={risk_summary.heat_map} />
          ) : (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Add risks to see the heat map</p>
            </div>
          )}
        </div>
      </div>

      {/* Project Info + Top Risks */}
      <div className="grid-2">
        {/* Project Info */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📌 Project Details</div>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/projects/${projectId}/tasks`)}>View Tasks →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Status', value: project.status?.replace('_', ' '), capitalize: true },
              { label: 'Team Size', value: `${project.team_size} members` },
              { label: 'Budget', value: project.budget ? `$${project.budget.toLocaleString()}` : 'N/A' },
              { label: 'Start Date', value: project.start_date || 'Not set' },
              { label: 'End Date', value: project.end_date || 'Not set' },
              { label: 'Technology', value: project.technology || 'Not specified' },
              { label: 'Owner', value: project.owner_name || 'N/A' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{item.label}</span>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, textTransform: item.capitalize ? 'capitalize' : 'none' }}>{item.value}</span>
              </div>
            ))}
            {/* Step 1: Show project modules */}
            {project.modules && (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 8 }}>Modules (Step 1)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {project.modules.split(',').map(m => m.trim()).filter(Boolean).map(m => (
                    <span key={m} style={{
                      fontSize: 12, padding: '3px 10px',
                      background: 'rgba(99,102,241,0.1)', borderRadius: 20,
                      color: 'var(--accent-hover)', fontWeight: 600,
                      border: '1px solid rgba(99,102,241,0.2)'
                    }}>{m}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(`/projects/${projectId}/fuzzy`)}>🧠 Fuzzy Analysis</button>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(`/projects/${projectId}/monte-carlo`)}>🎲 Monte Carlo</button>
          </div>
        </div>

        {/* Top Risks */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🔥 Top Risks</div>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/projects/${projectId}/risks`)}>All Risks →</button>
          </div>
          {top_risks.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-state-icon">⚠️</div>
              <div className="empty-state-title">No risks yet</div>
              <div className="empty-state-text">Add risks to see them prioritized here.</div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/projects/${projectId}/risks`)}>+ Add Risk</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {top_risks.map((risk, idx) => (
                <div key={risk.id} style={{
                  padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 10,
                  border: `1px solid ${getRiskColor(risk.risk_level)}22`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', background: `${getRiskColor(risk.risk_level)}22`,
                      color: getRiskColor(risk.risk_level), fontSize: 12, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>#{idx + 1}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{risk.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{risk.category} • {risk.sei_class?.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RiskBadge level={risk.risk_level} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: getRiskColor(risk.risk_level) }}>{risk.risk_score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
