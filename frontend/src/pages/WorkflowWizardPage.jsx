import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const STEPS = [
  { n: 1, icon: '📁', title: 'Define Project', desc: 'Set project scope, modules, and timeline', path: '' },
  { n: 2, icon: '🔍', title: 'Identify Risks', desc: 'Find possible risks in each module', path: '/risks' },
  { n: 3, icon: '🗂️', title: 'Categorize Risks', desc: 'Group: Technical, Schedule, Cost, Resource, Requirement', path: '/risks' },
  { n: 4, icon: '📊', title: 'Assign Probability', desc: 'Rate likelihood 1–5 (1=Unlikely, 5=Almost Certain)', path: '/risks' },
  { n: 5, icon: '💥', title: 'Assign Impact', desc: 'Rate severity 1–5 (1=Negligible, 5=Catastrophic)', path: '/risks' },
  { n: 6, icon: '🔢', title: 'Calculate Score', desc: 'Risk Score = Probability × Impact (max 25)', path: '/risks' },
  { n: 7, icon: '🏆', title: 'Prioritize Risks', desc: '1-3=Low, 4-8=Medium, 9-15=High, 16-25=Critical', path: '/risks' },
  { n: 8, icon: '🛡️', title: 'Apply Mitigation', desc: 'Avoid, Reduce, Transfer, or Accept each risk', path: '/risks' },
  { n: 9, icon: '📋', title: 'Project Planning', desc: 'Create schedules, allocate resources, PERT estimates', path: '/tasks' },
  { n: 10, icon: '⚡', title: 'Integrate Risk & Planning', desc: 'Add buffer time for high-risk tasks', path: '/tasks' },
  { n: 11, icon: '📡', title: 'Monitor & Review', desc: 'Continuously track risks, update strategies, and review weekly', path: '/monitoring' },
];

const STEP_INFO = {
  1: { example: 'Online Shopping System\nModules: Login, Cart, Payment, Order Tracking', tips: ['Define clear scope boundaries', 'List all modules explicitly', 'Set realistic start/end dates', 'Document technology stack'] },
  2: { example: 'Payment failure\nServer crash\nRequirement changes\nData security breach', tips: ['Brainstorm with the team', 'Review past project failures', 'Check each module separately', 'Use SEI taxonomy checklist'] },
  3: { example: 'Payment failure → Technical\nRequirement changes → Requirement\nBudget overrun → Cost', tips: ['Technical: code, architecture, tech', 'Schedule: timeline, milestones', 'Cost: budget, estimates', 'Resource: team, skills', 'Requirement: scope, clarity'] },
  4: { example: 'Payment failure → 4 (Likely)\nServer crash → 2 (Unlikely)\nScope creep → 5 (Almost Certain)', tips: ['1 = Very Unlikely (<10%)', '2 = Unlikely (10-30%)', '3 = Possible (30-50%)', '4 = Likely (50-70%)', '5 = Almost Certain (>70%)'] },
  5: { example: 'Payment failure → 5 (Catastrophic)\nUI bug → 2 (Minor)\nData breach → 5 (Catastrophic)', tips: ['1 = Negligible effect', '2 = Minor inconvenience', '3 = Moderate setback', '4 = Major disruption', '5 = Project failure'] },
  6: { example: 'Payment failure: 4 × 5 = 20\nServer crash: 2 × 4 = 8\nScope creep: 5 × 3 = 15', tips: ['Score range: 1 to 25', 'Higher score = higher priority', 'Auto-calculated in Risk Register', 'Review all scores together'] },
  7: { example: 'Score 20 → CRITICAL\nScore 8 → MEDIUM\nScore 15 → HIGH\nScore 2 → LOW', tips: ['Critical (16-25): Immediate action', 'High (9-15): Plan mitigation now', 'Medium (4-8): Monitor closely', 'Low (1-3): Accept or watch'] },
  8: { example: 'Payment failure → Reduce: Add backup gateway\nVendor lock-in → Transfer: Use SLAs\nMinor UI bug → Accept', tips: ['Avoid: Eliminate the risk source', 'Reduce: Lower probability/impact', 'Transfer: Insurance, contracts', 'Accept: Monitor, have contingency'] },
  9: { example: 'Payment Module: O=3, M=5, P=10 → PERT=5.5 days\nLogin Module: O=1, M=2, P=4 → PERT=2.2 days', tips: ['PERT = (Optimistic + 4×MostLikely + Pessimistic) / 6', 'Break tasks into small chunks', 'Assign clear ownership', 'Set realistic milestones'] },
  10: { example: 'High-risk task (score≥9): +15% buffer\nMultiple critical risks: +30% buffer\nPayment Module PERT: 5.5 → 6.3 days adjusted', tips: ['High-risk items need extra time', 'Buffer: 10-30% based on risk level', 'Document assumptions', 'Review with stakeholders'] },
  11: { example: 'Weekly risk review meetings\nUpdate probability if circumstances change\nEscalate new critical risks immediately', tips: ['Track risk status weekly', 'Update mitigation strategies', 'Log new risks as they emerge', 'Report status to stakeholders'] },
};

