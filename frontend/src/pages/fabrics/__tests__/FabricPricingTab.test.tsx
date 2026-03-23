/**
 * Unit tests for FabricPricingTab sub-component.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Form } from 'antd';

import { FabricPricingTab } from '../components/FabricPricingTab';
import type { CustomerPricing, PaginatedResult } from '@/types';
import type { PricingModalControl } from '@/hooks/useFabricDetail';

// Mock CustomerSelector to avoid async search complexity
vi.mock('@/components/business/CustomerSelector', () => ({
  CustomerSelector: () => <div data-testid="customer-selector">Customer Selector</div>,
}));

const mockPricing: PaginatedResult<CustomerPricing> = {
  items: [
    {
      id: 1,
      fabricId: 1,
      customerId: 1,
      specialPrice: 28,
      customer: {
        id: 1,
        companyName: '测试客户A',
        contactName: '李四',
        phone: '13900139000',
        email: 'customer@example.com',
        creditType: 'prepay' as const,
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
};

function createMockModal(overrides: Partial<PricingModalControl> = {}): PricingModalControl {
  return {
    open: false,
    mode: 'add',
    form: {} as PricingModalControl['form'],
    onOpen: vi.fn(),
    onEdit: vi.fn(),
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
    searchCustomers: vi.fn(),
    defaultPrice: 25.5,
    ...overrides,
  };
}

// Wrapper to provide Ant Design Form context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <Form>{children}</Form>;
}

describe('FabricPricingTab', () => {
  it('should render add pricing button', () => {
    render(
      <FabricPricingTab
        pricing={undefined}
        isLoading={false}
        modal={createMockModal()}
        onDelete={vi.fn()}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('添加客户定价')).toBeInTheDocument();
  });

  it('should render pricing data in table', () => {
    render(
      <FabricPricingTab
        pricing={mockPricing}
        isLoading={false}
        modal={createMockModal()}
        onDelete={vi.fn()}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('测试客户A')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
  });

  it('should render empty table when no pricing data', () => {
    const emptyResult: PaginatedResult<CustomerPricing> = {
      items: [],
      pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
    };

    render(
      <FabricPricingTab
        pricing={emptyResult}
        isLoading={false}
        modal={createMockModal()}
        onDelete={vi.fn()}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('添加客户定价')).toBeInTheDocument();
    expect(screen.queryByText('测试客户A')).not.toBeInTheDocument();
  });

  it('should call modal.onOpen when add button clicked', async () => {
    const user = userEvent.setup();
    const mockOnOpen = vi.fn();

    render(
      <FabricPricingTab
        pricing={undefined}
        isLoading={false}
        modal={createMockModal({ onOpen: mockOnOpen })}
        onDelete={vi.fn()}
      />,
      { wrapper: TestWrapper }
    );

    const addButton = screen.getByText('添加客户定价').closest('button');
    await user.click(addButton!);

    expect(mockOnOpen).toHaveBeenCalledTimes(1);
  });
});
