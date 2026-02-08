/**
 * Tests for OAuthCallback component (cookie-based auth flow).
 *
 * Backend redirects to /auth/callback?success=true after setting HttpOnly cookie.
 * Frontend calls GET /auth/me to fetch user info.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '@/types';
import { useAuthStore } from '@/store';

import OAuthCallback from '../OAuthCallback';

// Mock auth API
const mockGetCurrentUser = vi.fn();
vi.mock('@/api/auth.api', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  getWeworkLoginUrl: vi.fn(() => 'https://wework.example.com/oauth'),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUser: AuthUser = {
  id: 1,
  weworkId: 'wework-123',
  name: 'Test User',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

function renderWithRouter(searchParams: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/callback${searchParams}`]}>
      <Routes>
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('OAuthCallback', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isInitializing: false,
    });
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show loading state when success=true', () => {
    mockGetCurrentUser.mockReturnValue(new Promise(() => {})); // Never resolves

    renderWithRouter('?success=true');

    expect(screen.getByText('正在登录...')).toBeInTheDocument();
  });

  it('should call getCurrentUser on success=true', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);

    renderWithRouter('?success=true');

    await waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalled();
    });
  });

  it('should set user and navigate on successful callback', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);

    renderWithRouter('?success=true');

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText('登录成功')).toBeInTheDocument();
    });

    // Check user was set (no token)
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);

    // Advance timer and check navigation
    vi.advanceTimersByTime(500);
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('should show error when no success param', () => {
    renderWithRouter('');

    // Error is rendered immediately (no async)
    expect(screen.getByText('登录失败')).toBeInTheDocument();
    expect(screen.getByText('缺少授权信息，请重新登录')).toBeInTheDocument();
  });

  it('should show error from error param', () => {
    renderWithRouter('?error=AuthorizationFailed');

    expect(screen.getByText('登录失败')).toBeInTheDocument();
    expect(screen.getByText('AuthorizationFailed')).toBeInTheDocument();
  });

  it('should show error on API failure', async () => {
    mockGetCurrentUser.mockRejectedValue(new Error('Invalid session'));

    renderWithRouter('?success=true');

    await waitFor(() => {
      expect(screen.getByText('登录失败')).toBeInTheDocument();
      expect(screen.getByText('Invalid session')).toBeInTheDocument();
    });
  });

  it('should have retry button that redirects to WeWork OAuth', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockGetCurrentUser.mockRejectedValue(new Error('Error'));

    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    renderWithRouter('?success=true');

    await waitFor(() => {
      expect(screen.getByText('登录失败')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /重\s*试/ });
    await user.click(retryButton);

    expect(window.location.href).toBe('https://wework.example.com/oauth');

    // Restore
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('should have link to go back to login page', async () => {
    mockGetCurrentUser.mockRejectedValue(new Error('Error'));

    renderWithRouter('?success=true');

    await waitFor(() => {
      expect(screen.getByText('登录失败')).toBeInTheDocument();
    });

    const loginLink = screen.getByRole('link', { name: '返回登录' });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('should show generic error message when error has no message', async () => {
    mockGetCurrentUser.mockRejectedValue({});

    renderWithRouter('?success=true');

    await waitFor(() => {
      expect(screen.getByText('登录失败，请重试')).toBeInTheDocument();
    });
  });
});
