import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const ROLE_LABELS = { user: 'User', manager: 'Manager', authority: 'Authority', admin: 'Admin' };
const ROLE_DESCRIPTIONS = {
  manager: 'Manage shelter occupancy, log updates, and oversee facility operations for your assigned shelter.',
  authority: 'Access the Authority Command Center for disaster coordination and shelter redistribution.',
};
const STATUS_LABELS = { pending: 'Pending Review', approved: 'Approved', rejected: 'Rejected' };

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function getTimeSince(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

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

  if (loading) {
    return (
      <main className="page profile-page">
        <div className="profile-loading-state">
          <div className="profile-loading-spinner" />
          <p>Loading your profile...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page profile-page">
        <div className="profile-error-state" role="alert">
          <div className="profile-error-icon">!</div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button className="btn accent" type="button" onClick={loadProfile}>Try Again</button>
        </div>
      </main>
    );
  }

  return (
    <main className="page profile-page">
      {/* Hero Header with Avatar */}
      <div className="profile-hero">
        <div className="profile-hero-bg">
          <div className="profile-hero-content">
            <div className="profile-hero-info">
              <p className="section-eyebrow">YOUR ACCOUNT</p>
              <h1>{profile.name}</h1>
              <p className="profile-hero-email">{profile.email}</p>
              <div className="profile-hero-badges">
                <span className={`role-badge role-${profile.role}`}>{ROLE_LABELS[profile.role] || profile.role}</span>
                <span className={`status-badge ${profile.is_active ? 'status-active' : 'status-deactivated'}`}>
                  {profile.is_active ? 'Active' : 'Deactivated'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="profile-avatar-row">
          <div className={`profile-avatar-lg role-ring-${profile.role}`}>
            {getInitials(profile.name)}
          </div>
          <span className="profile-avatar-name">{profile.name}</span>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`profile-feedback ${feedback.includes('Unable') ? 'is-error' : 'is-success'}`} role="status">
          <span className="profile-feedback-icon">{feedback.includes('Unable') ? '✗' : '✓'}</span>
          <span>{feedback}</span>
          <button className="profile-feedback-dismiss" onClick={() => setFeedback('')}>×</button>
        </div>
      )}

      {/* Role Changed Notice */}
      {profile.role !== auth?.user?.role && (
        <div className="profile-role-changed-notice" role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
          <span>Your role has been updated. Please <strong>log out and log in again</strong> to access your new role-specific features.</span>
        </div>
      )}

      {/* Account Details Grid */}
      <section className="profile-details-section" aria-labelledby="profile-details-heading">
        <div className="profile-section-header">
          <h2 id="profile-details-heading">Account Details</h2>
          <p>Your personal information and account configuration</p>
        </div>
        <div className="profile-details-grid">
          <div className="profile-detail-item">
            <div className="profile-detail-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <span className="profile-detail-label">Full Name</span>
              <span className="profile-detail-value">{profile.name}</span>
            </div>
          </div>
          <div className="profile-detail-item">
            <div className="profile-detail-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div>
              <span className="profile-detail-label">Email Address</span>
              <span className="profile-detail-value">{profile.email}</span>
            </div>
          </div>
          <div className="profile-detail-item">
            <div className="profile-detail-icon is-role">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <span className="profile-detail-label">Current Role</span>
              <span className="profile-detail-value">
                <span className={`role-badge role-${profile.role}`}>{ROLE_LABELS[profile.role] || profile.role}</span>
              </span>
            </div>
          </div>
          <div className="profile-detail-item">
            <div className={`profile-detail-icon ${profile.is_active ? 'is-active' : 'is-deactivated'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div>
              <span className="profile-detail-label">Account Status</span>
              <span className="profile-detail-value">
                <span className={`status-badge ${profile.is_active ? 'status-active' : 'status-deactivated'}`}>
                  {profile.is_active ? 'Active' : 'Deactivated'}
                </span>
              </span>
            </div>
          </div>
          {profile.role === 'manager' && (
            <div className="profile-detail-item profile-detail-wide">
              <div className="profile-detail-icon is-shelter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div>
                <span className="profile-detail-label">Assigned Shelter</span>
                <span className="profile-detail-value">
                  {profile.assigned_shelter_name ? (
                    <Link to="/manager" className="profile-shelter-link">
                      {profile.assigned_shelter_name}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </Link>
                  ) : (
                    <span className="muted">No shelter assigned yet</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Role Access Section */}
      <section className="profile-role-section" aria-labelledby="role-access-heading">
        <div className="profile-section-header">
          <h2 id="role-access-heading">Role Access</h2>
          <p>Request elevated permissions to access specialized platform features</p>
        </div>

        {profile.role === 'user' ? (
          <div className="profile-role-cards">
            {['manager', 'authority'].map((requestedRole) => {
              const roleRequest = latestRequestByRole[requestedRole];
              const isPending = roleRequest?.status === 'pending';
              const isApproved = roleRequest?.status === 'approved';
              const isRejected = roleRequest?.status === 'rejected';
              return (
                <article className={`profile-role-card ${isPending ? 'is-pending' : ''} ${isApproved ? 'is-approved' : ''}`} key={requestedRole}>
                  <div className="profile-role-card-top">
                    <div className={`profile-role-icon is-${requestedRole}`}>
                      {requestedRole === 'manager' ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      )}
                    </div>
                    {roleRequest && (
                      <span className={`profile-request-status is-${roleRequest.status}`}>
                        {STATUS_LABELS[roleRequest.status] || roleRequest.status}
                      </span>
                    )}
                  </div>
                  <h3>{ROLE_LABELS[requestedRole]} Access</h3>
                  <p className="profile-role-desc">{ROLE_DESCRIPTIONS[requestedRole]}</p>
                  <button
                    className={`btn ${isPending || isApproved ? 'ghost' : 'accent'} profile-role-btn`}
                    type="button"
                    disabled={isPending || isApproved || submitting}
                    onClick={() => setPendingRole(requestedRole)}
                  >
                    {isApproved ? '✓ Access Granted' : isPending ? 'Awaiting Approval…' : isRejected ? 'Request Again' : `Request ${ROLE_LABELS[requestedRole]} Access`}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="profile-elevated-notice">
            <div className="profile-elevated-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <strong>Elevated Privileges Active</strong>
              <p>You currently hold <span className={`role-badge role-${profile.role}`}>{ROLE_LABELS[profile.role]}</span> access. Role escalation requests are available to standard users.</p>
            </div>
          </div>
        )}
      </section>

      {/* Request History */}
      {requests.length > 0 && (
        <section className="profile-history-section" aria-labelledby="request-history-heading">
          <div className="profile-section-header">
            <h2 id="request-history-heading">Request History</h2>
            <p>Track the status of your submitted role access requests</p>
          </div>
          <div className="profile-history-timeline">
            {requests.map((roleRequest) => (
              <div className="profile-history-item" key={roleRequest.id}>
                <div className={`profile-history-dot is-${roleRequest.status}`} />
                <div className="profile-history-body">
                  <div className="profile-history-main">
                    <strong>{ROLE_LABELS[roleRequest.requested_role]} Access Request</strong>
                    <span className={`profile-request-status is-${roleRequest.status}`}>
                      {STATUS_LABELS[roleRequest.status] || roleRequest.status}
                    </span>
                  </div>
                  <span className="profile-history-time">{getTimeSince(roleRequest.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Confirmation Dialog */}
      {pendingRole && (
        <div className="user-details-backdrop" role="presentation" onClick={() => !submitting && setPendingRole(null)}>
          <section
            className="profile-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-request-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`profile-confirm-icon is-${pendingRole}`}>
              {pendingRole === 'manager' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              )}
            </div>
            <h2 id="role-request-title">Request {ROLE_LABELS[pendingRole]} Access?</h2>
            <p>Your request will be reviewed by the system administrator. You'll be notified once a decision is made.</p>
            <div className="profile-confirm-actions">
              <button className="btn ghost" type="button" disabled={submitting} onClick={() => setPendingRole(null)}>Cancel</button>
              <button className="btn accent" type="button" disabled={submitting} onClick={submitRequest}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
