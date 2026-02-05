/**
 * Tests for ProtectedRoute component.
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/store';

import { ProtectedRoute } from '../ProtectedRoute';

// Track navigation
const mockNavigate = vi.fn();
let capturedState: unknown = null;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, state }: { to: string; state?: unknown }) => {
      mockNavigate(to);
      capturedState = state;
      return null;
    },
  };
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      isInitializing: false,
    });
    vi.clearAllMocks();
    capturedState = null;
  });

  it('should show FullPageSpinner while initializing', () => {
    useAuthStore.setState({
      user: null,
      token: null,
      isInitializing: true,
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Should show loading spinner (check for Ant Design Spin component)
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
    // Should not show protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should redirect to /login when not authenticated', () => {
    useAuthStore.setState({
      user: null,
      token: null,
      isInitializing: false,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Should navigate to login
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    // Should not show protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should pass original path in redirect state', () => {
    useAuthStore.setState({
      user: null,
      token: null,
      isInitializing: false,
    });

    render(
      <MemoryRouter initialEntries={['/fabrics/123']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/fabrics/:id" element={<div>Fabric Detail</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Should navigate to login with from state
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(capturedState).toEqual({ from: '/fabrics/123' });
  });

  it('should render children (Outlet) when authenticated', () => {
    useAuthStore.setState({
      user: {
        id: 1,
        weworkId: 'test',
        name: 'Test User',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
      token: 'valid-token',
      isInitializing: false,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Should show protected content
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    // Should not redirect
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
