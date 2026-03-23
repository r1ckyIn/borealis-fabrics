/**
 * Unit tests for FabricDetailPage orchestrator component.
 * Mocks useFabricDetail hook and all 4 sub-components.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import FabricDetailPage from '../FabricDetailPage';
import type { Fabric } from '@/types';
import type { UseFabricDetailReturn } from '@/hooks/useFabricDetail';

// Mock useFabricDetail custom hook
const mockUseFabricDetail = vi.fn();
vi.mock('@/hooks/useFabricDetail', () => ({
  useFabricDetail: (...args: unknown[]) => mockUseFabricDetail(...args),
}));

// Mock all 4 sub-components (following OrderDetailPage.test.tsx pattern)
vi.mock('../components/FabricBasicInfo', () => ({
  FabricBasicInfo: () => <div data-testid="fabric-basic-info">Basic Info</div>,
}));
vi.mock('../components/FabricImageGallery', () => ({
  FabricImageGallery: () => <div data-testid="fabric-image-gallery">Images</div>,
}));
vi.mock('../components/FabricSupplierTab', () => ({
  FabricSupplierTab: () => <div data-testid="fabric-supplier-tab">Suppliers</div>,
}));
vi.mock('../components/FabricPricingTab', () => ({
  FabricPricingTab: () => <div data-testid="fabric-pricing-tab">Pricing</div>,
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

// Default mock hook return value
function createDefaultHookReturn(
  overrides: Partial<UseFabricDetailReturn> = {}
): UseFabricDetailReturn {
  const mockSetActiveTab = vi.fn();
  const mockSetModalOpen = vi.fn();
  const mockHandleDelete = vi.fn().mockResolvedValue(undefined);

  return {
    data: {
      fabric: mockFabric,
      isLoading: false,
      fetchError: null,
    },
    tabs: {
      activeTab: 'info',
      setActiveTab: mockSetActiveTab,
    },
    deleteFabric: {
      modalOpen: false,
      setModalOpen: mockSetModalOpen,
      handle: mockHandleDelete,
      isDeleting: false,
    },
    supplier: {
      data: undefined,
      isLoading: false,
      modal: {
        open: false,
        mode: 'add',
        form: {} as UseFabricDetailReturn['supplier']['modal']['form'],
        onOpen: vi.fn(),
        onEdit: vi.fn(),
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        isSubmitting: false,
        searchSuppliers: vi.fn(),
      },
      onRemove: vi.fn(),
    },
    pricing: {
      data: undefined,
      isLoading: false,
      modal: {
        open: false,
        mode: 'add',
        form: {} as UseFabricDetailReturn['pricing']['modal']['form'],
        onOpen: vi.fn(),
        onEdit: vi.fn(),
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        isSubmitting: false,
        searchCustomers: vi.fn(),
        defaultPrice: 25.5,
      },
      onDelete: vi.fn(),
    },
    images: {
      items: undefined,
      onUpload: vi.fn(),
      onDelete: vi.fn(),
      isUploading: false,
      uploadProgress: 0,
    },
    breadcrumbs: [
      { label: '首页', path: '/' },
      { label: '面料管理', path: '/fabrics' },
      { label: '高档涤纶面料' },
    ],
    ...overrides,
  };
}

// Render helper
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
    mockUseFabricDetail.mockReturnValue(createDefaultHookReturn());
  });

  describe('Rendering', () => {
    it('should render page with fabric name', async () => {
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getAllByText('高档涤纶面料').length).toBeGreaterThan(0);
      });
    });

    it('should render edit and delete buttons', async () => {
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('编辑')).toBeInTheDocument();
      });
      expect(screen.getByText('删除')).toBeInTheDocument();
    });

    it('should render all four tabs', async () => {
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('基本信息')).toBeInTheDocument();
      });
      expect(screen.getByText('图片管理')).toBeInTheDocument();
      expect(screen.getByText('供应商关联')).toBeInTheDocument();
      expect(screen.getByText('客户定价')).toBeInTheDocument();
    });

    it('should render basic info sub-component by default', async () => {
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('fabric-basic-info')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching fabric', async () => {
      mockUseFabricDetail.mockReturnValue(
        createDefaultHookReturn({
          data: { fabric: undefined, isLoading: true, fetchError: null },
        })
      );

      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('加载中...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error result when fetch fails', async () => {
      mockUseFabricDetail.mockReturnValue(
        createDefaultHookReturn({
          data: { fabric: undefined, isLoading: false, fetchError: new Error('Network error') },
        })
      );

      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
      });
      expect(screen.getByText('无法加载面料信息，请稍后重试')).toBeInTheDocument();
    });

    it('should show back to list button on error', async () => {
      const user = userEvent.setup();

      mockUseFabricDetail.mockReturnValue(
        createDefaultHookReturn({
          data: { fabric: undefined, isLoading: false, fetchError: new Error('Network error') },
        })
      );

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
      mockUseFabricDetail.mockReturnValue(
        createDefaultHookReturn({
          data: { fabric: undefined, isLoading: false, fetchError: null },
        })
      );

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
        expect(screen.getByText('编辑')).toBeInTheDocument();
      });

      const editButton = screen.getByText('编辑').closest('button');
      await user.click(editButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/fabrics/1/edit');
    });
  });

  describe('Delete Modal', () => {
    it('should open delete modal when clicking delete button', async () => {
      const mockSetModalOpen = vi.fn();
      mockUseFabricDetail.mockReturnValue(
        createDefaultHookReturn({
          deleteFabric: {
            modalOpen: false,
            setModalOpen: mockSetModalOpen,
            handle: vi.fn(),
            isDeleting: false,
          },
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<FabricDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('删除')).toBeInTheDocument();
      });

      const deleteButton = screen.getByText('删除').closest('button');
      await user.click(deleteButton!);

      expect(mockSetModalOpen).toHaveBeenCalledWith(true);
    });
  });
});
