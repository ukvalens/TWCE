import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// perm = { module, action } — if provided, user must have that permission
const ProtectedRoute = ({ children, roles, perm }) => {
  const { user, loading, can } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user)   return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role_id)) return <Navigate to="/dashboard" replace />;
  if (perm && !can(perm.module, perm.action || 'view')) return <Navigate to="/dashboard" replace />;
  return children;
};

export default ProtectedRoute;
