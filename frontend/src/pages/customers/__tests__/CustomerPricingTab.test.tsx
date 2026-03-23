/**
 * Unit tests for CustomerPricingTab sub-component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CustomerPricingTab } from '../components/CustomerPricingTab';
import type { CustomerPricing } from '@/types';
import type {
  PricingModalControl,
  DeletePricingControl,
} from '@/hooks/useCustomerDetail';

// Mock FabricSelector to avoid complex search behavior
vi.mock('@/components/business/FabricSelector', () => ({
  FabricSelector: () => <div data-testid="fabric-selector">FabricSelector</div>,
}));

const mockPricing: CustomerPricing[] = [
  {
    id: 1,
    customerId: 1,
    fabricId: 10,
    specialPrice: 28,
    fabric: {
      id: 10,
      fabricCode: 'FB-2401-0001',
      name: '高档涤纶面料',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

function createMockModal(overrides?: Partial<PricingModalControl>): PricingModalControl {
  return {
    open: false,
    editing: null,
    form: {} as PricingModalControl['form'],
    isSubmitting: false,
    onOpenCreate: vi.fn(),
    onOpenEdit: vi.fn(),
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    searchFabrics: vi.fn(),
    ...overrides,
  };
}

function createMockDeletePricing(overrides?: Partial<DeletePricingControl>): DeletePricingControl {
  return {
    open: false,
    target: null,
    isDeleting: false,
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };
}

describe('CustomerPricingTab', () => {
  const defaultProps = {
    pricing: mockPricing,
    isLoading: false,
    modal: createMockModal(),
    deletePricing: createMockDeletePricing(),
    onNavigateToFabric: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render add pricing button', () => {
    render(<CustomerPricingTab {...defaultProps} />);

    expect(screen.getByText('添加定价')).toBeInTheDocument();
  });

  it('should render pricing data in table', () => {
    render(<CustomerPricingTab {...defaultProps} />);

    expect(screen.getByText('FB-2401-0001')).toBeInTheDocument();
    expect(screen.getByText('高档涤纶面料')).toBeInTheDocument();
  });

  it('should render empty text when no pricing data', () => {
    render(
      <CustomerPricingTab
        {...defaultProps}
        pricing={[]}
      />
    );

    expect(screen.getByText('暂无特殊定价')).toBeInTheDocument();
  });

  it('should call onOpenCreate when add button clicked', async () => {
    const mockOnOpenCreate = vi.fn();
    const user = userEvent.setup();

    render(
      <CustomerPricingTab
        {...defaultProps}
        modal={createMockModal({ onOpenCreate: mockOnOpenCreate })}
      />
    );

    const addButton = screen.getByText('添加定价').closest('button');
    await user.click(addButton!);

    expect(mockOnOpenCreate).toHaveBeenCalled();
  });

  it('should call onNavigateToFabric when fabric code link clicked', async () => {
    const mockNavigate = vi.fn();
    const user = userEvent.setup();

    render(
      <CustomerPricingTab
        {...defaultProps}
        onNavigateToFabric={mockNavigate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('FB-2401-0001')).toBeInTheDocument();
    });

    const fabricLink = screen.getByText('FB-2401-0001');
    await user.click(fabricLink);

    expect(mockNavigate).toHaveBeenCalledWith(10);
  }, 15000);
});
