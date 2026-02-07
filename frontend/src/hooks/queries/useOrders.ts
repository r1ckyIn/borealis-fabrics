/**
 * TanStack Query hooks for Order module.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { orderApi } from '@/api';
import type {
  QueryOrderParams,
  CreateOrderData,
  UpdateOrderData,
  AddOrderItemData,
  UpdateOrderItemData,
  UpdateOrderItemStatusData,
  CancelOrderItemData,
  RestoreOrderItemData,
  UpdateCustomerPaymentData,
  UpdateSupplierPaymentData,
} from '@/types';

// =============================================================================
// Query Keys
// =============================================================================

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params: QueryOrderParams) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: number) => [...orderKeys.details(), id] as const,
  items: (orderId: number) =>
    [...orderKeys.detail(orderId), 'items'] as const,
  timeline: (orderId: number) =>
    [...orderKeys.detail(orderId), 'timeline'] as const,
  itemTimeline: (orderId: number, itemId: number) =>
    [...orderKeys.detail(orderId), 'items', itemId, 'timeline'] as const,
  supplierPayments: (orderId: number) =>
    [...orderKeys.detail(orderId), 'supplier-payments'] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch paginated list of orders.
 * @param params - Query parameters (pagination, filters)
 * @param enabled - Whether to enable the query
 */
export function useOrders(params?: QueryOrderParams, enabled: boolean = true) {
  return useQuery({
    queryKey: orderKeys.list(params ?? {}),
    queryFn: () => orderApi.getOrders(params),
    enabled,
  });
}

/**
 * Fetch a single order by ID.
 * @param id - Order ID
 * @param enabled - Whether to enable the query
 */
export function useOrder(id: number | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: orderKeys.detail(id!),
    queryFn: () => orderApi.getOrder(id!),
    enabled: enabled && id !== undefined,
  });
}

/**
 * Fetch order items for an order.
 * @param orderId - Order ID
 * @param enabled - Whether to enable the query
 */
export function useOrderItems(
  orderId: number | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: orderKeys.items(orderId!),
    queryFn: () => orderApi.getOrderItems(orderId!),
    enabled: enabled && orderId !== undefined,
  });
}

/**
 * Fetch order timeline (all item status changes).
 * @param orderId - Order ID
 * @param enabled - Whether to enable the query
 */
export function useOrderTimeline(
  orderId: number | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: orderKeys.timeline(orderId!),
    queryFn: () => orderApi.getOrderTimeline(orderId!),
    enabled: enabled && orderId !== undefined,
  });
}

/**
 * Fetch timeline for a specific order item.
 * @param orderId - Order ID
 * @param itemId - Order item ID
 * @param enabled - Whether to enable the query
 */
export function useOrderItemTimeline(
  orderId: number | undefined,
  itemId: number | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: orderKeys.itemTimeline(orderId!, itemId!),
    queryFn: () => orderApi.getOrderItemTimeline(orderId!, itemId!),
    enabled: enabled && orderId !== undefined && itemId !== undefined,
  });
}

/**
 * Fetch supplier payments for an order.
 * @param orderId - Order ID
 * @param enabled - Whether to enable the query
 */
export function useSupplierPayments(
  orderId: number | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: orderKeys.supplierPayments(orderId!),
    queryFn: () => orderApi.getSupplierPayments(orderId!),
    enabled: enabled && orderId !== undefined,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/** Create a new order. */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrderData) => orderApi.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/** Update an existing order. */
export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOrderData }) =>
      orderApi.updateOrder(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
    },
  });
}

/** Delete an order. */
export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => orderApi.deleteOrder(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.removeQueries({ queryKey: orderKeys.detail(id) });
    },
  });
}

