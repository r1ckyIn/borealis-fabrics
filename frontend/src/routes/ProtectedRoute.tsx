/**
 * Protected route wrapper that requires authentication.
 *
 * Redirects to login page if user is not authenticated.
 * Shows loading spinner during initialization.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spin } from 'antd';

import { useIsAuthenticated, useIsInitializing } from '@/store';

export function ProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = useIsAuthenticated();
  const isInitializing = useIsInitializing();

  // Show loading spinner during authentication initialization
  if (isInitializing) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Render child routes
  return <Outlet />;
}
