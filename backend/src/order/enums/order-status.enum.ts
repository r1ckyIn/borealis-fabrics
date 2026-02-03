/**
 * Order item status enum.
 * Represents the 9-state workflow for order items.
 */
export enum OrderItemStatus {
  INQUIRY = 'INQUIRY', // Inquiring
  PENDING = 'PENDING', // Pending order
  ORDERED = 'ORDERED', // Order placed
  PRODUCTION = 'PRODUCTION', // In production
  QC = 'QC', // Quality check
  SHIPPED = 'SHIPPED', // Shipped
  RECEIVED = 'RECEIVED', // Received
  COMPLETED = 'COMPLETED', // Completed
  CANCELLED = 'CANCELLED', // Cancelled
}

/**
 * Customer payment status enum.
 */
export enum CustomerPayStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
}

/**
 * Payment method enum.
 */
export enum PaymentMethod {
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
  BANK = 'bank',
  CREDIT = 'credit',
}

/**
 * Status priority for aggregate calculation.
 * Lower index = lower progress = higher priority for aggregate status.
 * CANCELLED is excluded from aggregate calculation.
 */
export const STATUS_PRIORITY: OrderItemStatus[] = [
  OrderItemStatus.INQUIRY,
  OrderItemStatus.PENDING,
  OrderItemStatus.ORDERED,
  OrderItemStatus.PRODUCTION,
  OrderItemStatus.QC,
  OrderItemStatus.SHIPPED,
  OrderItemStatus.RECEIVED,
  OrderItemStatus.COMPLETED,
];

/**
 * Calculate aggregate order status from item statuses.
 * Returns the lowest progress status (excluding CANCELLED).
 * If all items are CANCELLED, returns CANCELLED.
 */
export function calculateAggregateStatus(
  itemStatuses: OrderItemStatus[],
): OrderItemStatus {
  const activeStatuses = itemStatuses.filter(
    (s) => s !== OrderItemStatus.CANCELLED,
  );

  if (activeStatuses.length === 0) {
    return OrderItemStatus.CANCELLED;
  }

  // Find the lowest priority (earliest in workflow)
  let lowestIndex = STATUS_PRIORITY.length;
  for (const status of activeStatuses) {
    const index = STATUS_PRIORITY.indexOf(status);
    if (index !== -1 && index < lowestIndex) {
      lowestIndex = index;
    }
  }

  return STATUS_PRIORITY[lowestIndex] ?? OrderItemStatus.INQUIRY;
}
