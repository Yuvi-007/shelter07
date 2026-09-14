import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const ROLE_LABELS = { user: 'User', manager: 'Manager', authority: 'Authority', admin: 'Admin' };

export default function Profile() {
  const { auth } = useAuth();
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [pendingRole, setPendingRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const [user, roleRequests] = await Promise.all([api.getMe(auth?.token), api.getMyRoleRequests(auth?.token)]);
      setProfile(user);
      setRequests(Array.isArray(roleRequests) ? roleRequests : []);
    } catch {
      setError('Unable to load profile information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const latestRequestByRole = useMemo(() => (
    Object.fromEntries(['manager', 'authority'].map((role) => [role, requests.find((roleRequest) => roleRequest.requested_role === role)]))
  ), [requests]);

  const submitRequest = async () => {
    if (!pendingRole || submitting) return;
    setSubmitting(true);
    setFeedback('');
    try {
      await api.createRoleRequest(pendingRole, auth?.token);
      setFeedback(`${ROLE_LABELS[pendingRole]} access request submitted successfully.`);
      setPendingRole(null);
      await loadProfile();
    } catch {
      setFeedback('Unable to submit your role request. Please try again.');
      setPendingRole(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="page profile-page"><p className="dashboard-loading" role="status">Loading profile...</p></main>;
  if (error) return <main className="page profile-page"><section className="admin-users-message" role="alert"><p>{error}</p><button className="btn ghost" type="button" onClick={loadProfile}>Retry</button></section></main>;

  return (
    <main className="page profile-page">
      <header className="profile-header">
        <p className="section-eyebrow">Account</p>
        <h1>Profile</h1>
        <p>Review your account and request additional ShelterX access.</p>
      </header>

      {feedback && <p className="admin-users-feedback" role="status">{feedback}</p>}

      <section className="profile-card" aria-labelledby="profile-details-heading">
        <h2 id="profile-details-heading">Account Details</h2>
        <dl className="profile-details">
          <div><dt>Name</dt><dd>{profile.name}</dd></div>
          <div><dt>Email</dt><dd>{profile.email}</dd></div>
          <div><dt>Current Role</dt><dd><span className={`role-badge role-${profile.role}`}>{ROLE_LABELS[profile.role] || profile.role}</span></dd></div>
          <div><dt>Account Status</dt><dd><span className={`status-badge ${profile.is_active ? 'status-active' : 'status-deactivated'}`}>{profile.is_active ? 'Active' : 'Deactivated'}</span></dd></div>
          {profile.role === 'manager' && (
            <div>
              <dt>Assigned Shelter</dt>
              <dd>
                {profile.assigned_shelter_name ? (
                  <Link to="/manager" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                    {profile.assigned_shelter_name} →
                  </Link>
                ) : (
                  <span className="muted">No shelter assigned</span>
                )}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {profile.role !== auth?.user?.role && (
        <p className="profile-role-notice" role="status">Your role has changed. Please log out and log in again to access role-specific features.</p>
      )}

      <section className="profile-requests" aria-labelledby="role-access-heading">
        <div className="dashboard-section-heading"><h2 id="role-access-heading">Role Access</h2><p>Submit requests for additional access, then monitor their status here.</p></div>
        {profile.role === 'user' ? (
          <>
            {requests.length === 0 && <p className="profile-empty-requests">No role requests submitted yet.</p>}
            <div className="profile-request-grid">
              {['manager', 'authority'].map((requestedRole) => {
              const roleRequest = latestRequestByRole[requestedRole];
              const isPending = roleRequest?.status === 'pending';
              return (
                <article className="profile-request-card" key={requestedRole}>
                  <h3>{ROLE_LABELS[requestedRole]} Access</h3>
                  {roleRequest ? <span className={`request-status request-${roleRequest.status}`}>{roleRequest.status}</span> : <p>No request submitted.</p>}
                  <button className="btn accent" type="button" disabled={isPending || submitting} onClick={() => setPendingRole(requestedRole)}>
                    {isPending ? 'Request Pending' : `Request ${ROLE_LABELS[requestedRole]} Access`}
                  </button>
                </article>
              );
              })}
            </div>
          </>
        ) : (
          <p className="profile-no-actions">Role access requests are available to standard users. Your current role is {ROLE_LABELS[profile.role] || profile.role}.</p>
        )}
      </section>

      {requests.length > 0 && (
        <section className="profile-requests" aria-labelledby="request-history-heading">
          <div className="dashboard-section-heading"><h2 id="request-history-heading">Request History</h2></div>
          <div className="profile-history-list">
            {requests.map((roleRequest) => <div key={roleRequest.id}><span>{ROLE_LABELS[roleRequest.requested_role]} Access</span><span className={`request-status request-${roleRequest.status}`}>{roleRequest.status}</span></div>)}
          </div>
        </section>
      )}

      {pendingRole && (
        <div className="user-details-backdrop" role="presentation">
          <section className="user-details-dialog user-confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="role-request-title">
            <h2 id="role-request-title">Request {ROLE_LABELS[pendingRole]} Access?</h2>
            <p>Your request will be sent to the system administrator.</p>
            <div className="user-confirmation-actions">
              <button className="btn ghost" type="button" disabled={submitting} onClick={() => setPendingRole(null)}>Cancel</button>
              <button className="btn accent" type="button" disabled={submitting} onClick={submitRequest}>{submitting ? 'Submitting...' : 'Submit Request'}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
