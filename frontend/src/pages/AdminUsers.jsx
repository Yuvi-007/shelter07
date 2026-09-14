import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import AdminHeader from '../components/admin/AdminHeader';
import {
  SearchIcon,
  EyeIcon,
  TrashIcon,
  AlertCircleIcon,
} from '../components/common/Icons';

function formatRole(role) {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown';
}

function isUserActive(user) {
  return Boolean(user.is_active);
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminUsers() {
  const { auth } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'deactivated'
  const [selectedUser, setSelectedUser] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getUsers(auth?.token);
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setError('Unable to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const roles = useMemo(
    () => [...new Set(users.map((u) => u.role).filter(Boolean))].sort(),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query);
      const matchesRole = !role || user.role === role;
      const active = isUserActive(user);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && active) ||
        (statusFilter === 'deactivated' && !active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, role, statusFilter]);

  const activeCount = useMemo(() => users.filter((u) => isUserActive(u)).length, [users]);
  const deactivatedCount = users.length - activeCount;

  const confirmAction = async () => {
    if (!pendingAction || actionSubmitting) return;

    setActionSubmitting(true);
    setFeedback('');
    try {
      if (pendingAction.type === 'delete') {
        await api.deleteUser(pendingAction.user.id, auth?.token);
        setFeedback('User deleted successfully.');
      } else {
        const activating = pendingAction.type === 'activate';
        await api.updateUserStatus(pendingAction.user.id, activating, auth?.token);
        setFeedback(`User ${activating ? 'activated' : 'deactivated'} successfully.`);
      }
      setPendingAction(null);
      setSelectedUser(null);
      await loadUsers();
    } catch {
      setFeedback(
        pendingAction.type === 'delete'
          ? 'Unable to delete this user. Users with redistribution history must be preserved.'
          : 'Unable to update this user. Please try again.',
      );
      setPendingAction(null);
    } finally {
      setActionSubmitting(false);
    }
  };

  const actionCopy = pendingAction && {
    activate: {
      title: 'Activate this user?',
      detail: `The user account "${pendingAction.user.name}" will be restored and allowed to log in.`,
      confirm: 'Activate User',
    },
    deactivate: {
      title: 'Deactivate this user?',
      detail: `The user account "${pendingAction.user.name}" will be suspended and unable to log in until reactivated.`,
      confirm: 'Deactivate User',
    },
    delete: {
      title: 'Permanently delete this user?',
      detail: `Are you sure you want to permanently remove "${pendingAction.user.name}" (${pendingAction.user.email})? This action cannot be reversed.`,
      confirm: 'Delete User',
    },
  }[pendingAction.type];

  return (
    <main className="page admin-users-page">
      <AdminHeader
        title="Manage Users"
        subtitle="Inspect, search, and manage registered ShelterX user accounts and permissions."
        badge={`${users.length} accounts`}
      />

      {feedback && (
        <div className="admin-alert-banner is-success" role="status">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {loading ? (
        <div className="admin-main-card">
          <div className="dashboard-loading-skeleton">
            <div className="skeleton-bar" style={{ height: '50px', width: '100%' }} />
            <div className="skeleton-bar" style={{ height: '240px', width: '100%' }} />
          </div>
        </div>
      ) : error ? (
        <div className="admin-main-card">
          <div className="admin-alert-banner is-error" role="alert">
            <span>{error}</span>
            <button type="button" className="btn ghost" onClick={loadUsers} style={{ padding: '4px 10px', fontSize: '12px' }}>
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-users-card">
          <div className="admin-users-toolbar">
            <div className="admin-toolbar-title">
              <h2>Registered Users</h2>
              <p>Showing {filteredUsers.length} of {users.length} total users</p>
            </div>

            <div className="admin-users-filters">
              {/* Status Tabs */}
              <div className="filter-chips-group" role="tablist" aria-label="Filter by account status">
                <button
                  type="button"
                  className={`filter-chip ${statusFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  All <span className="filter-chip-count">{users.length}</span>
                </button>
                <button
                  type="button"
                  className={`filter-chip ${statusFilter === 'active' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('active')}
                >
                  Active <span className="filter-chip-count">{activeCount}</span>
                </button>
                <button
                  type="button"
                  className={`filter-chip ${statusFilter === 'deactivated' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('deactivated')}
                >
                  Deactivated <span className="filter-chip-count">{deactivatedCount}</span>
                </button>
              </div>

              {/* Role Select Filter */}
              <select
                aria-label="Filter by role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">All Roles</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {formatRole(r)}
                  </option>
                ))}
              </select>

              {/* Search input */}
              <div className="search-input-wrap">
                <SearchIcon size={16} />
                <input
                  type="search"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="admin-empty-state">
              <div className="empty-state-icon">
                <AlertCircleIcon size={24} />
              </div>
              <h3>No users found</h3>
              <p>No registered user accounts exist in the platform database.</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="admin-empty-state">
              <div className="empty-state-icon">
                <SearchIcon size={24} />
              </div>
              <h3>No matching users</h3>
              <p>No users matched your current search or filter criteria.</p>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setSearch('');
                  setRole('');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="admin-users-table-wrap">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th scope="col">User</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const active = isUserActive(user);
                    const isCurrentAdmin = user.id === auth?.user?.id;

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="user-identity-cell">
                            <div className="avatar-initials">{getInitials(user.name)}</div>
                            <div className="user-names-wrap">
                              <strong>
                                {user.name} {isCurrentAdmin && <span className="muted">(You)</span>}
                              </strong>
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`role-badge role-${user.role}`}>
                            {formatRole(user.role)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${active ? 'status-active' : 'status-deactivated'}`}
                          >
                            {active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td>
                          <div className="admin-user-actions">
                            <button
                              className="btn ghost admin-user-action"
                              type="button"
                              onClick={() => setSelectedUser(user)}
                              disabled={actionSubmitting}
                              title="View user details"
                            >
                              View
                            </button>

                            {!isCurrentAdmin && (
                              <>
                                <button
                                  className="btn ghost admin-user-action"
                                  type="button"
                                  disabled={actionSubmitting}
                                  onClick={() =>
                                    setPendingAction({
                                      type: active ? 'deactivate' : 'activate',
                                      user,
                                    })
                                  }
                                >
                                  {active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  className="btn ghost admin-user-action admin-delete-button"
                                  type="button"
                                  disabled={actionSubmitting}
                                  onClick={() =>
                                    setPendingAction({ type: 'delete', user })
                                  }
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* User Details Modal Dialog */}
      {selectedUser && (
        <div
          className="user-details-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedUser(null)}
        >
          <section
            className="user-details-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-details-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="user-details-header">
              <h2 id="user-details-title">Account Details</h2>
              <button
                className="user-details-close"
                type="button"
                onClick={() => setSelectedUser(null)}
                aria-label="Close user details"
              >
                ×
              </button>
            </div>

            <div className="user-profile-summary-box">
              <div className="user-profile-avatar-lg">
                {getInitials(selectedUser.name)}
              </div>
              <div className="user-profile-summary-text">
                <strong>{selectedUser.name}</strong>
                <span>{selectedUser.email}</span>
              </div>
            </div>

            <div className="user-details-dl">
              <div>
                <dt>Role</dt>
                <dd>
                  <span className={`role-badge role-${selectedUser.role}`}>
                    {formatRole(selectedUser.role)}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Account Status</dt>
                <dd>
                  <span
                    className={`status-badge ${
                      isUserActive(selectedUser) ? 'status-active' : 'status-deactivated'
                    }`}
                  >
                    {isUserActive(selectedUser) ? 'Active' : 'Deactivated'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Account ID</dt>
                <dd>#{selectedUser.id}</dd>
              </div>
              <div>
                <dt>Assigned Shelter</dt>
                <dd>{selectedUser.shelter_id ? `Shelter #${selectedUser.shelter_id}` : 'None Assigned'}</dd>
              </div>
            </div>

            <div className="user-confirmation-actions">
              <button
                className="btn ghost"
                type="button"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Action Confirmation Modal Dialog */}
      {pendingAction && (
        <div className="user-details-backdrop" role="presentation">
          <section
            className="user-details-dialog user-confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-action-title"
          >
            <h2 id="user-action-title">{actionCopy.title}</h2>
            <p>{actionCopy.detail}</p>

            {pendingAction.type === 'delete' && (
              <div className="danger-warning-box">
                <AlertCircleIcon size={18} />
                <span>
                  <strong>Note:</strong> Users who have performed historical redistribution actions cannot be removed from the system audit log.
                </span>
              </div>
            )}

            <div className="user-confirmation-actions">
              <button
                className="btn ghost"
                type="button"
                disabled={actionSubmitting}
                onClick={() => setPendingAction(null)}
              >
                Cancel
              </button>
              <button
                className={`btn ${
                  pendingAction.type === 'delete' ? 'admin-delete-button' : 'accent'
                }`}
                type="button"
                disabled={actionSubmitting}
                onClick={confirmAction}
              >
                {actionSubmitting ? 'Processing...' : actionCopy.confirm}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
