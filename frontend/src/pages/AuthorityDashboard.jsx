import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function riskClass(level) {
  return { low: 'risk-low', medium: 'risk-medium', high: 'risk-high' }[level] || 'risk-low';
}

export default function AuthorityDashboard() {
  const { auth } = useAuth();
  const token = auth?.token;
  const navigate = useNavigate();

  // Active tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Backend live data
  const [shelters, setShelters] = useState([]);
  const [redistributions, setRedistributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Requests state
  const [requests, setRequests] = useState([
    {
      id: 'REQ-101',
      team: 'West Sector Rescue Unit',
      location: 'Sector 4 Flood Basin',
      people: 32,
      priority: 'Critical',
      needs: 'Food & Medical',
      status: 'Pending',
      assignedShelter: null,
      time: '12 mins ago',
    },
    {
      id: 'REQ-102',
      team: 'Riverside Evacuation Bus #3',
      location: 'Old Highway Bridge',
      people: 45,
      priority: 'High',
      needs: 'Safe Drinking Water',
      status: 'Pending',
      assignedShelter: null,
      time: '25 mins ago',
    },
    {
      id: 'REQ-103',
      team: 'Senior Home Transport',
      location: 'North Ward Care Facility',
      people: 16,
      priority: 'Medium',
      needs: 'Medical Care',
      status: 'Approved',
      assignedShelter: 'Government School B',
      time: '1 hour ago',
    },
  ]);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    team: '',
    location: '',
    people: '',
    priority: 'High',
    needs: 'Food & Water',
  });

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [rawShelters, logs] = await Promise.all([
        api.getShelters(token),
        api.getRedistributionLog(token).catch(() => []),
      ]);

      const enriched = await Promise.all(
        rawShelters.map(async (s) => {
          try {
            const prediction = await api.predict(s.id, token);
            return { ...s, prediction };
          } catch {
            return { ...s, prediction: null };
          }
        })
      );

      setShelters(enriched);
      setRedistributions(logs || []);
    } catch (err) {
      setError(err.message || 'Unable to load emergency shelter data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Derived metrics
  const totalShelters = shelters.length;
  const totalCapacity = shelters.reduce((acc, s) => acc + (s.total_capacity || 0), 0);
  const totalOccupancy = shelters.reduce((acc, s) => acc + (s.current_occupancy || 0), 0);
  const availableFreeSpots = Math.max(totalCapacity - totalOccupancy, 0);

  const criticalShelters = shelters.filter(
    (s) => s.prediction?.risk_level === 'high' || (s.total_capacity && s.current_occupancy / s.total_capacity >= 0.85)
  );

  const mediumRiskShelters = shelters.filter(
    (s) => s.prediction?.risk_level === 'medium' && (s.current_occupancy / (s.total_capacity || 1) < 0.85)
  );

  const activeAlertsCount = criticalShelters.length + mediumRiskShelters.length;
  const pendingRequestsCount = requests.filter((r) => r.status === 'Pending').length;

  // Fastest hours to full
  const hoursList = shelters
    .map((s) => s.prediction?.projected_hours_to_capacity)
    .filter((h) => typeof h === 'number' && h > 0);
  const fastestFullHours = hoursList.length > 0 ? Math.min(...hoursList) : null;

  // Filtered shelters
  const filteredShelters = shelters.filter((s) => {
    const matchesName = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const risk = s.prediction?.risk_level || 'low';
    if (!matchesName) return false;
    if (statusFilter === 'critical') return risk === 'high';
    if (statusFilter === 'medium') return risk === 'medium';
    if (statusFilter === 'safe') return risk === 'low';
    return true;
  });

  // Request actions
  const handleApprove = (id) => {
    setRequests(requests.map((r) => (r.id === id ? { ...r, status: 'Approved' } : r)));
  };

  const handleReject = (id) => {
    setRequests(requests.map((r) => (r.id === id ? { ...r, status: 'Rejected' } : r)));
  };

  const handleAssign = (id, shelterName) => {
    setRequests(
      requests.map((r) => (r.id === id ? { ...r, status: 'Assigned', assignedShelter: shelterName } : r))
    );
  };

  const handleCreateRequest = (e) => {
    e.preventDefault();
    if (!newRequest.team || !newRequest.people) return;
    const item = {
      id: `REQ-${Math.floor(100 + Math.random() * 900)}`,
      team: newRequest.team,
      location: newRequest.location || 'Field Origin',
      people: parseInt(newRequest.people, 10),
      priority: newRequest.priority,
      needs: newRequest.needs,
      status: 'Pending',
      assignedShelter: null,
      time: 'Just now',
    };
    setRequests([item, ...requests]);
    setNewRequest({ team: '', location: '', people: '', priority: 'High', needs: 'Food & Water' });
    setShowRequestForm(false);
  };

  return (
    <div className="authority-view">
      {/* Editorial Header */}
      <div className="authority-hero-header">
        <p className="section-eyebrow">AUTHORITY CONTROL CENTER</p>
        <h1>Emergency Shelter Operations</h1>
        <p>
          Real-time occupancy tracking, predictive capacity risk analysis, and coordinated evacuee redistribution.
        </p>
      </div>

      {/* Clean Minimalist Tab Switcher */}
      <div className="authority-tab-nav">
        <button
          className={`authority-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>

        <button
          className={`authority-tab-btn ${activeTab === 'shelters' ? 'active' : ''}`}
          onClick={() => setActiveTab('shelters')}
        >
          Shelters <span className="authority-tab-badge">{totalShelters}</span>
        </button>

        <button
          className={`authority-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Requests
          {pendingRequestsCount > 0 && (
            <span className="authority-tab-badge" style={{ background: '#c9503f', color: '#fff' }}>
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          className={`authority-tab-btn ${activeTab === 'allocations' ? 'active' : ''}`}
          onClick={() => setActiveTab('allocations')}
        >
          Allocations <span className="authority-tab-badge">{redistributions.length}</span>
        </button>

        <button
          className={`authority-tab-btn ${activeTab === 'predictions' ? 'active' : ''}`}
          onClick={() => setActiveTab('predictions')}
        >
          Predictions
        </button>

        <button
          className={`authority-tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          Alerts
          {activeAlertsCount > 0 && (
            <span className="authority-tab-badge" style={{ background: '#c9503f', color: '#fff' }}>
              {activeAlertsCount}
            </span>
          )}
        </button>

        <button className="authority-refresh-btn" onClick={loadData} disabled={loading}>
          {loading ? 'Refreshing…' : '🔄 Refresh'}
        </button>
      </div>

      {error && <p className="error-text" style={{ marginBottom: 20 }}>{error}</p>}

      {/* ========================================================
          TAB 1: OVERVIEW (Exact theme from homepage screenshot)
          ======================================================== */}
      {activeTab === 'overview' && (
        <div>
          {/* Urgent Overload Alert Banner */}
          {criticalShelters.length > 0 && (
            <div className="authority-urgent-banner">
              <div>
                <strong>⚠️ Capacity Warning: {criticalShelters.map((s) => s.name).join(', ')}</strong>
                <p>
                  Approaching or exceeding critical capacity. Initiate redistribution to divert incoming evacuees.
                </p>
              </div>
              <Link to={`/shelters/${criticalShelters[0].id}/redistribute`}>
                <button className="btn accent btn-sm">Redistribute Evacuees</button>
              </Link>
            </div>
          )}

          {/* Section: Core Capabilities Grid */}
          <div style={{ marginBottom: 32 }}>
            <p className="section-eyebrow">CORE CAPABILITIES</p>
            <h2 style={{ fontSize: 26, margin: '0 0 20px', color: 'var(--navy)' }}>
              Clear information for faster action
            </h2>

            <div className="authority-grid-4">
              <div className="authority-capability-card">
                <h3>Monitor Capacity</h3>
                <div className="card-metric">{totalOccupancy} / {totalCapacity}</div>
                <p>Track shelter occupancy and available space in real time.</p>
              </div>

              <div className="authority-capability-card">
                <h3>Identify Risk</h3>
                <div className="card-metric" style={{ color: criticalShelters.length > 0 ? '#c9503f' : '#1f6d4a' }}>
                  {criticalShelters.length > 0 ? `${criticalShelters.length} Critical` : 'Safe Levels'}
                </div>
                <p>Identify shelters approaching their capacity limits.</p>
              </div>

              <div className="authority-capability-card">
                <h3>Predict Capacity</h3>
                <div className="card-metric">
                  {fastestFullHours != null ? `~${fastestFullHours}h to full` : 'Stable Trend'}
                </div>
                <p>Analyze occupancy trends and estimate potential overcrowding.</p>
              </div>

              <div className="authority-capability-card">
                <h3>Redistribute People</h3>
                <div className="card-metric" style={{ color: '#1f6d4a' }}>
                  {availableFreeSpots} Free Spots
                </div>
                <p>Support authorities in moving people to shelters with available capacity.</p>
              </div>
            </div>
          </div>

          {/* Section: Focused Workflow */}
          <div style={{ marginBottom: 36 }}>
            <p className="section-eyebrow">A FOCUSED WORKFLOW</p>
            <h2 style={{ fontSize: 26, margin: '0 0 20px', color: 'var(--navy)' }}>
              How ShelterX Works
            </h2>

            <div className="authority-workflow-strip">
              <div className="authority-workflow-step">
                <span>1. MONITOR</span>
                <p>Managers update shelter occupancy headcounts on the ground.</p>
              </div>
              <div className="authority-workflow-arrow">→</div>
              <div className="authority-workflow-step">
                <span>2. ANALYZE</span>
                <p>ShelterX identifies capacity risks and trend projections.</p>
              </div>
              <div className="authority-workflow-arrow">→</div>
              <div className="authority-workflow-step">
                <span>3. RESPOND</span>
                <p>Authorities make informed, proactive redistribution decisions.</p>
              </div>
            </div>
          </div>

          {/* Real-time Shelter Occupancy Table */}
          <div className="authority-panel">
            <div className="authority-panel-header">
              <div>
                <h3>Active Regional Shelters</h3>
                <p>Current headcounts, fill levels, and risk classification.</p>
              </div>
              <button className="btn ghost btn-sm" onClick={() => setActiveTab('shelters')}>
                View All Shelters →
              </button>
            </div>

            <div className="authority-table-wrap">
              <table className="authority-simple-table">
                <thead>
                  <tr>
                    <th>Shelter Name</th>
                    <th>Occupancy</th>
                    <th style={{ minWidth: 160 }}>Capacity Meter</th>
                    <th>Risk Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shelters.map((s) => {
                    const ratio = s.total_capacity ? s.current_occupancy / s.total_capacity : 0;
                    const risk = s.prediction?.risk_level || 'low';
                    return (
                      <tr key={s.id}>
                        <td>
                          <strong>
                            <Link to={`/shelters/${s.id}`}>{s.name}</Link>
                          </strong>
                        </td>
                        <td>
                          {s.current_occupancy} / {s.total_capacity}
                          <span className="muted" style={{ fontSize: 12, display: 'block' }}>
                            {s.total_capacity - s.current_occupancy} spots remaining
                          </span>
                        </td>
                        <td>
                          <div className="bar-track" style={{ height: 8 }}>
                            <div
                              className="bar-fill"
                              style={{
                                width: `${Math.min(ratio * 100, 100)}%`,
                                background: ratio >= 0.85 ? '#c9503f' : ratio >= 0.6 ? '#d99a2b' : '#3f9c6d',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, display: 'inline-block' }}>
                            {Math.round(ratio * 100)}% full
                          </span>
                        </td>
                        <td>
                          <span className={`risk-tag ${riskClass(risk)}`}>{risk}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Link to={`/shelters/${s.id}`}>
                              <button className="btn-sm btn-outline">Trend</button>
                            </Link>
                            {risk !== 'low' && (
                              <Link to={`/shelters/${s.id}/redistribute`}>
                                <button className="btn-sm btn-danger">Redistribute</button>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: SHELTERS DIRECTORY
          ======================================================== */}
      {activeTab === 'shelters' && (
        <div className="authority-panel">
          <div className="authority-panel-header">
            <div>
              <p className="section-eyebrow">DIRECTORY</p>
              <h2>Regional Shelters</h2>
              <p>Comprehensive overview of shelter amenities, coordinates, and real-time status.</p>
            </div>
          </div>

          <div className="authority-filter-row">
            <input
              type="text"
              placeholder="Search shelter name..."
              className="authority-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <button
              className={`authority-filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({shelters.length})
            </button>
            <button
              className={`authority-filter-pill ${statusFilter === 'critical' ? 'active' : ''}`}
              onClick={() => setStatusFilter('critical')}
            >
              Critical ({criticalShelters.length})
            </button>
            <button
              className={`authority-filter-pill ${statusFilter === 'medium' ? 'active' : ''}`}
              onClick={() => setStatusFilter('medium')}
            >
              Medium Risk ({mediumRiskShelters.length})
            </button>
            <button
              className={`authority-filter-pill ${statusFilter === 'safe' ? 'active' : ''}`}
              onClick={() => setStatusFilter('safe')}
            >
              Safe
            </button>
          </div>

          <div className="authority-table-wrap">
            <table className="authority-simple-table">
              <thead>
                <tr>
                  <th>Shelter Name</th>
                  <th>Coordinates</th>
                  <th>Occupancy</th>
                  <th>Free Spots</th>
                  <th>Resources</th>
                  <th>Risk</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredShelters.map((s) => {
                  const free = s.total_capacity - s.current_occupancy;
                  const risk = s.prediction?.risk_level || 'low';
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>
                          <Link to={`/shelters/${s.id}`}>{s.name}</Link>
                        </strong>
                      </td>
                      <td>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {s.latitude?.toFixed(4)}, {s.longitude?.toFixed(4)}
                        </span>
                      </td>
                      <td>
                        <strong>{s.current_occupancy}</strong> / {s.total_capacity}
                      </td>
                      <td>
                        <strong style={{ color: free <= 20 ? '#c9503f' : '#1f6d4a' }}>
                          {free > 0 ? free : 0} spots
                        </strong>
                      </td>
                      <td>
                        <span className={`amenity-chip ${s.has_food ? 'has' : ''}`}>
                          {s.has_food ? '✓ Food' : '✗ Food'}
                        </span>
                        <span className={`amenity-chip ${s.has_water ? 'has' : ''}`}>
                          {s.has_water ? '✓ Water' : '✗ Water'}
                        </span>
                        <span className={`amenity-chip ${s.has_medical ? 'has' : ''}`}>
                          {s.has_medical ? '✓ Medical' : '✗ Medical'}
                        </span>
                      </td>
                      <td>
                        <span className={`risk-tag ${riskClass(risk)}`}>{risk}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Link to={`/shelters/${s.id}`}>
                            <button className="btn-sm btn-outline">Detail</button>
                          </Link>
                          {risk !== 'low' && (
                            <Link to={`/shelters/${s.id}/redistribute`}>
                              <button className="btn-sm btn-danger">Redistribute</button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: REQUESTS
          ======================================================== */}
      {activeTab === 'requests' && (
        <div className="authority-panel">
          <div className="authority-panel-header">
            <div>
              <p className="section-eyebrow">FIELD DISPATCH</p>
              <h2>Incoming Evacuation Requests</h2>
              <p>Coordinate citizen groups and rescue units arriving from emergency zones.</p>
            </div>
            <button
              className="btn accent btn-sm"
              onClick={() => setShowRequestForm(!showRequestForm)}
            >
              {showRequestForm ? 'Close Form' : '+ New Request'}
            </button>
          </div>

          {showRequestForm && (
            <form
              onSubmit={handleCreateRequest}
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                padding: 20,
                borderRadius: 8,
                marginBottom: 24,
              }}
            >
              <h4 style={{ margin: '0 0 12px', fontSize: 16 }}>Record Field Evacuation Request</h4>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Rescue Unit / Group Name</label>
                  <input
                    value={newRequest.team}
                    onChange={(e) => setNewRequest({ ...newRequest, team: e.target.value })}
                    placeholder="e.g. Coastal Evac Bus #2"
                    required
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Origin / Location</label>
                  <input
                    value={newRequest.location}
                    onChange={(e) => setNewRequest({ ...newRequest, location: e.target.value })}
                    placeholder="e.g. South Pier Basin"
                    required
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Number of People</label>
                  <input
                    type="number"
                    min="1"
                    value={newRequest.people}
                    onChange={(e) => setNewRequest({ ...newRequest, people: e.target.value })}
                    required
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Priority</label>
                  <select
                    value={newRequest.priority}
                    onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value })}
                  >
                    <option value="Critical">Critical (Immediate danger)</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <button type="submit" className="btn accent btn-sm">Submit Request</button>
                <button type="button" className="btn ghost btn-sm" onClick={() => setShowRequestForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="authority-table-wrap">
            <table className="authority-simple-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Unit / Group</th>
                  <th>Location</th>
                  <th>People</th>
                  <th>Needs</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assign Shelter</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <code>{r.id}</code>
                      <span className="muted" style={{ fontSize: 11, display: 'block' }}>{r.time}</span>
                    </td>
                    <td><strong>{r.team}</strong></td>
                    <td>{r.location}</td>
                    <td><strong>{r.people}</strong></td>
                    <td><span className="muted">{r.needs}</span></td>
                    <td>
                      <span className={`status-pill ${r.priority === 'Critical' ? 'rejected' : r.priority === 'High' ? 'pending' : 'approved'}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${r.status.toLowerCase()}`}>{r.status}</span>
                    </td>
                    <td>
                      {r.status !== 'Rejected' ? (
                        <select
                          value={r.assignedShelter || ''}
                          onChange={(e) => handleAssign(r.id, e.target.value)}
                          style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line)' }}
                        >
                          <option value="">— Select Shelter —</option>
                          {shelters.map((s) => {
                            const free = s.total_capacity - s.current_occupancy;
                            return (
                              <option key={s.id} value={s.name}>
                                {s.name} ({free} free)
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {r.status === 'Pending' && (
                          <button className="btn-sm btn-success" onClick={() => handleApprove(r.id)}>
                            Approve
                          </button>
                        )}
                        {r.status !== 'Rejected' && (
                          <button className="btn-sm btn-outline" onClick={() => handleReject(r.id)}>
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: ALLOCATIONS (Redistribution History)
          ======================================================== */}
      {activeTab === 'allocations' && (
        <div className="authority-panel">
          <div className="authority-panel-header">
            <div>
              <p className="section-eyebrow">MOVEMENT AUDIT</p>
              <h2>Redistribution & Allocation Log</h2>
              <p>Historical audit trail of all evacuee redirections between regional shelters.</p>
            </div>
          </div>

          {redistributions.length === 0 ? (
            <p className="muted" style={{ padding: '32px 0', textAlign: 'center' }}>
              No evacuee redistributions have been executed yet. Proactive diversions confirmed by authorities appear here.
            </p>
          ) : (
            <div className="authority-table-wrap">
              <table className="authority-simple-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Date & Time</th>
                    <th>Source Shelter (From)</th>
                    <th>Destination Shelter (To)</th>
                    <th>Evacuees Redirected</th>
                    <th>Authorized By</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {redistributions.map((log) => (
                    <tr key={log.id}>
                      <td>#{log.id}</td>
                      <td>{new Date(log.confirmed_at).toLocaleString()}</td>
                      <td><strong>{log.from_shelter}</strong></td>
                      <td><strong style={{ color: '#1f6d4a' }}>→ {log.to_shelter}</strong></td>
                      <td><strong>{log.people_count} people</strong></td>
                      <td>
                        <span className="pill" style={{ background: '#e2e8f0', color: '#334155' }}>
                          {log.confirmed_by}
                        </span>
                      </td>
                      <td><span className="status-pill approved">Confirmed</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 5: PREDICTIONS
          ======================================================== */}
      {activeTab === 'predictions' && (
        <div className="authority-panel">
          <div className="authority-panel-header">
            <div>
              <p className="section-eyebrow">TREND PROJECTIONS</p>
              <h2>Capacity Forecasting</h2>
              <p>Predictive model calculating rate of influx and time remaining until full capacity.</p>
            </div>
          </div>

          <div className="authority-table-wrap">
            <table className="authority-simple-table">
              <thead>
                <tr>
                  <th>Shelter Name</th>
                  <th>Current Occupancy</th>
                  <th>Fill %</th>
                  <th>Influx Velocity</th>
                  <th>Hours to 100% Full</th>
                  <th>Risk Level</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {shelters.map((s) => {
                  const p = s.prediction;
                  const ratio = s.total_capacity ? s.current_occupancy / s.total_capacity : 0;
                  const risk = p?.risk_level || 'low';
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>
                          <Link to={`/shelters/${s.id}`}>{s.name}</Link>
                        </strong>
                      </td>
                      <td>{s.current_occupancy} / {s.total_capacity}</td>
                      <td><strong>{Math.round(ratio * 100)}%</strong></td>
                      <td>
                        {p?.trend_people_per_hour != null ? (
                          <strong style={{ color: p.trend_people_per_hour > 0 ? '#c9503f' : '#1f6d4a' }}>
                            {p.trend_people_per_hour > 0 ? '+' : ''}{p.trend_people_per_hour} / hour
                          </strong>
                        ) : (
                          <span className="muted">Stable</span>
                        )}
                      </td>
                      <td>
                        {p?.projected_hours_to_capacity != null ? (
                          <strong style={{ color: p.projected_hours_to_capacity <= 3 ? '#c9503f' : '#96650f' }}>
                            ~{p.projected_hours_to_capacity} hours
                          </strong>
                        ) : (
                          <span className="muted">No overload expected</span>
                        )}
                      </td>
                      <td><span className={`risk-tag ${riskClass(risk)}`}>{risk}</span></td>
                      <td>
                        {risk === 'high' ? (
                          <Link to={`/shelters/${s.id}/redistribute`}>
                            <button className="btn-sm btn-danger">Redirect Now</button>
                          </Link>
                        ) : risk === 'medium' ? (
                          <Link to={`/shelters/${s.id}/redistribute`}>
                            <button className="btn-sm btn-outline">Prepare Diversion</button>
                          </Link>
                        ) : (
                          <span className="muted" style={{ fontSize: 12 }}>Normal monitoring</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 6: ALERTS
          ======================================================== */}
      {activeTab === 'alerts' && (
        <div>
          <div className="authority-panel-header" style={{ marginBottom: 20 }}>
            <div>
              <p className="section-eyebrow">ACTIVE OVERLOAD WARNINGS</p>
              <h2>Capacity Risk Alerts</h2>
              <p>Shelters approaching critical thresholds requiring authority response.</p>
            </div>
          </div>

          {criticalShelters.length === 0 && mediumRiskShelters.length === 0 ? (
            <div className="authority-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <span style={{ fontSize: 32 }}>🟢</span>
              <h3 style={{ marginTop: 12, fontSize: 18 }}>All Shelters Operating Within Safe Limits</h3>
              <p className="muted">No active overload warnings at this time.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {criticalShelters.map((s) => {
                const ratio = s.total_capacity ? s.current_occupancy / s.total_capacity : 0;
                return (
                  <div
                    key={s.id}
                    className="authority-panel"
                    style={{ borderLeft: '4px solid #c9503f' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <span className="risk-tag risk-high" style={{ marginBottom: 8 }}>
                          CRITICAL RISK ({(ratio * 100).toFixed(0)}% FULL)
                        </span>
                        <h3 style={{ margin: '6px 0 4px', fontSize: 18 }}>{s.name}</h3>
                        <p className="muted" style={{ margin: 0 }}>
                          Current Headcount: <strong>{s.current_occupancy}</strong> / {s.total_capacity} |{' '}
                          <strong>{s.total_capacity - s.current_occupancy}</strong> spots remaining.
                          {s.prediction?.projected_hours_to_capacity != null && (
                            <span> Projected full in ~{s.prediction.projected_hours_to_capacity} hours.</span>
                          )}
                        </p>
                      </div>
                      <Link to={`/shelters/${s.id}/redistribute`}>
                        <button className="btn accent">Redistribute Evacuees</button>
                      </Link>
                    </div>
                  </div>
                );
              })}

              {mediumRiskShelters.map((s) => {
                const ratio = s.total_capacity ? s.current_occupancy / s.total_capacity : 0;
                return (
                  <div
                    key={s.id}
                    className="authority-panel"
                    style={{ borderLeft: '4px solid #d99a2b' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <span className="risk-tag risk-medium" style={{ marginBottom: 8 }}>
                          MEDIUM RISK ({(ratio * 100).toFixed(0)}% FULL)
                        </span>
                        <h3 style={{ margin: '6px 0 4px', fontSize: 18 }}>{s.name}</h3>
                        <p className="muted" style={{ margin: 0 }}>
                          Current Headcount: <strong>{s.current_occupancy}</strong> / {s.total_capacity} |{' '}
                          <strong>{s.total_capacity - s.current_occupancy}</strong> spots remaining.
                        </p>
                      </div>
                      <Link to={`/shelters/${s.id}/redistribute`}>
                        <button className="btn-sm btn-outline">Prepare Redistribution</button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
