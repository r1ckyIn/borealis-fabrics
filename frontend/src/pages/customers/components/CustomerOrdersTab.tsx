/**
 * Customer order history tab content.
 * Renders a read-only table of orders for this customer.
 */

import { useMemo } from 'react';
import { Table, Button, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { AmountDisplay } from '@/components/common/AmountDisplay';
import { formatDate } from '@/utils';
import {
  ORDER_ITEM_STATUS_LABELS,
  CUSTOMER_PAY_STATUS_LABELS,
} from '@/types';
import type {
  Order,
  PaginatedResult,
  OrderItemStatus,
  CustomerPayStatus,
} from '@/types';

/** Map payment status to tag color. */
const PAY_STATUS_COLORS: Record<CustomerPayStatus, string> = {
  paid: 'green',
  partial: 'orange',
  unpaid: 'default',
};

export interface CustomerOrdersTabProps {
  orders: PaginatedResult<Order> | undefined;
  isLoading: boolean;
  onViewOrder: (orderId: number) => void;
}

/**
 * Renders the order history table for the customer.
 */
export function CustomerOrdersTab({
  orders,
  isLoading,
  onViewOrder,
}: CustomerOrdersTabProps): React.ReactElement {
  const columns: ColumnsType<Order> = useMemo(
    () => [
      {
        title: '订单编号',
        dataIndex: 'orderCode',
        key: 'orderCode',
        width: 160,
        render: (code: string, record) => (
          <Button
            type="link"
            size="small"
            onClick={() => onViewOrder(record.id)}
            style={{ padding: 0 }}
          >
            {code}
          </Button>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: OrderItemStatus) => (
          <Tag>{ORDER_ITEM_STATUS_LABELS[status]}</Tag>
        ),
      },
      {
        title: '总金额',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 120,
        align: 'right',
        render: (amount: number) => <AmountDisplay value={amount} />,
      },
      {
        title: '付款状态',
        dataIndex: 'customerPayStatus',
        key: 'customerPayStatus',
        width: 100,
        render: (status: CustomerPayStatus) => (
          <Tag color={PAY_STATUS_COLORS[status]}>
            {CUSTOMER_PAY_STATUS_LABELS[status]}
          </Tag>
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        render: (date: string) => formatDate(date),
      },
    ],
    [onViewOrder]
  );

  return (
    <Table<Order>
      columns={columns}
      dataSource={orders?.items ?? []}
      rowKey="id"
      loading={isLoading}
      pagination={false}
      size="middle"
      locale={{ emptyText: '暂无订单记录' }}
    />
  );
}
