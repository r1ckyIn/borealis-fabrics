/**
 * Order detail header section with basic info and status flow visualization.
 */

import { Card, Descriptions, Button, Typography } from 'antd';
import type { NavigateFunction } from 'react-router-dom';

import { StatusTag } from '@/components/common/StatusTag';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { OrderStatusFlow } from '@/components/business/OrderStatusFlow';
import { formatDate } from '@/utils';
import type { Order } from '@/types';
import type { OrderItemStatus } from '@/types';

const { Text } = Typography;

export interface OrderInfoSectionProps {
  order: Order;
  aggregateStatus: OrderItemStatus;
  navigate: NavigateFunction;
}

export function OrderInfoSection({
  order,
  aggregateStatus,
  navigate,
}: OrderInfoSectionProps): React.ReactElement {
  return (
    <Card style={{ marginBottom: 16 }}>
      <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
        <Descriptions.Item label="订单号">
          <Text strong>{order.orderCode}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="客户">
          {order.customer ? (
            <Button
              type="link"
              style={{ padding: 0 }}
              onClick={() => navigate(`/customers/${order.customerId}`)}
            >
              {order.customer.companyName}
            </Button>
          ) : (
            '-'
          )}
        </Descriptions.Item>
        <Descriptions.Item label="聚合状态">
          <StatusTag type="orderItem" value={aggregateStatus} />
        </Descriptions.Item>
        <Descriptions.Item label="合计金额">
          <AmountDisplay value={order.totalAmount} />
        </Descriptions.Item>
        <Descriptions.Item label="付款状态">
          <StatusTag type="customerPay" value={order.customerPayStatus} />
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {formatDate(order.createdAt)}
        </Descriptions.Item>
        <Descriptions.Item label="更新时间">
          {formatDate(order.updatedAt)}
        </Descriptions.Item>
        <Descriptions.Item label="交货地址" span={2}>
          {order.deliveryAddress ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="备注" span={3}>
          {order.notes ?? '-'}
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 16 }}>
        <OrderStatusFlow currentStatus={aggregateStatus} size="small" />
      </div>
    </Card>
  );
}
