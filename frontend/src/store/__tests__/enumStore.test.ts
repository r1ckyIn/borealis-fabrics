/**
 * Tests for enumStore.
 */

import type { SystemEnumsResponse } from '@/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEnumStore } from '../enumStore';

// Mock the systemApi module
vi.mock('@/api', () => ({
  systemApi: {
    getEnums: vi.fn(),
  },
}));

// Import the mocked module to control it in tests
import { systemApi } from '@/api';

describe('enumStore', () => {
  const mockEnums: SystemEnumsResponse = {
    orderItemStatus: {
      values: ['PENDING', 'SHIPPED', 'DELIVERED'],
      labels: {
        PENDING: '待发货',
        SHIPPED: '已发货',
        DELIVERED: '已送达',
      },
    },
    customerPayStatus: {
      values: ['UNPAID', 'PARTIAL', 'PAID'],
      labels: {
        UNPAID: '未付款',
        PARTIAL: '部分付款',
        PAID: '已付款',
      },
    },
    paymentMethod: {
      values: ['CASH', 'TRANSFER', 'CHECK'],
      labels: {
        CASH: '现金',
        TRANSFER: '转账',
        CHECK: '支票',
      },
    },
    quoteStatus: {
      values: ['DRAFT', 'SENT', 'ACCEPTED'],
      labels: {
        DRAFT: '草稿',
        SENT: '已发送',
        ACCEPTED: '已接受',
      },
    },
    supplierStatus: {
      values: ['ACTIVE', 'INACTIVE'],
      labels: {
        ACTIVE: '活跃',
        INACTIVE: '不活跃',
      },
    },
    settleType: {
      values: ['PREPAID', 'COD', 'CREDIT'],
      labels: {
        PREPAID: '预付款',
        COD: '货到付款',
        CREDIT: '赊账',
      },
    },
  };

  beforeEach(() => {
    // Reset store state before each test
    useEnumStore.setState({
      enums: null,
      isLoading: false,
      isLoaded: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have null enums initially', () => {
      const state = useEnumStore.getState();
      expect(state.enums).toBeNull();
    });

    it('should not be loading initially', () => {
      const state = useEnumStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('should not be loaded initially', () => {
      const state = useEnumStore.getState();
      expect(state.isLoaded).toBe(false);
    });

    it('should have no error initially', () => {
      const state = useEnumStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('fetchEnums', () => {
    it('should fetch and store enums successfully', async () => {
      vi.mocked(systemApi.getEnums).mockResolvedValueOnce(mockEnums);

      const { fetchEnums } = useEnumStore.getState();
      await fetchEnums();

      const state = useEnumStore.getState();
      expect(state.enums).toEqual(mockEnums);
      expect(state.isLoaded).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should skip if already loaded', async () => {
      useEnumStore.setState({
        enums: mockEnums,
        isLoaded: true,
      });

      const { fetchEnums } = useEnumStore.getState();
      await fetchEnums();

      expect(systemApi.getEnums).not.toHaveBeenCalled();
    });

    it('should skip if currently loading', async () => {
      useEnumStore.setState({ isLoading: true });

      const { fetchEnums } = useEnumStore.getState();
      await fetchEnums();

      expect(systemApi.getEnums).not.toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      vi.mocked(systemApi.getEnums).mockRejectedValueOnce(
        new Error('Network error')
      );
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { fetchEnums } = useEnumStore.getState();
      await fetchEnums();

      const state = useEnumStore.getState();
      expect(state.enums).toBeNull();
      expect(state.isLoaded).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network error');

      consoleSpy.mockRestore();
    });
  });

  describe('refetchEnums', () => {
    it('should refetch even if already loaded', async () => {
      useEnumStore.setState({
        enums: mockEnums,
        isLoaded: true,
      });

      vi.mocked(systemApi.getEnums).mockResolvedValueOnce(mockEnums);

      const { refetchEnums } = useEnumStore.getState();
      await refetchEnums();

      expect(systemApi.getEnums).toHaveBeenCalled();
    });

    it('should update enums on refetch', async () => {
      const updatedEnums = {
        ...mockEnums,
        orderItemStatus: {
          values: ['NEW', 'PROCESSING', 'COMPLETE'],
          labels: {
            NEW: '新建',
            PROCESSING: '处理中',
            COMPLETE: '已完成',
          },
        },
      };
      vi.mocked(systemApi.getEnums).mockResolvedValueOnce(updatedEnums);

      const { refetchEnums } = useEnumStore.getState();
      await refetchEnums();

      const state = useEnumStore.getState();
      expect(state.enums).toEqual(updatedEnums);
    });
  });

  describe('getLabel', () => {
    beforeEach(() => {
      useEnumStore.setState({
        enums: mockEnums,
        isLoaded: true,
      });
    });

    it('should return label for valid enum value', () => {
      const { getLabel } = useEnumStore.getState();
      expect(getLabel('orderItemStatus', 'PENDING')).toBe('待发货');
    });

    it('should return value if label not found', () => {
      const { getLabel } = useEnumStore.getState();
      expect(getLabel('orderItemStatus', 'UNKNOWN')).toBe('UNKNOWN');
    });

    it('should return value if enums not loaded', () => {
      useEnumStore.setState({ enums: null });

      const { getLabel } = useEnumStore.getState();
      expect(getLabel('orderItemStatus', 'PENDING')).toBe('PENDING');
    });
  });

  describe('getValues', () => {
    beforeEach(() => {
      useEnumStore.setState({
        enums: mockEnums,
        isLoaded: true,
      });
    });

    it('should return values for enum', () => {
      const { getValues } = useEnumStore.getState();
      expect(getValues('orderItemStatus')).toEqual([
        'PENDING',
        'SHIPPED',
        'DELIVERED',
      ]);
    });

    it('should return empty array if enums not loaded', () => {
      useEnumStore.setState({ enums: null });

      const { getValues } = useEnumStore.getState();
      expect(getValues('orderItemStatus')).toEqual([]);
    });
  });

  describe('getEnumDefinition', () => {
    beforeEach(() => {
      useEnumStore.setState({
        enums: mockEnums,
        isLoaded: true,
      });
    });

    it('should return enum definition', () => {
      const { getEnumDefinition } = useEnumStore.getState();
      expect(getEnumDefinition('orderItemStatus')).toEqual(
        mockEnums.orderItemStatus
      );
    });

    it('should return null if enums not loaded', () => {
      useEnumStore.setState({ enums: null });

      const { getEnumDefinition } = useEnumStore.getState();
      expect(getEnumDefinition('orderItemStatus')).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      useEnumStore.setState({
        enums: mockEnums,
        isLoaded: true,
        isLoading: false,
        error: 'some error',
      });

      const { reset } = useEnumStore.getState();
      reset();

      const state = useEnumStore.getState();
      expect(state.enums).toBeNull();
      expect(state.isLoaded).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
