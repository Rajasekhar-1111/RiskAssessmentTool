import { BrowserRouter, Routes, Route, Navigate, NavLink, useParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProjectsPage from './pages/ProjectsPage';
import DashboardPage from './pages/DashboardPage';
import RisksPage from './pages/RisksPage';
import TasksPage from './pages/TasksPage';
import WorkflowWizardPage from './pages/WorkflowWizardPage';
import MonitoringPage from './pages/MonitoringPage';
import FuzzyPage from './pages/FuzzyPage';
import MonteCarloPage from './pages/MonteCarloPage';
import MLPredictPage from './pages/MLPredictPage';
import NLPPage from './pages/NLPPage';
import './index.css';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;
  if (!token) return <Navigate to="/login" />;
  return children;
}

function Sidebar() {
  const { user, logout } = useAuth();
  const { projectId } = useParams();
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo" onClick={() => navigate('/projects')} style={{ cursor: 'pointer' }}>
          <div className="sidebar-logo-icon">🛡️</div>
          <div className="sidebar-logo-text">
            Risk Assessment
            <small>Project Planning Tool</small>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Navigation</div>
        <NavLink to="/projects" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📁</span> All Projects
        </NavLink>

        {projectId && (
          <>
            <div className="nav-section-title" style={{ marginTop: '16px' }}>Current Project</div>
            <NavLink to={`/projects/${projectId}`} end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">📊</span> Dashboard
            </NavLink>
            <NavLink to={`/projects/${projectId}/risks`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">⚠️</span> Risk Register
            </NavLink>
            <NavLink to={`/projects/${projectId}/tasks`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">📋</span> Tasks & Planning
            </NavLink>
            <NavLink to={`/projects/${projectId}/monitoring`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">📡</span> Monitor & Review
            </NavLink>
            <NavLink to={`/projects/${projectId}/wizard`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">✨</span> Workflow Wizard
            </NavLink>

            <div className="nav-section-title" style={{ marginTop: '16px' }}>Analysis Engines</div>
            <NavLink to={`/projects/${projectId}/fuzzy`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🧠</span> Fuzzy Logic
            </NavLink>
            <NavLink to={`/projects/${projectId}/monte-carlo`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🎲</span> Monte Carlo
            </NavLink>
            <NavLink to={`/projects/${projectId}/ml-predict`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🤖</span> ML Prediction
            </NavLink>
            <NavLink to={`/projects/${projectId}/nlp`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">📝</span> NLP Analyzer
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          <div>
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-role">{user?.role || 'Project Manager'}</div>
          </div>
        </div>
        <button className="nav-link" onClick={() => { logout(); navigate('/login'); }} style={{ color: 'var(--risk-critical)' }}>
          <span className="nav-icon">🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}

function Layout({ Page }) {
  return (
    <>
      <Sidebar />
      <main className="main-content"><Page /></main>
    </>
  );
}

function AppLayout() {
  return (
    <div className="app-layout">
      <div className="app-bg"></div>
      <Routes>
        <Route path="/projects" element={<Layout Page={ProjectsPage} />} />
        <Route path="/projects/:projectId" element={<Layout Page={DashboardPage} />} />
        <Route path="/projects/:projectId/risks" element={<Layout Page={RisksPage} />} />
        <Route path="/projects/:projectId/tasks" element={<Layout Page={TasksPage} />} />
        <Route path="/projects/:projectId/monitoring" element={<Layout Page={MonitoringPage} />} />
        <Route path="/projects/:projectId/wizard" element={<Layout Page={WorkflowWizardPage} />} />
        <Route path="/projects/:projectId/fuzzy" element={<Layout Page={FuzzyPage} />} />
        <Route path="/projects/:projectId/monte-carlo" element={<Layout Page={MonteCarloPage} />} />
        <Route path="/projects/:projectId/ml-predict" element={<Layout Page={MLPredictPage} />} />
        <Route path="/projects/:projectId/nlp" element={<Layout Page={NLPPage} />} />
        <Route path="*" element={<Navigate to="/projects" />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
