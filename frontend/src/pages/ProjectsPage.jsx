import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Modal from '../components/Modal';
import RiskBadge from '../components/RiskBadge';
import { projectAPI } from '../api';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(searchParams.get('create') === 'true');
  const [formData, setFormData] = useState({
    name: '', description: '', methodology: 'agile', complexity: 'medium',
    team_size: 5, budget: 50000, technology: '', status: 'planning',
    start_date: '', end_date: '', modules: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = () => {
    projectAPI.list()
      .then(res => setProjects(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await projectAPI.create(formData);
      setShowModal(false);
      setFormData({
        name: '', description: '', methodology: 'agile', complexity: 'medium',
        team_size: 5, budget: 50000, technology: '', status: 'planning',
        start_date: '', end_date: '', modules: ''
      });
      navigate(`/projects/${res.data.id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create project');
    }
    setSaving(false);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this project and all its data?')) return;
    try {
      await projectAPI.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert('Failed to delete project');
    }
  };

  const getRiskLevel = (score) =>
    score >= 70 ? 'critical' : score >= 45 ? 'high' : score >= 20 ? 'medium' : 'low';

  const complexityColor = { low: '#22c55e', medium: '#eab308', high: '#f97316', very_high: '#ef4444' };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading projects...</span>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">🛡️ Software Risk Assessment</h1>
          <p className="page-subtitle">Manage projects — identify, assess, and mitigate software risks across 11 structured steps</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ New Project
        </button>
      </div>

      {/* Step Overview Banner */}
      <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(6,182,212,0.06))', borderColor: 'rgba(99,102,241,0.2)' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { n: 1, label: 'Define Project' }, { n: 2, label: 'Identify Risks' },
            { n: 3, label: 'Categorize' }, { n: 4, label: 'Probability' },
            { n: 5, label: 'Impact' }, { n: 6, label: 'Risk Score' },
            { n: 7, label: 'Prioritize' }, { n: 8, label: 'Mitigate' },
            { n: 9, label: 'Plan Tasks' }, { n: 10, label: 'Integrate' },
            { n: 11, label: 'Monitor' }
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 64 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: '#fff', boxShadow: '0 0 12px rgba(99,102,241,0.3)'
              }}>{s.n}</div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <div className="empty-state-title">No projects yet</div>
            <div className="empty-state-text">Create your first project to begin the 11-step risk assessment workflow.</div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Create Project</button>
          </div>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map(p => (
            <div key={p.id} className="project-card fade-in" onClick={() => navigate(`/projects/${p.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div className="project-card-name">{p.name}</div>
                <RiskBadge level={getRiskLevel(p.overall_risk_score || 0)} />
              </div>
              <div className="project-card-desc">{p.description || 'No description provided'}</div>
              <div className="project-card-meta">
                <span>📅 {p.methodology}</span>
                <span>👥 {p.team_size} members</span>
                <span>⚠️ {p.risk_count || 0} risks</span>
                <span>📋 {p.task_count || 0} tasks</span>
              </div>
              {/* Complexity indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Complexity:</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: complexityColor[p.complexity] || 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {p.complexity?.replace('_', ' ') || 'Medium'}
                </span>
                <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: p.complexity === 'low' ? '25%' : p.complexity === 'medium' ? '50%' : p.complexity === 'high' ? '75%' : '100%',
                    background: complexityColor[p.complexity] || 'var(--accent-primary)',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
              <div className="project-card-footer">
                <span className={`risk-badge ${p.status === 'active' ? 'low' : p.status === 'planning' ? 'medium' : 'high'}`}
                  style={{ textTransform: 'capitalize' }}>
                  {p.status}
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Score: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {Math.round(p.overall_risk_score || 0)}
                    </strong>
                  </span>
                  <button className="btn btn-sm btn-danger" onClick={(e) => handleDelete(e, p.id)}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="🚀 Create New Project">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="form-input" value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Online Shopping System" required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the project scope..." />
          </div>
          <div className="form-group">
            <label className="form-label">Modules / Scope</label>
            <input className="form-input" value={formData.modules}
              onChange={e => setFormData({ ...formData, modules: e.target.value })}
              placeholder="e.g., Login, Cart, Payment, Order Tracking" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Methodology</label>
              <select className="form-select" value={formData.methodology}
                onChange={e => setFormData({ ...formData, methodology: e.target.value })}>
                <option value="agile">Agile</option>
                <option value="waterfall">Waterfall</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Complexity</label>
              <select className="form-select" value={formData.complexity}
                onChange={e => setFormData({ ...formData, complexity: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="very_high">Very High</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Team Size</label>
              <input className="form-input" type="number" min="1" value={formData.team_size}
                onChange={e => setFormData({ ...formData, team_size: parseInt(e.target.value) || 1 })} />
            </div>
            <div className="form-group">
              <label className="form-label">Budget ($)</label>
              <input className="form-input" type="number" min="0" value={formData.budget}
                onChange={e => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input className="form-input" type="date" value={formData.end_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Technology Stack</label>
            <input className="form-input" value={formData.technology}
              onChange={e => setFormData({ ...formData, technology: e.target.value })}
              placeholder="e.g., React, Node.js, PostgreSQL" />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : '🚀 Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
