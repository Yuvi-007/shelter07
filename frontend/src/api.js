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
  health: () => request('/health'),

  getShelters: (token) => request('/shelters', { token }),
  getShelter: (id, token) => request(`/shelters/${id}`, { token }),
  createShelter: (payload, token) => request('/shelters', { method: 'POST', body: payload, token }),
  updateShelter: (id, payload, token) => request(`/shelters/${id}`, { method: 'PUT', body: payload, token }),
  deleteShelter: (id, token) => request(`/shelters/${id}`, { method: 'DELETE', token }),
  assignShelterManager: (id, manager_id, token) =>
    request(`/shelters/${id}/manager`, { method: 'PATCH', body: { manager_id }, token }),
  claimShelter: (id, token) => request(`/shelters/${id}/claim`, { method: 'POST', token }),

  getDisasters: (token) => request('/disasters', { token }),
  getDisaster: (id, token) => request(`/disasters/${id}`, { token }),
  createDisaster: (payload, token) => request('/disasters', { method: 'POST', body: payload, token }),
  updateDisaster: (id, payload, token) => request(`/disasters/${id}`, { method: 'PATCH', body: payload, token }),
  updateDisasterStatus: (id, status, token) =>
    request(`/disasters/${id}/status`, { method: 'PATCH', body: { status }, token }),
  deleteDisaster: (id, token) => request(`/disasters/${id}`, { method: 'DELETE', token }),

  updateOccupancy: (id, occupancy_count, token) =>
    request(`/shelters/${id}/occupancy`, { method: 'POST', body: { occupancy_count }, token }),
  getOccupancyLogs: (id, token) => request(`/shelters/${id}/logs`, { token }),

  predict: (id, token) => request(`/shelters/${id}/predict`, { token }),
  redistribute: (id, token) => request(`/shelters/${id}/redistribute`, { token }),
  confirmRedistribution: (payload, token) =>
    request('/redistribute/confirm', { method: 'POST', body: payload, token }),
  getRedistributionLog: (token) => request('/redistribute/log', { token }),

  getUsers: (token) => request('/users', { token }),
  createRoleRequest: (requested_role, token) =>
    request('/role-requests', { method: 'POST', body: { requested_role }, token }),
  getMyRoleRequests: (token) => request('/role-requests/my', { token }),
  getRoleRequests: ({ status, requested_role } = {}, token) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (requested_role) params.set('requested_role', requested_role);
    const query = params.toString();
    return request(`/role-requests${query ? `?${query}` : ''}`, { token });
  },
  approveRoleRequest: (requestId, token) => request(`/role-requests/${requestId}/approve`, { method: 'PATCH', token }),
  rejectRoleRequest: (requestId, token) => request(`/role-requests/${requestId}/reject`, { method: 'PATCH', token }),
  updateUserStatus: (userId, is_active, token) =>
    request(`/users/${userId}/status`, { method: 'PATCH', body: { is_active }, token }),
  deleteUser: (userId, token) => request(`/users/${userId}`, { method: 'DELETE', token }),
  assignShelter: (userId, shelter_id, token) =>
    request(`/users/${userId}/assign-shelter`, { method: 'PUT', body: { shelter_id }, token }),
};
