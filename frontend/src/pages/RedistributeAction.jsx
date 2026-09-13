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
  const [error, setError] = useState('');
  const [confirmedId, setConfirmedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [peopleCounts, setPeopleCounts] = useState({});

  const load = async () => {
    try {
      const [result, sourceShelter] = await Promise.all([
        api.redistribute(id, token),
        api.getShelter(id, token),
      ]);
      const defaultPeopleCount = Math.max(
        Math.ceil(sourceShelter.current_occupancy - (sourceShelter.total_capacity * 0.8)),
        1,
      );
      setData(result);
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

  useEffect(() => { load(); }, [id]);

  const handleConfirm = async (toShelterId) => {
    const peopleCount = Number(peopleCounts[toShelterId]);
    if (!Number.isInteger(peopleCount) || peopleCount <= 0) {
      setError('People count must be a positive integer.');
      return;
    }

    setBusyId(toShelterId);
    setError('');
    try {
      await api.confirmRedistribution({
        from_shelter_id: parseInt(id, 10),
        to_shelter_id: toShelterId,
        people_count: peopleCount,
      }, token);
      setConfirmedId(toShelterId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Redistribution suggestions</h1>
        <p>Nearby shelters with room to spare for people arriving at this shelter.</p>
      </div>

      {error && <p className="error-text">{error}</p>}

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
                  disabled={busyId === s.shelter_id || confirmedId === s.shelter_id}
                />
              </label>
              <button
                className="btn accent"
                disabled={busyId === s.shelter_id || confirmedId === s.shelter_id}
                onClick={() => handleConfirm(s.shelter_id)}
              >
                {confirmedId === s.shelter_id ? 'Confirmed' : busyId === s.shelter_id ? 'Confirming…' : 'Confirm redirect'}
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="btn ghost" style={{ marginTop: 20 }} onClick={() => navigate(`/shelters/${id}`)}>
        Back to shelter detail
      </button>
    </div>
  );
}
