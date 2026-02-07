/**
 * Unit tests for SupplierFormPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SupplierFormPage from '../SupplierFormPage';
import type { Supplier } from '@/types';
import { SupplierStatus, SettleType } from '@/types';

// Mock hooks
const mockUseSupplier = vi.fn();
const mockUseCreateSupplier = vi.fn();
const mockUseUpdateSupplier = vi.fn();

vi.mock('@/hooks/queries/useSuppliers', () => ({
  useSupplier: (...args: unknown[]) => mockUseSupplier(...args),
  useCreateSupplier: () => mockUseCreateSupplier(),
  useUpdateSupplier: () => mockUseUpdateSupplier(),
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

// Mock supplier data
const mockSupplier: Supplier = {
  id: 1,
  companyName: '东莞纺织有限公司',
  contactName: '张三',
  phone: '13800138000',
  wechat: 'zhang_san',
  email: 'zhangsan@example.com',
  address: '广东省东莞市长安镇',
  status: SupplierStatus.ACTIVE,
  billReceiveType: '增值税专用发票',
  settleType: SettleType.CREDIT,
  creditDays: 30,
  notes: null,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Helper to render with providers
function renderWithProviders(
  ui: React.ReactElement,
  { initialEntries = ['/suppliers/new'] } = {}
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
          <Route path="/suppliers/new" element={ui} />
          <Route path="/suppliers/:id/edit" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SupplierFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseSupplier.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    mockUseCreateSupplier.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockSupplier),
      isPending: false,
    });

    mockUseUpdateSupplier.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockSupplier),
      isPending: false,
    });
  });

  describe('Create Mode', () => {
    it('should render create mode page with form', async () => {
      renderWithProviders(<SupplierFormPage />);

      await waitFor(() => {
        expect(screen.getAllByText('新建供应商').length).toBeGreaterThan(0);
      });

      expect(screen.getByText('创建供应商')).toBeInTheDocument();
    });

    it('should show correct breadcrumbs in create mode', async () => {
      renderWithProviders(<SupplierFormPage />);

      await waitFor(() => {
        expect(screen.getByText('首页')).toBeInTheDocument();
      });
      expect(screen.getByText('供应商管理')).toBeInTheDocument();
    });

    it('should navigate to list on cancel', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SupplierFormPage />);

      // Ant Design button inserts space between two Chinese characters
      await waitFor(() => {
        expect(screen.getByText(/取.*消/)).toBeInTheDocument();
      }, { timeout: 5000 });

      const cancelButton = screen.getByText(/取.*消/).closest('button');
      expect(cancelButton).toBeTruthy();
      await user.click(cancelButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/suppliers');
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      mockUseSupplier.mockReturnValue({
        data: mockSupplier,
        isLoading: false,
        error: null,
      });
    });

    it('should render edit mode page with supplier name', async () => {
      renderWithProviders(<SupplierFormPage />, {
        initialEntries: ['/suppliers/1/edit'],
      });

      await waitFor(() => {
        expect(screen.getAllByText(/编辑供应商/).length).toBeGreaterThan(0);
      });
      expect(screen.getByText('保存修改')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching supplier', async () => {
      mockUseSupplier.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderWithProviders(<SupplierFormPage />, {
        initialEntries: ['/suppliers/1/edit'],
      });

      await waitFor(() => {
        expect(screen.getByText('加载中...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error result when fetch fails', async () => {
      mockUseSupplier.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      renderWithProviders(<SupplierFormPage />, {
        initialEntries: ['/suppliers/1/edit'],
      });

      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
      });
      expect(screen.getByText('无法加载供应商信息，请稍后重试')).toBeInTheDocument();
    });

    it('should show back to list button on error', async () => {
      mockUseSupplier.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      renderWithProviders(<SupplierFormPage />, {
        initialEntries: ['/suppliers/1/edit'],
      });

      await waitFor(() => {
        expect(screen.getByText('返回列表')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockUseSupplier.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      renderWithProviders(<SupplierFormPage />, {
        initialEntries: ['/suppliers/1/edit'],
      });

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const retryButton = buttons.find(btn => btn.textContent?.includes('试'));
        expect(retryButton).toBeInTheDocument();
      });
    });
  });

  describe('404 Handling', () => {
    it('should show 404 result when supplier not found', async () => {
      mockUseSupplier.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<SupplierFormPage />, {
        initialEntries: ['/suppliers/999/edit'],
      });

      await waitFor(() => {
        expect(screen.getByText('供应商不存在')).toBeInTheDocument();
      });
      expect(screen.getByText('您访问的供应商不存在或已被删除')).toBeInTheDocument();
    });

    it('should show back to list button on 404', async () => {
      const user = userEvent.setup();

      mockUseSupplier.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<SupplierFormPage />, {
        initialEntries: ['/suppliers/999/edit'],
      });

      await waitFor(() => {
        expect(screen.getByText('返回列表')).toBeInTheDocument();
      });

      const backButton = screen.getByText('返回列表').closest('button');
      await user.click(backButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/suppliers');
    });
  });

  describe('Submit Loading', () => {
    it('should show loading state during create submission', async () => {
      mockUseCreateSupplier.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      renderWithProviders(<SupplierFormPage />);

      await waitFor(() => {
        const submitButton = screen.getByText('创建供应商').closest('button');
        expect(submitButton).toHaveClass('ant-btn-loading');
      });
    });

    it('should show loading state during update submission', async () => {
      mockUseSupplier.mockReturnValue({
        data: mockSupplier,
        isLoading: false,
        error: null,
      });

      mockUseUpdateSupplier.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      renderWithProviders(<SupplierFormPage />, {
        initialEntries: ['/suppliers/1/edit'],
      });

      await waitFor(() => {
        const submitButton = screen.getByText('保存修改').closest('button');
        expect(submitButton).toHaveClass('ant-btn-loading');
      });
    });
  });
});
