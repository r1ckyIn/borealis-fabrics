/**
 * Unit tests for CustomerListPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CustomerListPage from '../CustomerListPage';
import type { Customer, PaginatedResult } from '@/types';
import { CreditType } from '@/types';

// Mock hooks
const mockUseCustomers = vi.fn();

vi.mock('@/hooks/queries/useCustomers', () => ({
  useCustomers: (...args: unknown[]) => mockUseCustomers(...args),
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

// Mock customer data - only include required fields and those asserted on
const mockCustomers: Customer[] = [
  {
    id: 1,
    companyName: '上海服饰有限公司',
    contactName: '王五',
    creditType: CreditType.CREDIT,
    creditDays: 45,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    companyName: '北京纺织贸易公司',
    contactName: '赵六',
    creditType: CreditType.PREPAY,
    isActive: true,
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

const mockPaginatedResult: PaginatedResult<Customer> = {
  items: mockCustomers,
  pagination: {
    total: 2,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  },
};

// Helper to render with providers
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/customers']}>
        <Routes>
          <Route path="/customers" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CustomerListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseCustomers.mockReturnValue({
      data: mockPaginatedResult,
      isLoading: false,
      isFetching: false,
    });
  });

  describe('Rendering', () => {
    it('should render page title in header', async () => {
      renderWithProviders(<CustomerListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('客户管理').length).toBeGreaterThan(0);
      }, { timeout: 10000 });
    }, 15000);

    it('should render new customer button', async () => {
      renderWithProviders(<CustomerListPage />);

      await waitFor(() => {
        expect(screen.getByText('新建客户')).toBeInTheDocument();
      });
    });

    it('should render search form', async () => {
      renderWithProviders(<CustomerListPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('公司名称/联系人/电话')).toBeInTheDocument();
      });
    });

    it('should render table with column headers', async () => {
      renderWithProviders(<CustomerListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('公司名称').length).toBeGreaterThan(0);
      });
      expect(screen.getAllByText('联系人').length).toBeGreaterThan(0);
      expect(screen.getAllByText('操作').length).toBeGreaterThan(0);
    });

    it('should render customer data in table', async () => {
      renderWithProviders(<CustomerListPage />);

      await waitFor(() => {
        expect(screen.getByText('上海服饰有限公司')).toBeInTheDocument();
      });
      expect(screen.getByText('王五')).toBeInTheDocument();
      expect(screen.getByText('北京纺织贸易公司')).toBeInTheDocument();
      expect(screen.getByText('赵六')).toBeInTheDocument();
    });

    it('should render credit type labels', async () => {
      renderWithProviders(<CustomerListPage />);

      await waitFor(() => {
        expect(screen.getByText('账期')).toBeInTheDocument();
      });
      expect(screen.getByText('预付款')).toBeInTheDocument();
    });

    it('should show credit days for credit type', async () => {
      renderWithProviders(<CustomerListPage />);

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state', async () => {
      mockUseCustomers.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      });

      renderWithProviders(<CustomerListPage />);

      await waitFor(() => {
        expect(document.querySelector('.ant-spin')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to create page when clicking new button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerListPage />);

      await waitFor(() => {
        expect(screen.getByText('新建客户')).toBeInTheDocument();
      });

      const newButton = screen.getByText('新建客户').closest('button');
      await user.click(newButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/customers/new');
    });

    it('should navigate to detail page when clicking view button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('查看').length).toBeGreaterThan(0);
      });

      const viewButtons = screen.getAllByText('查看');
      await user.click(viewButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/customers/1');
    });
  });

  describe('Empty State', () => {
    it('should show empty table when no data', async () => {
      mockUseCustomers.mockReturnValue({
        data: {
          items: [],
          pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        },
        isLoading: false,
        isFetching: false,
      });

      renderWithProviders(<CustomerListPage />);

      await waitFor(() => {
        expect(document.querySelector('.ant-empty')).toBeInTheDocument();
      });
    });

    it('should show custom empty text with action button', async () => {
      mockUseCustomers.mockReturnValue({
        data: {
          items: [],
          pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        },
        isLoading: false,
        isFetching: false,
      });

      renderWithProviders(<CustomerListPage />);

      await waitFor(() => {
        expect(screen.getByText('暂无客户数据')).toBeInTheDocument();
      });
    });

    it('should navigate to create page from empty state button', async () => {
      const user = userEvent.setup();

      mockUseCustomers.mockReturnValue({
        data: {
          items: [],
          pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        },
        isLoading: false,
        isFetching: false,
      });

      renderWithProviders(<CustomerListPage />);

      await waitFor(() => {
        expect(screen.getByText('暂无客户数据')).toBeInTheDocument();
      });

      const emptyContainer = document.querySelector('.ant-empty');
      const createButton = emptyContainer?.querySelector('button');
      expect(createButton).toBeTruthy();
      await user.click(createButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/customers/new');
    });
  });
});
