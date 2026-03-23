/**
 * Unit tests for FabricSupplierTab sub-component.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Form } from 'antd';

import { FabricSupplierTab } from '../components/FabricSupplierTab';
import type { FabricSupplier, PaginatedResult } from '@/types';
import type { SupplierModalControl } from '@/hooks/useFabricDetail';

// Mock SupplierSelector to avoid async search complexity
vi.mock('@/components/business/SupplierSelector', () => ({
  SupplierSelector: () => <div data-testid="supplier-selector">Supplier Selector</div>,
}));

const mockSuppliers: PaginatedResult<FabricSupplier> = {
  items: [
    {
      id: 1,
      fabricId: 1,
      supplierId: 1,
      purchasePrice: 20,
      minOrderQty: 100,
      leadTimeDays: 5,
      supplier: {
        id: 1,
        companyName: '测试供应商A',
        contactName: '张三',
        phone: '13800138000',
        email: 'a@example.com',
        status: 'active' as const,
        settleType: 'prepay' as const,
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

function createMockModal(overrides: Partial<SupplierModalControl> = {}): SupplierModalControl {
  return {
    open: false,
    mode: 'add',
    form: {} as SupplierModalControl['form'],
    onOpen: vi.fn(),
    onEdit: vi.fn(),
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
    searchSuppliers: vi.fn(),
    ...overrides,
  };
}

// Wrapper to provide Ant Design Form context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <Form>{children}</Form>;
}

describe('FabricSupplierTab', () => {
  it('should render add supplier button', () => {
    render(
      <FabricSupplierTab
        suppliers={undefined}
        isLoading={false}
        modal={createMockModal()}
        onRemove={vi.fn()}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('添加供应商')).toBeInTheDocument();
  });

  it('should render supplier data in table', () => {
    render(
      <FabricSupplierTab
        suppliers={mockSuppliers}
        isLoading={false}
        modal={createMockModal()}
        onRemove={vi.fn()}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('测试供应商A')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
  });

  it('should render empty table when no suppliers', () => {
    const emptyResult: PaginatedResult<FabricSupplier> = {
      items: [],
      pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
    };

    render(
      <FabricSupplierTab
        suppliers={emptyResult}
        isLoading={false}
        modal={createMockModal()}
        onRemove={vi.fn()}
      />,
      { wrapper: TestWrapper }
    );

    // Table should be present but empty
    expect(screen.getByText('添加供应商')).toBeInTheDocument();
    expect(screen.queryByText('测试供应商A')).not.toBeInTheDocument();
  });

  it('should call modal.onOpen when add button clicked', async () => {
    const user = userEvent.setup();
    const mockOnOpen = vi.fn();

    render(
      <FabricSupplierTab
        suppliers={undefined}
        isLoading={false}
        modal={createMockModal({ onOpen: mockOnOpen })}
        onRemove={vi.fn()}
      />,
      { wrapper: TestWrapper }
    );

    const addButton = screen.getByText('添加供应商').closest('button');
    await user.click(addButton!);

    expect(mockOnOpen).toHaveBeenCalledTimes(1);
  });
});
