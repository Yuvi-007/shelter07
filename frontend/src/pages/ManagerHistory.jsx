import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  HistoryIcon,
  RefreshCwIcon,
  ArrowLeftIcon,
  BuildingIcon,
  AlertCircleIcon,
  TrendingUpIcon,
} from '../components/common/Icons';

function getOccupancyStatus(count, capacity) {
  if (!capacity || capacity <= 0) return { label: 'Unknown', className: 'status-deactivated' };
  const pct = Math.round((count / capacity) * 100);
  if (pct >= 90) return { label: 'Critical', className: 'occupancy-status-critical', pct };
  if (pct >= 75) return { label: 'High', className: 'occupancy-status-high', pct };
  if (pct >= 50) return { label: 'Moderate', className: 'occupancy-status-moderate', pct };
  return { label: 'Low', className: 'occupancy-status-low', pct };
}

export default function ManagerHistory() {
  const { auth } = useAuth();
  const token = auth?.token;

  const [shelterId, setShelterId] = useState(null);
  const [shelterName, setShelterName] = useState('');
  const [shelterCapacity, setShelterCapacity] = useState(null);
  const [allShelters, setAllShelters] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadHistoryForShelter = useCallback(async (targetShelterId, isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [logsData, shelterData] = await Promise.all([
        api.getOccupancyLogs(targetShelterId, token).catch(() => []),
        api.getShelter(targetShelterId, token).catch(() => null),
      ]);

      if (shelterData) {
        setShelterName(shelterData.name);
        setShelterCapacity(shelterData.total_capacity);
      }

      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (err) {
      setError(err.message || 'Unable to load occupancy history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const loadHistory = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [currentUser, sheltersList] = await Promise.all([
        api.getMe(token),
        api.getShelters(token).catch(() => []),
      ]);

      const validShelters = Array.isArray(sheltersList) ? sheltersList : [];
      setAllShelters(validShelters);

      let targetId = currentUser?.shelter_id;
      if (!targetId && validShelters.length > 0) {
        targetId = validShelters[0].id;
      }

      if (!targetId) {
        setShelterId(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setShelterId(targetId);
      await loadHistoryForShelter(targetId, isManual);
    } catch (err) {
      setError(err.message || 'Unable to load occupancy history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, loadHistoryForShelter]);

  const handleSwitchShelter = async (targetId) => {
    setShelterId(targetId);
    await loadHistoryForShelter(targetId);
  };

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // If unassigned manager and no shelters available
  if (!loading && !shelterId) {
    return (
      <main className="page manager-history-page">
        <header className="admin-dashboard-header">
          <p className="section-eyebrow">MY SHELTER</p>
          <h1 className="admin-welcome">Occupancy History</h1>
          <p className="admin-welcome-sub">Historical headcount updates and capacity utilization log</p>
        </header>

        <section className="admin-main-card">
          <div className="admin-empty-state">
            <div className="empty-state-icon">
              <BuildingIcon size={24} />
            </div>
            <h3>No shelter assigned</h3>
            <p>You have not been assigned to a shelter facility yet. Please select a facility on your Manager Dashboard first.</p>
            <Link to="/manager" className="btn accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              Go to Manager Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // Calculate statistics across history records
  const totalEvents = logs.length;
  const peakOccupancy = logs.reduce((max, l) => Math.max(max, l.occupancy_count || 0), 0);
  const latestCount = logs.length > 0 ? logs[0].occupancy_count : null;

  return (
    <main className="page manager-history-page">
      <header className="manager-page-header">
        <div>
          <div className="manager-header-nav">
            <Link to="/manager" className="manager-back-link">
              <ArrowLeftIcon size={14} /> Back to Dashboard
            </Link>
          </div>
          <p className="section-eyebrow">AUDIT &amp; LOGS</p>
          <h1 className="admin-welcome">Occupancy History</h1>
          <p className="admin-welcome-sub">
            Chronological audit trail of occupancy records for <strong>{shelterName || `Shelter #${shelterId}`}</strong>
          </p>
        </div>

        <div className="manager-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {allShelters.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid var(--line)', padding: '5px 12px', borderRadius: '8px' }}>
              <span className="muted" style={{ fontSize: '12px', fontWeight: 600 }}>Facility:</span>
              <select
                value={shelterId || ''}
                onChange={(e) => handleSwitchShelter(Number(e.target.value))}
                style={{ border: 'none', background: 'transparent', font: 'inherit', fontSize: '13px', fontWeight: 500, color: 'var(--navy)', cursor: 'pointer', outline: 'none' }}
              >
                {allShelters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (#{s.id})
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            className="sys-refresh-btn"
            type="button"
            onClick={() => loadHistory(true)}
            disabled={loading || refreshing}
            title="Refresh history logs"
          >
            <RefreshCwIcon size={13} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Logs'}</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="admin-alert-banner is-error" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircleIcon size={16} />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => loadHistory(false)}>Retry</button>
        </div>
      )}

      {/* Summary Stat Pills */}
      <section className="manager-history-summary-grid" aria-label="History summary metrics">
        <article className="manager-history-metric-card">
          <div className="metric-icon-wrap">
            <HistoryIcon size={18} />
          </div>
          <div>
            <span className="metric-label">Logged Events</span>
            <strong>{totalEvents}</strong>
          </div>
        </article>

        <article className="manager-history-metric-card">
          <div className="metric-icon-wrap">
            <TrendingUpIcon size={18} />
          </div>
          <div>
            <span className="metric-label">Latest Recorded</span>
            <strong>{latestCount !== null ? latestCount : '—'} {shelterCapacity ? `/ ${shelterCapacity}` : ''}</strong>
          </div>
        </article>

        <article className="manager-history-metric-card">
          <div className="metric-icon-wrap is-warning">
            <BuildingIcon size={18} />
          </div>
          <div>
            <span className="metric-label">Peak Occupancy</span>
            <strong>{totalEvents > 0 ? peakOccupancy : '—'} {shelterCapacity ? `/ ${shelterCapacity}` : ''}</strong>
          </div>
        </article>
      </section>

      {/* Table Card */}
      <section className="admin-main-card" aria-labelledby="history-table-heading">
        <div className="admin-users-toolbar">
          <div className="admin-toolbar-title">
            <h2 id="history-table-heading">Headcount Logs ({totalEvents})</h2>
            <p>Verified records saved on every occupancy update transaction.</p>
          </div>
        </div>

        {loading ? (
          <div className="dashboard-loading-skeleton" aria-busy="true">
            <div className="skeleton-bar" style={{ height: '48px', width: '100%' }} />
            <div className="skeleton-bar" style={{ height: '48px', width: '100%' }} />
            <div className="skeleton-bar" style={{ height: '48px', width: '100%' }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="admin-empty-state">
            <div className="empty-state-icon">
              <HistoryIcon size={24} />
            </div>
            <h3>No occupancy records yet</h3>
            <p>Occupancy updates submitted from the Manager Dashboard will automatically be logged here with timestamps.</p>
            <Link to="/manager" className="btn accent">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="admin-users-table-wrap">
            <table className="admin-table" aria-label="Occupancy history table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '60px' }}>#</th>
                  <th scope="col">Recorded At</th>
                  <th scope="col">Headcount</th>
                  <th scope="col">Delta</th>
                  <th scope="col">Capacity Fill</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => {
                  const effectiveCapacity = log.total_capacity || shelterCapacity;
                  const status = getOccupancyStatus(log.occupancy_count, effectiveCapacity);
                  
                  // Compute delta compared to the chronologically prior log
                  // Since logs are ORDER BY logged_at DESC, index + 1 is the previous event
                  const priorLog = logs[index + 1];
                  const delta = priorLog !== undefined ? log.occupancy_count - priorLog.occupancy_count : null;

                  const dateFormatted = log.logged_at
                    ? new Date(log.logged_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : '—';

                  return (
                    <tr key={log.id || index}>
                      <td>
                        <span className="log-id-badge">#{log.id || index + 1}</span>
                      </td>
                      <td>
                        <div className="log-time-cell">
                          <strong>{dateFormatted}</strong>
                        </div>
                      </td>
                      <td>
                        <div className="log-headcount-cell">
                          <strong>{log.occupancy_count}</strong>
                          {effectiveCapacity && (
                            <span className="muted"> / {effectiveCapacity}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {delta === null ? (
                          <span className="delta-neutral">Initial Entry</span>
                        ) : delta > 0 ? (
                          <span className="delta-increase">+{delta}</span>
                        ) : delta < 0 ? (
                          <span className="delta-decrease">{delta}</span>
                        ) : (
                          <span className="delta-neutral">No change (0)</span>
                        )}
                      </td>
                      <td>
                        <div className="capacity-fill-cell">
                          <span>{status.pct !== undefined ? `${status.pct}%` : '—'}</span>
                          {status.pct !== undefined && (
                            <div className="mini-bar-track">
                              <div
                                className="mini-bar-fill"
                                style={{
                                  width: `${Math.min(status.pct, 100)}%`,
                                  background:
                                    status.pct >= 90
                                      ? '#dc2626'
                                      : status.pct >= 75
                                      ? '#ea580c'
                                      : status.pct >= 50
                                      ? '#d97706'
                                      : '#16a34a',
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
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
