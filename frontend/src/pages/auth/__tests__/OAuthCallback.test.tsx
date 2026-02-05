/**
 * Tests for OAuthCallback component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LoginResponse } from '@/types';
import { useAuthStore } from '@/store';

import OAuthCallback from '../OAuthCallback';

// Mock auth API
const mockHandleOAuthCallback = vi.fn();
vi.mock('@/api/auth.api', () => ({
  handleOAuthCallback: (code: string) => mockHandleOAuthCallback(code),
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

const mockLoginResponse: LoginResponse = {
  token: 'mock-jwt-token',
  user: {
    id: 1,
    weworkId: 'wework-123',
    name: 'Test User',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
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
      token: null,
      isInitializing: false,
    });
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show loading state initially', () => {
    mockHandleOAuthCallback.mockReturnValue(new Promise(() => {})); // Never resolves

    renderWithRouter('?code=test-code');

    expect(screen.getByText('正在登录...')).toBeInTheDocument();
  });

  it('should call handleOAuthCallback with code from URL', async () => {
    mockHandleOAuthCallback.mockResolvedValue(mockLoginResponse);

    renderWithRouter('?code=test-auth-code');

    await waitFor(() => {
      expect(mockHandleOAuthCallback).toHaveBeenCalledWith('test-auth-code');
    });
  });

  it('should set auth and navigate on successful callback', async () => {
    mockHandleOAuthCallback.mockResolvedValue(mockLoginResponse);

    renderWithRouter('?code=test-code');

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText('登录成功')).toBeInTheDocument();
    });

    // Check auth was set
    const state = useAuthStore.getState();
    expect(state.token).toBe('mock-jwt-token');
    expect(state.user).toEqual(mockLoginResponse.user);

    // Advance timer and check navigation
    vi.advanceTimersByTime(500);
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('should show error when code is missing', () => {
    renderWithRouter('');

    // Error is rendered immediately (no async)
    expect(screen.getByText('登录失败')).toBeInTheDocument();
    expect(screen.getByText('缺少授权码，请重新登录')).toBeInTheDocument();
  });

  it('should show error on API failure', async () => {
    mockHandleOAuthCallback.mockRejectedValue(new Error('Invalid code'));

    renderWithRouter('?code=invalid-code');

    await waitFor(() => {
      expect(screen.getByText('登录失败')).toBeInTheDocument();
      expect(screen.getByText('Invalid code')).toBeInTheDocument();
    });
  });

  it('should have retry button that redirects to WeWork OAuth', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockHandleOAuthCallback.mockRejectedValue(new Error('Error'));

    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    renderWithRouter('?code=bad-code');

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
    mockHandleOAuthCallback.mockRejectedValue(new Error('Error'));

    renderWithRouter('?code=bad-code');

    await waitFor(() => {
      expect(screen.getByText('登录失败')).toBeInTheDocument();
    });

    const loginLink = screen.getByRole('link', { name: '返回登录' });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('should show generic error message when error has no message', async () => {
    mockHandleOAuthCallback.mockRejectedValue({});

    renderWithRouter('?code=bad-code');

    await waitFor(() => {
      expect(screen.getByText('登录失败，请重试')).toBeInTheDocument();
    });
  });
});
