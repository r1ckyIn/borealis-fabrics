/**
 * Unit tests for FabricDetailPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import FabricDetailPage from '../FabricDetailPage';
import type { Fabric, FabricSupplier, CustomerPricing, PaginatedResult } from '@/types';

// Mock all hooks from useFabrics
const mockUseFabric = vi.fn();
const mockUseFabricSuppliers = vi.fn();
const mockUseFabricPricing = vi.fn();
const mockUseUploadFabricImage = vi.fn();
const mockUseDeleteFabricImage = vi.fn();
const mockUseAddFabricSupplier = vi.fn();
const mockUseUpdateFabricSupplier = vi.fn();
const mockUseRemoveFabricSupplier = vi.fn();
const mockUseCreateFabricPricing = vi.fn();
const mockUseUpdateFabricPricing = vi.fn();
const mockUseDeleteFabricPricing = vi.fn();

vi.mock('@/hooks/queries/useFabrics', () => ({
  useFabric: (...args: unknown[]) => mockUseFabric(...args),
  useFabricSuppliers: (...args: unknown[]) => mockUseFabricSuppliers(...args),
  useFabricPricing: (...args: unknown[]) => mockUseFabricPricing(...args),
  useUploadFabricImage: () => mockUseUploadFabricImage(),
  useDeleteFabricImage: () => mockUseDeleteFabricImage(),
  useAddFabricSupplier: () => mockUseAddFabricSupplier(),
  useUpdateFabricSupplier: () => mockUseUpdateFabricSupplier(),
  useRemoveFabricSupplier: () => mockUseRemoveFabricSupplier(),
  useCreateFabricPricing: () => mockUseCreateFabricPricing(),
  useUpdateFabricPricing: () => mockUseUpdateFabricPricing(),
  useDeleteFabricPricing: () => mockUseDeleteFabricPricing(),
}));

// Mock API calls
vi.mock('@/api/supplier.api', () => ({
  getSuppliers: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock('@/api/customer.api', () => ({
  getCustomers: vi.fn().mockResolvedValue({ items: [] }),
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

// Mock fabric data
const mockFabric: Fabric = {
  id: 1,
  fabricCode: 'FB-2401-0001',
  name: '高档涤纶面料',
  material: { primary: '涤纶', secondary: '氨纶' },
  composition: '80%涤纶 20%氨纶',
  color: '黑色',
  weight: 180.5,
  width: 150,
  thickness: '中',
  handFeel: 'soft',
  glossLevel: 'matte',
  application: ['clothing', 'sports'],
  defaultPrice: 25.5,
  defaultLeadTime: 7,
  description: '高品质面料',
  tags: ['热销', '高档'],
  notes: '库存充足',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

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
        companyName: '测试供应商',
        contactName: '张三',
        phone: '13800138000',
        email: 'test@example.com',
        address: undefined,
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

const mockPricing: PaginatedResult<CustomerPricing> = {
  items: [
    {
      id: 1,
      fabricId: 1,
      customerId: 1,
      specialPrice: 28,
      customer: {
        id: 1,
        companyName: '测试客户',
        contactName: '李四',
        phone: '13900139000',
        email: 'customer@example.com',
        addresses: undefined,
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

// Helper to create default mock mutation return value
const createMockMutation = () => ({
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
});

// Helper to render with providers
function renderWithProviders(
  ui: React.ReactElement,
  { initialEntries = ['/fabrics/1'] } = {}
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
          <Route path="/fabrics/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('FabricDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseFabric.mockReturnValue({
      data: mockFabric,
      isLoading: false,
      error: null,
    });

    mockUseFabricSuppliers.mockReturnValue({
      data: mockSuppliers,
      isLoading: false,
    });

    mockUseFabricPricing.mockReturnValue({
      data: mockPricing,
      isLoading: false,
    });

    // Mock all mutations
    mockUseUploadFabricImage.mockReturnValue({
      ...createMockMutation(),
      uploadProgress: 0,
    });
    mockUseDeleteFabricImage.mockReturnValue(createMockMutation());
    mockUseAddFabricSupplier.mockReturnValue(createMockMutation());
    mockUseUpdateFabricSupplier.mockReturnValue(createMockMutation());
    mockUseRemoveFabricSupplier.mockReturnValue(createMockMutation());
    mockUseCreateFabricPricing.mockReturnValue(createMockMutation());
    mockUseUpdateFabricPricing.mockReturnValue(createMockMutation());
    mockUseDeleteFabricPricing.mockReturnValue(createMockMutation());
  });

  describe('Rendering', () => {
    it('should render page with fabric name', async () => {
      renderWithProviders(<FabricDetailPage />);

      // Fabric name appears in multiple places (title, breadcrumb, descriptions)
      await waitFor(() => {
        expect(screen.getAllByText('高档涤纶面料').length).toBeGreaterThan(0);
      });
    });

    it('should render edit button', async () => {
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('编辑面料')).toBeInTheDocument();
      });
    });

    it('should render all four tabs', async () => {
      renderWithProviders(<FabricDetailPage />);

      // Wait for tabs to render by checking for tab text
      await waitFor(() => {
        expect(screen.getByText('基本信息')).toBeInTheDocument();
      });
      expect(screen.getByText('图片管理')).toBeInTheDocument();
      expect(screen.getByText('供应商关联')).toBeInTheDocument();
      expect(screen.getByText('客户定价')).toBeInTheDocument();
    });

    it('should show basic info tab by default', async () => {
      renderWithProviders(<FabricDetailPage />);

      // Check for fabric details in basic info tab
      await waitFor(() => {
        expect(screen.getByText('FB-2401-0001')).toBeInTheDocument();
      });
      expect(screen.getByText('80%涤纶 20%氨纶')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching fabric', async () => {
      mockUseFabric.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('加载中...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error result when fetch fails', async () => {
      mockUseFabric.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
      });
      expect(screen.getByText('无法加载面料信息，请稍后重试')).toBeInTheDocument();
    });

    it('should show back to list button on error', async () => {
      const user = userEvent.setup();

      mockUseFabric.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('返回列表')).toBeInTheDocument();
      });

      const backButton = screen.getByText('返回列表').closest('button');
      await user.click(backButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/fabrics');
    });
  });

  describe('404 Handling', () => {
    it('should show 404 result when fabric not found', async () => {
      mockUseFabric.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('面料不存在')).toBeInTheDocument();
      });
      expect(screen.getByText('您访问的面料不存在或已被删除')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to edit page when clicking edit button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('编辑面料')).toBeInTheDocument();
      });

      const editButton = screen.getByText('编辑面料').closest('button');
      await user.click(editButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/fabrics/1/edit');
    });
  });

  describe('Tab Switching', () => {
    it('should switch to images tab', async () => {
      const user = userEvent.setup();
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('图片管理')).toBeInTheDocument();
      });

      const imagesTab = screen.getByText('图片管理');
      await user.click(imagesTab);

      await waitFor(() => {
        expect(screen.getByText('上传图片')).toBeInTheDocument();
      });
    });

    it('should switch to suppliers tab', async () => {
      const user = userEvent.setup();
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('供应商关联')).toBeInTheDocument();
      });

      const suppliersTab = screen.getByText('供应商关联');
      await user.click(suppliersTab);

      await waitFor(() => {
        expect(screen.getByText('添加供应商')).toBeInTheDocument();
      });
    });

    it('should switch to pricing tab', async () => {
      const user = userEvent.setup();
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('客户定价')).toBeInTheDocument();
      });

      const pricingTab = screen.getByText('客户定价');
      await user.click(pricingTab);

      await waitFor(() => {
        expect(screen.getByText('添加客户定价')).toBeInTheDocument();
      });
    });
  });

  describe('Suppliers Tab', () => {
    it('should render supplier data in table', async () => {
      const user = userEvent.setup();
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('供应商关联')).toBeInTheDocument();
      });

      const suppliersTab = screen.getByText('供应商关联');
      await user.click(suppliersTab);

      await waitFor(() => {
        expect(screen.getByText('测试供应商')).toBeInTheDocument();
      });
      expect(screen.getByText('张三')).toBeInTheDocument();
    });

    it('should open add supplier modal', async () => {
      const user = userEvent.setup();
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('供应商关联')).toBeInTheDocument();
      });

      const suppliersTab = screen.getByText('供应商关联');
      await user.click(suppliersTab);

      await waitFor(() => {
        expect(screen.getByText('添加供应商')).toBeInTheDocument();
      });

      const addButton = screen.getByText('添加供应商').closest('button');
      await user.click(addButton!);

      // Modal title
      await waitFor(() => {
        expect(screen.getAllByText('添加供应商').length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Pricing Tab', () => {
    it('should render pricing data in table', async () => {
      const user = userEvent.setup();
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('客户定价')).toBeInTheDocument();
      });

      const pricingTab = screen.getByText('客户定价');
      await user.click(pricingTab);

      await waitFor(() => {
        expect(screen.getByText('测试客户')).toBeInTheDocument();
      });
      expect(screen.getByText('李四')).toBeInTheDocument();
    });

    it('should open add pricing modal', async () => {
      const user = userEvent.setup();
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('客户定价')).toBeInTheDocument();
      });

      const pricingTab = screen.getByText('客户定价');
      await user.click(pricingTab);

      await waitFor(() => {
        expect(screen.getByText('添加客户定价')).toBeInTheDocument();
      });

      const addButton = screen.getByText('添加客户定价').closest('button');
      await user.click(addButton!);

      // Modal title (increased timeout for Modal animation in jsdom)
      await waitFor(
        () => {
          expect(screen.getAllByText('添加客户定价').length).toBeGreaterThanOrEqual(2);
        },
        { timeout: 10000 }
      );
    }, 15000);
  });

  describe('Basic Info Display', () => {
    it('should display fabric field labels', async () => {
      renderWithProviders(<FabricDetailPage />);

      // Check description items are rendered
      await waitFor(() => {
        expect(screen.getByText('面料编码')).toBeInTheDocument();
      });
      expect(screen.getByText('面料名称')).toBeInTheDocument();
      expect(screen.getByText('颜色')).toBeInTheDocument();
      expect(screen.getByText('主要材质')).toBeInTheDocument();
    });

    it('should display fabric values correctly', async () => {
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('FB-2401-0001')).toBeInTheDocument();
      });
      expect(screen.getByText('黑色')).toBeInTheDocument();
      expect(screen.getByText('180.5 g/m²')).toBeInTheDocument();
      expect(screen.getByText('150 cm')).toBeInTheDocument();
    });

    it('should display tags', async () => {
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('热销')).toBeInTheDocument();
      });
      expect(screen.getByText('高档')).toBeInTheDocument();
    });

    it('should display application tags', async () => {
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('clothing')).toBeInTheDocument();
      });
      expect(screen.getByText('sports')).toBeInTheDocument();
    });
  });
});
