/**
 * Order API endpoints.
 */

import type {
  PaginatedResult,
  Order,
  OrderItem,
  OrderTimelineEntry,
  SupplierPayment,
  PaymentRecord,
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

import { get, post, patch, del } from './client';

/** Get paginated list of orders. */
export function getOrders(
  params?: QueryOrderParams
): Promise<PaginatedResult<Order>> {
  return get<PaginatedResult<Order>>('/orders', params);
}

/** Get a single order by ID. */
export function getOrder(id: number): Promise<Order> {
  return get<Order>(`/orders/${id}`);
}

/** Create a new order. */
export function createOrder(data: CreateOrderData): Promise<Order> {
  return post<Order>('/orders', data);
}

/** Update an existing order. */
export function updateOrder(
  id: number,
  data: UpdateOrderData
): Promise<Order> {
  return patch<Order>(`/orders/${id}`, data);
}

/** Delete an order (soft delete). */
export function deleteOrder(id: number): Promise<void> {
  return del<void>(`/orders/${id}`);
}

/** Get order items for an order. */
export function getOrderItems(orderId: number): Promise<OrderItem[]> {
  return get<OrderItem[]>(`/orders/${orderId}/items`);
}

/** Add a new item to an order. */
export function addOrderItem(
  orderId: number,
  data: AddOrderItemData
): Promise<OrderItem> {
  return post<OrderItem>(`/orders/${orderId}/items`, data);
}

/** Update an order item. */
export function updateOrderItem(
  orderId: number,
  itemId: number,
  data: UpdateOrderItemData
): Promise<OrderItem> {
  return patch<OrderItem>(`/orders/${orderId}/items/${itemId}`, data);
}

/** Delete an order item. */
export function deleteOrderItem(
  orderId: number,
  itemId: number
): Promise<void> {
  return del<void>(`/orders/${orderId}/items/${itemId}`);
}

/** Update order item status. */
export function updateOrderItemStatus(
  orderId: number,
  itemId: number,
  data: UpdateOrderItemStatusData
): Promise<OrderItem> {
  return patch<OrderItem>(
    `/orders/${orderId}/items/${itemId}/status`,
    data
  );
}

/** Cancel an order item. */
export function cancelOrderItem(
  orderId: number,
  itemId: number,
  data?: CancelOrderItemData
): Promise<OrderItem> {
  return post<OrderItem>(
    `/orders/${orderId}/items/${itemId}/cancel`,
    data
  );
}

/** Restore a cancelled order item. */
export function restoreOrderItem(
  orderId: number,
  itemId: number,
  data?: RestoreOrderItemData
): Promise<OrderItem> {
  return post<OrderItem>(
    `/orders/${orderId}/items/${itemId}/restore`,
    data
  );
}

/** Get order timeline (all item status changes). */
export function getOrderTimeline(
  orderId: number
): Promise<OrderTimelineEntry[]> {
  return get<OrderTimelineEntry[]>(`/orders/${orderId}/timeline`);
}

/** Get timeline for a specific order item. */
export function getOrderItemTimeline(
  orderId: number,
  itemId: number
): Promise<OrderTimelineEntry[]> {
  return get<OrderTimelineEntry[]>(
    `/orders/${orderId}/items/${itemId}/timeline`
  );
}

/** Update customer payment info for an order. */
export function updateCustomerPayment(
  orderId: number,
  data: UpdateCustomerPaymentData
): Promise<Order> {
  return patch<Order>(`/orders/${orderId}/customer-payment`, data);
}

/** Get supplier payments for an order. */
export function getSupplierPayments(
  orderId: number
): Promise<SupplierPayment[]> {
  return get<SupplierPayment[]>(`/orders/${orderId}/supplier-payments`);
}

/** Update a supplier payment for an order. */
export function updateSupplierPayment(
  orderId: number,
  supplierId: number,
  data: UpdateSupplierPaymentData
): Promise<SupplierPayment> {
  return patch<SupplierPayment>(
    `/orders/${orderId}/supplier-payments/${supplierId}`,
    data
  );
}

/** Get payment vouchers (records with attached files) for an order. */
export function getPaymentVouchers(
  orderId: number
): Promise<PaymentRecord[]> {
  return get<PaymentRecord[]>(`/orders/${orderId}/payment-vouchers`);
}

export const orderApi = {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrderItems,
  addOrderItem,
  updateOrderItem,
  deleteOrderItem,
  updateOrderItemStatus,
  cancelOrderItem,
  restoreOrderItem,
  getOrderTimeline,
  getOrderItemTimeline,
  updateCustomerPayment,
  getSupplierPayments,
  updateSupplierPayment,
  getPaymentVouchers,
};
