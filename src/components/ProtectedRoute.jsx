import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * Wraps routes that require authentication: redirects to login if the visitor has no session, and
 * to their own landing page if they have one but the wrong role for this route.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-paper">
        <div className="text-center">
          <span className="mx-auto block size-9 animate-spin rounded-full border-[3px] border-line border-t-primary" />
          <p className="mt-3 text-[12.5px] text-ink-3">Loading…</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect if the authenticated user's role isn't allowed for this route
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={role === 'CLIENT' ? '/shop' : '/'} replace />;
  }

  // Render children if authenticated
  return children;
};

export default ProtectedRoute;
