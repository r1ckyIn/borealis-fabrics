/**
 * PaymentStatusCard - Displays payment status for customer or supplier payments.
 * Shows progress, amounts, payment method, and status tags.
 */

import { Card, Progress, Statistic, Tag, Row, Col, Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';

import { formatCurrency, formatDateTime } from '@/utils/format';
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
  payMethod,
  paidAt,
  supplierName,
  loading = false,
  onEdit,
}: PaymentStatusCardProps) {
  const total = Number(totalAmount) || 0;
  const paid = Number(paidAmount) || 0;
  const unpaidAmount = total - paid;
  const progressPercent =
    total > 0 ? Math.round((paid / total) * 100) : 0;

  // Derive status from amounts, not DB value
  const derivedStatus: string =
    paid <= 0 ? 'unpaid' : total > 0 && paid >= total ? 'paid' : 'partial';
  const statusColor = getPayStatusColor(derivedStatus);
  let progressStrokeColor = '#ff4d4f';
  if (progressPercent >= 100) {
    progressStrokeColor = '#52c41a';
  } else if (progressPercent > 0) {
    progressStrokeColor = '#faad14';
  }

  const title =
    type === 'customer'
      ? '客户付款'
      : `供应商付款${supplierName ? ` - ${supplierName}` : ''}`;

  const statusLabel =
    CUSTOMER_PAY_STATUS_LABELS[derivedStatus as CustomerPayStatus] ?? derivedStatus;

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
            value={formatCurrency(total)}
            valueStyle={{ fontSize: 14 }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="已付"
            value={formatCurrency(paid)}
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
