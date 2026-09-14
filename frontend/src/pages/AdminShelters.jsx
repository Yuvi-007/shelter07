import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import AdminHeader from '../components/admin/AdminHeader';
import {
  ShelterIcon,
  SearchIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  UserAssignIcon,
  MapPinIcon,
  FoodIcon,
  WaterIcon,
  MedicalIcon,
  AlertCircleIcon,
} from '../components/common/Icons';

const emptyForm = {
  name: '',
  latitude: '',
  longitude: '',
  total_capacity: '',
  current_occupancy: '0',
  has_food: true,
  has_water: true,
  has_medical: false,
};

function shelterPayload(form) {
  return {
    name: form.name.trim(),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    total_capacity: Number(form.total_capacity),
    current_occupancy: Number(form.current_occupancy),
    has_food: Boolean(form.has_food),
    has_water: Boolean(form.has_water),
    has_medical: Boolean(form.has_medical),
  };
}

function validate(form) {
  const value = shelterPayload(form);
  if (!value.name) return 'Shelter name is required.';
  if (!Number.isFinite(value.latitude) || value.latitude < -90 || value.latitude > 90) {
    return 'Enter a latitude between -90 and 90.';
  }
  if (!Number.isFinite(value.longitude) || value.longitude < -180 || value.longitude > 180) {
    return 'Enter a longitude between -180 and 180.';
  }
  if (!Number.isInteger(value.total_capacity) || value.total_capacity <= 0) {
    return 'Total capacity must be a positive whole number.';
  }
  if (!Number.isInteger(value.current_occupancy) || value.current_occupancy < 0) {
    return 'Occupancy must be zero or more.';
  }
  if (value.current_occupancy > value.total_capacity) {
    return 'Occupancy cannot exceed total capacity.';
  }
  return '';
}

