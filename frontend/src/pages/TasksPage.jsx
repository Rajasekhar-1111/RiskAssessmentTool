import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskAPI, riskAPI, projectAPI } from '../api';

const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
const STATUS_COLORS = { pending: '#6366f1', in_progress: '#06b6d4', completed: '#22c55e', blocked: '#ef4444' };

export default function TasksPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [risks, setRisks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState({
    name: '', description: '',
    optimistic_est: 1, most_likely_est: 3, pessimistic_est: 7,
    priority: 'medium', status: 'pending',
    start_date: '', end_date: '',
    risk_buffer_days: 0
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      taskAPI.list(projectId),
      riskAPI.list(projectId)
    ]).then(([taskRes, riskRes]) => {
      setTasks(taskRes.data);
      setRisks(riskRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleAutoGenerate = async () => {
    if (!confirm("This will automatically suggest mitigation plans for your manually added risks and generate task schedules based on the project's modules. Your manually added risks will be preserved, and no new risks will be generated. Do you want to proceed?")) return;
    setGenerating(true);
    try {
      await projectAPI.autoGenerate(projectId);
      // Reload tasks & risks
      const [taskRes, riskRes] = await Promise.all([
        taskAPI.list(projectId),
        riskAPI.list(projectId)
      ]);
      setTasks(taskRes.data);
      setRisks(riskRes.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to auto-generate plan");
    } finally {
      setGenerating(false);
    }
  };

  // PERT estimate: (O + 4M + P) / 6
  const pertEstimate = () => {
    const { optimistic_est: o, most_likely_est: m, pessimistic_est: p } = form;
    return ((+o + 4 * +m + +p) / 6).toFixed(1);
  };

  // Display score for a risk (1-25 scale)
  const displayRiskScore = (r) => {
    const p = Math.round(r.probability * 5) || 1;
    const i = Math.round(r.impact * 5) || 1;
    return p * i;
  };

  // Risk-adjusted estimate (Step 10: Add buffer for high-risk tasks)
  const riskBuffer = () => {
    const highRisks = risks.filter(r => displayRiskScore(r) >= 9);
    if (highRisks.length >= 3) return parseFloat(pertEstimate()) * 0.3; // 30% buffer
    if (highRisks.length >= 1) return parseFloat(pertEstimate()) * 0.15; // 15% buffer
    return 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await taskAPI.create(projectId, form);
      setShowModal(false);
      setForm({ name: '', description: '', optimistic_est: 1, most_likely_est: 3, pessimistic_est: 7, priority: 'medium', status: 'pending', start_date: '', end_date: '', risk_buffer_days: 0 });
      const res = await taskAPI.list(projectId);
      setTasks(res.data);
    } catch (err) { alert('Failed to create task'); }
  };

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await taskAPI.delete(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch { alert('Failed to delete'); }
  };

  // Inline status update (Step 11: Monitoring)
  const updateTaskStatus = async (id, status) => {
    try {
      const res = await taskAPI.update(id, { status });
      setTasks(prev => prev.map(t => t.id === id ? res.data : t));
    } catch { alert('Failed to update status'); }
  };

  // Calculate Gantt-like data
  const ganttTasks = tasks.filter(t => t.start_date && t.end_date);

  const totalPert = tasks.reduce((sum, t) => sum + (t.pert_estimate || 0), 0);
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const blockedCount = tasks.filter(t => t.status === 'blocked').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  if (generating) {
    return (
      <div className="loading-container" style={{ flexDirection: 'column', gap: 20 }}>
        <div className="spinner" style={{ width: 60, height: 60, border: '4px solid rgba(99,102,241,0.1)', borderTopColor: 'var(--accent-hover)' }}></div>
        <h2 style={{ color: 'var(--text-heading)', fontWeight: 800 }}>🤖 AI Project Planner</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400 }}>
          Analyzing project modules, creating Work Breakdown Structure (WBS), and scheduling tasks sequentially...
        </p>
      </div>
    );
  }

  const highRiskCount = risks.filter(r => displayRiskScore(r) >= 9).length;

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">📋 Tasks &amp; Project Planning</h1>
          <p className="page-subtitle">Steps 9–11: Schedule tasks, allocate resources, integrate risk buffers, and monitor progress</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/projects/${projectId}`)}>← Dashboard</button>
          <button className="btn btn-secondary btn-sm" onClick={handleAutoGenerate} disabled={generating}>✨ Auto-Generate Schedule</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Add Task</button>
        </div>
      </div>

      {/* Step Banners */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { n: 9, label: 'Create Schedule & Allocate Resources' },
          { n: 10, label: 'Integrate Risk Buffers into Planning' },
          { n: 11, label: 'Monitor & Review Continuously' },
        ].map(s => (
          <div key={s.n} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
            borderRadius: 24, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
            flex: 1, minWidth: 200
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0
            }}>{s.n}</span>
            <span style={{ fontSize: 12, color: 'var(--accent-hover)', fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Risk Warning Banner */}
      {highRiskCount > 0 && (
        <div style={{
          padding: '14px 20px', borderRadius: 12, marginBottom: 20,
          background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f97316' }}>Step 10: Risk-Adjusted Planning Active</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              {highRiskCount} high/critical risk{highRiskCount > 1 ? 's' : ''} detected →
              <strong> Add {highRiskCount >= 3 ? '30%' : '15%'} buffer time</strong> to PERT estimates.
              Total buffer: ~{(totalPert * (highRiskCount >= 3 ? 0.3 : 0.15)).toFixed(1)} days extra.
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon purple">📋</div>
          <div><div className="stat-value">{tasks.length}</div><div className="stat-label">Total Tasks</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>🔄</div>
          <div><div className="stat-value" style={{ color: '#06b6d4' }}>{inProgressCount}</div><div className="stat-label">In Progress</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div><div className="stat-value" style={{ color: '#22c55e' }}>{completedCount}</div><div className="stat-label">Completed</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">⏱️</div>
          <div><div className="stat-value">{totalPert.toFixed(1)}</div><div className="stat-label">Total PERT Days</div></div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No Tasks Yet</div>
            <div className="empty-state-text">Create tasks with PERT time estimates. The system automatically suggests risk buffers based on your risk register.</div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Add First Task</button>
          </div>
        </div>
      ) : (
        <>
          {/* Task Table — WBS with inline status monitoring */}
          <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">📋 Work Breakdown Structure (WBS)</div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Step 11: Update status below to monitor progress in real time
              </span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Task Name</th>
                  <th style={{ textAlign: 'center' }}>Optimistic<br />(days)</th>
                  <th style={{ textAlign: 'center' }}>Most Likely<br />(days)</th>
                  <th style={{ textAlign: 'center' }}>Pessimistic<br />(days)</th>
                  <th style={{ textAlign: 'center' }}>PERT<br />Estimate</th>
                  <th style={{ textAlign: 'center' }}>Risk Adj.<br />Estimate</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Dates</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, idx) => {
                  const pert = task.pert_estimate || 0;
                  const buffer = highRiskCount >= 3 ? 0.3 : highRiskCount >= 1 ? 0.15 : 0;
                  const adjusted = (pert * (1 + buffer)).toFixed(1);
                  return (
                    <tr key={task.id}>
                      <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{idx + 1}</td>
                      <td>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{task.name}</div>
                        {task.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{task.description}</div>}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#22c55e' }}>{task.optimistic_est}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{task.most_likely_est}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#f97316' }}>{task.pessimistic_est}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15,
                          color: 'var(--accent-hover)',
                          background: 'rgba(99,102,241,0.1)', padding: '3px 8px', borderRadius: 6
                        }}>{pert.toFixed(1)}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {buffer > 0 ? (
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15,
                            color: '#f97316',
                            background: 'rgba(249,115,22,0.1)', padding: '3px 8px', borderRadius: 6
                          }}>{adjusted}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`risk-badge ${task.priority}`} style={{ textTransform: 'capitalize' }}>{task.priority}</span>
                      </td>
                      <td>
                        {/* Step 11: Inline status update for monitoring */}
                        <select value={task.status}
                          onChange={e => updateTaskStatus(task.id, e.target.value)}
                          style={{
                            background: `${STATUS_COLORS[task.status]}15`,
                            border: `1px solid ${STATUS_COLORS[task.status]}40`,
                            color: STATUS_COLORS[task.status],
                            borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer',
                            fontWeight: 700
                          }}>
                          <option value="pending">⏳ Pending</option>
                          <option value="in_progress">🔄 In Progress</option>
                          <option value="completed">✅ Completed</option>
                          <option value="blocked">🚫 Blocked</option>
                        </select>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {task.start_date ? (
                          <div>
                            <div>Start: {task.start_date}</div>
                            <div>End: {task.end_date || '—'}</div>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteTask(task.id)}>🗑</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Gantt-like Timeline */}
          {ganttTasks.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">📅 Task Timeline (Gantt Chart)</div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Based on task start/end dates</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                {ganttTasks.map(task => {
                  const start = new Date(task.start_date);
                  const end = new Date(task.end_date);
                  const now = new Date();
                  const projectStart = new Date(Math.min(...ganttTasks.map(t => new Date(t.start_date))));
                  const projectEnd = new Date(Math.max(...ganttTasks.map(t => new Date(t.end_date))));
                  const left = ((start - projectStart) / (projectEnd - projectStart)) * 100;
                  const width = ((end - start) / (projectEnd - projectStart)) * 100;
                  const progress = task.status === 'completed' ? 100 :
                    task.status === 'in_progress' ? Math.min(100, Math.max(5, ((now - start) / (end - start)) * 100)) : 0;

                  return (
                    <div key={task.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{task.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{task.start_date} → {task.end_date}
                          &nbsp;|&nbsp;
                          <span style={{ color: STATUS_COLORS[task.status], fontWeight: 700 }}>
                            {task.status?.replace('_', ' ')}
                          </span>
                        </span>
                      </div>
                      <div style={{ height: 22, background: 'rgba(255,255,255,0.04)', borderRadius: 11, position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                          position: 'absolute', left: `${Math.max(0, left)}%`, width: `${Math.max(2, width)}%`,
                          height: '100%', borderRadius: 11,
                          background: task.status === 'blocked' ? '#ef444320' : 'rgba(99,102,241,0.2)',
                          border: `1px solid ${task.status === 'blocked' ? '#ef4444' : 'rgba(99,102,241,0.4)'}`,
                          overflow: 'hidden'
                        }}>
                          <div style={{ height: '100%', width: `${progress}%`, background: STATUS_COLORS[task.status] + '90', borderRadius: 11, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">📋 Add Task (Steps 9–10)</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Task Name *</label>
                <input className="form-input" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required placeholder="e.g., Implement Payment Module" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Task description..." style={{ minHeight: 60 }} />
              </div>

              {/* PERT Estimation */}
              <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 14 }}>
                  ⏱️ PERT Time Estimation — Formula: (O + 4M + P) / 6
                </div>
                <div className="form-row-3">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: '#22c55e' }}>Optimistic (days)</label>
                    <input className="form-input" type="number" min="0.5" step="0.5" value={form.optimistic_est}
                      onChange={e => setForm({ ...form, optimistic_est: parseFloat(e.target.value) || 1 })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Most Likely (days)</label>
                    <input className="form-input" type="number" min="0.5" step="0.5" value={form.most_likely_est}
                      onChange={e => setForm({ ...form, most_likely_est: parseFloat(e.target.value) || 3 })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: '#f97316' }}>Pessimistic (days)</label>
                    <input className="form-input" type="number" min="0.5" step="0.5" value={form.pessimistic_est}
                      onChange={e => setForm({ ...form, pessimistic_est: parseFloat(e.target.value) || 7 })} />
                  </div>
                </div>
                <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    PERT = ({form.optimistic_est} + 4×{form.most_likely_est} + {form.pessimistic_est}) / 6
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 900, color: 'var(--accent-hover)' }}>
                    {pertEstimate()} days
                  </span>
                </div>
                {riskBuffer() > 0 && (
                  <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(249,115,22,0.08)', borderRadius: 8, border: '1px solid rgba(249,115,22,0.2)' }}>
                    <span style={{ fontSize: 12, color: '#f97316', fontWeight: 600 }}>
                      ⚡ Step 10 Risk Buffer: +{riskBuffer().toFixed(1)} days recommended
                      → Risk-adjusted total: <strong>{(parseFloat(pertEstimate()) + riskBuffer()).toFixed(1)} days</strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-input" type="date" value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">📋 Add Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
