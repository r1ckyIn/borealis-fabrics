/**
 * Unit tests for CustomerDetailPage orchestrator component.
 * Mocks useCustomerDetail hook and all 4 sub-components.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CustomerDetailPage from '../CustomerDetailPage';
import type { Customer } from '@/types';
import { CreditType } from '@/types';

// Mock useCustomerDetail hook
const mockUseCustomerDetail = vi.fn();
vi.mock('@/hooks/useCustomerDetail', () => ({
  useCustomerDetail: (...args: unknown[]) => mockUseCustomerDetail(...args),
}));

// Mock sub-components to avoid deep rendering
vi.mock('../components/CustomerBasicInfo', () => ({
  CustomerBasicInfo: () => <div data-testid="customer-basic-info">Basic Info</div>,
}));
vi.mock('../components/CustomerAddressTab', () => ({
  CustomerAddressTab: () => <div data-testid="customer-address-tab">Addresses</div>,
}));
vi.mock('../components/CustomerPricingTab', () => ({
  CustomerPricingTab: () => <div data-testid="customer-pricing-tab">Pricing</div>,
}));
vi.mock('../components/CustomerOrdersTab', () => ({
  CustomerOrdersTab: () => <div data-testid="customer-orders-tab">Orders</div>,
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

// Mock customer data
const mockCustomer: Customer = {
  id: 1,
  companyName: '上海服饰有限公司',
  contactName: '王五',
  phone: '13700137000',
  wechat: 'wang_wu',
  email: 'wangwu@example.com',
  addresses: [
    {
      province: '上海市',
      city: '上海市',
      district: '浦东新区',
      detailAddress: '世纪大道100号',
      contactName: '王五',
      contactPhone: '13700137000',
      label: '公司',
      isDefault: true,
    },
  ],
  creditType: CreditType.CREDIT,
  creditDays: 45,
  notes: '重要客户',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/** Create a default mock return value for useCustomerDetail. */
function createDefaultHookReturn(overrides?: Record<string, unknown>) {
  const mockSetActiveTab = vi.fn();
  const mockSetDeleteModalOpen = vi.fn();
  const mockHandleDelete = vi.fn();
  const mockGoToList = vi.fn();
  const mockGoToEdit = vi.fn();
  const mockGoToOrderDetail = vi.fn();
  const mockGoToFabricDetail = vi.fn();

  return {
    data: {
      customer: mockCustomer,
      isLoading: false,
      fetchError: null,
    },
    tabs: {
      activeTab: 'info',
      setActiveTab: mockSetActiveTab,
    },
    deleteCustomer: {
      modalOpen: false,
      setModalOpen: mockSetDeleteModalOpen,
      handle: mockHandleDelete,
      isDeleting: false,
    },
    pricing: {
      data: [],
      isLoading: false,
      modal: {
        open: false,
        editing: null,
        form: {},
        isSubmitting: false,
        onOpenCreate: vi.fn(),
        onOpenEdit: vi.fn(),
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        searchFabrics: vi.fn(),
      },
      deletePricing: {
        open: false,
        target: null,
        isDeleting: false,
        onOpen: vi.fn(),
        onClose: vi.fn(),
        onConfirm: vi.fn(),
      },
    },
    orders: {
      data: undefined,
      isLoading: false,
    },
    navigation: {
      goToList: mockGoToList,
      goToEdit: mockGoToEdit,
      goToOrderDetail: mockGoToOrderDetail,
      goToFabricDetail: mockGoToFabricDetail,
    },
    breadcrumbs: [
      { label: '首页', path: '/' },
      { label: '客户管理', path: '/customers' },
      { label: '上海服饰有限公司' },
    ],
    ...overrides,
  };
}

