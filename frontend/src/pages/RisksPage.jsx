import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { riskAPI, projectAPI } from '../api';

const CATEGORIES = ['technical', 'schedule', 'cost', 'resource', 'requirement', 'quality', 'external'];
const MITIGATION_STRATEGIES = ['avoid', 'reduce', 'transfer', 'accept'];
const RISK_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };

function getRiskLevel(score) {
  if (score >= 16) return 'critical';
  if (score >= 9) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function getRiskScore(prob, impact) {
  return prob * impact; // 1–5 × 1–5 = 1–25
}

export default function RisksPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [risks, setRisks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortBy, setSortBy] = useState('score');

  const [form, setForm] = useState({
    title: '', description: '', category: 'technical', sei_class: 'product_engineering',
    probability: 0.5, impact: 0.5, mitigation_plan: '', trigger_condition: '',
    mitigation_strategy: 'reduce', status: 'identified'
  });

  // We store 1-5 UI values separately
  const [uiProb, setUiProb] = useState(3);
  const [uiImpact, setUiImpact] = useState(3);

  useEffect(() => { loadRisks(); }, [projectId]);

  const loadRisks = async () => {
    try {
      const res = await riskAPI.list(projectId);
      setRisks(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleAutoGenerate = async () => {
    if (!confirm("This will automatically suggest mitigation plans for your manually added risks and generate task schedules based on the project's modules. Your manually added risks will be preserved, and no new risks will be generated. Do you want to proceed?")) return;
    setGenerating(true);
    try {
      await projectAPI.autoGenerate(projectId);
      await loadRisks();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to auto-generate plan");
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    // Convert 1-5 → 0-1 for backend (backend multiplies ×100 for score)
    const payload = { ...form, probability: uiProb / 5, impact: uiImpact / 5 };
    try {
      await riskAPI.create(projectId, payload);
      setShowModal(false);
      resetForm();
      loadRisks();
    } catch (err) { alert('Failed to create risk'); }
  };

  const suggestMitigation = async () => {
    if (!form.title) return;
    setSuggesting(true);
    try {
      const res = await riskAPI.suggestMitigation({
        title: form.title,
        description: form.description,
        category: form.category
      });
      setForm(prev => ({
        ...prev,
        mitigation_plan: res.data.mitigation_plan,
        trigger_condition: res.data.trigger_condition
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to auto-suggest mitigation planning.");
    } finally {
      setSuggesting(false);
    }
  };

  const resetForm = () => {
    setForm({ title: '', description: '', category: 'technical', sei_class: 'product_engineering', probability: 0.5, impact: 0.5, mitigation_plan: '', trigger_condition: '', mitigation_strategy: 'reduce', status: 'identified' });
    setUiProb(3); setUiImpact(3);
  };

  const deleteRisk = async (id) => {
    if (!confirm('Delete this risk?')) return;
    try { await riskAPI.delete(id); loadRisks(); } catch { alert('Failed to delete'); }
  };

  const updateStatus = async (id, status) => {
    try { await riskAPI.update(id, { status }); loadRisks(); } catch { alert('Failed to update'); }
  };

  // Display probability/impact as 1-5 for existing records (stored as 0-1 * 5)
  const displayProb = (v) => Math.round(v * 5) || 1;
  const displayImpact = (v) => Math.round(v * 5) || 1;
  const displayScore = (risk) => {
    const p = displayProb(risk.probability);
    const i = displayImpact(risk.impact);
    return p * i; // 1–25 score
  };
  const displayLevel = (risk) => getRiskLevel(displayScore(risk));

  const filtered = risks
    .filter(r => filterCat === 'all' || r.category === filterCat)
    .filter(r => filterLevel === 'all' || displayLevel(r) === filterLevel)
    .sort((a, b) => {
      if (sortBy === 'score') return displayScore(b) - displayScore(a);
      if (sortBy === 'prob') return displayProb(b.probability) - displayProb(a.probability);
      if (sortBy === 'impact') return displayImpact(b.impact) - displayImpact(a.impact);
      return 0;
    });

  const seiLabels = {
    product_engineering: 'Product Engineering',
    development_environment: 'Development Environment',
    program_constraints: 'Program Constraints'
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  if (generating) {
    return (
      <div className="loading-container" style={{ flexDirection: 'column', gap: 20 }}>
        <div className="spinner" style={{ width: 60, height: 60, border: '4px solid rgba(99,102,241,0.1)', borderTopColor: 'var(--accent-hover)' }}></div>
        <h2 style={{ color: 'var(--text-heading)', fontWeight: 800 }}>🤖 AI Risk Assessor</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400 }}>
          Analyzing project modules and automatically suggesting mitigation plans for your manually added risks...
        </p>
      </div>
    );
  }

  // Summary counts by level using display values
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  risks.forEach(r => { summary[displayLevel(r)]++; });

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">⚠️ Risk Register</h1>
          <p className="page-subtitle">Steps 2–8: Identify, categorize, score, prioritize, and mitigate project risks</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/projects/${projectId}`)}>← Dashboard</button>
          <button className="btn btn-secondary btn-sm" onClick={handleAutoGenerate} disabled={generating}>✨ Auto-Generate Plan</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Add Risk</button>
        </div>
      </div>

      {/* Step Indicators */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { n: 2, label: 'Identify Risks', active: true },
          { n: 3, label: 'Categorize', active: true },
          { n: 4, label: 'Probability (1-5)', active: true },
          { n: 5, label: 'Impact (1-5)', active: true },
          { n: 6, label: 'Score (P×I)', active: true },
          { n: 7, label: 'Prioritize', active: true },
          { n: 8, label: 'Mitigate', active: true },
        ].map(s => (
          <div key={s.n} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 20,
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)'
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: '#fff'
            }}>{s.n}</span>
            <span style={{ fontSize: 12, color: 'var(--accent-hover)', fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Summary Badges */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { level: 'critical', icon: '🔴', score: '16-25', range: 'Score ≥ 16' },
          { level: 'high', icon: '🟠', score: '9-15', range: 'Score 9-15' },
          { level: 'medium', icon: '🟡', score: '4-8', range: 'Score 4-8' },
          { level: 'low', icon: '🟢', score: '1-3', range: 'Score 1-3' },
        ].map(item => (
          <div key={item.level} className="stat-card" style={{ cursor: 'pointer', borderColor: filterLevel === item.level ? RISK_COLORS[item.level] : 'var(--border-color)' }}
            onClick={() => setFilterLevel(filterLevel === item.level ? 'all' : item.level)}>
            <div className="stat-icon" style={{ background: `${RISK_COLORS[item.level]}15` }}>{item.icon}</div>
            <div>
              <div className="stat-value" style={{ color: RISK_COLORS[item.level] }}>{summary[item.level]}</div>
              <div className="stat-label" style={{ textTransform: 'capitalize' }}>{item.level} ({item.range})</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</span>
          <select className="form-select" style={{ width: 'auto', padding: '6px 30px 6px 10px', fontSize: 13 }}
            value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto', padding: '6px 30px 6px 10px', fontSize: 13 }}
            value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
            <option value="all">All Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select className="form-select" style={{ width: 'auto', padding: '6px 30px 6px 10px', fontSize: 13 }}
            value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="score">Sort: Score</option>
            <option value="prob">Sort: Probability</option>
            <option value="impact">Sort: Impact</option>
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} risks</span>
        </div>
      </div>

      {/* Risk Table */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h3 className="empty-state-title">No Risks Found</h3>
            <p className="empty-state-text">Start by adding risks using the "Add Risk" button above.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add First Risk</button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Risk Title</th>
                <th>Category</th>
                <th style={{ textAlign: 'center' }}>Probability<br /><span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(1–5)</span></th>
                <th style={{ textAlign: 'center' }}>Impact<br /><span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(1–5)</span></th>
                <th style={{ textAlign: 'center' }}>Score<br /><span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(P×I)</span></th>
                <th>Level</th>
                <th>Mitigation</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((risk, idx) => {
                const p = displayProb(risk.probability);
                const i = displayImpact(risk.impact);
                const s = p * i;
                const level = getRiskLevel(s);
                const color = RISK_COLORS[level];
                return (
                  <tr key={risk.id}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{idx + 1}</td>
                    <td>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, maxWidth: 200 }}>{risk.title}</div>
                      {risk.trigger_condition && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>⚡ {risk.trigger_condition}</div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, textTransform: 'capitalize' }}>{risk.category}</span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{seiLabels[risk.sei_class] || risk.sei_class}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: '50%',
                        background: p >= 4 ? '#ef444420' : p >= 3 ? '#f9731620' : '#22c55e20',
                        color: p >= 4 ? '#ef4444' : p >= 3 ? '#f97316' : '#22c55e',
                        fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15
                      }}>{p}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: '50%',
                        background: i >= 4 ? '#ef444420' : i >= 3 ? '#eab30820' : '#22c55e20',
                        color: i >= 4 ? '#ef4444' : i >= 3 ? '#eab308' : '#22c55e',
                        fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15
                      }}>{i}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: 18, color
                      }}>{s}</span>
                    </td>
                    <td>
                      <span className={`risk-badge ${level}`}>{level.toUpperCase()}</span>
                    </td>
                    <td>
                      {risk.mitigation_plan ? (
                        <div style={{ fontSize: 11, maxWidth: 140, color: 'var(--text-secondary)', lineHeight: 1.4 }} title={risk.mitigation_plan}>
                          {risk.mitigation_plan.slice(0, 60)}{risk.mitigation_plan.length > 60 ? '…' : ''}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Not set</span>
                      )}
                    </td>
                    <td>
                      <select value={risk.status}
                        onChange={e => updateStatus(risk.id, e.target.value)}
                        style={{
                          background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer'
                        }}>
                        <option value="identified">Identified</option>
                        <option value="analyzed">Analyzed</option>
                        <option value="mitigating">Mitigating</option>
                        <option value="accepted">Accepted</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteRisk(risk.id)}>🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Risk Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">⚠️ Add New Risk</h2>

            {/* Step indicators inside modal */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
              {['Step 2: Identify', 'Step 3: Categorize', 'Step 4–5: Score', 'Step 6: Calculate', 'Step 8: Mitigate'].map(s => (
                <span key={s} style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(99,102,241,0.1)', borderRadius: 20, color: 'var(--accent-hover)' }}>{s}</span>
              ))}
            </div>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Risk Title * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Step 2: Identify)</span></label>
                <input className="form-input" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required placeholder="e.g., Payment gateway failure causing transaction loss" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed description of the risk and its context..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Step 3)</span></label>
                  <select className="form-select" value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">SEI Classification</label>
                  <select className="form-select" value={form.sei_class}
                    onChange={e => setForm({ ...form, sei_class: e.target.value })}>
                    <option value="product_engineering">Product Engineering</option>
                    <option value="development_environment">Development Environment</option>
                    <option value="program_constraints">Program Constraints</option>
                  </select>
                </div>
              </div>

              {/* Probability 1-5 */}
              <div className="form-group" style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                <label className="form-label">📊 Probability <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Step 4) — How likely is this risk?</span></label>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {[1, 2, 3, 4, 5].map(v => (
                    <button key={v} type="button"
                      onClick={() => setUiProb(v)}
                      style={{
                        flex: 1, padding: '10px 4px', borderRadius: 8, border: `2px solid ${uiProb === v ? RISK_COLORS[getRiskLevel(v * uiImpact)] : 'var(--border-color)'}`,
                        background: uiProb === v ? `${RISK_COLORS[getRiskLevel(v * uiImpact)]}18` : 'transparent',
                        color: uiProb === v ? RISK_COLORS[getRiskLevel(v * uiImpact)] : 'var(--text-muted)',
                        cursor: 'pointer', fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)',
                        transition: 'all 0.15s ease'
                      }}>{v}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  <span>1 = Very Unlikely</span><span>3 = Moderate</span><span>5 = Almost Certain</span>
                </div>
              </div>

              {/* Impact 1-5 */}
              <div className="form-group" style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                <label className="form-label">💥 Impact <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Step 5) — How severe is the effect?</span></label>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {[1, 2, 3, 4, 5].map(v => (
                    <button key={v} type="button"
                      onClick={() => setUiImpact(v)}
                      style={{
                        flex: 1, padding: '10px 4px', borderRadius: 8, border: `2px solid ${uiImpact === v ? RISK_COLORS[getRiskLevel(uiProb * v)] : 'var(--border-color)'}`,
                        background: uiImpact === v ? `${RISK_COLORS[getRiskLevel(uiProb * v)]}18` : 'transparent',
                        color: uiImpact === v ? RISK_COLORS[getRiskLevel(uiProb * v)] : 'var(--text-muted)',
                        cursor: 'pointer', fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)',
                        transition: 'all 0.15s ease'
                      }}>{v}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  <span>1 = Negligible</span><span>3 = Moderate</span><span>5 = Catastrophic</span>
                </div>
              </div>

              {/* Live Score Calculation (Step 6) */}
              <div style={{
                background: 'var(--bg-surface)', borderRadius: 12, padding: '16px 20px',
                border: `2px solid ${RISK_COLORS[getRiskLevel(uiProb * uiImpact)]}40`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 20
              }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Step 6: Risk Score = Probability × Impact</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {uiProb} × {uiImpact} = <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 18 }}>{uiProb * uiImpact}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Step 7: Priority Level</div>
                  <span className={`risk-badge ${getRiskLevel(uiProb * uiImpact)}`} style={{ fontSize: 13 }}>
                    {getRiskLevel(uiProb * uiImpact).toUpperCase()} RISK
                  </span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mitigation Strategy <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Step 8)</span></label>
                  <select className="form-select" value={form.mitigation_strategy}
                    onChange={e => setForm({ ...form, mitigation_strategy: e.target.value })}>
                    {MITIGATION_STRATEGIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="identified">Identified</option>
                    <option value="analyzed">Analyzed</option>
                    <option value="mitigating">Mitigating</option>
                    <option value="accepted">Accepted</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>Mitigation Plan</label>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={suggestMitigation} disabled={suggesting || !form.title}>
                    {suggesting ? '⏳ Suggesting...' : '✨ Auto-Suggest'}
                  </button>
                </div>
                <textarea className="form-textarea" value={form.mitigation_plan}
                  onChange={e => setForm({ ...form, mitigation_plan: e.target.value })}
                  placeholder="e.g., Use backup payment gateway, implement retry logic, add monitoring alerts..." />
              </div>
              <div className="form-group">
                <label className="form-label">Trigger Condition</label>
                <input className="form-input" value={form.trigger_condition}
                  onChange={e => setForm({ ...form, trigger_condition: e.target.value })}
                  placeholder="e.g., Payment API error rate exceeds 5%" />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">⚠️ Add Risk</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
