/**
 * Unit tests for OrderDetailPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import OrderDetailPage from '../OrderDetailPage';
import type { Order } from '@/types';
import { OrderItemStatus, CustomerPayStatus } from '@/types';

// Mock hooks
const mockUseOrder = vi.fn();
const mockUseOrderItems = vi.fn();
const mockUseOrderTimeline = vi.fn();
const mockUseSupplierPayments = vi.fn();
const mockUseDeleteOrder = vi.fn();

vi.mock('@/hooks/queries/useOrders', () => ({
  useOrder: (...args: unknown[]) => mockUseOrder(...args),
  useOrderItems: (...args: unknown[]) => mockUseOrderItems(...args),
  useOrderTimeline: (...args: unknown[]) => mockUseOrderTimeline(...args),
  useSupplierPayments: (...args: unknown[]) => mockUseSupplierPayments(...args),
  useDeleteOrder: () => mockUseDeleteOrder(),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock sub-components to avoid deep rendering
vi.mock('../components/OrderInfoSection', () => ({
  OrderInfoSection: () => <div data-testid="order-info-section">Order Info</div>,
}));
vi.mock('../components/OrderItemsSection', () => ({
  OrderItemsSection: () => <div data-testid="order-items-section">Order Items</div>,
}));
vi.mock('../components/OrderPaymentSection', () => ({
  CustomerPaymentTab: () => <div data-testid="customer-payment-tab">Customer Payment</div>,
  SupplierPaymentsTab: () => <div data-testid="supplier-payments-tab">Supplier Payments</div>,
}));
vi.mock('../components/OrderLogisticsSection', () => ({
  OrderLogisticsSection: () => <div data-testid="order-logistics-section">Logistics</div>,
}));

// Mock order data
const mockOrder: Order = {
  id: 1,
  orderCode: 'ORD-2601-0001',
  customerId: 1,
  customer: { id: 1, companyName: '客户A公司' } as Order['customer'],
  status: OrderItemStatus.ORDERED,
  totalAmount: 12500.00,
  customerPayStatus: CustomerPayStatus.PARTIAL,
  customerPaid: 5000,
  isActive: true,
  createdAt: '2026-01-15T00:00:00.000Z',
  updatedAt: '2026-01-15T00:00:00.000Z',
} as Order;

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/orders/1']}>
        <Routes>
          <Route path="/orders/:id" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseOrder.mockReturnValue({
      data: mockOrder,
      isLoading: false,
      error: null,
    });

    mockUseOrderItems.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseOrderTimeline.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseSupplierPayments.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseDeleteOrder.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
  });

  describe('Rendering', () => {
    it('should render order code as page title', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getAllByText('ORD-2601-0001').length).toBeGreaterThan(0);
      }, { timeout: 10000 });
    }, 15000);

    it('should render order info sub-section', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('order-info-section')).toBeInTheDocument();
      });
    });

    it('should render order items tab', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('order-items-section')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show spinner when loading', async () => {
      mockUseOrder.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderWithProviders();

      await waitFor(() => {
        expect(document.querySelector('.ant-spin')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error result when fetch fails', async () => {
      mockUseOrder.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
      });
    });

    it('should show 404 result when order not found', async () => {
      mockUseOrder.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('订单不存在')).toBeInTheDocument();
      });
    });
  });
});
