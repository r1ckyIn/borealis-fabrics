/**
 * Tests for Sidebar component.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Sidebar } from '../Sidebar';

// Track navigation
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Default mock user (non-admin)
const mockUser = {
  id: 1,
  weworkId: 'test-001',
  name: 'Test User',
  isAdmin: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// Mock authStore
vi.mock('@/store/authStore', () => ({
  useUser: vi.fn(() => mockUser),
}));

// Import after mock setup to allow overriding
import { useUser } from '@/store/authStore';

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default non-admin user
    vi.mocked(useUser).mockReturnValue(mockUser);
  });

  it('should render top-level menu items and product SubMenu', () => {
    render(
      <MemoryRouter initialEntries={['/products/fabrics']}>
        <Sidebar collapsed={false} />
      </MemoryRouter>
    );

    // Product SubMenu parent
    expect(screen.getByText('产品管理')).toBeInTheDocument();
    // Product sub-items (visible when SubMenu is expanded)
    expect(screen.getByText('面料')).toBeInTheDocument();
    expect(screen.getByText('铁架')).toBeInTheDocument();
    expect(screen.getByText('电机')).toBeInTheDocument();
    expect(screen.getByText('床垫')).toBeInTheDocument();
    expect(screen.getByText('配件')).toBeInTheDocument();
    // Other top-level items
    expect(screen.getByText('供应商管理')).toBeInTheDocument();
    expect(screen.getByText('客户管理')).toBeInTheDocument();
    expect(screen.getByText('报价管理')).toBeInTheDocument();
    expect(screen.getByText('订单管理')).toBeInTheDocument();
    expect(screen.getByText('数据导入')).toBeInTheDocument();
  });

  it('should show "BF" logo when collapsed', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar collapsed={true} />
      </MemoryRouter>
    );

    expect(screen.getByText('BF')).toBeInTheDocument();
    expect(screen.queryByText('铂润面料')).not.toBeInTheDocument();
  });

  it('should show "铂润面料" logo when expanded', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar collapsed={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('铂润面料')).toBeInTheDocument();
    expect(screen.queryByText('BF')).not.toBeInTheDocument();
  });

  it('should highlight fabric sub-item when on /products/fabrics', () => {
    render(
      <MemoryRouter initialEntries={['/products/fabrics']}>
        <Sidebar collapsed={false} />
      </MemoryRouter>
    );

    // The Fabric sub-item should be selected
    const fabricsMenuItem = screen.getByText('面料').closest('li');
    expect(fabricsMenuItem).toHaveClass('ant-menu-item-selected');
  });

  it('should highlight fabric sub-item for nested fabric paths', () => {
    render(
      <MemoryRouter initialEntries={['/products/fabrics/123/edit']}>
        <Sidebar collapsed={false} />
      </MemoryRouter>
    );

    // Should still highlight Fabric sub-item for nested routes
    const fabricsMenuItem = screen.getByText('面料').closest('li');
    expect(fabricsMenuItem).toHaveClass('ant-menu-item-selected');
  });

  it('should navigate to path when menu item is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar collapsed={false} />
      </MemoryRouter>
    );

    // Click on suppliers menu item
    const suppliersMenuItem = screen.getByText('供应商管理');
    await user.click(suppliersMenuItem);

    expect(mockNavigate).toHaveBeenCalledWith('/suppliers');
  });

  it('should navigate to product sub-page when sub-item is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/products/fabrics']}>
        <Sidebar collapsed={false} />
      </MemoryRouter>
    );

    // Click on iron frames sub-item
    const ironFramesItem = screen.getByText('铁架');
    await user.click(ironFramesItem);

    expect(mockNavigate).toHaveBeenCalledWith('/products/iron-frames');
  });

  // Admin role-based visibility tests
  it('should show "审计日志" menu item for admin users', () => {
    vi.mocked(useUser).mockReturnValue({ ...mockUser, isAdmin: true });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar collapsed={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('审计日志')).toBeInTheDocument();
  });

  it('should NOT show "审计日志" menu item for non-admin users', () => {
    vi.mocked(useUser).mockReturnValue({ ...mockUser, isAdmin: false });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar collapsed={false} />
      </MemoryRouter>
    );

    expect(screen.queryByText('审计日志')).not.toBeInTheDocument();
  });

  it('should show "数据导出" menu item for all users', () => {
    vi.mocked(useUser).mockReturnValue({ ...mockUser, isAdmin: false });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar collapsed={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('数据导出')).toBeInTheDocument();
  });

  it('should show "数据导出" menu item for admin users', () => {
    vi.mocked(useUser).mockReturnValue({ ...mockUser, isAdmin: true });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar collapsed={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('数据导出')).toBeInTheDocument();
  });
});
