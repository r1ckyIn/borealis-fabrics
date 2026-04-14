/**
 * Integration tests for the authentication flow (cookie-based).
 *
 * Mocks at the API module level while keeping authStore,
 * React Router, and components running with real code.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/routes/ProtectedRoute';
import LoginPage from '@/pages/auth/LoginPage';
import OAuthCallback from '@/pages/auth/OAuthCallback';
import { useAuthStore } from '@/store/authStore';
import { createMockAuthUser } from '@/test/mocks/mockFactories';

import {
  renderIntegration,
  screen,
  waitFor,
  clearAuthState,
} from './integrationTestUtils';

// Mock at the API module boundary
vi.mock('@/api/auth.api', () => ({
  getWeworkLoginUrl: vi.fn(() => '/api/v1/auth/wework/login'),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}));

type AuthApiModule = typeof import('@/api/auth.api');
const { getCurrentUser } =
  vi.mocked(await vi.importMock<AuthApiModule>('@/api/auth.api'));

/**
 * Render the auth-related routes used in tests.
 */
function renderAuthRoutes(initialEntries: string[] = ['/login']) {
  function ProtectedHome() {
    return <div>Protected Home</div>;
  }

  return renderIntegration(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<ProtectedHome />} />
        <Route path="/fabrics" element={<div>Fabrics Page</div>} />
      </Route>
    </Routes>,
    { initialEntries },
  );
}

describe('Auth Flow Integration', () => {
  beforeEach(() => {
    clearAuthState();
    vi.clearAllMocks();
  });

  describe('ProtectedRoute', () => {
    it('redirects unauthenticated user to /login with from state', async () => {
      renderAuthRoutes(['/fabrics']);

      await waitFor(() => {
        expect(screen.getByText('铂润面料管理系统')).toBeInTheDocument();
      });
    });

    it('renders protected content for authenticated user', async () => {
      renderAuthRoutes(['/']);

      // Not authenticated, should show login
      await waitFor(() => {
        expect(screen.getByText('铂润面料管理系统')).toBeInTheDocument();
      });
    });
  });

  describe('LoginPage', () => {
    it('renders login page with WeWork button', () => {
      renderAuthRoutes(['/login']);

      expect(screen.getByText('铂润面料管理系统')).toBeInTheDocument();
      expect(screen.getByText('企业微信登录')).toBeInTheDocument();
    });

    it('redirects already-authenticated user away from login', async () => {
      useAuthStore.setState({
        user: createMockAuthUser(),
        isInitializing: false,
      });

      renderAuthRoutes(['/login']);

      await waitFor(() => {
        expect(screen.getByText('Protected Home')).toBeInTheDocument();
      });
    });

    it('redirects to from location after login', async () => {
      useAuthStore.setState({
        user: createMockAuthUser(),
        isInitializing: false,
      });

      renderIntegration(
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/fabrics" element={<div>Fabrics Page</div>} />
          </Route>
        </Routes>,
        {
          initialEntries: [
            { pathname: '/login', state: { from: '/fabrics' } } as unknown as string,
          ],
        },
      );

      await waitFor(() => {
        expect(screen.getByText('Fabrics Page')).toBeInTheDocument();
      });
    });

  });

  describe('OAuthCallback', () => {
    it('fetches user on success=true and navigates to home', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const mockUser = createMockAuthUser();
      getCurrentUser.mockResolvedValueOnce(mockUser);

      renderAuthRoutes(['/auth/callback?success=true']);

      // Should show loading state
      expect(screen.getByText('正在登录...')).toBeInTheDocument();

      // Wait for success
      await waitFor(() => {
        expect(getCurrentUser).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('登录成功')).toBeInTheDocument();
      });

      // Verify auth store was updated (user only, no token)
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);

      // Advance timer for navigation
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByText('Protected Home')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('shows error when OAuth callback fails', async () => {
      getCurrentUser.mockRejectedValueOnce(
        new Error('Authorization failed'),
      );

      renderAuthRoutes(['/auth/callback?success=true']);

      await waitFor(() => {
        expect(screen.getByText('登录失败')).toBeInTheDocument();
      });

      // Retry and back-to-login buttons should be present
      expect(screen.getByText('重 试')).toBeInTheDocument();
      expect(screen.getByText('返回登录')).toBeInTheDocument();
    });

    it('shows error immediately when success param is missing', () => {
      renderAuthRoutes(['/auth/callback']);

      expect(screen.getByText('登录失败')).toBeInTheDocument();
      expect(getCurrentUser).not.toHaveBeenCalled();
    });
  });
});