export default function WorkflowWizardPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);

  const step = STEPS[activeStep - 1];
  const info = STEP_INFO[activeStep];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">✨ 11-Step Risk Assessment Wizard</h1>
        <p className="page-subtitle">Follow this guided workflow to complete a full software risk assessment and project plan</p>
      </div>

      {/* Step Progress Bar */}
      <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
          {STEPS.map((s, idx) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <button onClick={() => setActiveStep(s.n)} style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: activeStep === s.n ? 'var(--accent-gradient)' : activeStep > s.n ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                color: activeStep >= s.n ? '#fff' : 'var(--text-muted)',
                fontWeight: 800, fontSize: 14, fontFamily: 'var(--font-mono)',
                boxShadow: activeStep === s.n ? '0 0 16px rgba(99,102,241,0.4)' : 'none',
                transition: 'all 0.2s ease', flexShrink: 0
              }}>{s.n}</button>
              {idx < STEPS.length - 1 && (
                <div style={{ width: 24, height: 2, background: activeStep > s.n ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.06)', margin: '0 2px', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          Step {activeStep} of 11 — <span style={{ color: 'var(--accent-hover)', fontWeight: 600 }}>{step.title}</span>
        </div>
      </div>

      <div className="grid-2">
        {/* Step Detail */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(6,182,212,0.04))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 30, boxShadow: '0 0 24px rgba(99,102,241,0.3)'
            }}>{step.icon}</div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--accent-hover)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Step {step.n}</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-heading)', margin: '4px 0' }}>{step.title}</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{step.desc}</p>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Example</div>
            <div style={{
              background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 10,
              padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: 12,
              color: 'var(--text-primary)', lineHeight: 1.8, whiteSpace: 'pre-line'
            }}>{info.example}</div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>💡 Tips</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {info.tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--accent-hover)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {step.path && (
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}
              onClick={() => navigate(`/projects/${projectId}${step.path}`)}>
              {step.icon} Go to {step.title} →
            </button>
          )}
          {step.n === 1 && (
            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
              onClick={() => navigate(`/projects/${projectId}`)}>
              📊 View Project Dashboard →
            </button>
          )}
        </div>

        {/* All Steps Overview */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>📋 All 11 Steps Overview</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {STEPS.map(s => (
              <button key={s.n} onClick={() => setActiveStep(s.n)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                borderRadius: 10, border: `1px solid ${activeStep === s.n ? 'rgba(99,102,241,0.4)' : 'var(--border-color)'}`,
                background: activeStep === s.n ? 'rgba(99,102,241,0.08)' : 'transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease'
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: activeStep === s.n ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800,
                  color: activeStep === s.n ? '#fff' : 'var(--text-muted)'
                }}>{s.n}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: activeStep === s.n ? 'var(--accent-hover)' : 'var(--text-primary)' }}>
                    {s.icon} {s.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{s.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button className="btn btn-secondary" disabled={activeStep === 1} onClick={() => setActiveStep(s => s - 1)}>← Previous Step</button>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center' }}>{activeStep} / 11</span>
        <button className="btn btn-primary" disabled={activeStep === 11} onClick={() => setActiveStep(s => s + 1)}>Next Step →</button>
      </div>
    </div>
  );
}
