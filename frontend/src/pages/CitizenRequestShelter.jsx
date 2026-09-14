import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

function riskClass(level) {
  return { low: 'risk-low', medium: 'risk-medium', high: 'risk-high' }[level] || 'risk-low';
}

export default function CitizenRequestShelter() {
  // Requirements State
  const [groupSize, setGroupSize] = useState(1);
  const [location, setLocation] = useState('');
  const [needsMedical, setNeedsMedical] = useState(false);
  const [needsWheelchair, setNeedsWheelchair] = useState(false);
  const [needsFood, setNeedsFood] = useState(false);
  const [needsWater, setNeedsWater] = useState(false);

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

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!contactName || !contactPhone) return;

    setSubmitting(true);

    const specialNeedsList = [];
    if (needsMedical) specialNeedsList.push('Medical Support');
    if (needsWheelchair) specialNeedsList.push('Wheelchair Access');
    if (needsFood) specialNeedsList.push('Food Provision');
    if (needsWater) specialNeedsList.push('Drinking Water');
    if (additionalNotes) specialNeedsList.push(additionalNotes);

    try {
      const token = JSON.parse(localStorage.getItem('shelterx_auth') || '{}')?.token;
      const savedRequest = await api.createShelterRequest({
        shelter_id: selectedShelter.id,
        people_count: parseInt(groupSize, 10),
        contact_name: contactName,
        contact_phone: contactPhone,
        preferred_location: location.trim(),
        special_requirements: specialNeedsList.join(' · '),
      }, token);

    const newReq = {
      id: `REQ-${savedRequest.id}`,
      team: `${contactName} (Family of ${groupSize})`,
      location: savedRequest.preferred_location || 'Unspecified Location',
      people: savedRequest.people_count,
      priority: needsMedical ? 'Critical' : 'High',
      needs: specialNeedsList.join(' · '),
      status: savedRequest.status.charAt(0).toUpperCase() + savedRequest.status.slice(1),
      assignedShelter: savedRequest.shelter_name || selectedShelter.name,
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
    setSelectedShelter(null);
    setContactName('');
    setContactPhone('');
    setAdditionalNotes('');
    } catch (err) {
      setError(err.message || 'Unable to submit shelter request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="citizen-portal-page page">
      {/* Hero Header Matching Theme */}
      <div className="citizen-hero-header">
        <p className="section-eyebrow">CITIZEN ASSISTANCE PORTAL</p>
        <h1>Find &amp; Request Shelter</h1>
        <p className="citizen-hero-desc">
          Search live capacity across emergency shelters, match with critical facilities, and submit instant family evacuation requests.
        </p>
      </div>

      {/* Focused Workflow Strip */}
      <div className="citizen-workflow-strip">
        <div className="citizen-workflow-step">
          <span className="step-tag">1. REQUIREMENTS</span>
          <h4>Specify Family Needs</h4>
          <p>Enter your group size, preferred area, and special accessibility requirements.</p>
        </div>
        <div className="citizen-workflow-arrow" aria-hidden="true">&rarr;</div>
        <div className="citizen-workflow-step">
          <span className="step-tag">2. RECOMMENDATIONS</span>
          <h4>Live Capacity Matching</h4>
          <p>System matches live open beds with required medical and nutritional supplies.</p>
        </div>
        <div className="citizen-workflow-arrow" aria-hidden="true">&rarr;</div>
        <div className="citizen-workflow-step">
          <span className="step-tag">3. REQUEST SHELTER</span>
          <h4>Instant Allocation</h4>
          <p>Submit request for priority allocation and emergency responder verification.</p>
        </div>
      </div>

      {/* Confirmation Box if Citizen has an Active Request */}
      {activeRequest && (
        <div className="citizen-active-request-card">
          <div className="active-req-header">
            <div>
              <span className="status-pill approved">
                REQUEST SUBMITTED &amp; TRACKED
              </span>
              <h3>Tracking ID: {activeRequest.id}</h3>
              <p className="muted">
                Group of <strong>{activeRequest.people}</strong> &middot; Location: <strong>{activeRequest.location}</strong> &middot; Target: <strong>{activeRequest.assignedShelter || 'Any Available Shelter'}</strong>
              </p>
              <p className="active-req-status">
                Status: <strong>{activeRequest.status}</strong> &mdash; Sent to regional emergency authority dispatch.
              </p>
            </div>
            <button
              className="btn-sm btn-outline"
              type="button"
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
          <div className="requirements-card-header">
            <h3>Your Requirements</h3>
            <p className="muted">
              Specify your evacuation needs to receive matched shelter recommendations.
            </p>
          </div>

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
            <span className="field-hint">Number of family members or evacuees</span>
          </div>

          <div className="field">
            <label htmlFor="location">Preferred Location / Area</label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Downtown, Sector 4, North District"
            />
          </div>

          <div className="field" style={{ marginBottom: 12 }}>
            <label>Special Requirements</label>
            <div className="checkbox-group">
              <label className="custom-checkbox-label">
                <input
                  type="checkbox"
                  checked={needsWheelchair}
                  onChange={(e) => setNeedsWheelchair(e.target.checked)}
                />
                <span>Wheelchair &amp; Ramp Access</span>
              </label>

              <label className="custom-checkbox-label">
                <input
                  type="checkbox"
                  checked={needsMedical}
                  onChange={(e) => setNeedsMedical(e.target.checked)}
                />
                <span>Medical Support &amp; First Aid</span>
              </label>

              <label className="custom-checkbox-label">
                <input
                  type="checkbox"
                  checked={needsFood}
                  onChange={(e) => setNeedsFood(e.target.checked)}
                />
                <span>Food &amp; Meal Supply</span>
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
            className="btn accent search-shelters-btn"
            type="button"
            onClick={loadShelters}
            disabled={loading}
          >
            {loading ? 'Checking Shelters...' : 'Search Matching Shelters'}
          </button>
        </div>

        {/* Right Column: Recommended Shelters */}
        <div className="recommendations-column">
          <div className="recommendations-header">
            <div>
              <h3>Recommended Shelters</h3>
              <p className="muted">
                Filtered by capacity for {groupSize} people and preferred amenities.
              </p>
            </div>

            <div className="sort-wrapper">
              <span className="muted">Sort by:</span>
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
            <div className="citizen-loading-card">
              <div className="spinner"></div>
              <p className="muted">Scanning regional shelter network...</p>
            </div>
          ) : sortedShelters.length === 0 ? (
            <div className="citizen-empty-card">
              <p className="muted">No shelters available matching your search criteria.</p>
              <button className="btn ghost" type="button" onClick={loadShelters} style={{ marginTop: 12 }}>
                Reload Shelters
              </button>
            </div>
          ) : (
            <div className="shelter-match-list">
              {sortedShelters.map((s) => {
                const isOverloaded = !s.canAccommodate;
                const percentFull = Math.min(Math.round(s.ratio * 100), 100);
                return (
                  <div key={s.id} className="shelter-match-card">
                    <div className="shelter-match-info">
                      <div className="match-title-row">
                        <h4>{s.name}</h4>
                        <span className="match-chip">{s.matchPercent}% Match</span>
                        <span className={`risk-tag ${riskClass(s.prediction?.risk_level || 'low')}`}>
                          {s.prediction?.risk_level || 'Normal'}
                        </span>
                      </div>

                      <div className="shelter-capacity-row">
                        <span className={`capacity-spots ${isOverloaded ? 'is-full' : 'is-available'}`}>
                          {s.freeSpots} spots available
                        </span>
                        <span className="capacity-meta">
                          &middot; Capacity: {s.current_occupancy} / {s.total_capacity} people &middot; {percentFull}% Full
                        </span>
                      </div>

                      {/* Mini Capacity Bar */}
                      <div className="citizen-mini-bar">
                        <div
                          className="citizen-mini-bar-fill"
                          style={{
                            width: `${percentFull}%`,
                            background: percentFull >= 85 ? '#c9503f' : percentFull >= 60 ? '#d99a2b' : '#3f9c6d',
                          }}
                        />
                      </div>

                      {/* Amenities Badges */}
                      <div className="amenities-row">
                        <span className={`amenity-chip ${s.has_medical ? 'has' : ''}`}>
                          {s.has_medical ? '✓ Medical Support' : '✕ No Medical'}
                        </span>
                        <span className={`amenity-chip ${s.has_food ? 'has' : ''}`}>
                          {s.has_food ? '✓ Food Supply' : '✕ No Food'}
                        </span>
                        <span className={`amenity-chip ${s.has_water ? 'has' : ''}`}>
                          {s.has_water ? '✓ Safe Water' : '✕ No Water'}
                        </span>
                        <span className="amenity-chip has">✓ Wheelchair Access</span>
                      </div>
                    </div>

                    <div className="shelter-match-action">
                      <button
                        className={`btn ${isOverloaded ? 'ghost' : 'accent'}`}
                        type="button"
                        onClick={() => handleOpenRequest(s)}
                        disabled={isOverloaded}
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
              <button className="modal-close-btn" type="button" onClick={handleCloseModal} aria-label="Close modal">&times;</button>
            </div>

            <div className="modal-shelter-summary">
              <strong>{selectedShelter.name}</strong>
              <p className="muted">
                Accommodating {groupSize} people &middot; Location: {location || 'Nearby'}
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

              <div className="modal-actions-row">
                <button
                  type="submit"
                  className="btn accent"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Confirm & Send Request'}
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
