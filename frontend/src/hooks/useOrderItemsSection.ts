/**
 * Custom hook managing all OrderItemsSection state + handlers.
 * Composes existing TanStack Query mutation hooks from useOrders.
 * Named useOrderItemsSection (not useOrderItems) to avoid collision
 * with the data-fetching hook in hooks/queries/useOrders.ts.
 */

import { useState, useCallback } from 'react';
import { Form, message } from 'antd';
import type { FormInstance } from 'antd';
import dayjs from 'dayjs';

import {
  useAddOrderItem,
  useUpdateOrderItem,
  useDeleteOrderItem,
  useUpdateOrderItemStatus,
  useCancelOrderItem,
  useRestoreOrderItem,
} from '@/hooks/queries/useOrders';
import { getStatusLabel } from '@/utils';
import { getErrorMessage } from '@/utils/errorMessages';
import { logger } from '@/utils/logger';
import { OrderItemStatus } from '@/types';
import type {
  OrderItem,
  AddOrderItemData,
  UpdateOrderItemData,
  ApiError,
} from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatusModalState {
  open: boolean;
  item: OrderItem | null;
  targetStatus: OrderItemStatus | null;
}

export interface ItemModalState {
  open: boolean;
  item: OrderItem | null;
}

export interface ItemFormControl {
  addOpen: boolean;
  editModal: ItemModalState;
  addForm: FormInstance;
  editForm: FormInstance;
  onAdd: () => void;
  onEdit: (item: OrderItem) => void;
  onCloseAdd: () => void;
  onCloseEdit: () => void;
  onSubmitAdd: () => Promise<void>;
  onSubmitEdit: () => Promise<void>;
  isAdding: boolean;
  isEditing: boolean;
}

export interface StatusActionControl {
  statusModal: StatusModalState;
  cancelModal: ItemModalState;
  restoreModal: ItemModalState;
  statusForm: FormInstance;
  cancelForm: FormInstance;
  onStatusChange: (item: OrderItem, targetStatus: OrderItemStatus) => void;
  onCancel: (item: OrderItem) => void;
  onRestore: (item: OrderItem) => void;
  onCloseStatus: () => void;
  onCloseCancel: () => void;
  onCloseRestore: () => void;
  onConfirmStatus: () => Promise<void>;
  onConfirmCancel: () => Promise<void>;
  onConfirmRestore: () => Promise<void>;
  isStatusChanging: boolean;
  isCancelling: boolean;
  isRestoring: boolean;
}

export interface DeleteItemControl {
  handle: (itemId: number) => Promise<void>;
  isDeleting: boolean;
}

export interface UseOrderItemsSectionReturn {
  itemForm: ItemFormControl;
  statusActions: StatusActionControl;
  deleteItem: DeleteItemControl;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOrderItemsSection(orderId: number): UseOrderItemsSectionReturn {
  // ---- Modal states ----
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItemModal, setEditItemModal] = useState<ItemModalState>({
    open: false,
    item: null,
  });
  const [statusModal, setStatusModal] = useState<StatusModalState>({
    open: false,
    item: null,
    targetStatus: null,
  });
  const [cancelModal, setCancelModal] = useState<ItemModalState>({
    open: false,
    item: null,
  });
  const [restoreModal, setRestoreModal] = useState<ItemModalState>({
    open: false,
    item: null,
  });

  // ---- Forms ----
  const [statusForm] = Form.useForm();
  const [cancelForm] = Form.useForm();
  const [addItemForm] = Form.useForm();
  const [editItemForm] = Form.useForm();

  // ---- Mutations ----
  const addItemMutation = useAddOrderItem();
  const updateItemMutation = useUpdateOrderItem();
  const deleteItemMutation = useDeleteOrderItem();
  const updateStatusMutation = useUpdateOrderItemStatus();
  const cancelItemMutation = useCancelOrderItem();
  const restoreItemMutation = useRestoreOrderItem();

  // ---- Add item handlers ----
  const openAddItem = useCallback(() => {
    addItemForm.resetFields();
    setAddItemOpen(true);
  }, [addItemForm]);

  const handleAddItem = useCallback(async (): Promise<void> => {
    try {
      const values = await addItemForm.validateFields();
      const data: AddOrderItemData = {
        fabricId: values.fabricId,
        supplierId: values.supplierId,
        quantity: values.quantity,
        salePrice: values.salePrice,
        purchasePrice: values.purchasePrice,
        deliveryDate: values.deliveryDate?.format('YYYY-MM-DD'),
        notes: values.notes,
      };
      await addItemMutation.mutateAsync({ orderId, data });
      message.success('明细已添加');
      setAddItemOpen(false);
    } catch (error) {
      logger.error('Add item failed', error);
      message.error(getErrorMessage(error as ApiError));
    }
  }, [orderId, addItemForm, addItemMutation]);

  // ---- Edit item handlers ----
  const openEditItem = useCallback(
    (item: OrderItem) => {
      editItemForm.setFieldsValue({
        fabricId: item.fabricId,
        supplierId: item.supplierId,
        quantity: item.quantity,
        salePrice: item.salePrice,
        purchasePrice: item.purchasePrice,
        deliveryDate: item.deliveryDate ? dayjs(item.deliveryDate) : undefined,
        notes: item.notes ?? undefined,
      });
      setEditItemModal({ open: true, item });
    },
    [editItemForm]
  );