function ShelterForm({ form, setForm, onSubmit, submitting, mode, error, onCancel }) {
  const update = (field, value) => setForm({ ...form, [field]: value });

  return (
    <form onSubmit={onSubmit} className="admin-shelter-form">
      {error && (
        <div className="admin-alert-banner is-error" role="alert" style={{ marginBottom: '14px' }}>
          <span>{error}</span>
        </div>
      )}

      <div className="admin-form-grid">
        <div className="admin-form-field form-field-full">
          <label htmlFor="form-shelter-name">Shelter Facility Name *</label>
          <input
            id="form-shelter-name"
            value={form.name}
            maxLength="150"
            placeholder="e.g. Central Community Refuge Center"
            required
            onChange={(e) => update('name', e.target.value)}
          />
        </div>

        <div className="admin-form-field">
          <label htmlFor="form-shelter-cap">Total Bed Capacity *</label>
          <input
            id="form-shelter-cap"
            type="number"
            min="1"
            step="1"
            value={form.total_capacity}
            placeholder="e.g. 250"
            required
            onChange={(e) => update('total_capacity', e.target.value)}
          />
        </div>

        <div className="admin-form-field">
          <label htmlFor="form-shelter-occ">Current Occupancy *</label>
          <input
            id="form-shelter-occ"
            type="number"
            min="0"
            step="1"
            value={form.current_occupancy}
            placeholder="0"
            required
            onChange={(e) => update('current_occupancy', e.target.value)}
          />
        </div>

        <div className="admin-form-field">
          <label htmlFor="form-shelter-lat">Latitude (-90 to 90) *</label>
          <input
            id="form-shelter-lat"
            type="number"
            min="-90"
            max="90"
            step="any"
            value={form.latitude}
            placeholder="e.g. 34.0522"
            required
            onChange={(e) => update('latitude', e.target.value)}
          />
        </div>

        <div className="admin-form-field">
          <label htmlFor="form-shelter-lng">Longitude (-180 to 180) *</label>
          <input
            id="form-shelter-lng"
            type="number"
            min="-180"
            max="180"
            step="any"
            value={form.longitude}
            placeholder="e.g. -118.2437"
            required
            onChange={(e) => update('longitude', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: '8px' }}>
          Available Facility Resources
        </label>
        <div className="resource-checkbox-grid">
          <label className={`resource-checkbox-card ${form.has_food ? 'is-checked' : ''}`}>
            <input
              type="checkbox"
              checked={form.has_food}
              onChange={(e) => update('has_food', e.target.checked)}
            />
            <FoodIcon size={16} />
            <span>Food / Rations</span>
          </label>

          <label className={`resource-checkbox-card ${form.has_water ? 'is-checked' : ''}`}>
            <input
              type="checkbox"
              checked={form.has_water}
              onChange={(e) => update('has_water', e.target.checked)}
            />
            <WaterIcon size={16} />
            <span>Potable Water</span>
          </label>

          <label className={`resource-checkbox-card ${form.has_medical ? 'is-checked' : ''}`}>
            <input
              type="checkbox"
              checked={form.has_medical}
              onChange={(e) => update('has_medical', e.target.checked)}
            />
            <MedicalIcon size={16} />
            <span>Medical Aid</span>
          </label>
        </div>
      </div>

      <div className="user-confirmation-actions">
        <button className="btn ghost" type="button" disabled={submitting} onClick={onCancel}>
          Cancel
        </button>
        <button className="btn accent" disabled={submitting}>
          {submitting
            ? `${mode === 'create' ? 'Creating' : 'Saving'} shelter...`
            : mode === 'create'
            ? 'Create Shelter'
            : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

export default function AdminShelters() {
  const { auth } = useAuth();
  const token = auth?.token;
  const [shelters, setShelters] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [shelterData, userData] = await Promise.all([
        api.getShelters(token),
        api.getUsers(token),
      ]);
      setShelters(Array.isArray(shelterData) ? shelterData : []);
      setManagers(
        (Array.isArray(userData) ? userData : []).filter(
          (u) => u.role === 'manager' && Boolean(u.is_active),
        ),
      );
    } catch {
      setError('Unable to load shelters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shelters.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        `${s.latitude}, ${s.longitude}`.includes(q) ||
        (s.manager_name && s.manager_name.toLowerCase().includes(q)),
    );
  }, [shelters, search]);

  const close = () => {
    if (!submitting) {
      setDialog(null);
      setFormError('');
    }
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormError('');
    setDialog({ type: 'create' });
  };

  const openEdit = (shelter) => {
    setForm({
      name: shelter.name,
      latitude: String(shelter.latitude),
      longitude: String(shelter.longitude),
      total_capacity: String(shelter.total_capacity),
      current_occupancy: String(shelter.current_occupancy),
      has_food: Boolean(shelter.has_food),
      has_water: Boolean(shelter.has_water),
      has_medical: Boolean(shelter.has_medical),
    });
    setFormError('');
    setDialog({ type: 'edit', shelter });
  };

  const saveShelter = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const message = validate(form);
    if (message) {
      setFormError(message);
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = shelterPayload(form);
      if (dialog.type === 'create') {
        await api.createShelter(payload, token);
        setFeedback(`Shelter "${payload.name}" created successfully.`);
      } else {
        await api.updateShelter(dialog.shelter.id, payload, token);
        setFeedback(`Shelter "${payload.name}" updated successfully.`);
      }
      setDialog(null);
      await load();
    } catch (err) {
      setFormError(err.message || `Unable to ${dialog.type === 'create' ? 'create' : 'update'} the shelter.`);
    } finally {
      setSubmitting(false);
    }
  };

  const removeShelter = async () => {
    if (submitting) return;
    setSubmitting(true);
    setFormError('');
    try {
      await api.deleteShelter(dialog.shelter.id, token);
      setFeedback('Shelter deleted successfully.');
      setDialog(null);
      await load();
    } catch (err) {
      setFormError(
        err.message ||
          'Unable to delete this shelter. Shelters with occupancy logs or active redistributions must be preserved.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const changeManager = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const raw = new FormData(e.currentTarget).get('manager_id');
    const manager_id = raw ? Number(raw) : null;
    setSubmitting(true);
    setFormError('');
    try {
      await api.assignShelterManager(dialog.shelter.id, manager_id, token);
      setFeedback(
        manager_id
          ? `Manager successfully assigned to "${dialog.shelter.name}".`
          : `Manager assignment removed from "${dialog.shelter.name}".`,
      );
      setDialog(null);
      await load();
    } catch {
      setFormError('Unable to update manager assignment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page admin-shelters-page">
      <AdminHeader
        title="Shelter Management"
        subtitle="Maintain emergency shelter facilities, live capacity meters, and facility manager assignments."
        badge={`${shelters.length} facilities`}
        actions={
          <button className="btn accent" type="button" onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <PlusIcon size={16} />
            <span>Add Shelter</span>
          </button>
        }
      />

      {feedback && (
        <div className="admin-alert-banner is-success" role="status">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {loading ? (
        <div className="admin-main-card">
          <div className="dashboard-loading-skeleton">
            <div className="skeleton-bar" style={{ height: '48px', width: '100%' }} />
            <div className="skeleton-bar" style={{ height: '260px', width: '100%' }} />
          </div>
        </div>
      ) : error ? (
        <div className="admin-main-card">
          <div className="admin-alert-banner is-error" role="alert">
            <span>{error}</span>
            <button type="button" className="btn ghost" onClick={load} style={{ padding: '4px 10px', fontSize: '12px' }}>
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-users-card">
          <div className="admin-users-toolbar">
            <div className="admin-toolbar-title">
              <h2>Registered Shelters</h2>
              <p>Showing {filtered.length} of {shelters.length} facilities</p>
            </div>

            <div className="admin-shelter-toolbar">
              <div className="search-input-wrap">
                <SearchIcon size={16} />
                <input
                  type="search"
                  placeholder="Search shelters or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="admin-empty-state">
              <div className="empty-state-icon">
                <ShelterIcon size={24} />
              </div>
              <h3>{shelters.length ? 'No matching shelters' : 'No shelters created'}</h3>
              <p>
                {shelters.length
                  ? 'No shelter matched your search query.'
                  : 'Get started by creating your first emergency shelter facility.'}
              </p>
              {shelters.length ? (
                <button type="button" className="btn ghost" onClick={() => setSearch('')}>
                  Clear Search
                </button>
              ) : (
                <button type="button" className="btn accent" onClick={openCreate}>
                  Create Shelter
                </button>
              )}
            </div>
          ) : (
            <div className="admin-users-table-wrap">
              <table className="admin-shelters-table">
                <thead>
                  <tr>
                    <th scope="col">Facility Name</th>
                    <th scope="col">Location</th>
                    <th scope="col">Occupancy & Capacity</th>
                    <th scope="col">Available</th>
                    <th scope="col">Resources</th>
                    <th scope="col">Assigned Manager</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((shelter) => {
                    const occ = shelter.current_occupancy || 0;
                    const cap = shelter.total_capacity || 1;
                    const pct = Math.min(100, Math.round((occ / cap) * 100));
                    const meterTier = pct >= 90 ? 'meter-critical' : pct >= 70 ? 'meter-warning' : 'meter-safe';

                    return (
                      <tr key={shelter.id}>
                        <td>
                          <strong>{shelter.name}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <MapPinIcon size={13} />
                            <span>{shelter.latitude?.toFixed(4)}, {shelter.longitude?.toFixed(4)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="occupancy-meter">
                            <div className="meter-top">
                              <span className="meter-ratio">{occ} / {cap}</span>
                              <span className={`meter-percent ${meterTier}`}>{pct}%</span>
                            </div>
                            <div className="meter-track">
                              <div
                                className={`meter-fill ${meterTier}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: shelter.available_capacity <= 0 ? 'var(--risk-high-fg)' : 'var(--navy)' }}>
                            {shelter.available_capacity}
                          </strong>
                        </td>
                        <td>
                          <div className="shelter-resources-cell">
                            <span className={`res-badge ${shelter.has_food ? 'is-available' : 'is-missing'}`} title="Food supply">
                              <FoodIcon size={12} /> Food
                            </span>
                            <span className={`res-badge ${shelter.has_water ? 'is-available' : 'is-missing'}`} title="Potable water">
                              <WaterIcon size={12} /> Water
                            </span>
                            <span className={`res-badge ${shelter.has_medical ? 'is-available' : 'is-missing'}`} title="Medical support">
                              <MedicalIcon size={12} /> Medical
                            </span>
                          </div>
                        </td>
                        <td>
                          {shelter.manager_name ? (
                            <span className="role-badge role-manager">
                              <UserAssignIcon size={12} />
                              <span>{shelter.manager_name}</span>
                              {!shelter.manager_is_active && (
                                <span className="muted" style={{ fontSize: '10px' }}>(inactive)</span>
                              )}
                            </span>
                          ) : (
                            <span className="muted" style={{ fontSize: '12px' }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <div className="admin-user-actions">
                            <button
                              className="btn ghost admin-user-action"
                              type="button"
                              onClick={() => openEdit(shelter)}
                              title="Edit facility parameters"
                            >
                              Edit
                            </button>
                            <button
                              className="btn ghost admin-user-action"
                              type="button"
                              onClick={() => setDialog({ type: 'manager', shelter })}
                              title="Assign or change facility manager"
                            >
                              Manager
                            </button>
                            <button
                              className="btn ghost admin-user-action admin-delete-button"
                              type="button"
                              onClick={() => setDialog({ type: 'delete', shelter })}
                              title="Delete facility"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dialog Modals */}
      {dialog && (
        <div className="user-details-backdrop" role="presentation">
          <section
            className={`user-details-dialog ${
              dialog.type === 'create' || dialog.type === 'edit'
                ? 'admin-shelter-dialog'
                : 'user-confirmation-dialog'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shelter-dialog-title"
          >
            {dialog.type === 'create' || dialog.type === 'edit' ? (
              <>
                <div className="user-details-header">
                  <h2 id="shelter-dialog-title">
                    {dialog.type === 'create' ? 'Create Shelter Facility' : 'Edit Shelter Facility'}
                  </h2>
                  <button
                    className="user-details-close"
                    type="button"
                    onClick={close}
                    disabled={submitting}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <ShelterForm
                  form={form}
                  setForm={setForm}
                  onSubmit={saveShelter}
                  submitting={submitting}
                  mode={dialog.type}
                  error={formError}
                  onCancel={close}
                />
              </>
            ) : dialog.type === 'delete' ? (
              <>
                <h2 id="shelter-dialog-title">Delete Shelter Facility?</h2>
                <p>
                  Are you sure you want to permanently delete{' '}
                  <strong>{dialog.shelter.name}</strong>?
                </p>

                <div className="danger-warning-box">
                  <AlertCircleIcon size={18} />
                  <span>
                    Shelters with historical occupancy logs or active AI redistribution records cannot be removed to preserve audit integrity.
                  </span>
                </div>

                {formError && (
                  <div className="admin-alert-banner is-error" role="alert">
                    <span>{formError}</span>
                  </div>
                )}

                <div className="user-confirmation-actions">
                  <button className="btn ghost" type="button" disabled={submitting} onClick={close}>
                    Cancel
                  </button>
                  <button
                    className="btn admin-delete-button"
                    type="button"
                    disabled={submitting}
                    onClick={removeShelter}
                  >
                    {submitting ? 'Deleting facility...' : 'Delete Shelter'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="user-details-header">
                  <h2 id="shelter-dialog-title">Assign Facility Manager</h2>
                  <button className="user-details-close" type="button" onClick={close} aria-label="Close">
                    ×
                  </button>
                </div>
                <p>
                  Select an active manager account for <strong>{dialog.shelter.name}</strong>.
                  Assigning a new manager will automatically update their dashboard assignments.
                </p>

                {formError && (
                  <div className="admin-alert-banner is-error" role="alert">
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={changeManager}>
                  <div className="admin-form-field" style={{ margin: '18px 0 20px' }}>
                    <label htmlFor="assign-manager-select">Select Active Manager</label>
                    <select
                      id="assign-manager-select"
                      name="manager_id"
                      defaultValue={dialog.shelter.manager_id || ''}
                      disabled={submitting}
                    >
                      <option value="">No manager assigned</option>
                      {managers.map((m) => (
                        <option value={m.id} key={m.id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="user-confirmation-actions">
                    <button className="btn ghost" type="button" disabled={submitting} onClick={close}>
                      Cancel
                    </button>
                    <button className="btn accent" disabled={submitting}>
                      {submitting ? 'Updating assignment...' : 'Save Assignment'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
