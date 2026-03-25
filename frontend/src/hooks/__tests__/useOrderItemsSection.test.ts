/**
 * Unit tests for useOrderItemsSection custom hook.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { OrderItemStatus } from '@/types';
import type { OrderItem } from '@/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMutateAsync = vi.fn().mockResolvedValue(undefined);

const createMockMutation = () => ({
  mutateAsync: mockMutateAsync,
  isPending: false,
});

vi.mock('@/hooks/queries/useOrders', () => ({
  useAddOrderItem: () => createMockMutation(),
  useUpdateOrderItem: () => createMockMutation(),
  useDeleteOrderItem: () => createMockMutation(),
  useUpdateOrderItemStatus: () => createMockMutation(),
  useCancelOrderItem: () => createMockMutation(),
  useRestoreOrderItem: () => createMockMutation(),
}));

// Mock Ant Design Form.useForm
const mockResetFields = vi.fn();
const mockSetFieldsValue = vi.fn();
const mockValidateFields = vi.fn().mockResolvedValue({});

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    Form: {
      ...((actual as Record<string, unknown>).Form as Record<string, unknown>),
      useForm: () => [
        {
          resetFields: mockResetFields,
          setFieldsValue: mockSetFieldsValue,
          validateFields: mockValidateFields,
          getFieldsValue: vi.fn().mockReturnValue({}),
          setFields: vi.fn(),
          getFieldValue: vi.fn(),
          getFieldError: vi.fn().mockReturnValue([]),
          getFieldsError: vi.fn().mockReturnValue([]),
          isFieldTouched: vi.fn().mockReturnValue(false),
          isFieldsTouched: vi.fn().mockReturnValue(false),
          isFieldValidating: vi.fn().mockReturnValue(false),
          scrollToField: vi.fn(),
          submit: vi.fn(),
        },
      ],
    },
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

vi.mock('@/utils', () => ({
  getStatusLabel: (status: string) => status,
}));

vi.mock('@/utils/errorMessages', () => ({
  getErrorMessage: () => 'Error occurred',
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockOrderItem: OrderItem = {
  id: 1,
  orderId: 100,
  fabricId: 10,
  supplierId: 20,
  quantity: 50,
  salePrice: 25.5,
  purchasePrice: 18.0,
  subtotal: 1275,
  unit: '米',
  status: OrderItemStatus.ORDERED,
  prevStatus: null,
  deliveryDate: '2026-04-15',
  notes: 'Test item',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useOrderItemsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Lazy import to ensure mocks are applied
  async function getHook() {
    const { useOrderItemsSection } = await import('../useOrderItemsSection');
    return useOrderItemsSection;
  }

  describe('Initial State', () => {
    it('should return closed modals and no processing state', async () => {
      const useOrderItemsSection = await getHook();
      const { result } = renderHook(() => useOrderItemsSection(100));

      // Item form modals closed
      expect(result.current.itemForm.addOpen).toBe(false);
      expect(result.current.itemForm.editModal.open).toBe(false);
      expect(result.current.itemForm.editModal.item).toBeNull();

      // Status action modals closed
      expect(result.current.statusActions.statusModal.open).toBe(false);
      expect(result.current.statusActions.statusModal.item).toBeNull();
      expect(result.current.statusActions.statusModal.targetStatus).toBeNull();
      expect(result.current.statusActions.cancelModal.open).toBe(false);
      expect(result.current.statusActions.cancelModal.item).toBeNull();
      expect(result.current.statusActions.restoreModal.open).toBe(false);
      expect(result.current.statusActions.restoreModal.item).toBeNull();

      // No processing
      expect(result.current.itemForm.isAdding).toBe(false);
      expect(result.current.itemForm.isEditing).toBe(false);
      expect(result.current.statusActions.isStatusChanging).toBe(false);
      expect(result.current.statusActions.isCancelling).toBe(false);
      expect(result.current.statusActions.isRestoring).toBe(false);
      expect(result.current.deleteItem.isDeleting).toBe(false);
    }, 30000);

    it('should provide form instances', async () => {
      const useOrderItemsSection = await getHook();
      const { result } = renderHook(() => useOrderItemsSection(100));

      expect(result.current.itemForm.addForm).toBeDefined();
      expect(result.current.itemForm.editForm).toBeDefined();
      expect(result.current.statusActions.statusForm).toBeDefined();
      expect(result.current.statusActions.cancelForm).toBeDefined();
    });
  });

  describe('Item Form Modal', () => {
    it('should open add modal and reset fields', async () => {
      const useOrderItemsSection = await getHook();
      const { result } = renderHook(() => useOrderItemsSection(100));

      act(() => {
        result.current.itemForm.onAdd();
      });

      expect(result.current.itemForm.addOpen).toBe(true);
      expect(mockResetFields).toHaveBeenCalled();
    });

    it('should close add modal', async () => {
      const useOrderItemsSection = await getHook();
      const { result } = renderHook(() => useOrderItemsSection(100));

      act(() => {
        result.current.itemForm.onAdd();
      });
      expect(result.current.itemForm.addOpen).toBe(true);

      act(() => {
        result.current.itemForm.onCloseAdd();
      });
      expect(result.current.itemForm.addOpen).toBe(false);
    });

    it('should open edit modal with item data', async () => {
      const useOrderItemsSection = await getHook();
      const { result } = renderHook(() => useOrderItemsSection(100));

      act(() => {
        result.current.itemForm.onEdit(mockOrderItem);
      });

      expect(result.current.itemForm.editModal.open).toBe(true);
      expect(result.current.itemForm.editModal.item).toEqual(mockOrderItem);
      expect(mockSetFieldsValue).toHaveBeenCalledWith(
        expect.objectContaining({
          fabricId: mockOrderItem.fabricId,
          quantity: mockOrderItem.quantity,
          salePrice: mockOrderItem.salePrice,
        })
      );
    });

    it('should close edit modal', async () => {
      const useOrderItemsSection = await getHook();
      const { result } = renderHook(() => useOrderItemsSection(100));

      act(() => {
        result.current.itemForm.onEdit(mockOrderItem);
      });

      act(() => {
        result.current.itemForm.onCloseEdit();
      });

      expect(result.current.itemForm.editModal.open).toBe(false);
      expect(result.current.itemForm.editModal.item).toBeNull();
    });
  });

  describe('Status Actions', () => {
    it('should open status change modal with item and target status', async () => {
      const useOrderItemsSection = await getHook();
      const { result } = renderHook(() => useOrderItemsSection(100));

      act(() => {
        result.current.statusActions.onStatusChange(
          mockOrderItem,
          OrderItemStatus.PRODUCTION
        );
      });

      expect(result.current.statusActions.statusModal.open).toBe(true);
      expect(result.current.statusActions.statusModal.item).toEqual(mockOrderItem);
      expect(result.current.statusActions.statusModal.targetStatus).toBe(
        OrderItemStatus.PRODUCTION
      );
      expect(mockResetFields).toHaveBeenCalled();
    });

    it('should close status modal', async () => {
      const useOrderItemsSection = await getHook();
      const { result } = renderHook(() => useOrderItemsSection(100));

      act(() => {
        result.current.statusActions.onStatusChange(
          mockOrderItem,
          OrderItemStatus.PRODUCTION
        );
      });

      act(() => {
        result.current.statusActions.onCloseStatus();
      });

      expect(result.current.statusActions.statusModal.open).toBe(false);
      expect(result.current.statusActions.statusModal.item).toBeNull();
      expect(result.current.statusActions.statusModal.targetStatus).toBeNull();
    });

    it('should open cancel modal with item', async () => {
      const useOrderItemsSection = await getHook();
      const { result } = renderHook(() => useOrderItemsSection(100));

      act(() => {
        result.current.statusActions.onCancel(mockOrderItem);
      });

      expect(result.current.statusActions.cancelModal.open).toBe(true);
      expect(result.current.statusActions.cancelModal.item).toEqual(mockOrderItem);
    });

    it('should close cancel modal', async () => {
      const useOrderItemsSection = await getHook();
      const { result } = renderHook(() => useOrderItemsSection(100));

      act(() => {
        result.current.statusActions.onCancel(mockOrderItem);
      });

      act(() => {
        result.current.statusActions.onCloseCancel();
      });

      expect(result.current.statusActions.cancelModal.open).toBe(false);
      expect(result.current.statusActions.cancelModal.item).toBeNull();
    });

    it('should open restore modal with item', async () => {
      const useOrderItemsSection = await getHook();
      const { result } = renderHook(() => useOrderItemsSection(100));

      act(() => {
        result.current.statusActions.onRestore(mockOrderItem);
      });

      expect(result.current.statusActions.restoreModal.open).toBe(true);
      expect(result.current.statusActions.restoreModal.item).toEqual(mockOrderItem);
    });

    it('should close restore modal', async () => {
      const useOrderItemsSection = await getHook();
      const { result } = renderHook(() => useOrderItemsSection(100));

      act(() => {
        result.current.statusActions.onRestore(mockOrderItem);
      });

      act(() => {
        result.current.statusActions.onCloseRestore();
      });

      expect(result.current.statusActions.restoreModal.open).toBe(false);
      expect(result.current.statusActions.restoreModal.item).toBeNull();
    });
  });

  describe('Handler Functions', () => {
    it('should provide delete handler', async () => {
      const useOrderItemsSection = await getHook();
      const { result } = renderHook(() => useOrderItemsSection(100));

      expect(typeof result.current.deleteItem.handle).toBe('function');
    });

    it('should provide submit handlers for add and edit', async () => {
      const useOrderItemsSection = await getHook();
      const { result } = renderHook(() => useOrderItemsSection(100));

      expect(typeof result.current.itemForm.onSubmitAdd).toBe('function');
      expect(typeof result.current.itemForm.onSubmitEdit).toBe('function');
    });

    it('should provide confirm handlers for status actions', async () => {
      const useOrderItemsSection = await getHook();
      const { result } = renderHook(() => useOrderItemsSection(100));

      expect(typeof result.current.statusActions.onConfirmStatus).toBe('function');
      expect(typeof result.current.statusActions.onConfirmCancel).toBe('function');
      expect(typeof result.current.statusActions.onConfirmRestore).toBe('function');
    });
  });
});
