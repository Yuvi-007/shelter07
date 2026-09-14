import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleDashboardPath, hasRoleAccess } from '../utils/rbac';

export { getRoleDashboardPath, hasRoleAccess, formatRoleName } from '../utils/rbac';

export default function ProtectedRoute({ roles, children }) {
  const { auth } = useAuth();
  const location = useLocation();

  if (!auth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !hasRoleAccess(auth.user, roles)) {
    // If the user's role is not authorized for this specific route,
    // safely redirect to their own role-specific dashboard instead of dropping to /
    const fallback = getRoleDashboardPath(auth.user);
    return <Navigate to={fallback} replace />;
  }

  return children;
}
