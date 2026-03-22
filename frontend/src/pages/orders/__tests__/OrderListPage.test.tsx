/**
 * Unit tests for OrderListPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import OrderListPage from '../OrderListPage';
import type { Order, PaginatedResult } from '@/types';
import { OrderItemStatus, CustomerPayStatus } from '@/types';

// Mock hooks
const mockUseOrders = vi.fn();

vi.mock('@/hooks/queries/useOrders', () => ({
  useOrders: (...args: unknown[]) => mockUseOrders(...args),
}));

// Mock usePagination
vi.mock('@/hooks/usePagination', () => ({
  usePagination: () => ({
    paginationProps: {
      current: 1,
      pageSize: 20,
      showSizeChanger: true,
    },
    queryParams: {
      page: 1,
      pageSize: 20,
    },
    handleTableChange: vi.fn(),
    setPage: vi.fn(),
  }),
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

// Mock order data
const mockOrders: Order[] = [
  {
    id: 1,
    orderCode: 'ORD-2601-0001',
    customerId: 1,
    customer: { id: 1, companyName: '客户A公司' } as Order['customer'],
    status: OrderItemStatus.INQUIRY,
    totalAmount: 12500.00,
    customerPayStatus: CustomerPayStatus.UNPAID,
    customerPaid: 0,
    isActive: true,
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
  } as Order,
  {
    id: 2,
    orderCode: 'ORD-2601-0002',
    customerId: 2,
    customer: { id: 2, companyName: '客户B公司' } as Order['customer'],
    status: OrderItemStatus.ORDERED,
    totalAmount: 8000.00,
    customerPayStatus: CustomerPayStatus.PARTIAL,
    customerPaid: 3000,
    isActive: true,
    createdAt: '2026-01-20T00:00:00.000Z',
    updatedAt: '2026-01-20T00:00:00.000Z',
  } as Order,
];

const mockPaginatedResult: PaginatedResult<Order> = {
  items: mockOrders,
  pagination: {
    total: 2,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  },
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/orders']}>
        <Routes>
          <Route path="/orders" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('OrderListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseOrders.mockReturnValue({
      data: mockPaginatedResult,
      isLoading: false,
      isFetching: false,
    });
  });

  describe('Rendering', () => {
    it('should render page title', async () => {
      renderWithProviders(<OrderListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('订单管理').length).toBeGreaterThan(0);
      }, { timeout: 10000 });
    }, 15000);

    it('should render table with order data', async () => {
      renderWithProviders(<OrderListPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-2601-0001')).toBeInTheDocument();
      });
      expect(screen.getByText('客户A公司')).toBeInTheDocument();
      expect(screen.getByText('ORD-2601-0002')).toBeInTheDocument();
      expect(screen.getByText('客户B公司')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state', async () => {
      mockUseOrders.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      });

      renderWithProviders(<OrderListPage />);

      await waitFor(() => {
        expect(document.querySelector('.ant-spin')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no data', async () => {
      mockUseOrders.mockReturnValue({
        data: {
          items: [],
          pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        },
        isLoading: false,
        isFetching: false,
      });

      renderWithProviders(<OrderListPage />);

      await waitFor(() => {
        expect(document.querySelector('.ant-empty')).toBeInTheDocument();
      });
    });

    it('should show create button in empty state', async () => {
      mockUseOrders.mockReturnValue({
        data: {
          items: [],
          pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        },
        isLoading: false,
        isFetching: false,
      });

      renderWithProviders(<OrderListPage />);

      await waitFor(() => {
        expect(screen.getByText('暂无订单数据')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to create page', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderListPage />);

      await waitFor(() => {
        expect(screen.getByText('新建订单')).toBeInTheDocument();
      });

      const newButton = screen.getByText('新建订单').closest('button');
      await user.click(newButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/orders/new');
    });

    it('should navigate to detail page when clicking view button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OrderListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('查看').length).toBeGreaterThan(0);
      });

      const viewButtons = screen.getAllByText('查看');
      await user.click(viewButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/orders/1');
    });
  });
});
