import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getRole = () => {
    if (!auth?.user) return 'guest';
    const r = auth.user.role;
    if (r === 'authority' || auth.user.email?.toLowerCase().startsWith('authority@')) return 'authority';
    if (r === 'admin') return 'admin';
    if (r === 'manager') return 'manager';
    return 'user';
  };

  const role = getRole();

  const roleLabels = {
    authority: 'Disaster Authority',
    admin: 'Administrator',
    manager: 'Shelter Manager',
    user: 'Citizen',
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className={`navbar ${auth ? 'navbar-logged-in' : 'navbar-guest'}`}>
      <div className="navbar-container">
        {/* Brand */}
        <div className="navbar-brand-section">
          <Link to="/" className="brand">
            Shelter<span>X</span>
          </Link>
          {auth && (
            <span className="navbar-env-tag">
              {role === 'authority' ? 'EMERGENCY OPS' : role === 'admin' ? 'SYSTEM OPS' : 'PORTAL'}
            </span>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="nav-links">
          {auth ? (
            <>
              {role === 'authority' && (
                <>
                  <Link
                    to="/authority"
                    className={`nav-link-item ${isActive('/authority') ? 'active' : ''}`}
                  >
                    <span className="nav-icon">🚨</span> Command Center
                  </Link>
                  <Link
                    to="/request-shelter"
                    className={`nav-link-item ${isActive('/request-shelter') ? 'active' : ''}`}
                  >
                    <span className="nav-icon">📋</span> Citizen Assistance
                  </Link>
                </>
              )}

              {role === 'admin' && (
                <>
                  <Link
                    to="/admin"
                    className={`nav-link-item ${isActive('/admin') && !isActive('/admin/users') ? 'active' : ''}`}
                  >
                    <span className="nav-icon">🛡️</span> Admin Console
                  </Link>
                  <Link
                    to="/admin/users"
                    className={`nav-link-item ${isActive('/admin/users') ? 'active' : ''}`}
                  >
                    <span className="nav-icon">👥</span> Users
                  </Link>
                  <Link
                    to="/authority"
                    className={`nav-link-item ${isActive('/authority') ? 'active' : ''}`}
                  >
                    <span className="nav-icon">🚨</span> Authority View
                  </Link>
                  <Link
                    to="/request-shelter"
                    className={`nav-link-item ${isActive('/request-shelter') ? 'active' : ''}`}
                  >
                    <span className="nav-icon">📋</span> Citizen Portal
                  </Link>
                </>
              )}

              {role === 'manager' && (
                <>
                  <Link
                    to="/manager"
                    className={`nav-link-item ${isActive('/manager') ? 'active' : ''}`}
                  >
                    <span className="nav-icon">🏢</span> My Shelter
                  </Link>
                  <Link
                    to="/request-shelter"
                    className={`nav-link-item ${isActive('/request-shelter') ? 'active' : ''}`}
                  >
                    <span className="nav-icon">📋</span> Citizen Portal
                  </Link>
                </>
              )}

              {role === 'user' && (
                <>
                  <Link
                    to="/user"
                    className={`nav-link-item ${isActive('/user') || isActive('/request-shelter') ? 'active' : ''}`}
                  >
                    <span className="nav-icon">📋</span> Find & Request Shelter
                  </Link>
                  <a href="/#how-it-works" className="nav-link-item">
                    How It Works
                  </a>
                </>
              )}
            </>
          ) : (
            <>
              <Link
                to="/request-shelter"
                className={`nav-link-item ${isActive('/request-shelter') ? 'active' : ''}`}
              >
                Request Shelter
              </Link>
              <a href="/#how-it-works" className="nav-link-item">
                How It Works
              </a>
            </>
          )}
        </nav>

        {/* Right Side: Profile / Auth Actions */}
        <div className="nav-actions">
          {auth ? (
            <div className="nav-user-cluster">
              <div className="nav-user-info">
                <div className="nav-avatar">
                  {(auth.user.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="nav-user-details">
                  <span className="nav-user-name">{auth.user.name}</span>
                  <span className={`nav-role-badge role-badge-${role}`}>
                    {roleLabels[role]}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="nav-logout-btn"
                title="Sign out of your session"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="nav-guest-actions">
              <Link to="/login" className="nav-login-btn">
                Log In
              </Link>
              <Link to="/signup" className="nav-access-btn">
                Access Platform
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
