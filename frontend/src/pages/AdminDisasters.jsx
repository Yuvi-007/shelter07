import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import AdminHeader from '../components/admin/AdminHeader';
import {
  DisasterIcon,
  SearchIcon,
  PlusIcon,
  MapPinIcon,
  AlertCircleIcon,
  EditIcon,
  TrashIcon,
} from '../components/common/Icons';

const blankDisaster = {
  name: '',
  disaster_type: '',
  location: '',
  description: '',
  start_date: '',
  status: 'active',
};

function validate(form) {
  if (!form.name.trim()) return 'Disaster name is required.';
  if (!form.disaster_type.trim()) return 'Disaster type is required.';
  if (!form.location.trim()) return 'Location is required.';
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(form.start_date) ||
    Number.isNaN(new Date(`${form.start_date}T00:00:00`).getTime())
  ) {
    return 'Enter a valid start date (YYYY-MM-DD).';
  }
  return '';
}

function payload(form) {
  return {
    name: form.name.trim(),
    disaster_type: form.disaster_type.trim(),
    location: form.location.trim(),
    description: form.description ? form.description.trim() : '',
    start_date: form.start_date,
    status: form.status,
  };
}

function DisasterForm({ form, setForm, error, submitting, onSubmit, onCancel, title }) {
  const update = (field, value) => setForm({ ...form, [field]: value });

  return (
    <>
      <div className="user-details-header">
        <h2 id="disaster-dialog-title">{title}</h2>
        <button
          className="user-details-close"
          type="button"
          disabled={submitting}
          onClick={onCancel}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <form onSubmit={onSubmit}>
        {error && (
          <div className="admin-alert-banner is-error" role="alert" style={{ marginBottom: '14px' }}>
            <span>{error}</span>
          </div>
        )}

        <div className="admin-form-grid">
          <div className="admin-form-field">
            <label htmlFor="form-disaster-name">Incident / Disaster Name *</label>
            <input
              id="form-disaster-name"
              required
              maxLength="150"
              placeholder="e.g. Cyclone Vayu"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </div>

          <div className="admin-form-field">
            <label htmlFor="form-disaster-type">Disaster Type *</label>
            <input
              id="form-disaster-type"
              required
              maxLength="100"
              placeholder="e.g. Flood, Hurricane, Wildfire"
              value={form.disaster_type}
              onChange={(e) => update('disaster_type', e.target.value)}
            />
          </div>

          <div className="admin-form-field">
            <label htmlFor="form-disaster-location">Affected Region / Location *</label>
            <input
              id="form-disaster-location"
              required
              maxLength="150"
              placeholder="e.g. Coastal District Zone 4"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
            />
          </div>

          <div className="admin-form-field">
            <label htmlFor="form-disaster-date">Start Date *</label>
            <input
              id="form-disaster-date"
              required
              type="date"
              value={form.start_date}
              onChange={(e) => update('start_date', e.target.value)}
            />
          </div>

          <div className="admin-form-field form-field-full">
            <label htmlFor="form-disaster-status">Emergency Operational Status</label>
            <select
              id="form-disaster-status"
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
            >
              <option value="active">Active Emergency (Ongoing)</option>
              <option value="closed">Closed / Resolved Incident</option>
            </select>
          </div>

          <div className="admin-form-field form-field-full">
            <label htmlFor="form-disaster-desc">Incident Description & Relief Notes (Optional)</label>
            <textarea
              id="form-disaster-desc"
              maxLength="5000"
              rows={3}
              placeholder="Add key incident details, affected areas, evacuation routes, or coordination notes..."
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>
        </div>

        <div className="user-confirmation-actions">
          <button type="button" className="btn ghost" disabled={submitting} onClick={onCancel}>
            Cancel
          </button>
          <button className="btn accent" disabled={submitting}>
            {submitting ? 'Saving disaster...' : 'Save Disaster'}
          </button>
        </div>
      </form>
    </>
  );
}

