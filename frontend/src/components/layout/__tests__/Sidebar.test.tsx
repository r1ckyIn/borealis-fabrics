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

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all 6 menu items', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar collapsed={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('面料管理')).toBeInTheDocument();
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

  it('should highlight current route', () => {
    render(
      <MemoryRouter initialEntries={['/fabrics']}>
        <Sidebar collapsed={false} />
      </MemoryRouter>
    );

    // Find the menu item for fabrics and check it's selected
    const fabricsMenuItem = screen.getByText('面料管理').closest('li');
    expect(fabricsMenuItem).toHaveClass('ant-menu-item-selected');
  });

  it('should highlight parent route for nested paths', () => {
    render(
      <MemoryRouter initialEntries={['/fabrics/123/edit']}>
        <Sidebar collapsed={false} />
      </MemoryRouter>
    );

    // Should still highlight fabrics for nested routes
    const fabricsMenuItem = screen.getByText('面料管理').closest('li');
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
});
