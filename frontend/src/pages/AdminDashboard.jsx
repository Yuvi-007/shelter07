import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { auth } = useAuth();
  const token = auth.token;

  const [shelters, setShelters] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [newShelter, setNewShelter] = useState({ name: '', latitude: '', longitude: '', total_capacity: '' });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [s, u] = await Promise.all([api.getShelters(token), api.getUsers(token)]);
      setShelters(s);
      setUsers(u);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createShelter({
        ...newShelter,
        latitude: parseFloat(newShelter.latitude),
        longitude: parseFloat(newShelter.longitude),
        total_capacity: parseInt(newShelter.total_capacity, 10),
      }, token);
      setNewShelter({ name: '', latitude: '', longitude: '', total_capacity: '' });
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this shelter?')) return;
    try {
      await api.deleteShelter(id, token);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAssign = async (userId, shelterId) => {
    try {
      await api.assignShelter(userId, shelterId || null, token);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Admin dashboard</h1>
        <p>Manage shelters and assign managers to them.</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="grid grid-2" style={{ alignItems: 'start', marginBottom: 28 }}>
        <div className="card">
          <h3>Add a shelter</h3>
          <form onSubmit={handleCreate}>
            <div className="field">
              <label>Name</label>
              <input value={newShelter.name} onChange={(e) => setNewShelter({ ...newShelter, name: e.target.value })} required />
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label>Latitude</label>
                <input type="number" step="any" value={newShelter.latitude} onChange={(e) => setNewShelter({ ...newShelter, latitude: e.target.value })} required />
              </div>
              <div className="field">
                <label>Longitude</label>
                <input type="number" step="any" value={newShelter.longitude} onChange={(e) => setNewShelter({ ...newShelter, longitude: e.target.value })} required />
              </div>
            </div>
            <div className="field">
              <label>Total capacity</label>
              <input type="number" value={newShelter.total_capacity} onChange={(e) => setNewShelter({ ...newShelter, total_capacity: e.target.value })} required />
            </div>
            <button className="btn accent" type="submit" disabled={saving}>
              {saving ? 'Adding…' : 'Add shelter'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Shelters ({shelters.length})</h3>
          <table>
            <thead><tr><th>Name</th><th>Occupancy</th><th></th></tr></thead>
            <tbody>
              {shelters.map((s) => (
                <tr key={s.id}>
                  <td><Link to={`/shelters/${s.id}`}>{s.name}</Link></td>
                  <td>{s.current_occupancy}/{s.total_capacity}</td>
                  <td>
                    <button className="btn ghost" onClick={() => handleDelete(s.id)} style={{ padding: '4px 10px', fontSize: 12 }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Users ({users.length})</h3>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Assigned shelter</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  {u.role === 'manager' ? (
                    <select value={u.shelter_id || ''} onChange={(e) => handleAssign(u.id, e.target.value)}>
                      <option value="">— unassigned —</option>
                      {shelters.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