  const handleEditItem = useCallback(async (): Promise<void> => {
    if (!editItemModal.item) return;
    try {
      const values = await editItemForm.validateFields();
      const data: UpdateOrderItemData = {
        supplierId: values.supplierId,
        quantity: values.quantity,
        salePrice: values.salePrice,
        purchasePrice: values.purchasePrice,
        deliveryDate: values.deliveryDate?.format('YYYY-MM-DD'),
        notes: values.notes,
      };
      await updateItemMutation.mutateAsync({
        orderId,
        itemId: editItemModal.item.id,
        data,
      });
      message.success('明细已更新');
      setEditItemModal({ open: false, item: null });
    } catch (error) {
      logger.error('Edit item failed', error);
      message.error(getErrorMessage(error as ApiError));
    }
  }, [orderId, editItemModal, editItemForm, updateItemMutation]);

  // ---- Delete item handler ----
  const handleDeleteItem = useCallback(
    async (itemId: number): Promise<void> => {
      try {
        await deleteItemMutation.mutateAsync({ orderId, itemId });
        message.success('明细已删除');
      } catch (error) {
        logger.error('Delete item failed', error);
        message.error(getErrorMessage(error as ApiError));
      }
    },
    [orderId, deleteItemMutation]
  );

  // ---- Status change handlers ----
  const openStatusModal = useCallback(
    (item: OrderItem, targetStatus: OrderItemStatus) => {
      statusForm.resetFields();
      setStatusModal({ open: true, item, targetStatus });
    },
    [statusForm]
  );

  const handleStatusChange = useCallback(async (): Promise<void> => {
    if (!statusModal.item || !statusModal.targetStatus) return;
    try {
      await updateStatusMutation.mutateAsync({
        orderId,
        itemId: statusModal.item.id,
        data: { status: statusModal.targetStatus },
      });
      message.success(`状态已更新为「${getStatusLabel(statusModal.targetStatus)}」`);
      setStatusModal({ open: false, item: null, targetStatus: null });
    } catch (error) {
      logger.error('Status change failed', error);
      message.error(getErrorMessage(error as ApiError));
    }
  }, [orderId, statusModal, updateStatusMutation]);

  // ---- Cancel item handlers ----
  const openCancelModal = useCallback(
    (item: OrderItem) => {
      cancelForm.resetFields();
      setCancelModal({ open: true, item });
    },
    [cancelForm]
  );

  const handleCancel = useCallback(async (): Promise<void> => {
    if (!cancelModal.item) return;
    try {
      const values = await cancelForm.validateFields();
      await cancelItemMutation.mutateAsync({
        orderId,
        itemId: cancelModal.item.id,
        data: values.reason ? { reason: values.reason } : undefined,
      });
      message.success('订单明细已取消');
      setCancelModal({ open: false, item: null });
    } catch (error) {
      logger.error('Cancel item failed', error);
      message.error(getErrorMessage(error as ApiError));
    }
  }, [orderId, cancelModal, cancelForm, cancelItemMutation]);

  // ---- Restore item handlers ----
  const openRestoreModal = useCallback((item: OrderItem) => {
    setRestoreModal({ open: true, item });
  }, []);

  const handleRestore = useCallback(async (): Promise<void> => {
    if (!restoreModal.item) return;
    try {
      await restoreItemMutation.mutateAsync({
        orderId,
        itemId: restoreModal.item.id,
      });
      message.success('订单明细已恢复');
      setRestoreModal({ open: false, item: null });
    } catch (error) {
      logger.error('Restore item failed', error);
      message.error(getErrorMessage(error as ApiError));
    }
  }, [orderId, restoreModal, restoreItemMutation]);

  // ---- Close handlers ----
  const closeAddItem = useCallback(() => setAddItemOpen(false), []);
  const closeEditItem = useCallback(() => setEditItemModal({ open: false, item: null }), []);
  const closeStatusModal = useCallback(
    () => setStatusModal({ open: false, item: null, targetStatus: null }),
    []
  );
  const closeCancelModal = useCallback(() => setCancelModal({ open: false, item: null }), []);
  const closeRestoreModal = useCallback(() => setRestoreModal({ open: false, item: null }), []);

  return {
    itemForm: {
      addOpen: addItemOpen,
      editModal: editItemModal,
      addForm: addItemForm,
      editForm: editItemForm,
      onAdd: openAddItem,
      onEdit: openEditItem,
      onCloseAdd: closeAddItem,
      onCloseEdit: closeEditItem,
      onSubmitAdd: handleAddItem,
      onSubmitEdit: handleEditItem,
      isAdding: addItemMutation.isPending,
      isEditing: updateItemMutation.isPending,
    },
    statusActions: {
      statusModal,
      cancelModal,
      restoreModal,
      statusForm,
      cancelForm,
      onStatusChange: openStatusModal,
      onCancel: openCancelModal,
      onRestore: openRestoreModal,
      onCloseStatus: closeStatusModal,
      onCloseCancel: closeCancelModal,
      onCloseRestore: closeRestoreModal,
      onConfirmStatus: handleStatusChange,
      onConfirmCancel: handleCancel,
      onConfirmRestore: handleRestore,
      isStatusChanging: updateStatusMutation.isPending,
      isCancelling: cancelItemMutation.isPending,
      isRestoring: restoreItemMutation.isPending,
    },
    deleteItem: {
      handle: handleDeleteItem,
      isDeleting: deleteItemMutation.isPending,
    },
  };
}
