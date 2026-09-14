import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleDashboardPath, formatRoleName } from '../utils/rbac';

export default function Navbar() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const dashboardPath = getRoleDashboardPath(auth?.user);
  const roleName = formatRoleName(auth?.user);

  return (
    <nav className="navbar">
      <Link to="/" className="brand">Shelter<span>X</span></Link>
      <div className="nav-links">
        <Link to="/request-shelter">Request Shelter</Link>
        <a href="/#how-it-works">How It Works</a>
        {auth ? (
          <>
            {auth.user.role === 'admin' ? (
              <>
                <Link to="/admin">Admin Console</Link>
                <Link to="/authority" style={{ color: '#e2986b' }}>Authority View</Link>
              </>
            ) : auth.user.role === 'authority' || auth.user.email?.toLowerCase().startsWith('authority@') ? (
              <Link to="/authority">Command Center</Link>
            ) : auth.user.role === 'manager' ? (
              <Link to="/manager">Manager Ops</Link>
            ) : (
              <Link to="/user">Citizen Portal</Link>
            )}

            <span className="pill">
              {auth.user.name} · {roleName}
            </span>
            <button onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log In</Link>
            <Link to="/signup" className="nav-access">Access Platform</Link>
          </>
        )}
      </div>
    </nav>
  );
}
