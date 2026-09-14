import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function formatRole(role) {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown';
}

export default function AdminUsers() {
  const { auth } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

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

  useEffect(() => { loadUsers(); }, []);

  const roles = useMemo(
    () => [...new Set(users.map((user) => user.role).filter(Boolean))].sort(),
    [users],
  );
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !query || user.name?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query);
      return matchesSearch && (!role || user.role === role);
    });
  }, [users, search, role]);

  return (
    <main className="page admin-users-page">
      <Link className="back-link admin-back-link" to="/admin">← Back to Dashboard</Link>
      <header className="admin-users-header">
        <p className="section-eyebrow">Administration</p>
        <h1>User Management</h1>
        <p>View and manage registered ShelterX users.</p>
      </header>

      {loading ? (
        <p className="dashboard-loading" role="status">Loading users...</p>
      ) : error ? (
        <section className="admin-users-message" role="alert">
          <p>{error}</p>
          <button className="btn ghost" type="button" onClick={loadUsers}>Retry</button>
        </section>
      ) : (
        <section className="admin-users-card" aria-labelledby="users-heading">
          <div className="admin-users-toolbar">
            <div>
              <h2 id="users-heading">Registered Users</h2>
              <p>{users.length} registered {users.length === 1 ? 'user' : 'users'}</p>
            </div>
            <div className="admin-users-filters">
              <label>
                <span className="sr-only">Search users</span>
                <input
                  type="search"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label>
                <span className="sr-only">Filter by role</span>
                <select value={role} onChange={(event) => setRole(event.target.value)}>
                  <option value="">All Roles</option>
                  {roles.map((availableRole) => <option key={availableRole} value={availableRole}>{formatRole(availableRole)}</option>)}
                </select>
              </label>
            </div>
          </div>

          {users.length === 0 ? (
            <p className="admin-users-empty">No users found.</p>
          ) : filteredUsers.length === 0 ? (
            <p className="admin-users-empty">No users match your search.</p>
          ) : (
            <div className="admin-users-table-wrap">
              <table className="admin-users-table">
                <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td><span className={`role-badge role-${user.role}`}>{formatRole(user.role)}</span></td>
                      <td><button className="btn ghost admin-view-button" type="button" onClick={() => setSelectedUser(user)}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {selectedUser && (
        <div className="user-details-backdrop" role="presentation" onMouseDown={() => setSelectedUser(null)}>
          <section className="user-details-dialog" role="dialog" aria-modal="true" aria-labelledby="user-details-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="user-details-header">
              <h2 id="user-details-title">User Details</h2>
              <button className="user-details-close" type="button" onClick={() => setSelectedUser(null)} aria-label="Close user details">×</button>
            </div>
            <dl>
              <div><dt>Name</dt><dd>{selectedUser.name}</dd></div>
              <div><dt>Email</dt><dd>{selectedUser.email}</dd></div>
              <div><dt>Role</dt><dd><span className={`role-badge role-${selectedUser.role}`}>{formatRole(selectedUser.role)}</span></dd></div>
              {selectedUser.shelter_id && <div><dt>Assigned Shelter ID</dt><dd>{selectedUser.shelter_id}</dd></div>}
            </dl>
          </section>
        </div>
      )}
    </main>
  );
}
