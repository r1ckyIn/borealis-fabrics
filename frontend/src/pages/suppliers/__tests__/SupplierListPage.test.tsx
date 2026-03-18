/**
 * Unit tests for SupplierListPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SupplierListPage from '../SupplierListPage';
import type { Supplier, PaginatedResult } from '@/types';
import { SupplierStatus, SettleType } from '@/types';

// Mock hooks
const mockUseSuppliers = vi.fn();
const mockUseDeleteSupplier = vi.fn();

vi.mock('@/hooks/queries/useSuppliers', () => ({
  useSuppliers: (...args: unknown[]) => mockUseSuppliers(...args),
  useDeleteSupplier: () => mockUseDeleteSupplier(),
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

// Mock supplier data - only include required fields and those asserted on
const mockSuppliers: Supplier[] = [
  {
    id: 1,
    companyName: '东莞纺织有限公司',
    contactName: '张三',
    phone: '13800138000',
    status: SupplierStatus.ACTIVE,
    settleType: SettleType.CREDIT,
    creditDays: 30,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    companyName: '苏州丝绸厂',
    contactName: '李四',
    phone: '13900139000',
    status: SupplierStatus.SUSPENDED,
    settleType: SettleType.PREPAY,
    isActive: true,
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

const mockPaginatedResult: PaginatedResult<Supplier> = {
  items: mockSuppliers,
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
      <MemoryRouter initialEntries={['/suppliers']}>
        <Routes>
          <Route path="/suppliers" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SupplierListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseSuppliers.mockReturnValue({
      data: mockPaginatedResult,
      isLoading: false,
      isFetching: false,
    });

    mockUseDeleteSupplier.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
  });

  describe('Rendering', () => {
    it('should render page title in header', async () => {
      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('供应商管理').length).toBeGreaterThan(0);
      }, { timeout: 10000 });
    }, 15000);

    it('should render new supplier button', async () => {
      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getByText('新建供应商')).toBeInTheDocument();
      });
    });

    it('should render search form', async () => {
      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('公司名称/联系人/电话')).toBeInTheDocument();
      });
    });

    it('should render table with column headers', async () => {
      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('公司名称').length).toBeGreaterThan(0);
      });
      expect(screen.getAllByText('联系人').length).toBeGreaterThan(0);
      expect(screen.getAllByText('操作').length).toBeGreaterThan(0);
    });

    it('should render supplier data in table', async () => {
      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getByText('东莞纺织有限公司')).toBeInTheDocument();
      });
      expect(screen.getByText('张三')).toBeInTheDocument();
      expect(screen.getByText('苏州丝绸厂')).toBeInTheDocument();
      expect(screen.getByText('李四')).toBeInTheDocument();
    });

    it('should render status tags correctly', async () => {
      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getByText('正常')).toBeInTheDocument();
      });
      expect(screen.getByText('暂停')).toBeInTheDocument();
    });

    it('should render settle type labels', async () => {
      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getByText('账期')).toBeInTheDocument();
      });
      expect(screen.getByText('预付款')).toBeInTheDocument();
    });

    it('should show credit days for credit settle type', async () => {
      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getByText('30')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state', async () => {
      mockUseSuppliers.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      });

      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(document.querySelector('.ant-spin')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to create page when clicking new button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getByText('新建供应商')).toBeInTheDocument();
      });

      const newButton = screen.getByText('新建供应商').closest('button');
      await user.click(newButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/suppliers/new');
    });

    it('should navigate to detail page when clicking view button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('查看').length).toBeGreaterThan(0);
      });

      const viewButtons = screen.getAllByText('查看');
      await user.click(viewButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/suppliers/1');
    });

    it('should navigate to edit page when clicking edit button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('编辑').length).toBeGreaterThan(0);
      });

      const editButtons = screen.getAllByText('编辑');
      await user.click(editButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/suppliers/1/edit');
    });
  });

  describe('Delete', () => {
    it('should open delete confirmation modal', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('删除').length).toBeGreaterThan(0);
      });

      const deleteButtons = screen.getAllByText('删除');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
      });
    });

    it('should show supplier name in delete confirmation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('删除').length).toBeGreaterThan(0);
      });

      const deleteButtons = screen.getAllByText('删除');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/"东莞纺织有限公司"/)).toBeInTheDocument();
      });
    });

    it('should have delete modal with warning text', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('删除').length).toBeGreaterThan(0);
      });

      const deleteButtons = screen.getAllByText('删除');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(document.querySelector('.ant-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Row Click', () => {
    it('should navigate to detail on row click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getByText('东莞纺织有限公司')).toBeInTheDocument();
      });

      const companyNameCell = screen.getByText('东莞纺织有限公司');
      await user.click(companyNameCell);

      expect(mockNavigate).toHaveBeenCalledWith('/suppliers/1');
    });
  });

  describe('Empty State', () => {
    it('should show empty table when no data', async () => {
      mockUseSuppliers.mockReturnValue({
        data: {
          items: [],
          pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        },
        isLoading: false,
        isFetching: false,
      });

      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(document.querySelector('.ant-empty')).toBeInTheDocument();
      });
    });

    it('should show custom empty text with action button', async () => {
      mockUseSuppliers.mockReturnValue({
        data: {
          items: [],
          pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        },
        isLoading: false,
        isFetching: false,
      });

      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getByText('暂无供应商数据')).toBeInTheDocument();
      });
    });

    it('should navigate to create page from empty state button', async () => {
      const user = userEvent.setup();

      mockUseSuppliers.mockReturnValue({
        data: {
          items: [],
          pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        },
        isLoading: false,
        isFetching: false,
      });

      renderWithProviders(<SupplierListPage />);

      await waitFor(() => {
        expect(screen.getByText('暂无供应商数据')).toBeInTheDocument();
      });

      // Find the button inside the empty state (not the header button)
      const emptyContainer = document.querySelector('.ant-empty');
      const createButton = emptyContainer?.querySelector('button');
      expect(createButton).toBeTruthy();
      await user.click(createButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/suppliers/new');
    });
  });

  describe('Delete Error Handling', () => {
    it('should show specific error message on delete 409 conflict', async () => {
      const { message: antdMessage } = await import('antd');
      const user = userEvent.setup();

      const mockMutateAsync = vi.fn().mockRejectedValue({
        code: 409,
        message: 'SUPPLIER_HAS_ORDERS',
        data: null,
      });

      mockUseDeleteSupplier.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderWithProviders(<SupplierListPage />);

      // Click delete button
      await waitFor(() => {
        expect(screen.getAllByText('删除').length).toBeGreaterThan(0);
      });
      const deleteButtons = screen.getAllByText('删除');
      await user.click(deleteButtons[0]);

      // Confirm deletion in modal
      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
      });

      const confirmButton = document.querySelector(
        '.ant-modal-footer .ant-btn-dangerous'
      ) as HTMLButtonElement;
      expect(confirmButton).toBeTruthy();
      await user.click(confirmButton);

      await waitFor(() => {
        expect(antdMessage.error).toHaveBeenCalledWith(
          '该供应商有关联的订单，无法删除'
        );
      });
    });

    it('should show generic error message on delete 500 error', async () => {
      const { message: antdMessage } = await import('antd');
      const user = userEvent.setup();

      const mockMutateAsync = vi.fn().mockRejectedValue({
        code: 500,
        message: 'Internal Server Error',
        data: null,
      });

      mockUseDeleteSupplier.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderWithProviders(<SupplierListPage />);

      // Click delete button
      await waitFor(() => {
        expect(screen.getAllByText('删除').length).toBeGreaterThan(0);
      });
      const deleteButtons = screen.getAllByText('删除');
      await user.click(deleteButtons[0]);

      // Confirm deletion in modal
      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
      });

      const confirmButton = document.querySelector(
        '.ant-modal-footer .ant-btn-dangerous'
      ) as HTMLButtonElement;
      expect(confirmButton).toBeTruthy();
      await user.click(confirmButton);

      await waitFor(() => {
        expect(antdMessage.error).toHaveBeenCalledWith(
          '服务器错误，请稍后重试'
        );
      });
    });
  });
});
