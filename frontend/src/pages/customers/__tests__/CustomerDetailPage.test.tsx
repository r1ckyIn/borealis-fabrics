/**
 * Unit tests for CustomerDetailPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CustomerDetailPage from '../CustomerDetailPage';
import type { Customer, CustomerPricing, Order, PaginatedResult } from '@/types';
import { CreditType, OrderItemStatus, CustomerPayStatus } from '@/types';

// Mock hooks
const mockUseCustomer = vi.fn();
const mockUseCustomerPricing = vi.fn();
const mockUseCustomerOrders = vi.fn();
const mockUseCreateCustomerPricing = vi.fn();
const mockUseUpdateCustomerPricing = vi.fn();
const mockUseDeleteCustomerPricing = vi.fn();
const mockUseDeleteCustomer = vi.fn();

vi.mock('@/hooks/queries/useCustomers', () => ({
  useCustomer: (...args: unknown[]) => mockUseCustomer(...args),
  useCustomerPricing: (...args: unknown[]) => mockUseCustomerPricing(...args),
  useCustomerOrders: (...args: unknown[]) => mockUseCustomerOrders(...args),
  useCreateCustomerPricing: () => mockUseCreateCustomerPricing(),
  useUpdateCustomerPricing: () => mockUseUpdateCustomerPricing(),
  useDeleteCustomerPricing: () => mockUseDeleteCustomerPricing(),
  useDeleteCustomer: () => mockUseDeleteCustomer(),
}));

// Mock fabric API
vi.mock('@/api', () => ({
  fabricApi: {
    getFabrics: vi.fn().mockResolvedValue({ items: [] }),
  },
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
    {
      province: '上海市',
      city: '上海市',
      district: '徐汇区',
      detailAddress: '漕溪北路100号',
      contactName: '赵六',
      contactPhone: '13600136000',
      isDefault: false,
    },
  ],
  creditType: CreditType.CREDIT,
  creditDays: 45,
  notes: '重要客户',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockPricing: CustomerPricing[] = [
  {
    id: 1,
    customerId: 1,
    fabricId: 10,
    specialPrice: 28,
    fabric: {
      id: 10,
      fabricCode: 'FB-2401-0001',
      name: '高档涤纶面料',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const mockOrders: PaginatedResult<Order> = {
  items: [
    {
      id: 1,
      orderCode: 'ORD-2401-0001',
      customerId: 1,
      status: OrderItemStatus.PENDING,
      totalAmount: 5000,
      customerPaid: 0,
      customerPayStatus: CustomerPayStatus.UNPAID,
      createdAt: '2024-01-15T00:00:00.000Z',
      updatedAt: '2024-01-15T00:00:00.000Z',
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

    // Default mock implementations
    mockUseCustomer.mockReturnValue({
      data: mockCustomer,
      isLoading: false,
      error: null,
    });

    mockUseCustomerPricing.mockReturnValue({
      data: mockPricing,
      isLoading: false,
    });

    mockUseCustomerOrders.mockReturnValue({
      data: mockOrders,
      isLoading: false,
    });

    // Mock all mutations
    mockUseCreateCustomerPricing.mockReturnValue(createMockMutation());
    mockUseUpdateCustomerPricing.mockReturnValue(createMockMutation());
    mockUseDeleteCustomerPricing.mockReturnValue(createMockMutation());
    mockUseDeleteCustomer.mockReturnValue(createMockMutation());
  });

  describe('Rendering', () => {
    it('should render page with customer name', async () => {
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getAllByText('上海服饰有限公司').length).toBeGreaterThan(0);
      });
    });

    it('should render edit button', async () => {
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('编辑')).toBeInTheDocument();
      });
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

    it('should show basic info tab by default', async () => {
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('公司名称')).toBeInTheDocument();
      });
      expect(screen.getByText('联系人')).toBeInTheDocument();
      expect(screen.getByText('电话')).toBeInTheDocument();
    });
  });

  describe('Basic Info Display', () => {
    it('should display customer field labels', async () => {
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('公司名称')).toBeInTheDocument();
      });
      expect(screen.getByText('联系人')).toBeInTheDocument();
      expect(screen.getByText('电话')).toBeInTheDocument();
      expect(screen.getByText('微信')).toBeInTheDocument();
      expect(screen.getByText('邮箱')).toBeInTheDocument();
      expect(screen.getByText('结算方式')).toBeInTheDocument();
    });

    it('should display customer values correctly', async () => {
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getAllByText('上海服饰有限公司').length).toBeGreaterThan(0);
      });
      expect(screen.getAllByText('王五').length).toBeGreaterThan(0);
      expect(screen.getByText('13700137000')).toBeInTheDocument();
      expect(screen.getByText('wang_wu')).toBeInTheDocument();
      expect(screen.getByText('wangwu@example.com')).toBeInTheDocument();
      expect(screen.getByText('账期')).toBeInTheDocument();
      expect(screen.getByText('45 天')).toBeInTheDocument();
      expect(screen.getByText('重要客户')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching customer', async () => {
      mockUseCustomer.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('加载中...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error result when fetch fails', async () => {
      mockUseCustomer.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
      });
      expect(screen.getByText('无法加载客户信息，请稍后重试')).toBeInTheDocument();
    });

    it('should show back to list button on error', async () => {
      const user = userEvent.setup();

      mockUseCustomer.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('返回列表')).toBeInTheDocument();
      });

      const backButton = screen.getByText('返回列表').closest('button');
      await user.click(backButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/customers');
    });
  });

  describe('404 Handling', () => {
    it('should show 404 result when customer not found', async () => {
      mockUseCustomer.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('客户不存在')).toBeInTheDocument();
      });
      expect(screen.getByText('您访问的客户不存在或已被删除')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to edit page when clicking edit button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('编辑')).toBeInTheDocument();
      });

      const editButton = screen.getByText('编辑').closest('button');
      await user.click(editButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/customers/1/edit');
    });
  });

  describe('Tab Switching', () => {
    it('should switch to addresses tab', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('收货地址')).toBeInTheDocument();
      });

      const addressesTab = screen.getByText('收货地址');
      await user.click(addressesTab);

      await waitFor(() => {
        expect(screen.getByText(/王五 13700137000/)).toBeInTheDocument();
      });
    });

    it('should show address with label and default tag', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('收货地址')).toBeInTheDocument();
      });

      const addressesTab = screen.getByText('收货地址');
      await user.click(addressesTab);

      await waitFor(() => {
        expect(screen.getByText('公司')).toBeInTheDocument();
      });
      expect(screen.getByText('默认')).toBeInTheDocument();
    });

    it('should switch to pricing tab', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('特殊定价')).toBeInTheDocument();
      });

      const pricingTab = screen.getByText('特殊定价');
      await user.click(pricingTab);

      await waitFor(() => {
        expect(screen.getByText('添加定价')).toBeInTheDocument();
      });
    });

    it('should show pricing data in table', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('特殊定价')).toBeInTheDocument();
      });

      const pricingTab = screen.getByText('特殊定价');
      await user.click(pricingTab);

      await waitFor(() => {
        expect(screen.getByText('FB-2401-0001')).toBeInTheDocument();
      });
      expect(screen.getByText('高档涤纶面料')).toBeInTheDocument();
    });

    it('should switch to orders tab', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('订单历史')).toBeInTheDocument();
      });

      const ordersTab = screen.getByText('订单历史');
      await user.click(ordersTab);

      await waitFor(() => {
        expect(screen.getByText('ORD-2401-0001')).toBeInTheDocument();
      });
    });
  });

  describe('Addresses Tab', () => {
    it('should show multiple addresses', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('收货地址')).toBeInTheDocument();
      });

      const addressesTab = screen.getByText('收货地址');
      await user.click(addressesTab);

      await waitFor(() => {
        expect(screen.getByText(/王五 13700137000/)).toBeInTheDocument();
      });
      expect(screen.getByText(/赵六 13600136000/)).toBeInTheDocument();
    });

    it('should show empty state when no addresses', async () => {
      mockUseCustomer.mockReturnValue({
        data: { ...mockCustomer, addresses: null },
        isLoading: false,
        error: null,
      });

      const user = userEvent.setup();
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('收货地址')).toBeInTheDocument();
      });

      const addressesTab = screen.getByText('收货地址');
      await user.click(addressesTab);

      await waitFor(() => {
        expect(screen.getByText('暂无收货地址')).toBeInTheDocument();
      });
    });
  });

  describe('Pricing Tab', () => {
    it('should open add pricing modal', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('特殊定价')).toBeInTheDocument();
      });

      const pricingTab = screen.getByText('特殊定价');
      await user.click(pricingTab);

      await waitFor(() => {
        expect(screen.getByText('添加定价')).toBeInTheDocument();
      });

      const addButton = screen.getByText('添加定价').closest('button');
      await user.click(addButton!);

      await waitFor(() => {
        expect(screen.getByText('添加特殊定价')).toBeInTheDocument();
      });
    });

    it('should have clickable fabric code link', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('特殊定价')).toBeInTheDocument();
      });

      const pricingTab = screen.getByText('特殊定价');
      await user.click(pricingTab);

      await waitFor(() => {
        expect(screen.getByText('FB-2401-0001')).toBeInTheDocument();
      });

      const fabricLink = screen.getByText('FB-2401-0001');
      await user.click(fabricLink);

      expect(mockNavigate).toHaveBeenCalledWith('/fabrics/10');
    }, 15000);
  });
});
