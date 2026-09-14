import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  UsersIcon,
  ShelterIcon,
  DisasterIcon,
  RoleRequestIcon,
  ActivityIcon,
  RefreshCwIcon,
  ArrowRightIcon,
} from '../components/common/Icons';

export default function AdminDashboard() {
  const { auth } = useAuth();
  const token = auth?.token;
  const name = auth?.user?.name;
  const [dashboard, setDashboard] = useState({
    shelters: null,
    users: null,
    disasters: null,
    pendingRoleRequests: null,
    apiConnected: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    const [sheltersResult, usersResult, disastersResult, roleRequestsResult, healthResult] = await Promise.allSettled([
      api.getShelters(token),
      api.getUsers(token),
      api.getDisasters(token),
      api.getRoleRequests({ status: 'pending' }, token),
      api.health(),
    ]);

    setDashboard({
      shelters: sheltersResult.status === 'fulfilled' ? sheltersResult.value : null,
      users: usersResult.status === 'fulfilled' ? usersResult.value : null,
      disasters: disastersResult.status === 'fulfilled' ? disastersResult.value : null,
      pendingRoleRequests: roleRequestsResult.status === 'fulfilled' ? roleRequestsResult.value : null,
      apiConnected: healthResult.status === 'fulfilled',
    });

    if (
      sheltersResult.status === 'rejected' ||
      usersResult.status === 'rejected' ||
      disastersResult.status === 'rejected' ||
      roleRequestsResult.status === 'rejected'
    ) {
      setError('Unable to load some dashboard statistics. Please verify backend service.');
    }

    setLoading(false);
    setRefreshing(false);
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totalUsers = dashboard.users ? dashboard.users.length : null;
  const totalShelters = dashboard.shelters ? dashboard.shelters.length : null;
  const activeDisasters = dashboard.disasters
    ? dashboard.disasters.filter((d) => d.status === 'active').length
    : null;
  const pendingRequests = dashboard.pendingRoleRequests ? dashboard.pendingRoleRequests.length : null;

  return (
    <main className="page admin-dashboard">
      <header className="admin-dashboard-header">
        <p className="section-eyebrow">ADMINISTRATION</p>
        <h1 className="admin-welcome">Welcome back, {name || 'Administrator'}</h1>
        <p className="admin-welcome-sub">Emergency shelter operations and platform administration command center</p>
      </header>

      {/* Operational System Status Bar */}
      <section className="dashboard-sys-status-bar" aria-label="System status">
        <div className="sys-status-items">
          <div className="sys-status-item">
            <span className={`status-pulse-dot ${dashboard.apiConnected ? 'is-live' : 'is-down'}`} aria-hidden="true" />
            <span>
              <strong>API Service:</strong> {dashboard.apiConnected ? 'Online & Healthy' : 'Service Offline'}
            </span>
          </div>
          <div className="sys-status-item">
            <span className="status-pulse-dot is-live" aria-hidden="true" />
            <span>
              <strong>Session:</strong> Authenticated ({auth?.user?.email || 'admin'})
            </span>
          </div>
        </div>
        <button
          className="sys-refresh-btn"
          type="button"
          onClick={() => loadDashboard(true)}
          disabled={loading || refreshing}
          title="Refresh dashboard statistics"
        >
          <RefreshCwIcon size={13} className={refreshing ? 'spin-icon' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
        </button>
      </section>

      {error && (
        <div className="admin-alert-banner is-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">×</button>
        </div>
      )}

      {/* Real Statistics Overview */}
      <section className="dashboard-section" aria-labelledby="statistics-heading">
        <div className="dashboard-section-heading">
          <h2 id="statistics-heading">System Statistics</h2>
          <p>Real-time operational metrics across registered shelters, users, and disaster events.</p>
        </div>

        {loading ? (
          <div className="dashboard-loading-skeleton" aria-busy="true">
            <div className="skeleton-bar" style={{ height: '136px', width: '100%' }} />
          </div>
        ) : (
          <div className="dashboard-stat-grid">
            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <p className="stat-card-label">Total Users</p>
                <div className="stat-icon-wrap is-users">
                  <UsersIcon size={18} />
                </div>
              </div>
              <strong>{totalUsers !== null ? totalUsers : '—'}</strong>
              <p className="stat-card-meta">Registered platform accounts</p>
            </article>

            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <p className="stat-card-label">Total Shelters</p>
                <div className="stat-icon-wrap is-shelters">
                  <ShelterIcon size={18} />
                </div>
              </div>
              <strong>{totalShelters !== null ? totalShelters : '—'}</strong>
              <p className="stat-card-meta">Managed shelter facilities</p>
            </article>

            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <p className="stat-card-label">Active Disasters</p>
                <div className="stat-icon-wrap is-disasters">
                  <DisasterIcon size={18} />
                </div>
              </div>
              <strong style={activeDisasters && activeDisasters > 0 ? { color: '#dc2626' } : {}}>
                {activeDisasters !== null ? activeDisasters : '—'}
              </strong>
              <p className="stat-card-meta">
                {activeDisasters === 0 ? 'No active emergency alerts' : 'Ongoing emergency incidents'}
              </p>
            </article>

            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <p className="stat-card-label">Pending Role Requests</p>
                <div className="stat-icon-wrap is-requests">
                  <RoleRequestIcon size={18} />
                </div>
              </div>
              <strong style={pendingRequests && pendingRequests > 0 ? { color: '#b45309' } : {}}>
                {pendingRequests !== null ? pendingRequests : '—'}
              </strong>
              <p className="stat-card-meta">
                {pendingRequests === 0 ? 'All access requests reviewed' : 'Awaiting admin decision'}
              </p>
            </article>
          </div>
        )}
      </section>

      {/* Quick Management Shortcuts */}
      <section className="dashboard-section" aria-labelledby="actions-heading">
        <div className="dashboard-section-heading">
          <h2 id="actions-heading">Quick Management</h2>
          <p>Access and administer core platform domains, capacities, and access control.</p>
        </div>

        <div className="dashboard-management-grid" aria-label="Administration shortcuts">
          <Link to="/admin/users" className="dashboard-management-card">
            <div>
              <div className="mgmt-card-header">
                <div className="mgmt-icon-wrap">
                  <UsersIcon size={20} />
                </div>
                {totalUsers !== null && (
                  <span className="mgmt-card-badge">{totalUsers} users</span>
                )}
              </div>
              <div className="mgmt-card-body">
                <strong>Manage Users</strong>
                <p>View accounts, inspect details, and manage active or deactivated access.</p>
              </div>
            </div>
            <div className="mgmt-card-footer">
              <span>Open Users</span>
              <ArrowRightIcon size={14} />
            </div>
          </Link>

          <Link to="/admin/shelters" className="dashboard-management-card">
            <div>
              <div className="mgmt-card-header">
                <div className="mgmt-icon-wrap">
                  <ShelterIcon size={20} />
                </div>
                {totalShelters !== null && (
                  <span className="mgmt-card-badge">{totalShelters} shelters</span>
                )}
              </div>
              <div className="mgmt-card-body">
                <strong>Manage Shelters</strong>
                <p>Maintain shelter capacities, occupancy meters, resources, and managers.</p>
              </div>
            </div>
            <div className="mgmt-card-footer">
              <span>Open Shelters</span>
              <ArrowRightIcon size={14} />
            </div>
          </Link>

          <Link to="/admin/role-requests" className="dashboard-management-card">
            <div>
              <div className="mgmt-card-header">
                <div className="mgmt-icon-wrap">
                  <RoleRequestIcon size={20} />
                </div>
                {pendingRequests !== null && pendingRequests > 0 && (
                  <span className="mgmt-card-badge is-urgent">{pendingRequests} pending</span>
                )}
              </div>
              <div className="mgmt-card-body">
                <strong>Manage Role Requests</strong>
                <p>Review and process incoming requests for Manager and Authority roles.</p>
              </div>
            </div>
            <div className="mgmt-card-footer">
              <span>Review Requests</span>
              <ArrowRightIcon size={14} />
            </div>
          </Link>

          <Link to="/admin/disasters" className="dashboard-management-card disaster-mgmt-card">
            <div>
              <div className="mgmt-card-header">
                <div className="mgmt-icon-wrap" style={{ color: '#dc2626' }}>
                  <DisasterIcon size={20} />
                </div>
                {activeDisasters !== null && activeDisasters > 0 && (
                  <span className="mgmt-card-badge is-urgent">{activeDisasters} active</span>
                )}
              </div>
              <div className="mgmt-card-body">
                <strong style={{ color: '#dc2626' }}>Manage Disasters</strong>
                <p>Declare, update, and manage active and historical emergency disaster events.</p>
              </div>
            </div>
            <div className="mgmt-card-footer" style={{ color: '#dc2626' }}>
              <span>Open Disasters</span>
              <ArrowRightIcon size={14} />
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
