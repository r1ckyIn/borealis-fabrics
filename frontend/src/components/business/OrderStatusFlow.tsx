/**
 * OrderStatusFlow - Visual workflow display for order item status progression.
 * Shows 8 forward states as Steps and CANCELLED as a separate Tag.
 */

import { Steps, Tag } from 'antd';

import {
  OrderItemStatus,
  ORDER_ITEM_STATUS_LABELS,
} from '@/types';
import {
  getStatusFlowSteps,
  getStatusColor,
  getValidNextStatuses,
} from '@/utils/statusHelpers';

export interface OrderStatusFlowProps {
  currentStatus: OrderItemStatus;
  onStatusClick?: (status: OrderItemStatus) => void;
  interactive?: boolean;
  size?: 'small' | 'default';
}

export function OrderStatusFlow({
  currentStatus,
  onStatusClick,
  interactive = false,
  size = 'default',
}: OrderStatusFlowProps) {
  const isCancelled = currentStatus === OrderItemStatus.CANCELLED;
  const flowSteps = getStatusFlowSteps(currentStatus);
  const validNextStatuses = interactive
    ? getValidNextStatuses(currentStatus)
    : [];

  const stepItems = flowSteps.map((step) => {
    let status: 'finish' | 'process' | 'wait' | 'error' = 'wait';
    if (isCancelled) {
      status = 'wait';
    } else if (step.isCompleted) {
      status = 'finish';
    } else if (step.isCurrent) {
      status = 'process';
    }

    const isClickable =
      interactive &&
      !isCancelled &&
      validNextStatuses.includes(step.status) &&
      step.status !== OrderItemStatus.CANCELLED;

    return {
      title: isClickable ? (
        <span
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
          onClick={() => onStatusClick?.(step.status)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onStatusClick?.(step.status);
          }}
        >
          {step.label}
        </span>
      ) : (
        step.label
      ),
      status,
      disabled: isCancelled,
    };
  });

  return (
    <div>
      <Steps
        items={stepItems}
        size={size}
        style={isCancelled ? { opacity: 0.4 } : undefined}
      />
      {isCancelled && (
        <div style={{ marginTop: 8 }}>
          <Tag color={getStatusColor(OrderItemStatus.CANCELLED)}>
            {ORDER_ITEM_STATUS_LABELS[OrderItemStatus.CANCELLED]}
          </Tag>
        </div>
      )}
    </div>
  );
}
