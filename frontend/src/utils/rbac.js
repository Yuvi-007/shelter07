/**
 * Role-Based Access Control (RBAC) definitions and helpers for ShelterX.
 *
 * Roles:
 * - 'admin': System Administrator (full access to all management modules)
 * - 'authority': Disaster Authority (access to Authority Command Center & Redistribution)
 * - 'manager': Shelter Facility Manager (access to assigned shelter occupancy operations)
 * - 'user': Citizen / Public User (access to Citizen Shelter Request portal)
 */

export function getRoleDashboardPath(user) {
  if (!user) return '/login';
  const role = user.role;
  const email = (user.email || '').toLowerCase();

  if (role === 'admin') return '/admin';
  if (role === 'manager') return '/manager';
  if (role === 'authority' || email.startsWith('authority@')) return '/authority';
  return '/user';
}

export function hasRoleAccess(user, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (!user) return false;

  const role = user.role;
  const email = (user.email || '').toLowerCase();
  const isAuthority = role === 'authority' || email.startsWith('authority@');

  // System Administrator has superuser access to all admin and management views
  if (role === 'admin') return true;

  // Direct role match
  if (allowedRoles.includes(role)) return true;

  // Authority alias check
  if (isAuthority && allowedRoles.includes('authority')) return true;

  return false;
}

export function formatRoleName(user) {
  if (!user) return '';
  const role = user.role;
  const email = (user.email || '').toLowerCase();

  if (role === 'authority' || email.startsWith('authority@')) return 'Authority';
  if (role === 'admin') return 'Admin';
  if (role === 'manager') return 'Manager';
  return 'Citizen';
}
