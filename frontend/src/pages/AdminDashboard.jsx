import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { auth } = useAuth();
  const token = auth?.token;
  const name = auth?.user?.name;
  const [dashboard, setDashboard] = useState({ shelters: null, users: null, apiConnected: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    const loadDashboard = async () => {
      const [sheltersResult, usersResult, healthResult] = await Promise.allSettled([
        api.getShelters(token),
        api.getUsers(token),
        api.health(),
      ]);

      if (!isCurrent) return;

      setDashboard({
        shelters: sheltersResult.status === 'fulfilled' ? sheltersResult.value : null,
        users: usersResult.status === 'fulfilled' ? usersResult.value : null,
        apiConnected: healthResult.status === 'fulfilled',
      });

      if (sheltersResult.status === 'rejected' || usersResult.status === 'rejected') {
        setError('Unable to load dashboard information.');
      }
      setLoading(false);
    };

    loadDashboard();
    return () => { isCurrent = false; };
  }, [token]);

  if (loading) {
    return (
      <main className="page admin-dashboard" aria-busy="true">
        <p className="dashboard-loading" role="status">Loading dashboard...</p>
      </main>
    );
  }

  const statistics = [
    dashboard.users !== null && { label: 'Total Users', value: dashboard.users.length },
    dashboard.shelters !== null && { label: 'Total Shelters', value: dashboard.shelters.length },
  ].filter(Boolean);

  return (
    <main className="page admin-dashboard">
      <header className="admin-dashboard-header">
        <p className="section-eyebrow">Administration</p>
        <h1>Admin Dashboard</h1>
        <p>Monitor and manage the ShelterX emergency response system.</p>
        {name && <p className="admin-welcome">Welcome back, {name}</p>}
      </header>

      {error && <p className="dashboard-error" role="alert">{error}</p>}

      {statistics.length > 0 && (
        <section className="dashboard-section" aria-labelledby="statistics-heading">
          <div className="dashboard-section-heading">
            <h2 id="statistics-heading">System Statistics</h2>
            <p>Current information from ShelterX.</p>
          </div>
          <div className="dashboard-stat-grid">
            {statistics.map((statistic) => (
              <article className="dashboard-stat-card" key={statistic.label}>
                <p>{statistic.label}</p>
                <strong>{statistic.value}</strong>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-section" aria-labelledby="status-heading">
        <div className="dashboard-section-heading">
          <h2 id="status-heading">System Status</h2>
          <p>Live availability checks and current session status.</p>
        </div>
        <div className="dashboard-status-card">
          <div className="dashboard-status-item">
            <span className={`status-dot ${dashboard.apiConnected ? 'is-connected' : 'is-unavailable'}`} aria-hidden="true" />
            <div><strong>API Status</strong><span>{dashboard.apiConnected ? 'API Connected' : 'API Unavailable'}</span></div>
          </div>
          <div className="dashboard-status-item">
            <span className="status-dot is-connected" aria-hidden="true" />
            <div><strong>Authentication</strong><span>Authenticated</span></div>
          </div>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="actions-heading">
        <div className="dashboard-section-heading">
          <h2 id="actions-heading">Quick Actions</h2>
          <p>Additional administration workflows will be available here soon.</p>
        </div>
        <div className="dashboard-actions" aria-label="Future administration actions">
          <button className="btn accent" type="button" disabled>Add Shelter <span>Coming soon</span></button>
          <Link className="btn ghost" to="/admin/users">Manage Users</Link>
          <button className="btn ghost" type="button" disabled>View Shelters <span>Coming soon</span></button>
        </div>
      </section>
    </main>
  );
}
