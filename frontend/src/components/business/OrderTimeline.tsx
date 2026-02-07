/**
 * OrderTimeline - Displays status change history for orders/order items.
 * Shows status transitions, remarks, operators, and timestamps.
 */

import { Timeline, Tag, Typography, Spin, Empty } from 'antd';

import type { OrderTimelineEntry, OrderItemStatus } from '@/types';
import { getStatusLabel, getStatusColor } from '@/utils/statusHelpers';
import { formatDateTime } from '@/utils/format';

const { Text } = Typography;

export interface OrderTimelineProps {
  entries: OrderTimelineEntry[];
  loading?: boolean;
  showItemInfo?: boolean;
}

export function OrderTimeline({
  entries,
  loading = false,
  showItemInfo = false,
}: OrderTimelineProps) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <Spin />
      </div>
    );
  }

  if (entries.length === 0) {
    return <Empty description="暂无状态记录" />;
  }

  const timelineItems = entries.map((entry) => {
    const toStatus = entry.toStatus as OrderItemStatus;
    const fromStatus = entry.fromStatus as OrderItemStatus | null;

    const statusTransition = fromStatus ? (
      <span>
        <Tag color={getStatusColor(fromStatus)}>
          {getStatusLabel(fromStatus)}
        </Tag>
        <span style={{ margin: '0 4px' }}>→</span>
        <Tag color={getStatusColor(toStatus)}>
          {getStatusLabel(toStatus)}
        </Tag>
      </span>
    ) : (
      <Tag color={getStatusColor(toStatus)}>
        {getStatusLabel(toStatus)}
      </Tag>
    );

    const itemInfo =
      showItemInfo && entry.orderItem ? (
        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
          [{entry.orderItem.fabric.fabricCode}]
        </Text>
      ) : null;

    const operatorInfo = entry.operator ? (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {entry.operator.name}
      </Text>
    ) : null;

    return {
      key: entry.id,
      children: (
        <div>
          <div>
            {statusTransition}
            {itemInfo}
          </div>
          {entry.remark && (
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {entry.remark}
              </Text>
            </div>
          )}
          <div style={{ marginTop: 4 }}>
            {operatorInfo}
            {operatorInfo && (
              <span style={{ margin: '0 4px', color: '#999' }}>·</span>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatDateTime(entry.createdAt)}
            </Text>
          </div>
        </div>
      ),
    };
  });

  return <Timeline items={timelineItems} />;
}
