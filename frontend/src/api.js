const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  getMe: (token) => request('/auth/me', { token }),

  getShelters: (token) => request('/shelters', { token }),
  getShelter: (id, token) => request(`/shelters/${id}`, { token }),
  createShelter: (payload, token) => request('/shelters', { method: 'POST', body: payload, token }),
  updateShelter: (id, payload, token) => request(`/shelters/${id}`, { method: 'PUT', body: payload, token }),
  deleteShelter: (id, token) => request(`/shelters/${id}`, { method: 'DELETE', token }),

  updateOccupancy: (id, occupancy_count, token) =>
    request(`/shelters/${id}/occupancy`, { method: 'POST', body: { occupancy_count }, token }),
  getOccupancyLogs: (id, token) => request(`/shelters/${id}/logs`, { token }),

  predict: (id, token) => request(`/shelters/${id}/predict`, { token }),
  redistribute: (id, token) => request(`/shelters/${id}/redistribute`, { token }),
  confirmRedistribution: (payload, token) =>
    request('/redistribute/confirm', { method: 'POST', body: payload, token }),
  getRedistributionLog: (token) => request('/redistribute/log', { token }),

  getUsers: (token) => request('/users', { token }),
  assignShelter: (userId, shelter_id, token) =>
    request(`/users/${userId}/assign-shelter`, { method: 'PUT', body: { shelter_id }, token }),
};