export default function AdminDisasters() {
  const { auth } = useAuth();
  const token = auth?.token;
  const [disasters, setDisasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'closed'
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(blankDisaster);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getDisasters(token);
      setDisasters(Array.isArray(data) ? data : []);
    } catch {
      setError('Unable to load disaster incidents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const activeCount = useMemo(
    () => disasters.filter((d) => d.status === 'active').length,
    [disasters],
  );
  const closedCount = disasters.length - activeCount;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return disasters.filter((d) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && d.status === 'active') ||
        (statusFilter === 'closed' && d.status === 'closed');
      const matchesSearch =
        !q || [d.name, d.disaster_type, d.location].some((val) => val?.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [disasters, search, statusFilter]);

  const close = () => {
    if (!submitting) {
      setDialog(null);
      setFormError('');
    }
  };

  const openCreate = () => {
    setForm(blankDisaster);
    setFormError('');
    setDialog({ type: 'create' });
  };

  const openEdit = (disaster) => {
    setForm({
      name: disaster.name,
      disaster_type: disaster.disaster_type,
      location: disaster.location,
      description: disaster.description || '',
      start_date: disaster.start_date?.slice(0, 10) || '',
      status: disaster.status,
    });
    setFormError('');
    setDialog({ type: 'edit', disaster });
  };

  const save = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const validation = validate(form);
    if (validation) {
      setFormError(validation);
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (dialog.type === 'create') {
        await api.createDisaster(payload(form), token);
        setFeedback(`Disaster incident "${form.name}" declared successfully.`);
      } else {
        await api.updateDisaster(dialog.disaster.id, payload(form), token);
        setFeedback(`Disaster incident "${form.name}" updated successfully.`);
      }
      setDialog(null);
      await load();
    } catch {
      setFormError(`Unable to ${dialog.type === 'create' ? 'create' : 'update'} the disaster incident.`);
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (disaster) => {
    if (submitting) return;
    setSubmitting(true);
    setFeedback('');
    try {
      const nextStatus = disaster.status === 'active' ? 'closed' : 'active';
      await api.updateDisasterStatus(disaster.id, nextStatus, token);
      setFeedback(
        `Disaster "${disaster.name}" marked as ${nextStatus === 'active' ? 'Active' : 'Closed'}.`,
      );
      await load();
    } catch {
      setFeedback('Unable to update the disaster incident status.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (submitting) return;
    setSubmitting(true);
    setFormError('');
    try {
      await api.deleteDisaster(dialog.disaster.id, token);
      setFeedback('Disaster incident deleted successfully.');
      setDialog(null);
      await load();
    } catch {
      setFormError('Unable to delete this disaster incident.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page admin-disasters-page">
      <AdminHeader
        title="Disaster Management"
        subtitle="Declare, monitor, and coordinate emergency events and relief mobilization zones."
        badge={`${disasters.length} incidents`}
        actions={
          <button
            className="btn accent"
            type="button"
            onClick={openCreate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <PlusIcon size={16} />
            <span>Add Disaster</span>
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
            <div className="skeleton-bar" style={{ height: '240px', width: '100%' }} />
          </div>
        </div>
      ) : error ? (
        <div className="admin-main-card">
          <div className="admin-alert-banner is-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="btn ghost"
              onClick={load}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-users-card">
          <div className="admin-users-toolbar">
            <div className="admin-toolbar-title">
              <h2>Recorded Disasters</h2>
              <p>Showing {rows.length} of {disasters.length} disaster events</p>
            </div>

            <div className="admin-disaster-toolbar">
              {/* Status Chips */}
              <div className="filter-chips-group" role="tablist" aria-label="Filter disasters by status">
                <button
                  type="button"
                  className={`filter-chip ${statusFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  All <span className="filter-chip-count">{disasters.length}</span>
                </button>
                <button
                  type="button"
                  className={`filter-chip ${statusFilter === 'active' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('active')}
                >
                  Active <span className="filter-chip-count">{activeCount}</span>
                </button>
                <button
                  type="button"
                  className={`filter-chip ${statusFilter === 'closed' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('closed')}
                >
                  Closed <span className="filter-chip-count">{closedCount}</span>
                </button>
              </div>

              {/* Search input */}
              <div className="search-input-wrap">
                <SearchIcon size={16} />
                <input
                  type="search"
                  placeholder="Search disasters or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="admin-empty-state">
              <div className="empty-state-icon">
                <DisasterIcon size={24} />
              </div>
              <h3>{disasters.length ? 'No matching disasters' : 'No disaster incidents recorded'}</h3>
              <p>
                {disasters.length
                  ? 'No disaster records match your search and filter criteria.'
                  : 'Declare an emergency incident to begin shelter mobilization.'}
              </p>
              {disasters.length ? (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                >
                  Clear Filters
                </button>
              ) : (
                <button type="button" className="btn accent" onClick={openCreate}>
                  Add Disaster Incident
                </button>
              )}
            </div>
          ) : (
            <div className="admin-users-table-wrap">
              <table className="admin-disasters-table">
                <thead>
                  <tr>
                    <th scope="col">Disaster Incident</th>
                    <th scope="col">Type</th>
                    <th scope="col">Location</th>
                    <th scope="col">Start Date</th>
                    <th scope="col">Status</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((disaster) => {
                    const isActive = disaster.status === 'active';

                    return (
                      <tr key={disaster.id}>
                        <td>
                          <strong>{disaster.name}</strong>
                          {disaster.description && (
                            <span className="muted" style={{ display: 'block', fontSize: '12px', maxWidth: '40ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {disaster.description}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="disaster-type-pill">{disaster.disaster_type}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <MapPinIcon size={13} />
                            <span>{disaster.location}</span>
                          </div>
                        </td>
                        <td>
                          {new Date(`${disaster.start_date.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td>
                          <span className={`disaster-status ${isActive ? 'disaster-status-active' : 'disaster-status-closed'}`}>
                            {isActive ? 'Active Emergency' : 'Closed'}
                          </span>
                        </td>
                        <td>
                          <div className="admin-user-actions">
                            <button
                              className="btn ghost admin-user-action"
                              disabled={submitting}
                              onClick={() => openEdit(disaster)}
                              title="Edit disaster details"
                            >
                              Edit
                            </button>
                            <button
                              className="btn ghost admin-user-action"
                              disabled={submitting}
                              onClick={() => changeStatus(disaster)}
                              title={isActive ? 'Mark incident as closed' : 'Reactivate incident'}
                            >
                              {isActive ? 'Close' : 'Reopen'}
                            </button>
                            <button
                              className="btn ghost admin-user-action admin-delete-button"
                              disabled={submitting}
                              onClick={() => setDialog({ type: 'delete', disaster })}
                              title="Delete disaster record"
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
              dialog.type === 'delete' ? 'user-confirmation-dialog' : 'admin-disaster-dialog'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="disaster-dialog-title"
          >
            {dialog.type === 'delete' ? (
              <>
                <h2 id="disaster-dialog-title">Delete Disaster Incident?</h2>
                <p>
                  Are you sure you want to permanently delete{' '}
                  <strong>{dialog.disaster.name}</strong>? This will remove the incident from the active platform list.
                </p>

                {formError && (
                  <div className="admin-alert-banner is-error" role="alert">
                    <span>{formError}</span>
                  </div>
                )}

                <div className="user-confirmation-actions">
                  <button type="button" className="btn ghost" disabled={submitting} onClick={close}>
                    Cancel
                  </button>
                  <button
                    className="btn admin-delete-button"
                    type="button"
                    disabled={submitting}
                    onClick={remove}
                  >
                    {submitting ? 'Deleting...' : 'Delete Disaster'}
                  </button>
                </div>
              </>
            ) : (
              <DisasterForm
                title={dialog.type === 'create' ? 'Declare Disaster Incident' : 'Edit Disaster Incident'}
                form={form}
                setForm={setForm}
                error={formError}
                submitting={submitting}
                onSubmit={save}
                onCancel={close}
              />
            )}
          </section>
        </div>
      )}
    </main>
  );
}
