import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { riskAPI, taskAPI } from '../api';

const URGENCY_COLORS = {
  immediate: '#ef4444',
  high: '#f97316',
  normal: '#eab308'
};

const STATUS_COLORS = {
  pending: '#6366f1', in_progress: '#06b6d4', completed: '#22c55e', blocked: '#ef4444'
};

export default function MonitoringPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [risks, setRisks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const loadData = async () => {
    try {
      const [riskRes, taskRes] = await Promise.all([
        riskAPI.list(projectId),
        taskAPI.list(projectId)
      ]);
      setRisks(riskRes.data);
      setTasks(taskRes.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds for real-time monitoring
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [projectId]);

  const displayScore = (r) => {
    const p = Math.round(r.probability * 5) || 1;
    const i = Math.round(r.impact * 5) || 1;
    return p * i;
  };

  const getLevel = (score) => {
    if (score >= 16) return 'critical';
    if (score >= 9) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  };

  const RISK_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };

  // Derived monitoring data
  const openRisks = risks.filter(r => !['resolved', 'accepted'].includes(r.status));
  const criticalRisks = risks.filter(r => displayScore(r) >= 16);
  const highRisks = risks.filter(r => displayScore(r) >= 9 && displayScore(r) < 16);
  const resolvedRisks = risks.filter(r => r.status === 'resolved');
  const mitigatingRisks = risks.filter(r => r.status === 'mitigating');

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');

  const actionItems = openRisks
    .filter(r => displayScore(r) >= 4)
    .sort((a, b) => displayScore(b) - displayScore(a))
    .map(r => ({
      ...r,
      score: displayScore(r),
      level: getLevel(displayScore(r)),
      urgency: displayScore(r) >= 16 ? 'immediate' : displayScore(r) >= 9 ? 'high' : 'normal'
    }));

  const updateRiskStatus = async (id, status) => {
    try {
      await riskAPI.update(id, { status });
      loadData();
    } catch { alert('Failed to update'); }
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">📡 Continuous Monitoring</h1>
          <p className="page-subtitle">Step 11: Track risks and project plan — monitor status, take action, update strategies</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            🔄 Auto-refresh every 30s | Last: {lastUpdated.toLocaleTimeString()}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>🔄 Refresh Now</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/projects/${projectId}`)}>← Dashboard</button>
        </div>
      </div>

      {/* Step 11 Banner */}
      <div style={{
        padding: '16px 24px', borderRadius: 12, marginBottom: 24,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(6,182,212,0.06))',
        border: '1px solid rgba(99,102,241,0.2)',
        display: 'flex', alignItems: 'center', gap: 16
      }}>
        <span style={{ fontSize: 32 }}>📡</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-hover)' }}>Step 11: Continuous Risk Monitoring</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Regularly track risk status, update probability/impact when conditions change, escalate new critical risks,
            and update mitigation strategies as the project evolves.
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>🔴</div>
          <div>
            <div className="stat-value" style={{ color: '#ef4444' }}>{criticalRisks.length}</div>
            <div className="stat-label">Critical Risks (≥16)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.12)' }}>🟠</div>
          <div>
            <div className="stat-value" style={{ color: '#f97316' }}>{highRisks.length}</div>
            <div className="stat-label">High Risks (9-15)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div>
            <div className="stat-value" style={{ color: '#22c55e' }}>{resolvedRisks.length}</div>
            <div className="stat-label">Resolved Risks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>🚫</div>
          <div>
            <div className="stat-value" style={{ color: '#ef4444' }}>{blockedTasks.length}</div>
            <div className="stat-label">Blocked Tasks</div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Risk Status Overview */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚠️ Risk Status Overview</div>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/projects/${projectId}/risks`)}>
              Manage Risks →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Total Risks', value: risks.length, color: 'var(--text-primary)' },
              { label: 'Open (needs attention)', value: openRisks.length, color: '#f97316' },
              { label: 'Currently Mitigating', value: mitigatingRisks.length, color: '#06b6d4' },
              { label: 'Resolved / Accepted', value: risks.length - openRisks.length, color: '#22c55e' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 18, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Risk distribution bar */}
          {risks.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Risk Level Distribution</div>
              <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
                {[
                  { level: 'critical', count: criticalRisks.length, color: '#ef4444' },
                  { level: 'high', count: highRisks.length, color: '#f97316' },
                  { level: 'medium', count: risks.filter(r => displayScore(r) >= 4 && displayScore(r) < 9).length, color: '#eab308' },
                  { level: 'low', count: risks.filter(r => displayScore(r) < 4).length, color: '#22c55e' },
                ].filter(x => x.count > 0).map(item => (
                  <div key={item.level} title={`${item.level}: ${item.count}`} style={{
                    flex: item.count, background: item.color, transition: 'flex 0.5s ease'
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                {['critical', 'high', 'medium', 'low'].map(level => {
                  const count = risks.filter(r => getLevel(displayScore(r)) === level).length;
                  return count > 0 ? (
                    <span key={level} style={{ fontSize: 11, color: RISK_COLORS[level] }}>
                      ● {level}: {count}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>

        {/* Task Progress */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📋 Task Progress</div>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/projects/${projectId}/tasks`)}>
              Manage Tasks →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Total Tasks', value: tasks.length, color: 'var(--text-primary)' },
              { label: 'In Progress', value: inProgressTasks.length, color: '#06b6d4' },
              { label: 'Completed', value: completedTasks.length, color: '#22c55e' },
              { label: 'Blocked', value: blockedTasks.length, color: '#ef4444' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 18, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Task completion progress bar */}
          {tasks.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>Overall Completion</span>
                <span style={{ fontWeight: 700, color: '#22c55e' }}>
                  {Math.round((completedTasks.length / tasks.length) * 100)}%
                </span>
              </div>
              <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(completedTasks.length / tasks.length) * 100}%`,
                  background: 'linear-gradient(90deg, #22c55e, #06b6d4)',
                  borderRadius: 5, transition: 'width 0.7s ease'
                }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Items — Risks requiring attention */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title">🎯 Action Items — Risks Requiring Attention</div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{actionItems.length} open risks need action</span>
        </div>

        {actionItems.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>All risks are under control!</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>No open high/medium risks requiring immediate action.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actionItems.map(item => (
              <div key={item.id} style={{
                padding: '14px 18px', borderRadius: 10,
                background: 'var(--bg-surface)',
                border: `1px solid ${URGENCY_COLORS[item.urgency]}30`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                      background: `${URGENCY_COLORS[item.urgency]}15`,
                      color: URGENCY_COLORS[item.urgency],
                      border: `1px solid ${URGENCY_COLORS[item.urgency]}30`,
                      textTransform: 'uppercase'
                    }}>
                      {item.urgency === 'immediate' ? '🔥 Immediate' : item.urgency === 'high' ? '⚠️ High Priority' : '⏰ Monitor'}
                    </span>
                    <span className={`risk-badge ${item.level}`}>{item.level.toUpperCase()}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16, color: RISK_COLORS[item.level] }}>
                      Score: {item.score}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span style={{ textTransform: 'capitalize' }}>{item.category}</span> risk •{' '}
                    Mitigation: {item.mitigation_plan || <em style={{ color: 'var(--text-muted)' }}>No plan defined — add one in Risk Register</em>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <select value={item.status}
                    onChange={e => updateRiskStatus(item.id, e.target.value)}
                    style={{
                      background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)', borderRadius: 6, padding: '4px 8px',
                      fontSize: 11, cursor: 'pointer'
                    }}>
                    <option value="identified">Identified</option>
                    <option value="analyzed">Analyzed</option>
                    <option value="mitigating">Mitigating</option>
                    <option value="accepted">Accepted</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monitoring Checklist */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>📋 Monitoring Checklist (Weekly Review)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[
            { icon: '🔄', text: 'Review all open risks and update their status' },
            { icon: '📊', text: 'Re-score risks if probability or impact changed' },
            { icon: '🛡️', text: 'Verify mitigation actions are being implemented' },
            { icon: '🆕', text: 'Identify and log any newly discovered risks' },
            { icon: '✅', text: 'Mark resolved risks and document lessons learned' },
            { icon: '📅', text: 'Update task statuses and Gantt timeline' },
            { icon: '📢', text: 'Escalate any new critical risks to stakeholders' },
            { icon: '🔁', text: 'Adjust project plan if risk levels changed significantly' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8,
              border: '1px solid var(--border-color)'
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
