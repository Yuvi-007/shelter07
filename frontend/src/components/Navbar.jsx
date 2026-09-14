import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const dashboardPath = auth
    ? { admin: '/admin', manager: '/manager', user: '/authority' }[auth.user.role]
    : '/';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">Shelter<span>X</span></Link>
      <div className="nav-links">
        <Link to="/request-shelter">Request Shelter</Link>
        <a href="/#how-it-works">How It Works</a>
        {auth ? (
          <>
            <Link to={dashboardPath}>Dashboard</Link>
            {auth.user.role === 'admin' && (
              <Link to="/authority" style={{ color: '#e2986b' }}>Authority View</Link>
            )}
            <span className="pill">
              {auth.user.name} · {auth.user.role === 'user' ? 'Authority' : auth.user.role}
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
