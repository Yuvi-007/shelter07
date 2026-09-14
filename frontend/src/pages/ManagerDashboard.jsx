import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  ShelterIcon,
  UsersIcon,
  BedIcon,
  BuildingIcon,
  HistoryIcon,
  MapPinIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  FoodIcon,
  WaterIcon,
  MedicalIcon,
  ArrowRightIcon,
  TrendingUpIcon,
} from '../components/common/Icons';

function getOccupancyStatus(count, capacity) {
  if (!capacity || capacity <= 0) {
    return { label: 'Unknown', className: 'occupancy-status-low', pct: 0, level: 'low' };
  }
  const pct = Math.max(0, Math.round((count / capacity) * 100));
  if (pct >= 90) return { label: 'Critical', className: 'occupancy-status-critical', pct, level: 'critical' };
  if (pct >= 75) return { label: 'High', className: 'occupancy-status-high', pct, level: 'high' };
  if (pct >= 50) return { label: 'Moderate', className: 'occupancy-status-moderate', pct, level: 'moderate' };
  return { label: 'Low', className: 'occupancy-status-low', pct, level: 'low' };
}

function riskClass(level) {
  return { low: 'risk-low', medium: 'risk-medium', high: 'risk-high' }[level] || 'risk-low';
}

export default function ManagerDashboard() {
  const { auth } = useAuth();
  const token = auth?.token;

  const [shelterId, setShelterId] = useState(null);
  const [loadingAssignment, setLoadingAssignment] = useState(true);
  const [shelter, setShelter] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [shelterRequests, setShelterRequests] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Occupancy form state
  const [occupancyInput, setOccupancyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const loadShelterData = useCallback(async (currentShelterId, isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoadingData(true);
    setError('');

    try {
      const [shelterData, predictionData, logsData, requestsData] = await Promise.all([
        api.getShelter(currentShelterId, token),
        api.predict(currentShelterId, token).catch(() => null),
        api.getOccupancyLogs(currentShelterId, token).catch(() => []),
        api.getManagerShelterRequests(token).catch(() => []),
      ]);

      setShelter(shelterData);
      setPrediction(predictionData);
      setRecentLogs(Array.isArray(logsData) ? logsData.slice(0, 5) : []);
      setShelterRequests(Array.isArray(requestsData) ? requestsData : []);
      setOccupancyInput(String(shelterData.current_occupancy));
    } catch (err) {
      setError(err.message || 'Unable to load assigned shelter data.');
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    const fetchManagerAssignment = async () => {
      setLoadingAssignment(true);
      setError('');
      try {
        const currentUser = await api.getMe(token);
        setShelterId(currentUser.shelter_id);
        if (currentUser.shelter_id) {
          await loadShelterData(currentUser.shelter_id);
        }
      } catch (err) {
        setError(err.message || 'Unable to verify manager assignment.');
      } finally {
        setLoadingAssignment(false);
      }
    };

    fetchManagerAssignment();
  }, [token, loadShelterData]);

  // Stepper quick-adjustment helper
  const adjustOccupancy = (delta) => {
    setFormError('');
    setFeedback('');
    const currentVal = parseInt(occupancyInput, 10);
    const base = Number.isNaN(currentVal) ? shelter?.current_occupancy || 0 : currentVal;
    const nextVal = Math.max(0, Math.min(shelter?.total_capacity || 0, base + delta));
    setOccupancyInput(String(nextVal));
  };

  const handleUpdateOccupancy = async (e) => {
    e.preventDefault();
    setFormError('');
    setFeedback('');

    const count = parseInt(occupancyInput, 10);
    if (Number.isNaN(count) || count < 0) {
      setFormError('Occupancy count must be a non-negative number (0 or greater).');
      return;
    }

    if (shelter && count > shelter.total_capacity) {
      setFormError(`Occupancy count cannot exceed total capacity of ${shelter.total_capacity}.`);
      return;
    }

    setSaving(true);
    try {
      await api.updateOccupancy(shelterId, count, token);
      setFeedback(`Occupancy headcount updated successfully to ${count}.`);
      await loadShelterData(shelterId);
    } catch (err) {
      setFormError(err.message || 'Failed to update occupancy headcount.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestStatusUpdate = async (requestId, status) => {
    try {
      const updatedRequest = await api.updateShelterRequestStatus(requestId, status, token);
      setShelterRequests((requests) => requests.map((item) => (
        item.id === requestId ? updatedRequest : item
      )));
    } catch (err) {
      setError(err.message || 'Unable to update shelter request status.');
    }
  };

  // Loading state
  if (loadingAssignment) {
    return (
      <main className="page manager-dashboard">
        <header className="admin-dashboard-header">
          <p className="section-eyebrow">MY SHELTER</p>
          <h1 className="admin-welcome">Shelter Operations</h1>
          <p className="admin-welcome-sub">Synchronizing assigned shelter facility...</p>
        </header>
        <section className="admin-main-card">
          <div className="dashboard-loading-skeleton" aria-busy="true">
            <div className="skeleton-bar" style={{ height: '40px', width: '100%' }} />
            <div className="skeleton-bar" style={{ height: '120px', width: '100%' }} />
          </div>
        </section>
      </main>
    );
  }

  // Unassigned Manager Empty State
  if (!shelterId) {
    return (
      <main className="page manager-dashboard">
        <header className="admin-dashboard-header">
          <p className="section-eyebrow">MY SHELTER</p>
          <h1 className="admin-welcome">Shelter Operations</h1>
          <p className="admin-welcome-sub">Facility operational controls and occupancy management</p>
        </header>

        <section className="admin-main-card">
          <div className="admin-empty-state">
            <div className="empty-state-icon">
              <BuildingIcon size={24} />
            </div>
            <h3>No shelter has been assigned to you yet</h3>
            <p>
              Your account is registered as a Shelter Manager, but you have not yet been assigned to an active shelter facility. An administrator must assign a shelter to your account before you can view operational metrics or update headcounts.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link to="/profile" className="btn accent">
                View Account Profile
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (error && !shelter) {
    return (
      <main className="page manager-dashboard">
        <div className="admin-alert-banner is-error" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircleIcon size={16} />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => loadShelterData(shelterId)}>Retry</button>
        </div>
      </main>
    );
  }

  if (!shelter) {
    return (
      <main className="page manager-dashboard">
        <section className="admin-main-card">
          <p className="dashboard-loading" role="status">Loading shelter data...</p>
        </section>
      </main>
    );
  }

  // Calculate stats
  const totalCapacity = shelter.total_capacity || 0;
  const currentOccupancy = shelter.current_occupancy || 0;
  const availableCapacity = shelter.available_capacity ?? Math.max(0, totalCapacity - currentOccupancy);
  const statusInfo = getOccupancyStatus(currentOccupancy, totalCapacity);
  const fillRatio = totalCapacity > 0 ? currentOccupancy / totalCapacity : 0;
  const fillPercentage = statusInfo.pct;

  return (
    <main className="page manager-dashboard">
      {/* Header */}
      <header className="manager-page-header">
        <div>
          <p className="section-eyebrow">MY SHELTER</p>
          <h1 className="admin-welcome">{shelter.name}</h1>
          <p className="admin-welcome-sub">
            <MapPinIcon size={14} className="inline-icon" /> Location: {shelter.latitude}, {shelter.longitude}
          </p>
        </div>

        <div className="manager-header-actions">
          <Link to="/manager/history" className="btn ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <HistoryIcon size={14} />
            <span>Occupancy History</span>
          </Link>
          <button
            className="sys-refresh-btn"
            type="button"
            onClick={() => loadShelterData(shelterId, true)}
            disabled={loadingData || refreshing}
            title="Refresh shelter statistics"
          >
            <RefreshCwIcon size={13} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Feedback Banner */}
      {feedback && (
        <div className="admin-alert-banner is-success" role="status">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircleIcon size={16} />
            <span>{feedback}</span>
          </div>
          <button type="button" onClick={() => setFeedback('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {error && (
        <div className="admin-alert-banner is-error" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircleIcon size={16} />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* Prediction / Early Risk Warning Card (Reusing existing backend predict endpoint) */}
      {prediction && prediction.risk_level && prediction.risk_level !== 'low' && (
        <section
          className={`manager-risk-banner risk-border-${prediction.risk_level}`}
          aria-label="Occupancy risk advisory"
        >
          <div className="risk-banner-header">
            <span className={`risk-tag ${riskClass(prediction.risk_level)}`}>
              {prediction.risk_level.toUpperCase()} OVERLOAD RISK
            </span>
            {prediction.trend_people_per_hour !== null && (
              <span className="risk-trend-meta">
                <TrendingUpIcon size={14} className="inline-icon" /> Trend: +{prediction.trend_people_per_hour} occupants / hour
              </span>
            )}
          </div>
          <p className="risk-banner-message">
            {prediction.projected_hours_to_capacity !== null
              ? `At current intake velocity, this shelter is projected to hit maximum capacity in approximately ${prediction.projected_hours_to_capacity} hours.`
              : 'Occupancy is approaching peak limits rapidly. Monitor headcount intake closely.'}
          </p>
        </section>
      )}

      {/* 4 Core Operational Statistics Cards */}
      <section className="dashboard-section" aria-labelledby="operational-stats-heading">
        <div className="dashboard-section-heading">
          <h2 id="operational-stats-heading">Operational Statistics</h2>
          <p>Real-time occupancy status and live capacity measurements.</p>
        </div>

        <div className="dashboard-stat-grid">
          {/* Total Capacity */}
          <article className="dashboard-stat-card">
            <div className="stat-card-top">
              <p className="stat-card-label">Total Capacity</p>
              <div className="stat-icon-wrap is-shelters">
                <BedIcon size={18} />
              </div>
            </div>
            <strong>{totalCapacity}</strong>
            <p className="stat-card-meta">Authorized facility capacity</p>
          </article>

          {/* Current Occupancy */}
          <article className="dashboard-stat-card">
            <div className="stat-card-top">
              <p className="stat-card-label">Current Occupancy</p>
              <div className="stat-icon-wrap is-users">
                <UsersIcon size={18} />
              </div>
            </div>
            <strong>{currentOccupancy}</strong>
            <p className="stat-card-meta">Sheltered individuals on-site</p>
          </article>

          {/* Available Capacity */}
          <article className="dashboard-stat-card">
            <div className="stat-card-top">
              <p className="stat-card-label">Available Capacity</p>
              <div className="stat-icon-wrap is-requests">
                <BuildingIcon size={18} />
              </div>
            </div>
            <strong style={availableCapacity === 0 ? { color: '#dc2626' } : {}}>
              {availableCapacity}
            </strong>
            <p className="stat-card-meta">
              {availableCapacity === 0 ? 'No beds remaining' : 'Remaining intake space'}
            </p>
          </article>

          {/* Occupancy Percentage & Indicator */}
          <article className="dashboard-stat-card">
            <div className="stat-card-top">
              <p className="stat-card-label">Occupancy Rate</p>
              <span className={`occupancy-status-pill ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
            </div>
            <strong
              style={
                statusInfo.level === 'critical'
                  ? { color: '#dc2626' }
                  : statusInfo.level === 'high'
                  ? { color: '#ea580c' }
                  : statusInfo.level === 'moderate'
                  ? { color: '#d97706' }
                  : {}
              }
            >
              {fillPercentage}%
            </strong>
            <p className="stat-card-meta">Safe operational threshold: &lt; 90%</p>
          </article>
        </div>
      </section>

      {/* Visual Occupancy Meter */}
      <section className="admin-main-card manager-progress-card" aria-label="Capacity utilization progress">
        <div className="manager-progress-header">
          <div>
            <strong>Capacity Utilization Meter</strong>
            <span className="muted"> — {currentOccupancy} of {totalCapacity} beds occupied</span>
          </div>
          <div className="manager-threshold-legend">
            <span className="legend-item"><span className="legend-dot dot-low" /> Low (&lt;50%)</span>
            <span className="legend-item"><span className="legend-dot dot-moderate" /> Moderate (50-74%)</span>
            <span className="legend-item"><span className="legend-dot dot-high" /> High (75-89%)</span>
            <span className="legend-item"><span className="legend-dot dot-critical" /> Critical (≥90%)</span>
          </div>
        </div>

        <div className="manager-progress-track">
          <div
            className="manager-progress-fill"
            style={{
              width: `${Math.min(fillRatio * 100, 100)}%`,
              backgroundColor:
                fillRatio >= 0.9
                  ? '#dc2626'
                  : fillRatio >= 0.75
                  ? '#ea580c'
                  : fillRatio >= 0.5
                  ? '#d97706'
                  : '#16a34a',
            }}
          />
        </div>
      </section>

      {/* Actions and Information Grid */}
      <div className="manager-content-grid">
        {/* Update Occupancy Section */}
        <section className="admin-main-card" aria-labelledby="update-headcount-heading">
          <div className="admin-toolbar-title" style={{ marginBottom: '18px' }}>
            <h2 id="update-headcount-heading">Update Occupancy Headcount</h2>
            <p>Log safe headcount adjustments for your assigned shelter facility.</p>
          </div>

          {formError && (
            <div className="admin-alert-banner is-error" style={{ marginBottom: '16px' }} role="alert">
              <span>{formError}</span>
              <button type="button" onClick={() => setFormError('')}>×</button>
            </div>
          )}

          <form onSubmit={handleUpdateOccupancy} className="manager-occupancy-form">
            <div className="manager-form-metrics">
              <div className="form-metric-box">
                <span className="metric-box-label">Current</span>
                <strong>{currentOccupancy}</strong>
              </div>
              <div className="form-metric-box">
                <span className="metric-box-label">Total Capacity</span>
                <strong>{totalCapacity}</strong>
              </div>
              <div className="form-metric-box">
                <span className="metric-box-label">Available</span>
                <strong>{availableCapacity}</strong>
              </div>
            </div>

            <div className="admin-form-field" style={{ marginBottom: '14px' }}>
              <label htmlFor="occupancy-headcount-input">New Headcount Value</label>
              <div className="headcount-input-group">
                <input
                  id="occupancy-headcount-input"
                  type="number"
                  min="0"
                  max={totalCapacity}
                  step="1"
                  value={occupancyInput}
                  onChange={(e) => {
                    setFormError('');
                    setFeedback('');
                    setOccupancyInput(e.target.value);
                  }}
                  required
                  placeholder="Enter verified headcount"
                />
                <button
                  type="button"
                  className="btn ghost quick-btn"
                  onClick={() => setOccupancyInput(String(currentOccupancy))}
                  title="Reset to current occupancy"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Stepper buttons for rapid operational triage */}
            <div className="stepper-actions-wrap">
              <span className="stepper-label">Quick Adjustments:</span>
              <div className="stepper-btn-group">
                <button
                  type="button"
                  className="btn ghost stepper-btn"
                  onClick={() => adjustOccupancy(-10)}
                  disabled={saving || parseInt(occupancyInput, 10) <= 0}
                >
                  -10
                </button>
                <button
                  type="button"
                  className="btn ghost stepper-btn"
                  onClick={() => adjustOccupancy(-1)}
                  disabled={saving || parseInt(occupancyInput, 10) <= 0}
                >
                  -1
                </button>
                <button
                  type="button"
                  className="btn ghost stepper-btn"
                  onClick={() => adjustOccupancy(1)}
                  disabled={saving || parseInt(occupancyInput, 10) >= totalCapacity}
                >
                  +1
                </button>
                <button
                  type="button"
                  className="btn ghost stepper-btn"
                  onClick={() => adjustOccupancy(10)}
                  disabled={saving || parseInt(occupancyInput, 10) >= totalCapacity}
                >
                  +10
                </button>
              </div>
            </div>

            <div className="form-submit-actions">
              <button
                className="btn accent"
                type="submit"
                disabled={saving || loadingData || occupancyInput === String(currentOccupancy)}
                style={{ width: '100%' }}
              >
                {saving ? 'Saving Headcount...' : 'Submit Verified Occupancy Update'}
              </button>
            </div>
          </form>
        </section>

        {/* Shelter Information Section */}
        <section className="admin-main-card" aria-labelledby="shelter-info-heading">
          <div className="admin-toolbar-title" style={{ marginBottom: '18px' }}>
            <h2 id="shelter-info-heading">Shelter Information</h2>
            <p>Verified physical specifications and assigned on-site emergency resources.</p>
          </div>

          <dl className="user-details-dl" style={{ marginBottom: '18px' }}>
            <div>
              <dt>Shelter Name</dt>
              <dd>{shelter.name}</dd>
            </div>
            <div>
              <dt>Facility ID</dt>
              <dd>#{shelter.id}</dd>
            </div>
            <div>
              <dt>Latitude</dt>
              <dd>{shelter.latitude}</dd>
            </div>
            <div>
              <dt>Longitude</dt>
              <dd>{shelter.longitude}</dd>
            </div>
            <div>
              <dt>Total Capacity</dt>
              <dd>{totalCapacity} persons</dd>
            </div>
            <div>
              <dt>Assigned Manager</dt>
              <dd>{shelter.manager_name || auth?.user?.name || 'Assigned'}</dd>
            </div>
          </dl>

          <h3 className="section-subheading">On-Site Resources & Facilities</h3>
          <div className="resource-status-list">
            <div className={`resource-status-row ${shelter.has_food ? 'is-available' : 'is-unavailable'}`}>
              <div className="resource-row-title">
                <FoodIcon size={16} />
                <span>Food Supplies</span>
              </div>
              <span className={`status-badge ${shelter.has_food ? 'status-active' : 'status-deactivated'}`}>
                {shelter.has_food ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <div className={`resource-status-row ${shelter.has_water ? 'is-available' : 'is-unavailable'}`}>
              <div className="resource-row-title">
                <WaterIcon size={16} />
                <span>Drinking Water</span>
              </div>
              <span className={`status-badge ${shelter.has_water ? 'status-active' : 'status-deactivated'}`}>
                {shelter.has_water ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <div className={`resource-status-row ${shelter.has_medical ? 'is-available' : 'is-unavailable'}`}>
              <div className="resource-row-title">
                <MedicalIcon size={16} />
                <span>Medical Aid Station</span>
              </div>
              <span className={`status-badge ${shelter.has_medical ? 'status-active' : 'status-deactivated'}`}>
                {shelter.has_medical ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="admin-main-card" style={{ marginTop: '24px' }} aria-labelledby="shelter-requests-heading">
        <div className="admin-users-toolbar">
          <div className="admin-toolbar-title">
            <h2 id="shelter-requests-heading">Shelter Requests</h2>
            <p>Citizen allocation requests submitted for this shelter.</p>
          </div>
        </div>

        {shelterRequests.length === 0 ? (
          <p className="muted" style={{ padding: '12px 0', margin: 0 }}>
            No shelter requests have been submitted for this facility yet.
          </p>
        ) : (
          <div className="admin-users-table-wrap">
            <table className="admin-table" aria-label="Shelter requests table">
              <thead>
                <tr>
                  <th scope="col">Citizen</th>
                  <th scope="col">Shelter</th>
                  <th scope="col">People</th>
                  <th scope="col">Requested</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {shelterRequests.map((shelterRequest) => (
                  <tr key={shelterRequest.id}>
                    <td>
                      <strong>{shelterRequest.user_name}</strong>
                      <br />
                      <span className="muted">{shelterRequest.user_email}</span>
                    </td>
                    <td>{shelterRequest.shelter_name}</td>
                    <td>{shelterRequest.people_count}</td>
                    <td>{shelterRequest.created_at ? new Date(shelterRequest.created_at).toLocaleString() : '—'}</td>
                    <td>
                      <select
                        value={shelterRequest.status}
                        onChange={(e) => handleRequestStatusUpdate(shelterRequest.id, e.target.value)}
                        aria-label={`Update status for request ${shelterRequest.id}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Occupancy Audit Activity */}
      <section className="admin-main-card" style={{ marginTop: '24px' }} aria-labelledby="recent-activity-heading">
        <div className="admin-users-toolbar">
          <div className="admin-toolbar-title">
            <h2 id="recent-activity-heading">Recent Occupancy Activity</h2>
            <p>Last recorded headcount updates for this facility.</p>
          </div>
          <Link to="/manager/history" className="btn ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}>
            <span>View Full History</span>
            <ArrowRightIcon size={14} />
          </Link>
        </div>

        {recentLogs.length === 0 ? (
          <p className="muted" style={{ padding: '12px 0', margin: 0 }}>
            No occupancy updates logged yet. Updates submitted above will create an immutable audit record.
          </p>
        ) : (
          <div className="admin-users-table-wrap">
            <table className="admin-table" aria-label="Recent activity table">
              <thead>
                <tr>
                  <th scope="col">Recorded At</th>
                  <th scope="col">Headcount</th>
                  <th scope="col">Capacity Fill</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => {
                  const status = getOccupancyStatus(log.occupancy_count, totalCapacity);
                  return (
                    <tr key={log.id}>
                      <td>
                        <strong>
                          {log.logged_at
                            ? new Date(log.logged_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </strong>
                      </td>
                      <td>
                        <strong>{log.occupancy_count}</strong>
                        <span className="muted"> / {totalCapacity}</span>
                      </td>
                      <td>{status.pct}%</td>
                      <td>
                        <span className={`occupancy-status-pill ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
