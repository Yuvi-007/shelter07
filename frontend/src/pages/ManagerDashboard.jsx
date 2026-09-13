import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function riskClass(level) {
  return { low: 'risk-low', medium: 'risk-medium', high: 'risk-high' }[level] || 'risk-low';
}

export default function ManagerDashboard() {
  const { auth } = useAuth();
  const token = auth.token;

  const [shelterId, setShelterId] = useState(null);
  const [loadingAssignment, setLoadingAssignment] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [shelter, setShelter] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [occupancyInput, setOccupancyInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (currentShelterId) => {
    setHasLoadedData(false);
    try {
      const [s, p] = await Promise.all([
        api.getShelter(currentShelterId, token),
        api.predict(currentShelterId, token),
      ]);
      setShelter(s);
      setPrediction(p);
      setOccupancyInput(String(s.current_occupancy));
    } catch (err) {
      setError(err.message);
    } finally {
      setHasLoadedData(true);
    }
  };

  useEffect(() => {
    const loadCurrentUser = async () => {
      setError('');
      try {
        const currentUser = await api.getMe(token);
        setShelterId(currentUser.shelter_id);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingAssignment(false);
      }
    };

    loadCurrentUser();
  }, [token]);

  useEffect(() => {
    if (!loadingAssignment && shelterId) load(shelterId);
  }, [loadingAssignment, shelterId]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.updateOccupancy(shelterId, parseInt(occupancyInput, 10), token);
      await load(shelterId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingAssignment) {
    return <div className="page"><p className="muted">Loadingâ€¦</p></div>;
  }

  if (error && !shelterId) {
    return <div className="page"><p className="error-text">{error}</p></div>;
  }

  if (!shelterId) {
    return (
      <div className="page">
        <div className="page-header"><h1>Manager dashboard</h1></div>
        <p className="muted">You haven't been assigned to a shelter yet. Ask an admin to assign you one.</p>
      </div>
    );
  }

  if (error && !shelter) {
    return <div className="page"><p className="error-text">{error}</p></div>;
  }

  if (!hasLoadedData || !shelter) {
    return <div className="page"><p className="muted">Loading…</p></div>;
  }

  const ratio = shelter.total_capacity ? shelter.current_occupancy / shelter.total_capacity : 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{shelter.name}</h1>
        <p>Update occupancy and keep an eye on the risk of overload.</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      {prediction && prediction.risk_level !== 'low' && (
        <div className="card" style={{ marginBottom: 20, borderColor: prediction.risk_level === 'high' ? '#e3a89c' : '#e8cf9b' }}>
          <span className={`risk-tag ${riskClass(prediction.risk_level)}`}>
            {prediction.risk_level} risk
          </span>
          <p style={{ marginTop: 10, marginBottom: 0 }}>
            {prediction.projected_hours_to_capacity != null
              ? `At the current rate, this shelter may hit capacity in about ${prediction.projected_hours_to_capacity} hours.`
              : 'This shelter is filling up quickly — keep an eye on it.'}
          </p>
        </div>
      )}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3>Current status</h3>
          <div className="shelter-card">
            <div className="row">
              <span className="muted">Occupancy</span>
              <strong>{shelter.current_occupancy} / {shelter.total_capacity}</strong>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${Math.min(ratio * 100, 100)}%`,
                  background: ratio >= 0.85 ? '#c9503f' : ratio >= 0.6 ? '#d99a2b' : '#3f9c6d',
                }}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Update headcount</h3>
          <form onSubmit={handleUpdate}>
            <div className="field">
              <label>Current occupancy</label>
              <input
                type="number"
                min="0"
                value={occupancyInput}
                onChange={(e) => setOccupancyInput(e.target.value)}
                required
              />
            </div>
            <button className="btn accent" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save update'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
