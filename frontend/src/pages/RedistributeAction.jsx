import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function RedistributeAction() {
  const { id } = useParams();
  const { auth } = useAuth();
  const token = auth.token;
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [sourceShelter, setSourceShelter] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [peopleCounts, setPeopleCounts] = useState({});

  const load = async () => {
    try {
      const [result, source] = await Promise.all([
        api.redistribute(id, token),
        api.getShelter(id, token),
      ]);
      const defaultPeopleCount = Math.max(
        Math.ceil(source.current_occupancy - (source.total_capacity * 0.8)),
        1,
      );
      setError('');
      setData(result);
      setSourceShelter(source);
      setPeopleCounts(Object.fromEntries(
        result.suggestions.map((suggestion) => [
          suggestion.shelter_id,
          Math.min(defaultPeopleCount, suggestion.free_capacity),
        ])
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    setSuccess(null);
    load();
  }, [id]);

  const handleConfirm = async (toShelterId) => {
    if (isSubmitting) return;

    const sourceShelterId = Number(id);
    const enteredCount = peopleCounts[toShelterId];
    const peopleCount = Number(enteredCount);
    if (!Number.isInteger(sourceShelterId) || sourceShelterId <= 0 || sourceShelterId === toShelterId) {
      setError('Source and destination shelters must be different.');
      return;
    }
    if (enteredCount === '' || !Number.isInteger(peopleCount) || peopleCount <= 0) {
      setError('People count must be a positive integer.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const result = await api.confirmRedistribution({
        from_shelter_id: sourceShelterId,
        to_shelter_id: toShelterId,
        people_count: peopleCount,
      }, token);
      setSuccess(result);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Redistribution suggestions</h1>
        <p>Nearby shelters with room to spare for people arriving at this shelter.</p>
      </div>

      {error && <p className="error-text" role="alert">{error}</p>}
      {success && (
        <p className="success-text" role="status">
          {success.message} {success.people_count} people transferred (record #{success.id}).
        </p>
      )}

      {sourceShelter && (
        <div className="card redistribution-source">
          <h3>Source shelter</h3>
          <strong>{sourceShelter.name}</strong>
          <p className="muted">
            Current occupancy: {sourceShelter.current_occupancy} of {sourceShelter.total_capacity}
          </p>
        </div>
      )}

      {!data ? (
        <p className="muted">Loading…</p>
      ) : data.suggestions.length === 0 ? (
        <div className="card">
          <p className="muted">{data.message || 'No suggestions available right now.'}</p>
        </div>
      ) : (
        <div className="card">
          {data.suggestions.map((s) => (
            <div className="suggestion-row" key={s.shelter_id}>
              <div>
                <strong>{s.name}</strong>
                <p className="muted" style={{ margin: '2px 0 0' }}>
                  {s.distance_km} km away · {s.free_capacity} of {s.total_capacity} spots free
                </p>
                <p className="muted" style={{ margin: '2px 0 0' }}>
                  Current occupancy: {s.total_capacity - s.free_capacity} of {s.total_capacity}
                </p>
              </div>
              <label className="field" style={{ margin: 0 }}>
                <span className="muted">People</span>
                <input
                  type="number"
                  min="1"
                  max={s.free_capacity}
                  value={peopleCounts[s.shelter_id] ?? 1}
                  onChange={(e) => setPeopleCounts({
                    ...peopleCounts,
                    [s.shelter_id]: e.target.value,
                  })}
                  disabled={isSubmitting}
                />
              </label>
              <button
                className="btn accent"
                disabled={isSubmitting}
                onClick={() => handleConfirm(s.shelter_id)}
              >
                {isSubmitting ? 'Confirming…' : 'Confirm redirect'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button className="btn ghost" onClick={() => navigate('/authority')}>
          ← Back to Authority Center
        </button>
        <button className="btn ghost" onClick={() => navigate(`/shelters/${id}`)}>
          View Shelter Detail
        </button>
      </div>
    </div>
  );
}
