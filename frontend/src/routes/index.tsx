/**
 * Application routing configuration.
 *
 * Uses React Router 7 with lazy loading for code splitting.
 * Protected routes require authentication.
 */

import { Suspense, lazy } from 'react';
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';
import { Spin } from 'antd';

import { ProtectedRoute } from './ProtectedRoute';

// Lazy load layout
const MainLayout = lazy(() => import('./layouts/MainLayout'));

// Lazy load auth pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const OAuthCallback = lazy(() => import('@/pages/auth/OAuthCallback'));

// Lazy load fabric pages
const FabricListPage = lazy(() => import('@/pages/fabrics/FabricListPage'));
const FabricDetailPage = lazy(() => import('@/pages/fabrics/FabricDetailPage'));
const FabricFormPage = lazy(() => import('@/pages/fabrics/FabricFormPage'));

// Lazy load supplier pages
const SupplierListPage = lazy(
  () => import('@/pages/suppliers/SupplierListPage')
);
const SupplierDetailPage = lazy(
  () => import('@/pages/suppliers/SupplierDetailPage')
);
const SupplierFormPage = lazy(
  () => import('@/pages/suppliers/SupplierFormPage')
);

// Lazy load customer pages
const CustomerListPage = lazy(
  () => import('@/pages/customers/CustomerListPage')
);
const CustomerDetailPage = lazy(
  () => import('@/pages/customers/CustomerDetailPage')
);
const CustomerFormPage = lazy(
  () => import('@/pages/customers/CustomerFormPage')
);

// Lazy load quote pages
const QuoteListPage = lazy(() => import('@/pages/quotes/QuoteListPage'));
const QuoteDetailPage = lazy(() => import('@/pages/quotes/QuoteDetailPage'));
const QuoteFormPage = lazy(() => import('@/pages/quotes/QuoteFormPage'));

// Lazy load order pages
const OrderListPage = lazy(() => import('@/pages/orders/OrderListPage'));
const OrderDetailPage = lazy(() => import('@/pages/orders/OrderDetailPage'));
const OrderFormPage = lazy(() => import('@/pages/orders/OrderFormPage'));

// Lazy load import page
const ImportPage = lazy(() => import('@/pages/import/ImportPage'));

// Lazy load error pages
const NotFoundPage = lazy(() => import('@/pages/errors/NotFoundPage'));

/**
 * Loading fallback component for lazy loaded routes.
 */
function PageLoading() {
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

/**
 * Wrap lazy component with Suspense.
 */
function withSuspense(Component: React.LazyExoticComponent<() => JSX.Element>) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Component />
    </Suspense>
  );
}

/**
 * Application router configuration.
 */
const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: withSuspense(LoginPage),
  },
  {
    path: '/auth/callback',
    element: withSuspense(OAuthCallback),
  },

  // Protected routes with MainLayout
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: withSuspense(MainLayout),
        children: [
          // Root redirect to fabrics
          {
            path: '/',
            element: <Navigate to="/fabrics" replace />,
          },

          // Fabric routes
          {
            path: '/fabrics',
            element: withSuspense(FabricListPage),
          },
          {
            path: '/fabrics/new',
            element: withSuspense(FabricFormPage),
          },
          {
            path: '/fabrics/:id',
            element: withSuspense(FabricDetailPage),
          },
          {
            path: '/fabrics/:id/edit',
            element: withSuspense(FabricFormPage),
          },

          // Supplier routes
          {
            path: '/suppliers',
            element: withSuspense(SupplierListPage),
          },
          {
            path: '/suppliers/new',
            element: withSuspense(SupplierFormPage),
          },
          {
            path: '/suppliers/:id',
            element: withSuspense(SupplierDetailPage),
          },
          {
            path: '/suppliers/:id/edit',
            element: withSuspense(SupplierFormPage),
          },

          // Customer routes
          {
            path: '/customers',
            element: withSuspense(CustomerListPage),
          },
          {
            path: '/customers/new',
            element: withSuspense(CustomerFormPage),
          },
          {
            path: '/customers/:id',
            element: withSuspense(CustomerDetailPage),
          },
          {
            path: '/customers/:id/edit',
            element: withSuspense(CustomerFormPage),
          },

          // Quote routes
          {
            path: '/quotes',
            element: withSuspense(QuoteListPage),
          },
          {
            path: '/quotes/new',
            element: withSuspense(QuoteFormPage),
          },
          {
            path: '/quotes/:id',
            element: withSuspense(QuoteDetailPage),
          },
          {
            path: '/quotes/:id/edit',
            element: withSuspense(QuoteFormPage),
          },

          // Order routes
          {
            path: '/orders',
            element: withSuspense(OrderListPage),
          },
          {
            path: '/orders/new',
            element: withSuspense(OrderFormPage),
          },
          {
            path: '/orders/:id',
            element: withSuspense(OrderDetailPage),
          },
          {
            path: '/orders/:id/edit',
            element: withSuspense(OrderFormPage),
          },

          // Import route
          {
            path: '/import',
            element: withSuspense(ImportPage),
          },
        ],
      },
    ],
  },

  // 404 catch-all route
  {
    path: '*',
    element: withSuspense(NotFoundPage),
  },
]);

/**
 * Application router provider component.
 */
export function AppRouter() {
  return <RouterProvider router={router} />;
}

// Re-export ProtectedRoute for external use if needed
export { ProtectedRoute } from './ProtectedRoute';
