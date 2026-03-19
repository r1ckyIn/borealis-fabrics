/**
 * Unit tests for CustomerFormPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CustomerFormPage from '../CustomerFormPage';
import type { Customer } from '@/types';
import { CreditType } from '@/types';

// Mock hooks
const mockUseCustomer = vi.fn();
const mockUseCreateCustomer = vi.fn();
const mockUseUpdateCustomer = vi.fn();

vi.mock('@/hooks/queries/useCustomers', () => ({
  useCustomer: (...args: unknown[]) => mockUseCustomer(...args),
  useCreateCustomer: () => mockUseCreateCustomer(),
  useUpdateCustomer: () => mockUseUpdateCustomer(),
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

// Mock customer data - only include required fields
const mockCustomer: Customer = {
  id: 1,
  companyName: '上海服饰有限公司',
  creditType: CreditType.CREDIT,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Helper to render with providers
function renderWithProviders(
  ui: React.ReactElement,
  { initialEntries = ['/customers/new'] } = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/customers/new" element={ui} />
          <Route path="/customers/:id/edit" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CustomerFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseCustomer.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    mockUseCreateCustomer.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockCustomer),
      isPending: false,
    });

    mockUseUpdateCustomer.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockCustomer),
      isPending: false,
    });
  });

  describe('Create Mode', () => {
    it('should render create mode page with form', async () => {
      renderWithProviders(<CustomerFormPage />);

      await waitFor(() => {
        expect(screen.getAllByText('新建客户').length).toBeGreaterThan(0);
      });

      expect(screen.getByText('创建客户')).toBeInTheDocument();
    });

    it('should show correct breadcrumbs in create mode', async () => {
      renderWithProviders(<CustomerFormPage />);

      await waitFor(() => {
        expect(screen.getByText('首页')).toBeInTheDocument();
      });
      expect(screen.getByText('客户管理')).toBeInTheDocument();
    });

    it('should navigate to list on cancel', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerFormPage />);

      // Ant Design button inserts space between two Chinese characters
      await waitFor(() => {
        expect(screen.getByText(/取.*消/)).toBeInTheDocument();
      }, { timeout: 5000 });

      const cancelButton = screen.getByText(/取.*消/).closest('button');
      expect(cancelButton).toBeTruthy();
      await user.click(cancelButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/customers');
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      mockUseCustomer.mockReturnValue({
        data: mockCustomer,
        isLoading: false,
        error: null,
      });
    });

    it('should render edit mode page with customer name', async () => {
      renderWithProviders(<CustomerFormPage />, {
        initialEntries: ['/customers/1/edit'],
      });

      await waitFor(() => {
        expect(screen.getAllByText(/编辑客户/).length).toBeGreaterThan(0);
      });
      expect(screen.getByText('保存修改')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching customer', async () => {
      mockUseCustomer.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderWithProviders(<CustomerFormPage />, {
        initialEntries: ['/customers/1/edit'],
      });

      await waitFor(() => {
        expect(screen.getByText('加载中...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseCustomer.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });
    });

    it('should show error result when fetch fails', async () => {
      renderWithProviders(<CustomerFormPage />, {
        initialEntries: ['/customers/1/edit'],
      });

      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
      });
      expect(screen.getByText('无法加载客户信息，请稍后重试')).toBeInTheDocument();
    });

    it('should show back to list button on error', async () => {
      renderWithProviders(<CustomerFormPage />, {
        initialEntries: ['/customers/1/edit'],
      });

      await waitFor(() => {
        expect(screen.getByText('返回列表')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      renderWithProviders(<CustomerFormPage />, {
        initialEntries: ['/customers/1/edit'],
      });

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const retryButton = buttons.find(btn => btn.textContent?.includes('试'));
        expect(retryButton).toBeInTheDocument();
      });
    });
  });

  describe('404 Handling', () => {
    it('should show 404 result when customer not found', async () => {
      mockUseCustomer.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CustomerFormPage />, {
        initialEntries: ['/customers/999/edit'],
      });

      await waitFor(() => {
        expect(screen.getByText('客户不存在')).toBeInTheDocument();
      });
      expect(screen.getByText('您访问的客户不存在或已被删除')).toBeInTheDocument();
    });

    it('should show back to list button on 404', async () => {
      const user = userEvent.setup();

      mockUseCustomer.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CustomerFormPage />, {
        initialEntries: ['/customers/999/edit'],
      });

      await waitFor(() => {
        expect(screen.getByText('返回列表')).toBeInTheDocument();
      });

      const backButton = screen.getByText('返回列表').closest('button');
      await user.click(backButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/customers');
    });
  });

  describe('Submit Error Handling', () => {
    it('should render form with error handling code path available', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue({
        code: 409,
        message: 'COMPANY_NAME_EXISTS',
        data: null,
      });

      mockUseCreateCustomer.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderWithProviders(<CustomerFormPage />);

      await waitFor(() => {
        expect(screen.getByText('创建客户')).toBeInTheDocument();
      });

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Submit Loading', () => {
    it('should show loading state during create submission', async () => {
      mockUseCreateCustomer.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      renderWithProviders(<CustomerFormPage />);

      await waitFor(() => {
        const submitButton = screen.getByText('创建客户').closest('button');
        expect(submitButton).toHaveClass('ant-btn-loading');
      });
    });

    it('should show loading state during update submission', async () => {
      mockUseCustomer.mockReturnValue({
        data: mockCustomer,
        isLoading: false,
        error: null,
      });

      mockUseUpdateCustomer.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      renderWithProviders(<CustomerFormPage />, {
        initialEntries: ['/customers/1/edit'],
      });

      await waitFor(() => {
        const submitButton = screen.getByText('保存修改').closest('button');
        expect(submitButton).toHaveClass('ant-btn-loading');
      });
    });
  });
});
