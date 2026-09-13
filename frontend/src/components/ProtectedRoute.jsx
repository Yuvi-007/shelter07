import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles, children }) {
  const { auth } = useAuth();

  if (!auth) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(auth.user.role)) return <Navigate to="/" replace />;

  return children;
}
