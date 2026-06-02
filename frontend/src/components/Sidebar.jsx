import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🛡️</div>
          <div className="sidebar-logo-text">
            Risk Assessment
            <small>Project Planning Tool</small>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Main</div>
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          <span className="nav-icon">📊</span> Dashboard
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📁</span> Projects
        </NavLink>

        <div className="nav-section-title" style={{ marginTop: 20 }}>Analysis Engines</div>
        <div className="nav-link" style={{ opacity: 0.5, cursor: 'default', fontSize: 12 }}>
          <span className="nav-icon">🔬</span> Select a project to access engines
        </div>

        <div className="nav-section-title" style={{ marginTop: 20 }}>Account</div>
        <button className="nav-link" onClick={handleLogout}>
          <span className="nav-icon">🚪</span> Logout
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-role">{user?.role?.replace('_', ' ') || 'Member'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