// Helper to render with providers
function renderWithProviders(
  ui: React.ReactElement,
  { initialEntries = ['/customers/1'] } = {}
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
          <Route path="/customers/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CustomerDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCustomerDetail.mockReturnValue(createDefaultHookReturn());
  });

  describe('Rendering', () => {
    it('should render page with customer name', async () => {
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getAllByText('上海服饰有限公司').length).toBeGreaterThan(0);
      });
    });

    it('should render edit and delete buttons', async () => {
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getAllByText('编辑').length).toBeGreaterThan(0);
      });
      expect(screen.getAllByText('删除').length).toBeGreaterThan(0);
    });

    it('should render all four tabs', async () => {
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('基本信息')).toBeInTheDocument();
      });
      expect(screen.getByText('收货地址')).toBeInTheDocument();
      expect(screen.getByText('特殊定价')).toBeInTheDocument();
      expect(screen.getByText('订单历史')).toBeInTheDocument();
    });

    it('should render basic info sub-component by default', async () => {
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('customer-basic-info')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching customer', async () => {
      mockUseCustomerDetail.mockReturnValue(
        createDefaultHookReturn({
          data: { customer: undefined, isLoading: true, fetchError: null },
        })
      );

      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('加载中...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error result when fetch fails', async () => {
      mockUseCustomerDetail.mockReturnValue(
        createDefaultHookReturn({
          data: { customer: undefined, isLoading: false, fetchError: new Error('Network error') },
        })
      );

      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
      });
      expect(screen.getByText('无法加载客户信息，请稍后重试')).toBeInTheDocument();
    });

    it('should show back to list button on error', async () => {
      const mockGoToList = vi.fn();
      mockUseCustomerDetail.mockReturnValue(
        createDefaultHookReturn({
          data: { customer: undefined, isLoading: false, fetchError: new Error('Network error') },
          navigation: {
            goToList: mockGoToList,
            goToEdit: vi.fn(),
            goToOrderDetail: vi.fn(),
            goToFabricDetail: vi.fn(),
          },
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('返回列表')).toBeInTheDocument();
      });

      const backButton = screen.getByText('返回列表').closest('button');
      await user.click(backButton!);

      expect(mockGoToList).toHaveBeenCalled();
    });
  });

  describe('404 Handling', () => {
    it('should show 404 result when customer not found', async () => {
      mockUseCustomerDetail.mockReturnValue(
        createDefaultHookReturn({
          data: { customer: null, isLoading: false, fetchError: null },
        })
      );

      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('客户不存在')).toBeInTheDocument();
      });
      expect(screen.getByText('您访问的客户不存在或已被删除')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should call goToEdit when clicking edit button', async () => {
      const mockGoToEdit = vi.fn();
      mockUseCustomerDetail.mockReturnValue(
        createDefaultHookReturn({
          navigation: {
            goToList: vi.fn(),
            goToEdit: mockGoToEdit,
            goToOrderDetail: vi.fn(),
            goToFabricDetail: vi.fn(),
          },
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getAllByText('编辑').length).toBeGreaterThan(0);
      });

      const editButton = screen.getAllByText('编辑')[0].closest('button');
      await user.click(editButton!);

      expect(mockGoToEdit).toHaveBeenCalled();
    });
  });

  describe('Delete Customer', () => {
    it('should open delete modal when clicking delete button', async () => {
      const mockSetDeleteModalOpen = vi.fn();
      mockUseCustomerDetail.mockReturnValue(
        createDefaultHookReturn({
          deleteCustomer: {
            modalOpen: false,
            setModalOpen: mockSetDeleteModalOpen,
            handle: vi.fn(),
            isDeleting: false,
          },
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getAllByText('删除').length).toBeGreaterThan(0);
      });

      const deleteButton = screen.getAllByText('删除')[0].closest('button');
      await user.click(deleteButton!);

      expect(mockSetDeleteModalOpen).toHaveBeenCalledWith(true);
    });
  });

  describe('Sub-component rendering', () => {
    it('should render active tab sub-component (basic info by default)', async () => {
      renderWithProviders(<CustomerDetailPage />);

      // Only the active tab content is rendered in the DOM
      await waitFor(() => {
        expect(screen.getByTestId('customer-basic-info')).toBeInTheDocument();
      });
    });

    it('should pass customerId to useCustomerDetail hook', () => {
      renderWithProviders(<CustomerDetailPage />);

      // Verify the hook was called with the customerId from URL params
      expect(mockUseCustomerDetail).toHaveBeenCalledWith(1);
    });
  });
});
