/**
 * Unit tests for SoftDeleteToggle component.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SoftDeleteToggle } from '../SoftDeleteToggle';
import type { AuthUser } from '@/types';

// Mock the auth store
const mockUseUser = vi.fn<() => AuthUser | null>();
vi.mock('@/store/authStore', () => ({
  useUser: () => mockUseUser(),
}));

const adminUser: AuthUser = {
  id: 1,
  weworkId: 'admin-001',
  name: 'Admin User',
  isAdmin: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const regularUser: AuthUser = {
  id: 2,
  weworkId: 'user-001',
  name: 'Regular User',
  isAdmin: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('SoftDeleteToggle', () => {
  beforeEach(() => {
    mockUseUser.mockReset();
  });

  it('renders Switch when user.isAdmin is true', () => {
    mockUseUser.mockReturnValue(adminUser);
    render(<SoftDeleteToggle showDeleted={false} onChange={vi.fn()} />);

    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('renders nothing when user.isAdmin is false', () => {
    mockUseUser.mockReturnValue(regularUser);
    const { container } = render(
      <SoftDeleteToggle showDeleted={false} onChange={vi.fn()} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when user is null', () => {
    mockUseUser.mockReturnValue(null);
    const { container } = render(
      <SoftDeleteToggle showDeleted={false} onChange={vi.fn()} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('onChange callback fires when switch toggled', () => {
    mockUseUser.mockReturnValue(adminUser);
    const handleChange = vi.fn();
    render(<SoftDeleteToggle showDeleted={false} onChange={handleChange} />);

    fireEvent.click(screen.getByRole('switch'));

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('displays correct text based on showDeleted state', () => {
    mockUseUser.mockReturnValue(adminUser);
    const { rerender } = render(
      <SoftDeleteToggle showDeleted={false} onChange={vi.fn()} />,
    );

    // When unchecked, should show "Active only" label
    expect(screen.getByText('仅显示活跃')).toBeInTheDocument();

    // When checked, should show "Show deleted" label
    rerender(<SoftDeleteToggle showDeleted={true} onChange={vi.fn()} />);
    expect(screen.getByText('显示已删除')).toBeInTheDocument();
  });
});
