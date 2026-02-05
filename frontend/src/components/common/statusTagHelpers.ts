import type { PresetColorType, PresetStatusColorType } from 'antd/es/_util/colors';
import {
  OrderItemStatus,
  ORDER_ITEM_STATUS_LABELS,
  QuoteStatus,
  QUOTE_STATUS_LABELS,
  SupplierStatus,
  SUPPLIER_STATUS_LABELS,
  CustomerPayStatus,
  CUSTOMER_PAY_STATUS_LABELS,
} from '@/types';

export type StatusType = 'orderItem' | 'quote' | 'supplier' | 'customerPay';

export type AntdTagColor = PresetColorType | PresetStatusColorType | string;

const ORDER_ITEM_COLORS: Record<OrderItemStatus, AntdTagColor> = {
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

const QUOTE_COLORS: Record<QuoteStatus, AntdTagColor> = {
  [QuoteStatus.ACTIVE]: 'success',
  [QuoteStatus.EXPIRED]: 'error',
  [QuoteStatus.CONVERTED]: 'processing',
};

const SUPPLIER_COLORS: Record<SupplierStatus, AntdTagColor> = {
  [SupplierStatus.ACTIVE]: 'success',
  [SupplierStatus.SUSPENDED]: 'warning',
  [SupplierStatus.ELIMINATED]: 'error',
};

const CUSTOMER_PAY_COLORS: Record<CustomerPayStatus, AntdTagColor> = {
  [CustomerPayStatus.UNPAID]: 'error',
  [CustomerPayStatus.PARTIAL]: 'warning',
  [CustomerPayStatus.PAID]: 'success',
};

export function getStatusTagColor(type: StatusType, value: string): AntdTagColor {
  switch (type) {
    case 'orderItem':
      return ORDER_ITEM_COLORS[value as OrderItemStatus] ?? 'default';
    case 'quote':
      return QUOTE_COLORS[value as QuoteStatus] ?? 'default';
    case 'supplier':
      return SUPPLIER_COLORS[value as SupplierStatus] ?? 'default';
    case 'customerPay':
      return CUSTOMER_PAY_COLORS[value as CustomerPayStatus] ?? 'default';
    default:
      return 'default';
  }
}

export function getStatusTagLabel(type: StatusType, value: string): string {
  switch (type) {
    case 'orderItem':
      return ORDER_ITEM_STATUS_LABELS[value as OrderItemStatus] ?? value;
    case 'quote':
      return QUOTE_STATUS_LABELS[value as QuoteStatus] ?? value;
    case 'supplier':
      return SUPPLIER_STATUS_LABELS[value as SupplierStatus] ?? value;
    case 'customerPay':
      return CUSTOMER_PAY_STATUS_LABELS[value as CustomerPayStatus] ?? value;
    default:
      return value;
  }
}
