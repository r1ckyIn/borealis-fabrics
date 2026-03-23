/**
 * Unit tests for useFabricDetail custom hook.
 */

import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { createElement } from 'react';

import { useFabricDetail } from '../useFabricDetail';
import type { Fabric } from '@/types';

// Mock all query hooks from useFabrics
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
const mockUseDeleteFabric = vi.fn();

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
  useDeleteFabric: () => mockUseDeleteFabric(),
}));

// Mock API calls
vi.mock('@/api/supplier.api', () => ({
  getSuppliers: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock('@/api/customer.api', () => ({
  getCustomers: vi.fn().mockResolvedValue({ items: [] }),
}));

// Helper to create default mock mutation return value
const createMockMutation = () => ({
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
});

const mockFabric: Fabric = {
  id: 1,
  fabricCode: 'FB-2401-0001',
  name: '测试面料',
  material: { primary: '涤纶' },
  defaultPrice: 25.5,
  defaultLeadTime: 7,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useFabricDetail', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseFabric.mockReturnValue({
      data: mockFabric,
      isLoading: false,
      error: null,
    });

    mockUseFabricSuppliers.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    mockUseFabricPricing.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

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
    mockUseDeleteFabric.mockReturnValue(createMockMutation());
  });

  it('should return initial state with activeTab as info', () => {
    const { result } = renderHook(() => useFabricDetail(1, mockNavigate), {
      wrapper: createWrapper(),
    });

    expect(result.current.tabs.activeTab).toBe('info');
    expect(result.current.deleteFabric.modalOpen).toBe(false);
  });

  it('should call useFabric with the correct fabricId', () => {
    renderHook(() => useFabricDetail(42, mockNavigate), {
      wrapper: createWrapper(),
    });

    expect(mockUseFabric).toHaveBeenCalledWith(42);
  });

  it('should return fabric data from the query', () => {
    const { result } = renderHook(() => useFabricDetail(1, mockNavigate), {
      wrapper: createWrapper(),
    });

    expect(result.current.data.fabric).toEqual(mockFabric);
    expect(result.current.data.isLoading).toBe(false);
    expect(result.current.data.fetchError).toBeNull();
  });

  it('should propagate fetch error', () => {
    const testError = new Error('fetch failed');
    mockUseFabric.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: testError,
    });

    const { result } = renderHook(() => useFabricDetail(1, mockNavigate), {
      wrapper: createWrapper(),
    });

    expect(result.current.data.fetchError).toBe(testError);
  });

  it('should update activeTab via setActiveTab', () => {
    const { result } = renderHook(() => useFabricDetail(1, mockNavigate), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.tabs.setActiveTab('suppliers');
    });

    expect(result.current.tabs.activeTab).toBe('suppliers');
  });

  it('should toggle delete modal open state', () => {
    const { result } = renderHook(() => useFabricDetail(1, mockNavigate), {
      wrapper: createWrapper(),
    });

    expect(result.current.deleteFabric.modalOpen).toBe(false);

    act(() => {
      result.current.deleteFabric.setModalOpen(true);
    });

    expect(result.current.deleteFabric.modalOpen).toBe(true);
  });

  it('should return breadcrumbs with fabric name', () => {
    const { result } = renderHook(() => useFabricDetail(1, mockNavigate), {
      wrapper: createWrapper(),
    });

    expect(result.current.breadcrumbs).toEqual([
      { label: '首页', path: '/' },
      { label: '面料管理', path: '/fabrics' },
      { label: '测试面料' },
    ]);
  });

  it('should return default breadcrumb label when fabric is undefined', () => {
    mockUseFabric.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useFabricDetail(1, mockNavigate), {
      wrapper: createWrapper(),
    });

    expect(result.current.breadcrumbs[2].label).toBe('面料详情');
  });
});
