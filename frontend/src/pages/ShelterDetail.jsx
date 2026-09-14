import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { getRoleDashboardPath } from '../utils/rbac';

function riskClass(level) {
  return { low: 'risk-low', medium: 'risk-medium', high: 'risk-high' }[level] || 'risk-low';
}

export default function ShelterDetail() {
  const { id } = useParams();
  const { auth } = useAuth();
  const token = auth.token;

  const [shelter, setShelter] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [s, p, l] = await Promise.all([
        api.getShelter(id, token),
        api.predict(id, token),
        api.getOccupancyLogs(id, token),
      ]);
      setShelter(s);
      setPrediction(p);
      setLogs(l.slice(-10).reverse());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (error) return <div className="page"><p className="error-text">{error}</p></div>;
  if (!shelter) return <div className="page"><p className="muted">Loading…</p></div>;

  const ratio = shelter.total_capacity ? shelter.current_occupancy / shelter.total_capacity : 0;
  const risk = prediction?.risk_level || 'low';

  const canRedistribute =
    auth?.user?.role === 'admin' ||
    auth?.user?.role === 'authority' ||
    (auth?.user?.email || '').toLowerCase().startsWith('authority@');

  const backUrl = getRoleDashboardPath(auth?.user);

  return (
    <div className="page">
      <Link className="back-link" to={backUrl}>← Back to Dashboard</Link>
      <div className="page-header">
        <h1>{shelter.name}</h1>
        <p>{shelter.current_occupancy} of {shelter.total_capacity} capacity occupied</p>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start', marginBottom: 20 }}>
        <div className="card">
          <div className="row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Prediction</h3>
            <span className={`risk-tag ${riskClass(risk)}`}>{risk} risk</span>
          </div>
          <div className="bar-track" style={{ marginBottom: 12 }}>
            <div
              className="bar-fill"
              style={{
                width: `${Math.min(ratio * 100, 100)}%`,
                background: ratio >= 0.85 ? '#c9503f' : ratio >= 0.6 ? '#d99a2b' : '#3f9c6d',
              }}
            />
          </div>
          {prediction?.trend_people_per_hour != null ? (
            <p className="muted">
              Trend: {prediction.trend_people_per_hour > 0 ? '+' : ''}{prediction.trend_people_per_hour} people/hour.{' '}
              {prediction.projected_hours_to_capacity != null
                ? `Projected to reach capacity in ~${prediction.projected_hours_to_capacity} hours.`
                : 'Occupancy is stable or falling.'}
            </p>
          ) : (
            <p className="muted">{prediction?.note || 'Not enough data yet for a trend projection.'}</p>
          )}

          {risk !== 'low' && canRedistribute && (
            <Link to={`/shelters/${id}/redistribute`}>
              <button className="btn accent" style={{ marginTop: 8 }}>View redistribution suggestions</button>
            </Link>
          )}
        </div>

        <div className="card">
          <h3>Recent occupancy log</h3>
          {logs.length === 0 ? (
            <p className="muted">No updates logged yet.</p>
          ) : (
            <ul className="log-list">
              {logs.map((l) => (
                <li key={l.id}>
                  <span>{new Date(l.logged_at).toLocaleString()}</span>
                  <strong>{l.occupancy_count}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
