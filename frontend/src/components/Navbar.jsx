import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const adminItems = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Manage Users', to: '/admin/users' },
  { label: 'Manage Shelters', to: '/admin/shelters' },
  { label: 'Manage Role Requests', to: '/admin/role-requests' },
  { label: 'Manage Disasters', to: '/admin/disasters' },
];

export default function Navbar() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const navRef = useRef(null);
  const user = auth?.user;

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) setOpenMenu(null);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const closeMenu = () => setOpenMenu(null);
  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar" ref={navRef} aria-label="Primary navigation">
      <Link to="/" className="brand" onClick={closeMenu}>
        Shelter<span>X</span>
      </Link>

      <div className="nav-links">
        {!auth ? (
          <Link to="/login" className="btn accent" style={{ padding: '6px 16px', fontSize: '13px' }}>
            Log in
          </Link>
        ) : (
          <div className="nav-menu nav-user-menu">
            <button
              className="nav-menu-trigger nav-user-trigger"
              type="button"
              aria-expanded={openMenu === 'user'}
              aria-haspopup="menu"
              onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
            >
              <span>{user?.name}</span>
              <span aria-hidden="true" style={{ fontSize: '11px', opacity: 0.8 }}>▾</span>
            </button>

            {openMenu === 'user' && (
              <div className="nav-dropdown nav-user-dropdown" role="menu" aria-label="User menu">
                <div className="nav-user-summary">
                  <strong>{user?.name}</strong>
                  <span>{user?.email}</span>
                </div>

                <Link to="/profile" role="menuitem" onClick={closeMenu}>
                  Profile
                </Link>

                {user?.role === 'admin' && (
                  <div className="nav-admin-section" role="group" aria-label="Administration">
                    <span>Administration</span>
                    {adminItems.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        className={location.pathname === item.to ? 'is-active' : ''}
                        onClick={closeMenu}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}

                {user?.role === 'manager' && (
                  <div className="nav-admin-section" role="group" aria-label="Shelter Management">
                    <span>Manager</span>
                    <Link
                      to="/manager"
                      role="menuitem"
                      className={location.pathname === '/manager' ? 'is-active' : ''}
                      onClick={closeMenu}
                    >
                      My Shelter
                    </Link>
                    <Link
                      to="/manager/history"
                      role="menuitem"
                      className={location.pathname === '/manager/history' ? 'is-active' : ''}
                      onClick={closeMenu}
                    >
                      Occupancy History
                    </Link>
                  </div>
                )}

                {(user?.role === 'authority' || user?.email?.toLowerCase().startsWith('authority@')) && (
                  <Link to="/authority" role="menuitem" onClick={closeMenu}>
                    Region Overview
                  </Link>
                )}

                {user?.role === 'user' && (
                  <Link to="/user" role="menuitem" onClick={closeMenu}>
                    Find & Request Shelter
                  </Link>
                )}

                <button className="nav-logout" type="button" role="menuitem" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
