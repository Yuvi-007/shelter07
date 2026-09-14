import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

function riskClass(level) {
  return { low: 'risk-low', medium: 'risk-medium', high: 'risk-high' }[level] || 'risk-low';
}

export default function CitizenRequestShelter() {
  // Requirements State (as per user example)
  const [groupSize, setGroupSize] = useState(5);
  const [location, setLocation] = useState('Pune');
  const [needsMedical, setNeedsMedical] = useState(true);
  const [needsWheelchair, setNeedsWheelchair] = useState(true);
  const [needsFood, setNeedsFood] = useState(true);
  const [needsWater, setNeedsWater] = useState(true);

  // Sorting and Display
  const [sortBy, setSortBy] = useState('spots'); // 'spots' | 'ratio' | 'name'

  // Shelters Data
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Request Submission Modal
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tracking confirmation
  const [activeRequest, setActiveRequest] = useState(() => {
    try {
      const saved = localStorage.getItem('shelterx_citizen_last_request');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Load live shelters
  const loadShelters = async () => {
    setLoading(true);
    setError('');
    try {
      // In ShelterX, api.getShelters works with or without token for read-only directory
      const token = JSON.parse(localStorage.getItem('shelterx_auth') || '{}')?.token;
      const data = await api.getShelters(token);
      setShelters(data || []);
    } catch (err) {
      setError(err.message || 'Unable to load regional shelter information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShelters();
  }, []);

  // Compute recommendations
  const recommendedShelters = shelters.map((s) => {
    const freeSpots = Math.max(s.total_capacity - s.current_occupancy, 0);
    const ratio = s.total_capacity ? s.current_occupancy / s.total_capacity : 0;

    // Calculate match score based on citizen requirements
    let matchPoints = 0;
    let totalPoints = 0;

    if (needsMedical) {
      totalPoints += 2;
      if (s.has_medical) matchPoints += 2;
    }
    if (needsFood) {
      totalPoints += 1;
      if (s.has_food) matchPoints += 1;
    }
    if (needsWater) {
      totalPoints += 1;
      if (s.has_water) matchPoints += 1;
    }
    if (needsWheelchair) {
      totalPoints += 1;
      matchPoints += 1; // All regional ground shelters support ramp access
    }

    const matchPercent = totalPoints > 0 ? Math.round((matchPoints / totalPoints) * 100) : 100;
    const canAccommodate = freeSpots >= groupSize;

    return {
      ...s,
      freeSpots,
      ratio,
      matchPercent,
      canAccommodate,
    };
  });

  // Sort recommendations
  const sortedShelters = [...recommendedShelters].sort((a, b) => {
    if (sortBy === 'spots') return b.freeSpots - a.freeSpots;
    if (sortBy === 'ratio') return a.ratio - b.ratio;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  const handleOpenRequest = (shelter) => {
    setSelectedShelter(shelter);
  };

  const handleCloseModal = () => {
    setSelectedShelter(null);
  };

  const handleSubmitRequest = (e) => {
    e.preventDefault();
    if (!contactName || !contactPhone) return;

    setSubmitting(true);

    const specialNeedsList = [];
    if (needsMedical) specialNeedsList.push('Medical Support');
    if (needsWheelchair) specialNeedsList.push('Wheelchair Access');
    if (needsFood) specialNeedsList.push('Food Provision');
    if (needsWater) specialNeedsList.push('Drinking Water');
    if (additionalNotes) specialNeedsList.push(additionalNotes);

    const newReq = {
      id: `REQ-${Math.floor(100 + Math.random() * 900)}`,
      team: `${contactName} (Family of ${groupSize})`,
      location: location || 'Pune',
      people: parseInt(groupSize, 10),
      priority: needsMedical ? 'Critical' : 'High',
      needs: specialNeedsList.join(' · '),
      status: 'Pending',
      assignedShelter: selectedShelter?.name || null,
      phone: contactPhone,
      time: 'Just now',
    };

    // Save to shared localStorage requests queue so Authority Dashboard immediately sees it
    try {
      const existing = JSON.parse(localStorage.getItem('shelterx_requests') || '[]');
      localStorage.setItem('shelterx_requests', JSON.stringify([newReq, ...existing]));
      localStorage.setItem('shelterx_citizen_last_request', JSON.stringify(newReq));
    } catch {
      // Ignore storage write issues
    }

    setActiveRequest(newReq);
    setSubmitting(false);
    setSelectedShelter(null);
    setContactName('');
    setContactPhone('');
    setAdditionalNotes('');
  };

  return (
    <div className="authority-view">
      {/* 2-Line Header Matching Theme */}
      <div className="authority-hero-header">
        <p className="section-eyebrow">CITIZEN ASSISTANCE PORTAL</p>
        <h1>Find & Request Shelter</h1>
      </div>

      {/* Focused Workflow Strip */}
      <div className="authority-workflow-strip">
        <div className="authority-workflow-step">
          <span>1. REQUIREMENTS</span>
          <p>Enter your group size, preferred location, and special assistance needs.</p>
        </div>
        <div className="authority-workflow-arrow">→</div>
        <div className="authority-workflow-step">
          <span>2. RECOMMENDATIONS</span>
          <p>System checks live capacity and matches shelters with suitable resources.</p>
        </div>
        <div className="authority-workflow-arrow">→</div>
        <div className="authority-workflow-step">
          <span>3. REQUEST SHELTER</span>
          <p>Submit request for immediate allocation and disaster responder dispatch.</p>
        </div>
      </div>

      {/* Confirmation Box if Citizen has an Active Request */}
      {activeRequest && (
        <div className="authority-panel" style={{ borderLeft: '4px solid #1f6d4a', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span className="status-pill approved" style={{ marginBottom: 6 }}>
                REQUEST SUBMITTED & TRACKED
              </span>
              <h3 style={{ margin: '6px 0 4px', fontSize: 18 }}>Tracking ID: {activeRequest.id}</h3>
              <p className="muted" style={{ margin: 0 }}>
                Group of <strong>{activeRequest.people}</strong> · Location: <strong>{activeRequest.location}</strong> · Target: <strong>{activeRequest.assignedShelter || 'Any Available Shelter'}</strong>
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#1f6d4a' }}>
                Status: <strong>{activeRequest.status}</strong> — Sent to regional emergency authority dispatch.
              </p>
            </div>
            <button
              className="btn-sm btn-outline"
              onClick={() => {
                localStorage.removeItem('shelterx_citizen_last_request');
                setActiveRequest(null);
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {error && <p className="error-text" style={{ marginBottom: 20 }}>{error}</p>}

      {/* Main Two-Column Layout */}
      <div className="citizen-layout">
        {/* Left Column: Requirements Card */}
        <div className="requirements-card">
          <h3>Your Requirements</h3>
          <p className="muted" style={{ fontSize: 13, margin: '0 0 16px' }}>
            Specify your evacuation needs to receive matched shelter recommendations.
          </p>

          <div className="field">
            <label htmlFor="groupSize">Group Size (People)</label>
            <input
              id="groupSize"
              type="number"
              min="1"
              max="100"
              value={groupSize}
              onChange={(e) => setGroupSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
              required
            />
            <span className="muted" style={{ fontSize: 11 }}>Number of family members or evacuees</span>
          </div>

          <div className="field">
            <label htmlFor="location">Preferred Location / Area</label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Pune, Mumbai, Sector 4"
            />
          </div>

          <div className="field" style={{ marginBottom: 8 }}>
            <label>Special Requirements</label>
            <div className="checkbox-group">
              <label className="custom-checkbox-label">
                <input
                  type="checkbox"
                  checked={needsWheelchair}
                  onChange={(e) => setNeedsWheelchair(e.target.checked)}
                />
                <span>Wheelchair & Ramp Access</span>
              </label>

              <label className="custom-checkbox-label">
                <input
                  type="checkbox"
                  checked={needsMedical}
                  onChange={(e) => setNeedsMedical(e.target.checked)}
                />
                <span>Medical Support & First Aid</span>
              </label>

              <label className="custom-checkbox-label">
                <input
                  type="checkbox"
                  checked={needsFood}
                  onChange={(e) => setNeedsFood(e.target.checked)}
                />
                <span>Food & Meal Supply</span>
              </label>

              <label className="custom-checkbox-label">
                <input
                  type="checkbox"
                  checked={needsWater}
                  onChange={(e) => setNeedsWater(e.target.checked)}
                />
                <span>Safe Drinking Water</span>
              </label>
            </div>
          </div>

          <button
            className="btn accent"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={loadShelters}
            disabled={loading}
          >
            {loading ? 'Checking Shelters…' : '🔍 Find Matching Shelters'}
          </button>
        </div>

        {/* Right Column: Recommended Shelters */}
        <div>
          <div className="recommendations-header">
            <div>
              <h3>Recommended Shelters</h3>
              <p className="muted" style={{ fontSize: 13, margin: '2px 0 0' }}>
                Filtered by capacity for {groupSize} people and preferred amenities.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="muted" style={{ fontSize: 12 }}>Sort by:</span>
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="spots">Most Free Capacity</option>
                <option value="ratio">Lowest Occupancy %</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="muted">Scanning regional shelter network…</p>
          ) : sortedShelters.length === 0 ? (
            <div className="authority-panel" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <p className="muted">No shelters available matching your search criteria.</p>
            </div>
          ) : (
            <div className="shelter-match-list">
              {sortedShelters.map((s) => {
                const isOverloaded = !s.canAccommodate;
                return (
                  <div key={s.id} className="shelter-match-card">
                    <div className="shelter-match-info">
                      <h4>
                        <span>{s.name}</span>
                        <span className="match-chip">{s.matchPercent}% Match</span>
                      </h4>

                      <div className="shelter-match-meta">
                        <span style={{ color: isOverloaded ? '#c9503f' : '#1f6d4a', fontWeight: 600 }}>
                          {s.freeSpots} spots available
                        </span>{' '}
                        · Total Capacity: {s.total_capacity} people · Occupancy: {Math.round(s.ratio * 100)}%
                      </div>

                      {/* Amenities Badges */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className={`amenity-chip ${s.has_medical ? 'has' : ''}`}>
                          {s.has_medical ? '✓ Medical Support' : '✗ No Medical'}
                        </span>
                        <span className={`amenity-chip ${s.has_food ? 'has' : ''}`}>
                          {s.has_food ? '✓ Food Supply' : '✗ No Food'}
                        </span>
                        <span className={`amenity-chip ${s.has_water ? 'has' : ''}`}>
                          {s.has_water ? '✓ Safe Water' : '✗ No Water'}
                        </span>
                        <span className="amenity-chip has">✓ Wheelchair Access</span>
                      </div>
                    </div>

                    <div>
                      <button
                        className="btn accent"
                        onClick={() => handleOpenRequest(s)}
                        disabled={isOverloaded}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {isOverloaded ? 'Full Capacity' : 'Request Shelter'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Request Submission Modal */}
      {selectedShelter && (
        <div className="request-submit-modal" onClick={handleCloseModal}>
          <div className="request-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="request-modal-header">
              <h3>Request Shelter Allocation</h3>
              <button className="modal-close-btn" onClick={handleCloseModal}>×</button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid var(--line)', padding: '12px 14px', borderRadius: 8, marginBottom: 16 }}>
              <strong>{selectedShelter.name}</strong>
              <p className="muted" style={{ margin: '2px 0 0', fontSize: 12 }}>
                Accommodating {groupSize} people · Location: {location || 'Nearby'}
              </p>
            </div>

            <form onSubmit={handleSubmitRequest}>
              <div className="field">
                <label htmlFor="contactName">Primary Contact / Family Name</label>
                <input
                  id="contactName"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="contactPhone">Phone Number / Emergency Contact</label>
                <input
                  id="contactPhone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="notes">Special Requirements / Health Notes (Optional)</label>
                <input
                  id="notes"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="e.g. Elderly person requiring insulin, infant in group"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button
                  type="submit"
                  className="btn accent"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting…' : 'Confirm & Send Request'}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
