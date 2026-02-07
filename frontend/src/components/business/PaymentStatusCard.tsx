/**
 * PaymentStatusCard - Displays payment status for customer or supplier payments.
 * Shows progress, amounts, payment method, and status tags.
 */

import { Card, Progress, Statistic, Tag, Row, Col, Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';

import { formatCurrency } from '@/utils/format';
import { formatDateTime } from '@/utils/format';
import {
  CUSTOMER_PAY_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type CustomerPayStatus,
  type PaymentMethod,
} from '@/types';

export type PaymentViewType = 'customer' | 'supplier';

export interface PaymentStatusCardProps {
  type: PaymentViewType;
  totalAmount: number;
  paidAmount: number;
  payStatus: string;
  payMethod?: string | null;
  paidAt?: string | null;
  supplierName?: string;
  loading?: boolean;
  onEdit?: () => void;
}

/** Map pay status to tag color. */
function getPayStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return 'success';
    case 'partial':
      return 'warning';
    case 'unpaid':
    default:
      return 'error';
  }
}

export function PaymentStatusCard({
  type,
  totalAmount,
  paidAmount,
  payStatus,
  payMethod,
  paidAt,
  supplierName,
  loading = false,
  onEdit,
}: PaymentStatusCardProps) {
  const unpaidAmount = totalAmount - paidAmount;
  const progressPercent =
    totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  const statusColor = getPayStatusColor(payStatus);
  const progressStrokeColor =
    progressPercent >= 100
      ? '#52c41a'
      : progressPercent > 0
        ? '#faad14'
        : '#ff4d4f';

  const title =
    type === 'customer'
      ? '客户付款'
      : `供应商付款${supplierName ? ` - ${supplierName}` : ''}`;

  const statusLabel =
    type === 'customer'
      ? (CUSTOMER_PAY_STATUS_LABELS[payStatus as CustomerPayStatus] ??
        payStatus)
      : (CUSTOMER_PAY_STATUS_LABELS[payStatus as CustomerPayStatus] ??
        payStatus);

  const methodLabel = payMethod
    ? (PAYMENT_METHOD_LABELS[payMethod as PaymentMethod] ?? payMethod)
    : null;

  return (
    <Card
      title={title}
      loading={loading}
      size="small"
      extra={
        onEdit ? (
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={onEdit}
          >
            编辑
          </Button>
        ) : undefined
      }
    >
      <Progress
        percent={progressPercent}
        strokeColor={progressStrokeColor}
        size="small"
        format={(percent) => `${percent}%`}
      />

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Statistic
            title="应付"
            value={formatCurrency(totalAmount)}
            valueStyle={{ fontSize: 14 }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="已付"
            value={formatCurrency(paidAmount)}
            valueStyle={{ fontSize: 14, color: '#52c41a' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="未付"
            value={formatCurrency(unpaidAmount)}
            valueStyle={{
              fontSize: 14,
              color: unpaidAmount > 0 ? '#ff4d4f' : undefined,
            }}
          />
        </Col>
      </Row>

      <div style={{ marginTop: 12 }}>
        <Tag color={statusColor}>{statusLabel}</Tag>
        {methodLabel && <Tag>{methodLabel}</Tag>}
        {paidAt && (
          <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>
            {formatDateTime(paidAt)}
          </span>
        )}
      </div>
    </Card>
  );
}
