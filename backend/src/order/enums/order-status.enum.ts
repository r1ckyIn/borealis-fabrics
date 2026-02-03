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

/**
 * Valid status transitions map.
 * Key: current status, Value: array of valid next statuses.
 */
export const VALID_STATUS_TRANSITIONS: Record<
  OrderItemStatus,
  OrderItemStatus[]
> = {
  [OrderItemStatus.INQUIRY]: [
    OrderItemStatus.PENDING,
    OrderItemStatus.CANCELLED,
  ],
  [OrderItemStatus.PENDING]: [
    OrderItemStatus.ORDERED,
    OrderItemStatus.CANCELLED,
  ],
  [OrderItemStatus.ORDERED]: [
    OrderItemStatus.PRODUCTION,
    OrderItemStatus.CANCELLED,
  ],
  [OrderItemStatus.PRODUCTION]: [OrderItemStatus.QC, OrderItemStatus.CANCELLED],
  [OrderItemStatus.QC]: [OrderItemStatus.SHIPPED, OrderItemStatus.CANCELLED],
  [OrderItemStatus.SHIPPED]: [
    OrderItemStatus.RECEIVED,
    OrderItemStatus.CANCELLED,
  ],
  [OrderItemStatus.RECEIVED]: [
    OrderItemStatus.COMPLETED,
    OrderItemStatus.CANCELLED,
  ],
  [OrderItemStatus.COMPLETED]: [OrderItemStatus.CANCELLED],
  [OrderItemStatus.CANCELLED]: [], // Can be restored to prevStatus via separate endpoint
};

/**
 * Check if a status transition is valid.
 * @param fromStatus Current status
 * @param toStatus Target status
 * @returns true if transition is valid
 */
export function isValidStatusTransition(
  fromStatus: OrderItemStatus,
  toStatus: OrderItemStatus,
): boolean {
  const validTransitions = VALID_STATUS_TRANSITIONS[fromStatus];
  return validTransitions?.includes(toStatus) ?? false;
}

/**
 * Statuses that allow item modification (quantity, price, etc.).
 */
export const MODIFIABLE_STATUSES: OrderItemStatus[] = [
  OrderItemStatus.INQUIRY,
  OrderItemStatus.PENDING,
];

/**
 * Check if an item can be modified (quantity, price, etc.).
 * @param status Current item status
 * @returns true if item can be modified
 */
export function canModifyItem(status: OrderItemStatus): boolean {
  return MODIFIABLE_STATUSES.includes(status);
}

/**
 * Check if an item can be deleted.
 * Same rules as modification - only INQUIRY and PENDING.
 * @param status Current item status
 * @returns true if item can be deleted
 */
export function canDeleteItem(status: OrderItemStatus): boolean {
  return MODIFIABLE_STATUSES.includes(status);
}

/**
 * Check if an item can be cancelled.
 * All statuses except CANCELLED can be cancelled.
 * @param status Current item status
 * @returns true if item can be cancelled
 */
export function canCancelItem(status: OrderItemStatus): boolean {
  return status !== OrderItemStatus.CANCELLED;
}

/**
 * Check if a cancelled item can be restored.
 * @param status Current status (should be CANCELLED)
 * @param prevStatus Previous status before cancellation
 * @returns true if item can be restored
 */
export function canRestoreItem(
  status: OrderItemStatus,
  prevStatus: OrderItemStatus | null | undefined,
): boolean {
  return status === OrderItemStatus.CANCELLED && prevStatus != null;
}
