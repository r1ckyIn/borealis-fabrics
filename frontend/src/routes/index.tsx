/**
 * Application routing configuration.
 *
 * Uses React Router 7 with lazy loading for code splitting.
 * Protected routes require authentication.
 */

import type { ComponentType } from 'react';
import { Suspense, lazy } from 'react';
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useParams,
  useLocation,
} from 'react-router-dom';

import { ProtectedRoute } from './ProtectedRoute';
import { FullPageSpinner } from './FullPageSpinner';

// Lazy loaded components
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const OAuthCallback = lazy(() => import('@/pages/auth/OAuthCallback'));
const FabricListPage = lazy(() => import('@/pages/fabrics/FabricListPage'));
const FabricDetailPage = lazy(() => import('@/pages/fabrics/FabricDetailPage'));
const FabricFormPage = lazy(() => import('@/pages/fabrics/FabricFormPage'));
const ProductListPage = lazy(() => import('@/pages/products/ProductListPage'));
const ProductDetailPage = lazy(
  () => import('@/pages/products/ProductDetailPage')
);
const ProductFormPage = lazy(
  () => import('@/pages/products/ProductFormPage')
);
const SupplierListPage = lazy(() => import('@/pages/suppliers/SupplierListPage'));
const SupplierDetailPage = lazy(() => import('@/pages/suppliers/SupplierDetailPage'));
const SupplierFormPage = lazy(() => import('@/pages/suppliers/SupplierFormPage'));
const CustomerListPage = lazy(() => import('@/pages/customers/CustomerListPage'));
const CustomerDetailPage = lazy(() => import('@/pages/customers/CustomerDetailPage'));
const CustomerFormPage = lazy(() => import('@/pages/customers/CustomerFormPage'));
const QuoteListPage = lazy(() => import('@/pages/quotes/QuoteListPage'));
const QuoteDetailPage = lazy(() => import('@/pages/quotes/QuoteDetailPage'));
const QuoteFormPage = lazy(() => import('@/pages/quotes/QuoteFormPage'));
const OrderListPage = lazy(() => import('@/pages/orders/OrderListPage'));
const OrderDetailPage = lazy(() => import('@/pages/orders/OrderDetailPage'));
const OrderFormPage = lazy(() => import('@/pages/orders/OrderFormPage'));
const ImportPage = lazy(() => import('@/pages/import/ImportPage'));
const AuditLogPage = lazy(() => import('@/pages/audit/AuditLogPage'));
const AuditLogDetailPage = lazy(() => import('@/pages/audit/AuditLogDetailPage'));
const ExportPage = lazy(() => import('@/pages/export/ExportPage'));
const NotFoundPage = lazy(() => import('@/pages/errors/NotFoundPage'));

/**
 * Wrap lazy component with Suspense for code splitting.
 */
function withSuspense(Component: React.LazyExoticComponent<ComponentType>): React.ReactNode {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Component />
    </Suspense>
  );
}

/**
 * Redirect wrapper for old /fabrics/:id routes to /products/fabrics/:id.
 * Handles both detail and edit sub-routes.
 */
function FabricParamRedirect() {
  const { id } = useParams();
  const location = useLocation();
  const target = id
    ? `/products/fabrics/${id}${location.pathname.endsWith('/edit') ? '/edit' : ''}`
    : '/products/fabrics';
  return <Navigate to={target} replace />;
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
          // Root redirect to product fabrics
          {
            path: '/',
            element: <Navigate to="/products/fabrics" replace />,
          },

          // Fabric routes (under /products, more specific — listed first)
          {
            path: '/products/fabrics',
            element: withSuspense(FabricListPage),
          },
          {
            path: '/products/fabrics/new',
            element: withSuspense(FabricFormPage),
          },
          {
            path: '/products/fabrics/:id',
            element: withSuspense(FabricDetailPage),
          },
          {
            path: '/products/fabrics/:id/edit',
            element: withSuspense(FabricFormPage),
          },

          // Product routes (non-fabric categories, generic :category param)
          {
            path: '/products/:category',
            element: withSuspense(ProductListPage),
          },
          {
            path: '/products/:category/new',
            element: withSuspense(ProductFormPage),
          },
          {
            path: '/products/:category/:id',
            element: withSuspense(ProductDetailPage),
          },
          {
            path: '/products/:category/:id/edit',
            element: withSuspense(ProductFormPage),
          },

          // Fabric route redirects (backward compatibility)
          {
            path: '/fabrics',
            element: <Navigate to="/products/fabrics" replace />,
          },
          {
            path: '/fabrics/new',
            element: <Navigate to="/products/fabrics/new" replace />,
          },
          {
            path: '/fabrics/:id',
            element: <FabricParamRedirect />,
          },
          {
            path: '/fabrics/:id/edit',
            element: <FabricParamRedirect />,
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

          // Audit log routes (admin-only enforced server-side)
          {
            path: '/audit',
            element: withSuspense(AuditLogPage),
          },
          {
            path: '/audit/:id',
            element: withSuspense(AuditLogDetailPage),
          },

          // Export route
          {
            path: '/export',
            element: withSuspense(ExportPage),
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
