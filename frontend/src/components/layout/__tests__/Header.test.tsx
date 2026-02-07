/**
 * Tests for Header component.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/store';

import { Header } from '../Header';

// Track navigation
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test fixtures
const mockUser = {
  id: 1,
  weworkId: 'test',
  name: 'Test User',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

describe('Header', () => {
  const mockOnToggleCollapse = vi.fn();

  beforeEach(() => {
    useAuthStore.setState({
      user: mockUser,
      token: 'mock-token',
      isInitializing: false,
    });
    vi.clearAllMocks();
  });

  it('should render MenuUnfoldOutlined when collapsed', () => {
    render(
      <MemoryRouter>
        <Header collapsed={true} onToggleCollapse={mockOnToggleCollapse} />
      </MemoryRouter>
    );

    // Check aria-label for collapsed state
    const toggleButton = screen.getByRole('button', { name: '展开侧边栏' });
    expect(toggleButton).toBeInTheDocument();
  });

  it('should render MenuFoldOutlined when expanded', () => {
    render(
      <MemoryRouter>
        <Header collapsed={false} onToggleCollapse={mockOnToggleCollapse} />
      </MemoryRouter>
    );

    // Check aria-label for expanded state
    const toggleButton = screen.getByRole('button', { name: '折叠侧边栏' });
    expect(toggleButton).toBeInTheDocument();
  });

  it('should call onToggleCollapse when toggle button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Header collapsed={false} onToggleCollapse={mockOnToggleCollapse} />
      </MemoryRouter>
    );

    const toggleButton = screen.getByRole('button', { name: '折叠侧边栏' });
    await user.click(toggleButton);

    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('should call onToggleCollapse on Enter key press', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Header collapsed={false} onToggleCollapse={mockOnToggleCollapse} />
      </MemoryRouter>
    );

    const toggleButton = screen.getByRole('button', { name: '折叠侧边栏' });
    toggleButton.focus();
    await user.keyboard('{Enter}');

    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('should call onToggleCollapse on Space key press', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Header collapsed={false} onToggleCollapse={mockOnToggleCollapse} />
      </MemoryRouter>
    );

    const toggleButton = screen.getByRole('button', { name: '折叠侧边栏' });
    toggleButton.focus();
    await user.keyboard(' ');

    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('should display user name', () => {
    render(
      <MemoryRouter>
        <Header collapsed={false} onToggleCollapse={mockOnToggleCollapse} />
      </MemoryRouter>
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should display default value when user is null', () => {
    useAuthStore.setState({
      user: null,
      token: null,
      isInitializing: false,
    });

    render(
      <MemoryRouter>
        <Header collapsed={false} onToggleCollapse={mockOnToggleCollapse} />
      </MemoryRouter>
    );

    expect(screen.getByText('用户')).toBeInTheDocument();
  });

  it('should render DEV tag in development mode', () => {
    render(
      <MemoryRouter>
        <Header collapsed={false} onToggleCollapse={mockOnToggleCollapse} />
      </MemoryRouter>
    );

    expect(screen.getByText('DEV')).toBeInTheDocument();
  });

  it('should call clearAuth and navigate to /login on logout', async () => {
    const user = userEvent.setup();
    const clearAuthSpy = vi.spyOn(useAuthStore.getState(), 'clearAuth');

    render(
      <MemoryRouter>
        <Header collapsed={false} onToggleCollapse={mockOnToggleCollapse} />
      </MemoryRouter>
    );

    // Click on user menu to open dropdown
    const userMenu = screen.getByText('Test User');
    await user.click(userMenu);

    // Wait for dropdown menu to appear and click logout button
    // Ant Design Dropdown renders menu items in a portal
    const logoutButton = await screen.findByRole('menuitem', { name: /退出登录/i });
    await user.click(logoutButton);

    expect(clearAuthSpy).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
