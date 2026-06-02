import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { engineAPI, taskAPI } from '../api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend);

export default function MonteCarloPage() {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [result, setResult] = useState(null);
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', optimistic: '', most_likely: '', pessimistic: '', cost_per_day: '' });

  useEffect(() => { loadTasks(); }, [projectId]);

  const loadTasks = async () => {
    try {
      const res = await taskAPI.list(projectId);
      setTasks(res.data.map(t => ({
        name: t.name, optimistic: t.optimistic_est,
        most_likely: t.most_likely_est, pessimistic: t.pessimistic_est,
        cost_per_day: 0, id: t.id
      })));
    } catch (err) { console.error(err); }
  };

  const addTask = () => {
    if (!newTask.name || !newTask.optimistic || !newTask.most_likely || !newTask.pessimistic) {
      alert('Fill in task name and all three estimates');
      return;
    }
    setTasks([...tasks, { ...newTask, optimistic: +newTask.optimistic, most_likely: +newTask.most_likely, pessimistic: +newTask.pessimistic, cost_per_day: +(newTask.cost_per_day || 0) }]);
    setNewTask({ name: '', optimistic: '', most_likely: '', pessimistic: '', cost_per_day: '' });
  };

  const removeTask = (idx) => setTasks(tasks.filter((_, i) => i !== idx));

  const runSimulation = async () => {
    if (tasks.length === 0) {
      alert('Add at least one task');
      return;
    }
    setLoading(true);
    try {
      const data = { tasks, iterations: 5000 };
      if (deadline) data.deadline_days = parseFloat(deadline);
      const res = await engineAPI.monteCarlo(projectId, data);
      setResult(res.data);
    } catch (err) {
      alert('Simulation failed: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">🎲 Monte Carlo Simulation</h1>
        <p className="page-subtitle">PERT-based schedule and cost risk simulation with 5,000 iterations</p>
      </div>

      {/* Task Input */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">📝 Project Tasks (Three-Point Estimates)</div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Enter optimistic (O), most likely (M), and pessimistic (P) estimates in days for each task.
          PERT estimate = (O + 4M + P) / 6
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end', marginBottom: '12px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Task Name</label>
            <input className="form-input" value={newTask.name} onChange={e => setNewTask({...newTask, name: e.target.value})} placeholder="Task name" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">O (days)</label>
            <input type="number" className="form-input" value={newTask.optimistic} onChange={e => setNewTask({...newTask, optimistic: e.target.value})} placeholder="1" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">M (days)</label>
            <input type="number" className="form-input" value={newTask.most_likely} onChange={e => setNewTask({...newTask, most_likely: e.target.value})} placeholder="3" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">P (days)</label>
            <input type="number" className="form-input" value={newTask.pessimistic} onChange={e => setNewTask({...newTask, pessimistic: e.target.value})} placeholder="7" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">$/day</label>
            <input type="number" className="form-input" value={newTask.cost_per_day} onChange={e => setNewTask({...newTask, cost_per_day: e.target.value})} placeholder="0" />
          </div>
          <button className="btn btn-primary btn-sm" onClick={addTask} style={{ marginBottom: '0', height: '40px' }}>➕</button>
        </div>

        {tasks.length > 0 && (
          <table className="data-table" style={{ marginTop: '12px' }}>
            <thead>
              <tr><th>Task</th><th>O</th><th>M</th><th>P</th><th>PERT</th><th>$/day</th><th></th></tr>
            </thead>
            <tbody>
              {tasks.map((t, idx) => (
                <tr key={idx}>
                  <td style={{ color: 'var(--text-primary)' }}>{t.name}</td>
                  <td>{t.optimistic}</td>
                  <td>{t.most_likely}</td>
                  <td>{t.pessimistic}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {((t.optimistic + 4 * t.most_likely + t.pessimistic) / 6).toFixed(1)}
                  </td>
                  <td>{t.cost_per_day || 0}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => removeTask(idx)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginTop: '20px' }}>
          <div className="form-group" style={{ margin: 0, flex: '0 0 200px' }}>
            <label className="form-label">Target Deadline (days)</label>
            <input type="number" className="form-input" value={deadline} onChange={e => setDeadline(e.target.value)} placeholder="Optional" />
          </div>
          <button className="btn btn-primary btn-lg" onClick={runSimulation} disabled={loading || tasks.length === 0}>
            {loading ? '⏳ Simulating...' : '🎲 Run Monte Carlo (5000 iterations)'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="slide-up">
          {/* Summary Stats */}
          <div className="grid-4" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-icon purple">📊</div>
              <div>
                <div className="stat-value">{result.schedule.mean}</div>
                <div className="stat-label">Mean Duration (days)</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon cyan">📏</div>
              <div>
                <div className="stat-value">{result.schedule.std_dev}</div>
                <div className="stat-label">Std Deviation</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">🎯</div>
              <div>
                <div className="stat-value">{result.schedule.percentiles.p50}</div>
                <div className="stat-label">50th Percentile</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange">⚡</div>
              <div>
                <div className="stat-value">{result.schedule.percentiles.p90}</div>
                <div className="stat-label">90th Percentile</div>
              </div>
            </div>
          </div>

          {/* Deadline probability */}
          {result.deadline_analysis && (
            <div className="card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="card-title">🎯 Deadline Analysis</div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Target: {result.deadline_analysis.target_days} days
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '36px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: result.deadline_analysis.probability >= 70 ? '#22c55e' : result.deadline_analysis.probability >= 40 ? '#eab308' : '#ef4444' }}>
                  {result.deadline_analysis.probability}%
                </div>
                <span className={`risk-badge ${result.deadline_analysis.status === 'likely' ? 'low' : result.deadline_analysis.status === 'risky' ? 'medium' : 'critical'}`}>
                  {result.deadline_analysis.status}
                </span>
              </div>
            </div>
          )}

          <div className="grid-2">
            {/* Histogram */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: '16px' }}>📊 Duration Probability Distribution</div>
              <div className="chart-container">
                <Bar
                  data={{
                    labels: result.histogram.bin_centers.map(v => v.toFixed(0)),
                    datasets: [{
                      label: 'Frequency',
                      data: result.histogram.counts,
                      backgroundColor: 'rgba(99, 102, 241, 0.5)',
                      borderColor: '#6366f1',
                      borderWidth: 1,
                      borderRadius: 3
                    }]
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                      y: { ticks: { color: '#5a6478' }, grid: { color: 'rgba(255,255,255,0.04)' }, title: { display: true, text: 'Frequency', color: '#8b95a8' } },
                      x: { ticks: { color: '#8b95a8', maxTicksLimit: 10 }, grid: { display: false }, title: { display: true, text: 'Duration (days)', color: '#8b95a8' } }
                    },
                    plugins: { legend: { display: false } }
                  }}
                />
              </div>
            </div>

            {/* S-Curve */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: '16px' }}>📈 Cumulative Probability (S-Curve)</div>
              <div className="chart-container">
                <Line
                  data={{
                    labels: result.s_curve.durations.map(v => v.toFixed(0)),
                    datasets: [{
                      label: 'Probability %',
                      data: result.s_curve.probabilities,
                      borderColor: '#06b6d4',
                      backgroundColor: 'rgba(6, 182, 212, 0.1)',
                      fill: true,
                      tension: 0.4,
                      pointRadius: 0
                    }]
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                      y: { ticks: { color: '#5a6478', callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.04)' }, title: { display: true, text: 'Probability', color: '#8b95a8' } },
                      x: { ticks: { color: '#8b95a8', maxTicksLimit: 10 }, grid: { display: false }, title: { display: true, text: 'Duration (days)', color: '#8b95a8' } }
                    },
                    plugins: { legend: { display: false } }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Percentile Table */}
          <div className="card" style={{ marginTop: '24px' }}>
            <div className="card-title" style={{ marginBottom: '16px' }}>📋 Confidence Levels</div>
            <table className="data-table">
              <thead><tr><th>Confidence</th><th>Duration (days)</th><th>Interpretation</th></tr></thead>
              <tbody>
                {Object.entries(result.schedule.percentiles).map(([key, val]) => (
                  <tr key={key}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{key.replace('p', '')}%</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-heading)' }}>{val} days</td>
                    <td style={{ fontSize: '12px' }}>
                      {key === 'p50' ? 'Most likely outcome' : key === 'p80' ? 'Recommended target' : key === 'p90' ? 'High confidence target' : key === 'p95' ? 'Near-certain completion' : `${key.replace('p', '')}% chance of completing within`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
