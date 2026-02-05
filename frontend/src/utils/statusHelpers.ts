/**
 * Status helper utilities for order item workflow.
 * Core business logic for 9-state status workflow.
 */

import {
  OrderItemStatus,
  STATUS_PRIORITY,
  MODIFIABLE_STATUSES,
  ORDER_ITEM_STATUS_LABELS,
} from '@/types';

// =====================
// Status transition rules
// =====================

/**
 * Valid status transitions from each state.
 * Key: current status, Value: array of valid next statuses
 */
const VALID_STATUS_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  [OrderItemStatus.INQUIRY]: [OrderItemStatus.PENDING, OrderItemStatus.CANCELLED],
  [OrderItemStatus.PENDING]: [OrderItemStatus.ORDERED, OrderItemStatus.CANCELLED],
  [OrderItemStatus.ORDERED]: [OrderItemStatus.PRODUCTION, OrderItemStatus.CANCELLED],
  [OrderItemStatus.PRODUCTION]: [OrderItemStatus.QC, OrderItemStatus.CANCELLED],
  [OrderItemStatus.QC]: [OrderItemStatus.SHIPPED, OrderItemStatus.CANCELLED],
  [OrderItemStatus.SHIPPED]: [OrderItemStatus.RECEIVED, OrderItemStatus.CANCELLED],
  [OrderItemStatus.RECEIVED]: [OrderItemStatus.COMPLETED, OrderItemStatus.CANCELLED],
  [OrderItemStatus.COMPLETED]: [OrderItemStatus.CANCELLED],
  [OrderItemStatus.CANCELLED]: [], // Can only be restored via special restore operation
};

/**
 * Status colors for Ant Design components.
 */
const STATUS_COLORS: Record<OrderItemStatus, string> = {
  [OrderItemStatus.INQUIRY]: 'default',
  [OrderItemStatus.PENDING]: 'warning',
  [OrderItemStatus.ORDERED]: 'processing',
  [OrderItemStatus.PRODUCTION]: 'processing',
  [OrderItemStatus.QC]: 'processing',
  [OrderItemStatus.SHIPPED]: 'cyan',
  [OrderItemStatus.RECEIVED]: 'blue',
  [OrderItemStatus.COMPLETED]: 'success',
  [OrderItemStatus.CANCELLED]: 'error',
};

/**
 * Status progress percentages for visualization.
 */
const STATUS_PROGRESS: Record<OrderItemStatus, number> = {
  [OrderItemStatus.INQUIRY]: 0,
  [OrderItemStatus.PENDING]: 12.5,
  [OrderItemStatus.ORDERED]: 25,
  [OrderItemStatus.PRODUCTION]: 37.5,
  [OrderItemStatus.QC]: 50,
  [OrderItemStatus.SHIPPED]: 62.5,
  [OrderItemStatus.RECEIVED]: 75,
  [OrderItemStatus.COMPLETED]: 100,
  [OrderItemStatus.CANCELLED]: 0,
};

// =====================
// Status transition functions
// =====================

/**
 * Check if a status transition is valid.
 * @param from - Current status
 * @param to - Target status
 * @returns true if the transition is allowed
 */
export function isValidStatusTransition(
  from: OrderItemStatus,
  to: OrderItemStatus
): boolean {
  const validTransitions = VALID_STATUS_TRANSITIONS[from];
  return validTransitions.includes(to);
}

/**
 * Get all valid next statuses from current status.
 * @param current - Current status
 * @returns Array of valid next statuses
 */
export function getValidNextStatuses(current: OrderItemStatus): OrderItemStatus[] {
  return [...VALID_STATUS_TRANSITIONS[current]];
}

/**
 * Get the next forward status (excluding CANCELLED).
 * @param current - Current status
 * @returns Next forward status or null if at end of workflow
 */
export function getNextForwardStatus(
  current: OrderItemStatus
): OrderItemStatus | null {
  const validNext = VALID_STATUS_TRANSITIONS[current];
  const forwardStatus = validNext.find((s) => s !== OrderItemStatus.CANCELLED);
  return forwardStatus ?? null;
}

// =====================
// Aggregate status calculation
// =====================

/**
 * Calculate aggregate status from multiple order item statuses.
 * Returns the lowest progress status (excluding CANCELLED).
 * If all items are CANCELLED, returns CANCELLED.
 *
 * @param itemStatuses - Array of order item statuses
 * @returns Aggregate status for the order
 */
export function calculateAggregateStatus(
  itemStatuses: OrderItemStatus[]
): OrderItemStatus {
  // Empty array returns CANCELLED
  if (itemStatuses.length === 0) {
    return OrderItemStatus.CANCELLED;
  }

  // Filter out CANCELLED statuses
  const activeStatuses = itemStatuses.filter(
    (s) => s !== OrderItemStatus.CANCELLED
  );

  // All cancelled -> return CANCELLED
  if (activeStatuses.length === 0) {
    return OrderItemStatus.CANCELLED;
  }

  // Find the lowest priority status (earliest in workflow)
  let lowestIndex = STATUS_PRIORITY.length;

  for (const status of activeStatuses) {
    const index = STATUS_PRIORITY.indexOf(status);
    if (index !== -1 && index < lowestIndex) {
      lowestIndex = index;
    }
  }

  return STATUS_PRIORITY[lowestIndex];
}

