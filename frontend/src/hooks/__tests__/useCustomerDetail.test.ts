/**
 * Unit tests for useCustomerDetail custom hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useCustomerDetail } from '../useCustomerDetail';
import type { Customer } from '@/types';
import { CreditType } from '@/types';

// Mock individual query hooks
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
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock antd message + Form
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
  wechat: null,
  email: null,
  addresses: [],
  creditType: CreditType.CREDIT,
  creditDays: 30,
  notes: null,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/** Helper to create a default mutation mock. */
function createMockMutation() {
  return {
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  };
}

/** QueryClientProvider wrapper for renderHook. */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useCustomerDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseCustomer.mockReturnValue({
      data: mockCustomer,
      isLoading: false,
      error: null,
    });

    mockUseCustomerPricing.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseCustomerOrders.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    mockUseCreateCustomerPricing.mockReturnValue(createMockMutation());
    mockUseUpdateCustomerPricing.mockReturnValue(createMockMutation());
    mockUseDeleteCustomerPricing.mockReturnValue(createMockMutation());
    mockUseDeleteCustomer.mockReturnValue(createMockMutation());
  });

  describe('Initial State', () => {
    it('should have activeTab set to info by default', () => {
      const { result } = renderHook(() => useCustomerDetail(1), {
        wrapper: createWrapper(),
      });

      expect(result.current.tabs.activeTab).toBe('info');
    });

    it('should have modals closed by default', () => {
      const { result } = renderHook(() => useCustomerDetail(1), {
        wrapper: createWrapper(),
      });

      expect(result.current.deleteCustomer.modalOpen).toBe(false);
      expect(result.current.pricing.modal.open).toBe(false);
      expect(result.current.pricing.deletePricing.open).toBe(false);
    });

    it('should return customer data from query', () => {
      const { result } = renderHook(() => useCustomerDetail(1), {
        wrapper: createWrapper(),
      });

      expect(result.current.data.customer).toEqual(mockCustomer);
      expect(result.current.data.isLoading).toBe(false);
      expect(result.current.data.fetchError).toBeNull();
    });
  });

  describe('Tab Switching', () => {
    it('should update activeTab when setActiveTab is called', () => {
      const { result } = renderHook(() => useCustomerDetail(1), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.tabs.setActiveTab('pricing');
      });

      expect(result.current.tabs.activeTab).toBe('pricing');
    });
  });

  describe('Query Calls', () => {
    it('should call useCustomer with the provided customerId', () => {
      renderHook(() => useCustomerDetail(42), {
        wrapper: createWrapper(),
      });

      expect(mockUseCustomer).toHaveBeenCalledWith(42);
    });

    it('should call useCustomerPricing only when pricing tab is active', () => {
      const { result } = renderHook(() => useCustomerDetail(1), {
        wrapper: createWrapper(),
      });

      // Initially tab is 'info', so pricing should not be enabled
      expect(mockUseCustomerPricing).toHaveBeenCalledWith(1, false);

      // Switch to pricing tab
      act(() => {
        result.current.tabs.setActiveTab('pricing');
      });

      expect(mockUseCustomerPricing).toHaveBeenCalledWith(1, true);
    });

    it('should call useCustomerOrders only when orders tab is active', () => {
      const { result } = renderHook(() => useCustomerDetail(1), {
        wrapper: createWrapper(),
      });

      // Initially tab is 'info'
      expect(mockUseCustomerOrders).toHaveBeenCalledWith(1, undefined, false);

      // Switch to orders tab
      act(() => {
        result.current.tabs.setActiveTab('orders');
      });

      expect(mockUseCustomerOrders).toHaveBeenCalledWith(1, undefined, true);
    });
  });

  describe('Error Propagation', () => {
    it('should propagate fetchError from useCustomer', () => {
      const testError = new Error('Network error');
      mockUseCustomer.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: testError,
      });

      const { result } = renderHook(() => useCustomerDetail(1), {
        wrapper: createWrapper(),
      });

      expect(result.current.data.fetchError).toBe(testError);
    });

    it('should propagate isLoading from useCustomer', () => {
      mockUseCustomer.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() => useCustomerDetail(1), {
        wrapper: createWrapper(),
      });

      expect(result.current.data.isLoading).toBe(true);
    });
  });

  describe('Breadcrumbs', () => {
    it('should include customer company name in breadcrumbs', () => {
      const { result } = renderHook(() => useCustomerDetail(1), {
        wrapper: createWrapper(),
      });

      expect(result.current.breadcrumbs).toEqual([
        { label: '首页', path: '/' },
        { label: '客户管理', path: '/customers' },
        { label: '上海服饰有限公司' },
      ]);
    });

    it('should show fallback label when customer is undefined', () => {
      mockUseCustomer.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() => useCustomerDetail(1), {
        wrapper: createWrapper(),
      });

      expect(result.current.breadcrumbs[2].label).toBe('客户详情');
    });
  });

  describe('Navigation', () => {
    it('should navigate to customer list on goToList', () => {
      const { result } = renderHook(() => useCustomerDetail(1), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.navigation.goToList();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/customers');
    });

    it('should navigate to edit page on goToEdit', () => {
      const { result } = renderHook(() => useCustomerDetail(1), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.navigation.goToEdit();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/customers/1/edit');
    });

    it('should navigate to order detail on goToOrderDetail', () => {
      const { result } = renderHook(() => useCustomerDetail(1), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.navigation.goToOrderDetail(42);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/orders/42');
    });

    it('should navigate to fabric detail on goToFabricDetail', () => {
      const { result } = renderHook(() => useCustomerDetail(1), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.navigation.goToFabricDetail(10);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/fabrics/10');
    });
  });

  describe('Delete Customer Modal', () => {
    it('should open and close delete customer modal', () => {
      const { result } = renderHook(() => useCustomerDetail(1), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.deleteCustomer.setModalOpen(true);
      });

      expect(result.current.deleteCustomer.modalOpen).toBe(true);

      act(() => {
        result.current.deleteCustomer.setModalOpen(false);
      });

      expect(result.current.deleteCustomer.modalOpen).toBe(false);
    });
  });
});
