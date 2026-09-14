import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import AdminHeader from '../components/admin/AdminHeader';
import {
  RoleRequestIcon,
  ShieldCheckIcon,
  ShelterIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  CheckIcon,
  XIcon,
} from '../components/common/Icons';

const ROLE_CONFIG = {
  manager: {
    label: 'Shelter Manager',
    badgeClass: 'role-manager',
    icon: ShelterIcon,
    description: 'Permissions to update shelter capacity, log occupancy, and request resource redistribution.',
  },
  authority: {
    label: 'Disaster Authority',
    badgeClass: 'role-authority',
    icon: ShieldCheckIcon,
    description: 'Regional permissions to oversee all shelters, trigger AI redistribution, and manage disaster zones.',
  },
};

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminRoleRequests() {
  const { auth } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [statusTab, setStatusTab] = useState('pending'); // 'pending', 'all', 'approved', 'rejected'
  const [roleFilter, setRoleFilter] = useState(''); // '', 'manager', 'authority'
  const [pendingAction, setPendingAction] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = async (filtersToUse = {}) => {
    setLoading(true);
    setError('');
    try {
      const queryParams = {};
      if (filtersToUse.status) queryParams.status = filtersToUse.status;
      if (filtersToUse.requested_role) queryParams.requested_role = filtersToUse.requested_role;

      const data = await api.getRoleRequests(queryParams, auth?.token);
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setError('Unable to load role requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // On mount, load with current statusTab and roleFilter
    loadRequests({
      status: statusTab === 'all' ? undefined : statusTab,
      requested_role: roleFilter || undefined,
    });
  }, [statusTab, roleFilter]);

  const handleTabChange = (tab) => {
    setStatusTab(tab);
  };

  const handleRoleChange = (role) => {
    setRoleFilter(role);
  };

  const submitReview = async () => {
    if (!pendingAction || submitting) return;
    setSubmitting(true);
    setFeedback('');
    try {
      if (pendingAction.action === 'approve') {
        await api.approveRoleRequest(pendingAction.request.id, auth?.token);
        setFeedback(
          `Request approved: "${pendingAction.request.user_name}" has been upgraded to ${
            ROLE_CONFIG[pendingAction.request.requested_role]?.label || 'new role'
          }.`,
        );
      } else {
        await api.rejectRoleRequest(pendingAction.request.id, auth?.token);
        setFeedback(`Request rejected for "${pendingAction.request.user_name}".`);
      }
      setPendingAction(null);
      await loadRequests({
        status: statusTab === 'all' ? undefined : statusTab,
        requested_role: roleFilter || undefined,
      });
    } catch {
      setFeedback('Unable to process this role request. Please try again.');
      setPendingAction(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page admin-role-requests-page">
      <AdminHeader
        title="Manage Role Requests"
        subtitle="Evaluate and approve role elevations for Shelter Managers and Disaster Authorities."
        badge={`${requests.length} requests`}
      />

      {feedback && (
        <div className="admin-alert-banner is-success" role="status">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback('')} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="admin-users-card">
        <div className="admin-users-toolbar">
          <div className="admin-toolbar-title">
            <h2>Access Requests</h2>
            <p>Review incoming requests for elevated system permissions</p>
          </div>

          <div className="admin-users-filters">
            {/* Status Tabs */}
            <div className="filter-chips-group" role="tablist" aria-label="Filter role requests by status">
              <button
                type="button"
                className={`filter-chip ${statusTab === 'pending' ? 'is-active' : ''}`}
                onClick={() => handleTabChange('pending')}
              >
                Pending
              </button>
              <button
                type="button"
                className={`filter-chip ${statusTab === 'all' ? 'is-active' : ''}`}
                onClick={() => handleTabChange('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`filter-chip ${statusTab === 'approved' ? 'is-active' : ''}`}
                onClick={() => handleTabChange('approved')}
              >
                Approved
              </button>
              <button
                type="button"
                className={`filter-chip ${statusTab === 'rejected' ? 'is-active' : ''}`}
                onClick={() => handleTabChange('rejected')}
              >
                Rejected
              </button>
            </div>

            {/* Role Filter */}
            <select
              aria-label="Filter by requested role"
              value={roleFilter}
              onChange={(e) => handleRoleChange(e.target.value)}
            >
              <option value="">All Requested Roles</option>
              <option value="manager">Shelter Manager</option>
              <option value="authority">Disaster Authority</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="dashboard-loading-skeleton">
            <div className="skeleton-bar" style={{ height: '44px', width: '100%' }} />
            <div className="skeleton-bar" style={{ height: '180px', width: '100%' }} />
          </div>
        ) : error ? (
          <div className="admin-alert-banner is-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="btn ghost"
              style={{ padding: '4px 10px', fontSize: '12px' }}
              onClick={() =>
                loadRequests({
                  status: statusTab === 'all' ? undefined : statusTab,
                  requested_role: roleFilter || undefined,
                })
              }
            >
              Retry
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="admin-empty-state">
            <div className="empty-state-icon">
              <RoleRequestIcon size={24} />
            </div>
            <h3>No requests in this view</h3>
            <p>
              {statusTab === 'pending'
                ? 'Great news! There are no pending role requests waiting for review.'
                : 'No role requests matched the selected status and role filters.'}
            </p>
          </div>
        ) : (
          <div className="admin-users-table-wrap">
            <table className="admin-role-requests-table">
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Requested Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Date Submitted</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const roleCfg = ROLE_CONFIG[req.requested_role] || {
                    label: req.requested_role,
                    badgeClass: 'role-user',
                    icon: RoleRequestIcon,
                  };
                  const RoleIcon = roleCfg.icon;
                  const isPending = req.status === 'pending';

                  return (
                    <tr key={req.id}>
                      <td>
                        <div className="user-identity-cell">
                          <div className="avatar-initials">{getInitials(req.user_name)}</div>
                          <div className="user-names-wrap">
                            <strong>{req.user_name}</strong>
                            <span>{req.user_email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge ${roleCfg.badgeClass}`}>
                          <RoleIcon size={14} />
                          <span>{roleCfg.label}</span>
                        </span>
                      </td>
                      <td>
                        <span className={`request-status request-${req.status}`}>
                          {req.status === 'pending' && <span className="status-pulse-dot is-live" style={{ background: '#b45309' }} />}
                          {req.status === 'approved' && <CheckIcon size={12} />}
                          {req.status === 'rejected' && <XIcon size={12} />}
                          <span style={{ textTransform: 'capitalize' }}>{req.status}</span>
                        </span>
                      </td>
                      <td>
                        {new Date(req.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td>
                        {isPending ? (
                          <div className="admin-user-actions">
                            <button
                              className="btn ghost admin-user-action admin-approve-button"
                              type="button"
                              disabled={submitting}
                              onClick={() => setPendingAction({ action: 'approve', request: req })}
                            >
                              Approve
                            </button>
                            <button
                              className="btn ghost admin-user-action admin-delete-button"
                              type="button"
                              disabled={submitting}
                              onClick={() => setPendingAction({ action: 'reject', request: req })}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="muted" style={{ fontSize: '12px' }}>
                            {req.status === 'approved' ? 'Approved' : 'Rejected'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {pendingAction && (
        <div className="user-details-backdrop" role="presentation">
          <section
            className="user-details-dialog user-confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-request-title"
          >
            <h2 id="review-request-title">
              {pendingAction.action === 'approve'
                ? `Approve ${ROLE_CONFIG[pendingAction.request.requested_role]?.label || 'Role'} Request?`
                : 'Reject Role Request?'}
            </h2>
            <p>
              {pendingAction.action === 'approve' ? (
                <>
                  The user <strong>{pendingAction.request.user_name}</strong> will be immediately granted{' '}
                  <strong>{ROLE_CONFIG[pendingAction.request.requested_role]?.label}</strong> privileges.
                  <br />
                  <span className="muted" style={{ display: 'block', marginTop: '8px' }}>
                    {ROLE_CONFIG[pendingAction.request.requested_role]?.description}
                  </span>
                </>
              ) : (
                <>
                  Are you sure you want to reject the request from{' '}
                  <strong>{pendingAction.request.user_name}</strong>? The user will remain in their current role.
                </>
              )}
            </p>

            <div className="user-confirmation-actions">
              <button
                className="btn ghost"
                type="button"
                disabled={submitting}
                onClick={() => setPendingAction(null)}
              >
                Cancel
              </button>
              <button
                className={`btn ${pendingAction.action === 'reject' ? 'admin-delete-button' : 'accent'}`}
                type="button"
                disabled={submitting}
                onClick={submitReview}
              >
                {submitting
                  ? 'Processing...'
                  : pendingAction.action === 'approve'
                  ? 'Approve Request'
                  : 'Reject Request'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
