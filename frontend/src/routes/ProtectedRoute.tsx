/**
 * Protected route wrapper that requires authentication.
 *
 * Redirects to login page if user is not authenticated.
 * Shows loading spinner during initialization.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useIsAuthenticated, useIsInitializing } from '@/store';

import { FullPageSpinner } from './FullPageSpinner';

export function ProtectedRoute(): React.ReactNode {
  const location = useLocation();
  const isAuthenticated = useIsAuthenticated();
  const isInitializing = useIsInitializing();

  if (isInitializing) {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
