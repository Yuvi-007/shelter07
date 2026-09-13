import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function riskClass(level) {
  return { low: 'risk-low', medium: 'risk-medium', high: 'risk-high' }[level] || 'risk-low';
}

export default function AuthorityDashboard() {
  const { auth } = useAuth();
  const token = auth.token;

  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const shelters = await api.getShelters(token);
      const withPredictions = await Promise.all(
        shelters.map(async (s) => {
          try {
            const prediction = await api.predict(s.id, token);
            return { ...s, prediction };
          } catch {
            return { ...s, prediction: null };
          }
        })
      );
      setRows(withPredictions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Region overview</h1>
        <p>All shelters, ranked by risk of overload. Click into a shelter for the full trend and redistribution options.</p>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="muted">Loading shelters…</p>}

      <div className="grid grid-3">
        {rows.map((s) => {
          const ratio = s.total_capacity ? s.current_occupancy / s.total_capacity : 0;
          const risk = s.prediction?.risk_level || 'low';
          return (
            <Link to={`/shelters/${s.id}`} key={s.id} className="card shelter-card">
              <div className="row">
                <h3>{s.name}</h3>
                <span className={`risk-tag ${riskClass(risk)}`}>{risk}</span>
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
              <div className="row">
                <span className="muted">{s.current_occupancy} / {s.total_capacity} people</span>
                {s.prediction?.projected_hours_to_capacity != null && (
                  <span className="muted">~{s.prediction.projected_hours_to_capacity}h to full</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