/** Add an item to an order. */
export function useAddOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: number;
      data: AddOrderItemData;
    }) => orderApi.addOrderItem(orderId, data),
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.items(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/** Update an order item. */
export function useUpdateOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      data,
    }: {
      orderId: number;
      itemId: number;
      data: UpdateOrderItemData;
    }) => orderApi.updateOrderItem(orderId, itemId, data),
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.items(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/** Delete an order item. */
export function useDeleteOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
    }: {
      orderId: number;
      itemId: number;
    }) => orderApi.deleteOrderItem(orderId, itemId),
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.items(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/** Update order item status. */
export function useUpdateOrderItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      data,
    }: {
      orderId: number;
      itemId: number;
      data: UpdateOrderItemStatusData;
    }) => orderApi.updateOrderItemStatus(orderId, itemId, data),
    onSuccess: (_data, { orderId, itemId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.items(orderId) });
      queryClient.invalidateQueries({
        queryKey: orderKeys.timeline(orderId),
      });
      queryClient.invalidateQueries({
        queryKey: orderKeys.itemTimeline(orderId, itemId),
      });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/** Cancel an order item. */
export function useCancelOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      data,
    }: {
      orderId: number;
      itemId: number;
      data?: CancelOrderItemData;
    }) => orderApi.cancelOrderItem(orderId, itemId, data),
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.items(orderId) });
      queryClient.invalidateQueries({
        queryKey: orderKeys.timeline(orderId),
      });
      queryClient.invalidateQueries({
        queryKey: orderKeys.supplierPayments(orderId),
      });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/** Restore a cancelled order item. */
export function useRestoreOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      data,
    }: {
      orderId: number;
      itemId: number;
      data?: RestoreOrderItemData;
    }) => orderApi.restoreOrderItem(orderId, itemId, data),
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.items(orderId) });
      queryClient.invalidateQueries({
        queryKey: orderKeys.timeline(orderId),
      });
      queryClient.invalidateQueries({
        queryKey: orderKeys.supplierPayments(orderId),
      });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/** Update customer payment info. */
export function useUpdateCustomerPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: number;
      data: UpdateCustomerPaymentData;
    }) => orderApi.updateCustomerPayment(orderId, data),
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/** Update a supplier payment. */
export function useUpdateSupplierPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      supplierId,
      data,
    }: {
      orderId: number;
      supplierId: number;
      data: UpdateSupplierPaymentData;
    }) => orderApi.updateSupplierPayment(orderId, supplierId, data),
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({
        queryKey: orderKeys.supplierPayments(orderId),
      });
    },
  });
}

// =============================================================================
// Utility Types
// =============================================================================

/** Parameters for useUpdateOrder mutation. */
export interface UpdateOrderParams {
  id: number;
  data: UpdateOrderData;
}

/** Parameters for useAddOrderItem mutation. */
export interface AddOrderItemParams {
  orderId: number;
  data: AddOrderItemData;
}

/** Parameters for useUpdateOrderItem mutation. */
export interface UpdateOrderItemParams {
  orderId: number;
  itemId: number;
  data: UpdateOrderItemData;
}

/** Parameters for useUpdateOrderItemStatus mutation. */
export interface UpdateOrderItemStatusParams {
  orderId: number;
  itemId: number;
  data: UpdateOrderItemStatusData;
}

/** Parameters for useCancelOrderItem mutation. */
export interface CancelOrderItemParams {
  orderId: number;
  itemId: number;
  data?: CancelOrderItemData;
}

/** Parameters for useRestoreOrderItem mutation. */
export interface RestoreOrderItemParams {
  orderId: number;
  itemId: number;
  data?: RestoreOrderItemData;
}

/** Parameters for useUpdateCustomerPayment mutation. */
export interface UpdateCustomerPaymentParams {
  orderId: number;
  data: UpdateCustomerPaymentData;
}

/** Parameters for useUpdateSupplierPayment mutation. */
export interface UpdateSupplierPaymentParams {
  orderId: number;
  supplierId: number;
  data: UpdateSupplierPaymentData;
}
