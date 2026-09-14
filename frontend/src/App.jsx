import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import { getRoleDashboardPath } from './utils/rbac';

import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminShelters from './pages/AdminShelters';
import AdminDisasters from './pages/AdminDisasters';
import AdminRoleRequests from './pages/AdminRoleRequests';
import Profile from './pages/Profile';
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerHistory from './pages/ManagerHistory';
import AuthorityDashboard from './pages/AuthorityDashboard';
import ShelterDetail from './pages/ShelterDetail';
import RedistributeAction from './pages/RedistributeAction';
import CitizenRequestShelter from './pages/CitizenRequestShelter';

function RoleWatcher() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const prevRoleRef = useRef(auth?.user?.role);
  const [roleNotice, setRoleNotice] = useState(null);

  useEffect(() => {
    const currentRole = auth?.user?.role;
    const prevRole = prevRoleRef.current;

    // Detect when role changes from an existing role (e.g. user -> manager or authority)
    if (currentRole && prevRole && currentRole !== prevRole) {
      prevRoleRef.current = currentRole;

      const roleLabels = {
        manager: 'Shelter Manager',
        authority: 'Disaster Authority',
        admin: 'System Administrator',
        user: 'Citizen',
      };

      const dest = getRoleDashboardPath(auth.user);

      // Set visible toast notice
      setRoleNotice({
        roleName: roleLabels[currentRole] || currentRole,
        dest,
      });

      // Automatically open the manager or authority dashboard
      navigate(dest, { replace: true });

      const timer = setTimeout(() => {
        setRoleNotice(null);
      }, 6000);
      return () => clearTimeout(timer);
    } else {
      prevRoleRef.current = currentRole;
    }
  }, [auth?.user?.role, navigate, auth?.user]);

  if (!roleNotice) return null;

  return (
    <aside
      className="role-transition-banner"
      style={{
        position: 'fixed',
        top: '68px',
        right: '20px',
        zIndex: 9999,
        background: '#0f172a',
        color: '#ffffff',
        border: '1px solid #334155',
        borderLeft: '4px solid #10b981',
        borderRadius: '8px',
        padding: '12px 18px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '13.5px',
        maxWidth: '440px',
      }}
      role="alert"
    >
      <span style={{ fontSize: '18px' }}>🎉</span>
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', color: '#34d399', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Role Elevation Approved
        </strong>
        <span>You are now a <strong>{roleNotice.roleName}</strong>. Opened your workspace.</span>
      </div>
      <button
        type="button"
        onClick={() => setRoleNotice(null)}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '0 4px',
          lineHeight: 1,
        }}
        aria-label="Dismiss alert"
      >
        &times;
      </button>
    </aside>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RoleWatcher />
        <div className="app-shell">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/request-shelter" element={<CitizenRequestShelter />} />
            <Route path="/user" element={
              <ProtectedRoute roles={['user']}><CitizenRequestShelter /></ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>
            } />
            <Route path="/admin/shelters" element={
              <ProtectedRoute roles={['admin']}><AdminShelters /></ProtectedRoute>
            } />
            <Route path="/admin/disasters" element={
              <ProtectedRoute roles={['admin']}><AdminDisasters /></ProtectedRoute>
            } />
            <Route path="/admin/role-requests" element={
              <ProtectedRoute roles={['admin']}><AdminRoleRequests /></ProtectedRoute>
            } />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/manager" element={
              <ProtectedRoute roles={['manager']}><ManagerDashboard /></ProtectedRoute>
            } />
            <Route path="/manager/history" element={
              <ProtectedRoute roles={['manager']}><ManagerHistory /></ProtectedRoute>
            } />
            <Route path="/authority" element={
              <ProtectedRoute roles={['authority', 'admin']}><AuthorityDashboard /></ProtectedRoute>
            } />
            <Route path="/shelters/:id" element={
              <ProtectedRoute><ShelterDetail /></ProtectedRoute>
            } />
            <Route path="/shelters/:id/redistribute" element={
              <ProtectedRoute roles={['authority', 'admin']}><RedistributeAction /></ProtectedRoute>
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
