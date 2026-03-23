/**
 * Unit tests for CustomerOrdersTab sub-component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { CustomerOrdersTab } from '../components/CustomerOrdersTab';
import type { Order, PaginatedResult } from '@/types';
import { OrderItemStatus, CustomerPayStatus } from '@/types';

const mockOrders: PaginatedResult<Order> = {
  items: [
    {
      id: 1,
      orderCode: 'ORD-2401-0001',
      customerId: 1,
      status: OrderItemStatus.PENDING,
      totalAmount: 5000,
      customerPaid: 0,
      customerPayStatus: CustomerPayStatus.UNPAID,
      createdAt: '2024-01-15T00:00:00.000Z',
      updatedAt: '2024-01-15T00:00:00.000Z',
    },
    {
      id: 2,
      orderCode: 'ORD-2401-0002',
      customerId: 1,
      status: OrderItemStatus.COMPLETED,
      totalAmount: 8000,
      customerPaid: 8000,
      customerPayStatus: CustomerPayStatus.PAID,
      createdAt: '2024-02-01T00:00:00.000Z',
      updatedAt: '2024-02-01T00:00:00.000Z',
    },
  ],
  pagination: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
};

describe('CustomerOrdersTab', () => {
  it('should render order data in table', () => {
    render(
      <CustomerOrdersTab
        orders={mockOrders}
        isLoading={false}
        onViewOrder={vi.fn()}
      />
    );

    expect(screen.getByText('ORD-2401-0001')).toBeInTheDocument();
    expect(screen.getByText('ORD-2401-0002')).toBeInTheDocument();
  });

  it('should render empty text when no orders', () => {
    render(
      <CustomerOrdersTab
        orders={undefined}
        isLoading={false}
        onViewOrder={vi.fn()}
      />
    );

    expect(screen.getByText('暂无订单记录')).toBeInTheDocument();
  });

  it('should render order status labels', () => {
    render(
      <CustomerOrdersTab
        orders={mockOrders}
        isLoading={false}
        onViewOrder={vi.fn()}
      />
    );

    expect(screen.getByText('待下单')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
  });

  it('should render payment status labels', () => {
    render(
      <CustomerOrdersTab
        orders={mockOrders}
        isLoading={false}
        onViewOrder={vi.fn()}
      />
    );

    expect(screen.getByText('未付款')).toBeInTheDocument();
    expect(screen.getByText('已付清')).toBeInTheDocument();
  });

  it('should call onViewOrder when order code link clicked', async () => {
    const mockOnViewOrder = vi.fn();
    const user = userEvent.setup();

    render(
      <CustomerOrdersTab
        orders={mockOrders}
        isLoading={false}
        onViewOrder={mockOnViewOrder}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('ORD-2401-0001')).toBeInTheDocument();
    });

    const orderLink = screen.getByText('ORD-2401-0001');
    await user.click(orderLink);

    expect(mockOnViewOrder).toHaveBeenCalledWith(1);
  }, 15000);

  it('should render table headers', () => {
    render(
      <CustomerOrdersTab
        orders={mockOrders}
        isLoading={false}
        onViewOrder={vi.fn()}
      />
    );

    expect(screen.getByText('订单编号')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.getByText('总金额')).toBeInTheDocument();
    expect(screen.getByText('付款状态')).toBeInTheDocument();
    expect(screen.getByText('创建时间')).toBeInTheDocument();
  });
});
