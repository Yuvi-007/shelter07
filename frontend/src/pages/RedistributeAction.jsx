import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  ShelterIcon,
  UsersIcon,
  MapPinIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  FoodIcon,
  WaterIcon,
  MedicalIcon,
} from '../components/common/Icons';

function riskClass(level) {
  return { low: 'risk-low', medium: 'risk-medium', high: 'risk-high' }[level] || 'risk-low';
}

export default function RedistributeAction() {
  const { id } = useParams();
  const { auth } = useAuth();
  const token = auth?.token;
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
      setPeopleCounts(
        Object.fromEntries(
          result.suggestions.map((suggestion) => [
            suggestion.shelter_id,
            Math.min(defaultPeopleCount, suggestion.free_capacity),
          ])
        )
      );
    } catch (err) {
      setError(err.message || 'Unable to load redistribution suggestions.');
    }
  };

  useEffect(() => {
    setSuccess(null);
    load();
  }, [id]);

  const adjustCount = (toShelterId, maxFree, delta) => {
    const current = Number(peopleCounts[toShelterId]) || 1;
    const nextVal = Math.max(1, Math.min(maxFree, current + delta));
    setPeopleCounts((prev) => ({
      ...prev,
      [toShelterId]: nextVal,
    }));
  };

  const handleConfirm = async (toShelterId, destinationName) => {
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
    setSuccess(null);

    try {
      const result = await api.confirmRedistribution(
        {
          from_shelter_id: sourceShelterId,
          to_shelter_id: toShelterId,
          people_count: peopleCount,
        },
        token
      );
      setSuccess({
        ...result,
        destinationName,
      });
      await load();
    } catch (err) {
      setError(err.message || 'Failed to complete redistribution transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceOccupancy = sourceShelter?.current_occupancy || 0;
  const sourceCapacity = sourceShelter?.total_capacity || 0;
  const sourceRatio = sourceCapacity > 0 ? Math.round((sourceOccupancy / sourceCapacity) * 100) : 0;

  return (
    <main className="page redistribution-action-page">
      {/* Navigation Breadcrumb */}
      <div className="redistribution-nav-bar">
        <Link to="/authority" className="admin-back-btn">
          &larr; Back to Authority Center
        </Link>
        <Link to={`/shelters/${id}`} className="admin-back-btn">
          View Shelter Details
        </Link>
      </div>

      {/* Header */}
      <header className="redistribution-header">
        <div className="redistribution-header-main">
          <p className="section-eyebrow">EMERGENCY RELIEF DISPATCH</p>
          <h1>Shelter Capacity Redistribution</h1>
          <p className="redistribution-header-sub">
            Move evacuees from overloaded facility to nearby shelters with verified open beds.
          </p>
        </div>
      </header>

      {/* Feedback Messages */}
      {error && (
        <div className="admin-alert-banner is-error" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircleIcon size={16} />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">&times;</button>
        </div>
      )}

      {success && (
        <div className="admin-alert-banner is-success" role="status">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircleIcon size={16} />
            <span>
              <strong>Transfer Confirmed:</strong> Successfully transferred {success.people_count} evacuees to{' '}
              {success.destinationName || 'destination facility'} (Audit Record #{success.id}).
            </span>
          </div>
          <button type="button" onClick={() => setSuccess(null)} aria-label="Dismiss">&times;</button>
        </div>
      )}

      {/* Source Facility Overview Bar */}
      {sourceShelter && (
        <section className="redistribution-source-hero">
          <div className="source-hero-info">
            <span className="source-node-tag source-pulse">OVERLOADED SOURCE FACILITY</span>
            <h2>{sourceShelter.name} <span className="source-facility-id">#{sourceShelter.id}</span></h2>
            <p className="muted">
              <MapPinIcon size={13} className="inline-icon" /> Location: {sourceShelter.latitude}, {sourceShelter.longitude}
            </p>
          </div>

          <div className="source-hero-stats">
            <div className="source-stat-item">
              <span className="source-stat-label">Current Headcount</span>
              <strong className="source-stat-value is-critical">{sourceOccupancy} / {sourceCapacity}</strong>
            </div>
            <div className="source-stat-item">
              <span className="source-stat-label">Occupancy Load</span>
              <strong className="source-stat-value is-critical">{sourceRatio}% Full</strong>
            </div>
            <div className="source-stat-item">
              <span className="source-stat-label">Risk Level</span>
              <span className={`risk-tag ${riskClass(data?.risk_level || 'high')}`}>
                {(data?.risk_level || 'High').toUpperCase()}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Suggestions Pipeline */}
      {!data ? (
        <div className="admin-main-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p className="dashboard-loading" role="status">Analyzing regional network and computing shortest transit corridors...</p>
        </div>
      ) : data.suggestions.length === 0 ? (
        <div className="admin-main-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🟢</div>
          <h3>No Safe Transfer Corridors Available</h3>
          <p className="muted" style={{ maxWidth: '50ch', margin: '0 auto 20px' }}>
            {data.message || 'All nearby shelters are operating near or at capacity, or this shelter does not currently require immediate redistribution.'}
          </p>
          <button className="btn accent" onClick={() => navigate('/authority')}>
            Return to Regional Overview
          </button>
        </div>
      ) : (
        <div className="redistribution-corridors-list">
          <div className="corridors-list-title">
            <h3>Recommended Evacuation Transfer Corridors</h3>
            <span className="corridors-count-badge">{data.suggestions.length} Routes Identified</span>
          </div>

          {data.suggestions.map((dest) => {
            const transferCount = Number(peopleCounts[dest.shelter_id]) || 1;
            const destCurrent = dest.current_occupancy ?? (dest.total_capacity - dest.free_capacity);
            const sourceProjected = Math.max(0, sourceOccupancy - transferCount);
            const sourceProjectedRatio = sourceCapacity > 0 ? Math.round((sourceProjected / sourceCapacity) * 100) : 0;

            const destProjected = Math.min(dest.total_capacity, destCurrent + transferCount);
            const destProjectedRatio = dest.total_capacity > 0 ? Math.round((destProjected / dest.total_capacity) * 100) : 0;
            const destCurrentRatio = dest.total_capacity > 0 ? Math.round((destCurrent / dest.total_capacity) * 100) : 0;

            return (
              <article className="redistribution-corridor-card" key={dest.shelter_id}>
                {/* Visual Flow Grid (Source -> Arrow Flow -> Destination) */}
                <div className="corridor-flow-grid">
                  {/* 1. SOURCE FACILITY NODE */}
                  <div className="corridor-node source-node">
                    <div className="node-badge-row">
                      <span className="node-role-badge source">SOURCE FACILITY</span>
                      <span className="node-id-tag">ID #{sourceShelter?.id}</span>
                    </div>

                    <h4 className="node-title">{sourceShelter?.name}</h4>

                    <div className="node-stat-row">
                      <span className="node-stat-label">Current Load:</span>
                      <strong className="node-stat-val source-overload">{sourceOccupancy} / {sourceCapacity} ({sourceRatio}%)</strong>
                    </div>

                    {/* Source Progress Bar */}
                    <div className="corridor-bar-track">
                      <div
                        className="corridor-bar-fill source-bar"
                        style={{ width: `${Math.min(sourceRatio, 100)}%` }}
                      />
                    </div>

                    <div className="node-projection-row">
                      <span className="projection-pill relief">
                        Relief: &minus;{transferCount} evacuees
                      </span>
                      <span className="projection-result">
                        &rarr; New: <strong>{sourceProjected}</strong> ({sourceProjectedRatio}%)
                      </span>
                    </div>
                  </div>

                  {/* 2. DIRECTIONAL TRANSFER CORRIDOR WITH ARROW & PEOPLE INPUT */}
                  <div className="corridor-transfer-center">
                    <div className="transfer-transit-tag">
                      <MapPinIcon size={12} className="inline-icon" />
                      <span>{dest.distance_km} km transit distance</span>
                    </div>

                    {/* Dynamic Graphic Arrow */}
                    <div className="directional-arrow-track" aria-hidden="true">
                      <div className="arrow-line"></div>
                      <div className="arrow-badge">
                        <UsersIcon size={15} />
                        <span>{transferCount} Evacuees</span>
                      </div>
                      <div className="arrow-head">&rarr;</div>
                    </div>

                    {/* Stepper Count Form */}
                    <div className="transfer-input-box">
                      <label htmlFor={`people-count-${dest.shelter_id}`} className="transfer-input-label">
                        Evacuees to Move:
                      </label>
                      <div className="stepper-cluster">
                        <button
                          type="button"
                          className="stepper-step-btn"
                          onClick={() => adjustCount(dest.shelter_id, dest.free_capacity, -10)}
                          disabled={transferCount <= 1 || isSubmitting}
                          title="Decrease 10"
                        >
                          &minus;10
                        </button>
                        <button
                          type="button"
                          className="stepper-step-btn"
                          onClick={() => adjustCount(dest.shelter_id, dest.free_capacity, -1)}
                          disabled={transferCount <= 1 || isSubmitting}
                          title="Decrease 1"
                        >
                          &minus;1
                        </button>
                        <input
                          id={`people-count-${dest.shelter_id}`}
                          type="number"
                          min="1"
                          max={dest.free_capacity}
                          value={peopleCounts[dest.shelter_id] ?? 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setPeopleCounts((prev) => ({
                              ...prev,
                              [dest.shelter_id]: Number.isNaN(val) ? '' : Math.min(dest.free_capacity, Math.max(1, val)),
                            }));
                          }}
                          className="transfer-number-field"
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          className="stepper-step-btn"
                          onClick={() => adjustCount(dest.shelter_id, dest.free_capacity, 1)}
                          disabled={transferCount >= dest.free_capacity || isSubmitting}
                          title="Increase 1"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          className="stepper-step-btn"
                          onClick={() => adjustCount(dest.shelter_id, dest.free_capacity, 10)}
                          disabled={transferCount >= dest.free_capacity || isSubmitting}
                          title="Increase 10"
                        >
                          +10
                        </button>
                      </div>
                      <span className="transfer-max-hint">Max open beds: <strong>{dest.free_capacity}</strong></span>
                    </div>
                  </div>

                  {/* 3. DESTINATION FACILITY NODE */}
                  <div className="corridor-node destination-node">
                    <div className="node-badge-row">
                      <span className="node-role-badge destination">DESTINATION SAFE HARBOR</span>
                      <span className="node-id-tag">ID #{dest.shelter_id}</span>
                    </div>

                    <h4 className="node-title">{dest.name}</h4>

                    <div className="node-stat-row">
                      <span className="node-stat-label">Current Free:</span>
                      <strong className="node-stat-val dest-free">{dest.free_capacity} beds available</strong>
                    </div>

                    {/* Destination Progress Bar */}
                    <div className="corridor-bar-track">
                      <div
                        className="corridor-bar-fill dest-bar"
                        style={{ width: `${Math.min(destCurrentRatio, 100)}%` }}
                      />
                    </div>

                    <div className="node-projection-row">
                      <span className="projection-pill intake">
                        Receiving: +{transferCount}
                      </span>
                      <span className="projection-result">
                        &rarr; New: <strong>{destProjected}</strong> / {dest.total_capacity} ({destProjectedRatio}%)
                      </span>
                    </div>

                    {/* Amenities tags */}
                    <div className="node-amenities-row">
                      <span className={`amenity-chip ${dest.has_food ? 'has' : ''}`}>
                        {dest.has_food ? '✓ Food' : '✕ No Food'}
                      </span>
                      <span className={`amenity-chip ${dest.has_water ? 'has' : ''}`}>
                        {dest.has_water ? '✓ Water' : '✕ No Water'}
                      </span>
                      <span className={`amenity-chip ${dest.has_medical ? 'has' : ''}`}>
                        {dest.has_medical ? '✓ Medical' : '✕ No Medical'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Corridor Action Confirmation Bar */}
                <div className="corridor-bottom-action">
                  <div className="action-summary-text">
                    Dispatch <strong>{transferCount} evacuees</strong> from <strong>{sourceShelter?.name}</strong> to <strong>{dest.name}</strong> over <strong>{dest.distance_km} km</strong> corridor.
                  </div>
                  <button
                    className="btn accent corridor-confirm-btn"
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleConfirm(dest.shelter_id, dest.name)}
                  >
                    {isSubmitting ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCwIcon size={14} className="spin-icon" /> Executing Transfer...
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        Confirm Redistribution Transfer <ArrowRightIcon size={15} />
                      </span>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
