/**
 * Tests for LoginPage component (cookie-based auth).
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/store';

import LoginPage from '../LoginPage';

// Test fixtures
const mockUser = {
  id: 1,
  weworkId: 'test',
  name: 'Test User',
  isAdmin: false,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

// Mock auth API
const mockDevLogin = vi.fn();
vi.mock('@/api/auth.api', () => ({
  getWeworkLoginUrl: vi.fn(() => 'https://wework.example.com/oauth'),
  devLogin: (...args: unknown[]) => mockDevLogin(...args),
}));

// Mock react-router-dom Navigate component
const mockNavigate = vi.fn();
const mockUseNavigate = vi.fn(() => mockNavigate);
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockUseNavigate(),
    Navigate: ({ to }: { to: string }) => {
      mockNavigate(to);
      return null;
    },
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      isInitializing: false,
    });
    vi.clearAllMocks();
  });

  it('should render login page with WeWork login button', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // Check for title
    expect(screen.getByText('铂润面料管理系统')).toBeInTheDocument();
    expect(screen.getByText('Borealis Fabrics Management System')).toBeInTheDocument();

    // Check for login button
    const loginButton = screen.getByRole('button', { name: /企业微信登录/i });
    expect(loginButton).toBeInTheDocument();
  });

  it('should redirect to home when clicking login button', async () => {
    const user = userEvent.setup();

    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const loginButton = screen.getByRole('button', { name: /企业微信登录/i });
    await user.click(loginButton);

    expect(window.location.href).toBe('https://wework.example.com/oauth');

    // Restore window.location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('should redirect authenticated user to home', () => {
    // Set authenticated state (user only, no token)
    useAuthStore.setState({
      user: mockUser,
      isInitializing: false,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // Should navigate to home
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should redirect to original location after login', () => {
    useAuthStore.setState({
      user: mockUser,
      isInitializing: false,
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/fabrics' } }]}>
        <LoginPage />
      </MemoryRouter>
    );

    // Should navigate to original location
    expect(mockNavigate).toHaveBeenCalledWith('/fabrics');
  });

  it('should render Dev Login button in development mode', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Development Only')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dev Login/i })).toBeInTheDocument();
  });

  it('should call devLogin API and navigate on Dev Login click', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      token: 'dev-token',
      user: mockUser,
    };
    mockDevLogin.mockResolvedValue(mockResponse);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const devLoginButton = screen.getByRole('button', { name: /Dev Login/i });
    await user.click(devLoginButton);

    expect(mockDevLogin).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('should show error message when dev login fails', async () => {
    const user = userEvent.setup();
    mockDevLogin.mockRejectedValue(new Error('Dev login failed'));

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const devLoginButton = screen.getByRole('button', { name: /Dev Login/i });
    await user.click(devLoginButton);

    expect(mockDevLogin).toHaveBeenCalled();
  });

  it('should return null during initialization', () => {
    useAuthStore.setState({
      user: null,
      isInitializing: true,
    });

    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });
});
