import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';

export default function ProtectedRoute({ role }: { role?: 'admin' | 'user' }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/rooms'} replace />;
  }
  return <Outlet />;
}