// =====================
// Permission checks
// =====================

/**
 * Check if an order item can be modified (quantity, price, etc.).
 * Only INQUIRY and PENDING statuses allow modification.
 * @param status - Current status
 * @returns true if item can be modified
 */
export function canModifyItem(status: OrderItemStatus): boolean {
  return MODIFIABLE_STATUSES.includes(status);
}

/**
 * Check if an order item can be deleted.
 * Only INQUIRY and PENDING statuses allow deletion.
 * @param status - Current status
 * @returns true if item can be deleted
 */
export function canDeleteItem(status: OrderItemStatus): boolean {
  return MODIFIABLE_STATUSES.includes(status);
}

/**
 * Check if an order item can be cancelled.
 * All statuses except CANCELLED can be cancelled.
 * @param status - Current status
 * @returns true if item can be cancelled
 */
export function canCancelItem(status: OrderItemStatus): boolean {
  return status !== OrderItemStatus.CANCELLED;
}

/**
 * Check if a cancelled order item can be restored.
 * Requires the item to be CANCELLED and have a previous status.
 * @param status - Current status
 * @param previousStatus - Previous status before cancellation (may be null)
 * @returns true if item can be restored
 */
export function canRestoreItem(
  status: OrderItemStatus,
  previousStatus: OrderItemStatus | null | undefined
): boolean {
  return status === OrderItemStatus.CANCELLED && previousStatus != null;
}

// =====================
// Status display helpers
// =====================

/**
 * Get the Chinese label for a status.
 * @param status - The status
 * @returns Chinese label
 */
export function getStatusLabel(status: OrderItemStatus): string {
  return ORDER_ITEM_STATUS_LABELS[status] ?? status;
}

/**
 * Get the Ant Design color for a status.
 * @param status - The status
 * @returns Color string for Ant Design Tag/Badge
 */
export function getStatusColor(status: OrderItemStatus): string {
  return STATUS_COLORS[status] ?? 'default';
}

/**
 * Get the progress percentage for a status.
 * @param status - The status
 * @returns Progress percentage (0-100)
 */
export function getStatusProgress(status: OrderItemStatus): number {
  return STATUS_PROGRESS[status] ?? 0;
}

/**
 * Status info object for display.
 */
export interface StatusInfo {
  status: OrderItemStatus;
  label: string;
  color: string;
  progress: number;
  canModify: boolean;
  canDelete: boolean;
  canCancel: boolean;
}

/**
 * Get complete status information for display.
 * @param status - The status
 * @returns StatusInfo object
 */
export function getStatusInfo(status: OrderItemStatus): StatusInfo {
  return {
    status,
    label: getStatusLabel(status),
    color: getStatusColor(status),
    progress: getStatusProgress(status),
    canModify: canModifyItem(status),
    canDelete: canDeleteItem(status),
    canCancel: canCancelItem(status),
  };
}

// =====================
// Workflow visualization
// =====================

/**
 * Flow step for status visualization.
 */
export interface FlowStep {
  status: OrderItemStatus;
  label: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isPending: boolean;
}

/**
 * Get flow steps for workflow visualization.
 * @param currentStatus - Current status
 * @returns Array of flow steps
 */
export function getStatusFlowSteps(currentStatus: OrderItemStatus): FlowStep[] {
  const currentIndex = STATUS_PRIORITY.indexOf(currentStatus);
  const isCancelled = currentStatus === OrderItemStatus.CANCELLED;

  return STATUS_PRIORITY.map((status, index) => ({
    status,
    label: ORDER_ITEM_STATUS_LABELS[status],
    isCompleted: !isCancelled && currentIndex > index,
    isCurrent: !isCancelled && currentIndex === index,
    isPending: !isCancelled && currentIndex < index,
  }));
}

/**
 * Order status summary.
 */
export interface OrderStatusSummary {
  aggregateStatus: OrderItemStatus;
  aggregateLabel: string;
  aggregateColor: string;
  totalItems: number;
  completedItems: number;
  cancelledItems: number;
  inProgressItems: number;
  completionRate: number;
}

/**
 * Calculate order status summary from item statuses.
 * @param itemStatuses - Array of order item statuses
 * @returns OrderStatusSummary object
 */
export function calculateOrderStatusSummary(
  itemStatuses: OrderItemStatus[]
): OrderStatusSummary {
  const aggregateStatus = calculateAggregateStatus(itemStatuses);
  const totalItems = itemStatuses.length;
  const completedItems = itemStatuses.filter(
    (s) => s === OrderItemStatus.COMPLETED
  ).length;
  const cancelledItems = itemStatuses.filter(
    (s) => s === OrderItemStatus.CANCELLED
  ).length;
  const inProgressItems = totalItems - completedItems - cancelledItems;

  const activeItems = totalItems - cancelledItems;
  const completionRate = activeItems > 0 ? completedItems / activeItems : 0;

  return {
    aggregateStatus,
    aggregateLabel: getStatusLabel(aggregateStatus),
    aggregateColor: getStatusColor(aggregateStatus),
    totalItems,
    completedItems,
    cancelledItems,
    inProgressItems,
    completionRate,
  };
}
