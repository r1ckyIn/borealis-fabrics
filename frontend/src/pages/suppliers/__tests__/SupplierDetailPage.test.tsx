/**
 * Unit tests for SupplierDetailPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SupplierDetailPage from '../SupplierDetailPage';
import type { Supplier, FabricSupplier, PaginatedResult } from '@/types';
import { SupplierStatus, SettleType } from '@/types';

// Mock hooks
const mockUseSupplier = vi.fn();
const mockUseSupplierFabrics = vi.fn();
const mockUseDeleteSupplier = vi.fn();

vi.mock('@/hooks/queries/useSuppliers', () => ({
  useSupplier: (...args: unknown[]) => mockUseSupplier(...args),
  useSupplierFabrics: (...args: unknown[]) => mockUseSupplierFabrics(...args),
  useDeleteSupplier: () => mockUseDeleteSupplier(),
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
const mockSupplier: Supplier = {
  id: 1,
  companyName: '东莞纺织有限公司',
  contactName: '张三',
  phone: '13800138000',
  wechat: 'zhang_san',
  email: 'zhangsan@example.com',
  address: '广东省东莞市长安镇',
  status: SupplierStatus.ACTIVE,
  settleType: SettleType.CREDIT,
  creditDays: 30,
  notes: '优质供应商',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockFabrics: PaginatedResult<FabricSupplier> = {
  items: [
    {
      id: 1,
      fabricId: 10,
      supplierId: 1,
      purchasePrice: 20,
      minOrderQty: 100,
      leadTimeDays: 5,
      fabric: {
        id: 10,
        fabricCode: 'FB-2401-0001',
        name: '高档涤纶面料',
        color: '黑色',
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

// Helper to render with providers
function renderWithProviders(
  ui: React.ReactElement,
  { initialEntries = ['/suppliers/1'] } = {}
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
          <Route path="/suppliers/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SupplierDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseSupplier.mockReturnValue({
      data: mockSupplier,
      isLoading: false,
      error: null,
    });

    mockUseSupplierFabrics.mockReturnValue({
      data: mockFabrics,
      isLoading: false,
    });

    mockUseDeleteSupplier.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
  });

  describe('Rendering', () => {
    it('should render page with supplier name', async () => {
      renderWithProviders(<SupplierDetailPage />);

      await waitFor(() => {
        expect(screen.getAllByText('东莞纺织有限公司').length).toBeGreaterThan(0);
      });
    });

    it('should render edit button', async () => {
      renderWithProviders(<SupplierDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('编辑')).toBeInTheDocument();
      });
    });

    it('should render both tabs', async () => {
      renderWithProviders(<SupplierDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('基本信息')).toBeInTheDocument();
      });
      expect(screen.getByText('关联面料')).toBeInTheDocument();
    });

    it('should show basic info tab by default', async () => {
      renderWithProviders(<SupplierDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('公司名称')).toBeInTheDocument();
      });
      expect(screen.getByText('联系人')).toBeInTheDocument();
      expect(screen.getByText('电话')).toBeInTheDocument();
    });
  });

  describe('Basic Info Display', () => {
    it('should display supplier field labels', async () => {
      renderWithProviders(<SupplierDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('公司名称')).toBeInTheDocument();
      });
      expect(screen.getByText('联系人')).toBeInTheDocument();
      expect(screen.getByText('电话')).toBeInTheDocument();
      expect(screen.getByText('微信')).toBeInTheDocument();
      expect(screen.getByText('邮箱')).toBeInTheDocument();
      expect(screen.getByText('状态')).toBeInTheDocument();
      expect(screen.getByText('地址')).toBeInTheDocument();
      expect(screen.getByText('结算方式')).toBeInTheDocument();
    });

    it('should display supplier values correctly', async () => {
      renderWithProviders(<SupplierDetailPage />);

      await waitFor(() => {
        expect(screen.getAllByText('东莞纺织有限公司').length).toBeGreaterThan(0);
      });
      expect(screen.getByText('张三')).toBeInTheDocument();
      expect(screen.getByText('13800138000')).toBeInTheDocument();
      expect(screen.getByText('zhang_san')).toBeInTheDocument();
      expect(screen.getByText('zhangsan@example.com')).toBeInTheDocument();
      expect(screen.getByText('广东省东莞市长安镇')).toBeInTheDocument();
      expect(screen.getByText('正常')).toBeInTheDocument();
      expect(screen.getByText('账期')).toBeInTheDocument();
      expect(screen.getByText('30 天')).toBeInTheDocument();
      expect(screen.getByText('优质供应商')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching supplier', async () => {
      mockUseSupplier.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderWithProviders(<SupplierDetailPage />);

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

      renderWithProviders(<SupplierDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
      });
      expect(screen.getByText('无法加载供应商信息，请稍后重试')).toBeInTheDocument();
    });

    it('should show back to list button on error', async () => {
      const user = userEvent.setup();

      mockUseSupplier.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      renderWithProviders(<SupplierDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('返回列表')).toBeInTheDocument();
      });

      const backButton = screen.getByText('返回列表').closest('button');
      await user.click(backButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/suppliers');
    });
  });

  describe('404 Handling', () => {
    it('should show 404 result when supplier not found', async () => {
      mockUseSupplier.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<SupplierDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('供应商不存在')).toBeInTheDocument();
      });
      expect(screen.getByText('您访问的供应商不存在或已被删除')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to edit page when clicking edit button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SupplierDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('编辑')).toBeInTheDocument();
      });

      const editButton = screen.getByText('编辑').closest('button');
      await user.click(editButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/suppliers/1/edit');
    });
  });

  describe('Tab Switching', () => {
    it('should switch to fabrics tab and show fabric data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SupplierDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('关联面料')).toBeInTheDocument();
      });

      const fabricsTab = screen.getByText('关联面料');
      await user.click(fabricsTab);

      await waitFor(() => {
        expect(screen.getByText('FB-2401-0001')).toBeInTheDocument();
      });
    });

    it('should show fabric name in fabrics tab', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SupplierDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('关联面料')).toBeInTheDocument();
      });

      const fabricsTab = screen.getByText('关联面料');
      await user.click(fabricsTab);

      await waitFor(() => {
        expect(screen.getByText('高档涤纶面料')).toBeInTheDocument();
      });
    });

    it('should have clickable fabric code link', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SupplierDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('关联面料')).toBeInTheDocument();
      });

      const fabricsTab = screen.getByText('关联面料');
      await user.click(fabricsTab);

      await waitFor(() => {
        expect(screen.getByText('FB-2401-0001')).toBeInTheDocument();
      });

      const fabricLink = screen.getByText('FB-2401-0001');
      await user.click(fabricLink);

      expect(mockNavigate).toHaveBeenCalledWith('/fabrics/10');
    });
  });
});
