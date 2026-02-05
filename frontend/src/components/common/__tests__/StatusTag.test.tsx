/**
 * Unit tests for StatusTag component.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusTag } from '../StatusTag';
import { getStatusTagColor, getStatusTagLabel } from '../statusTagHelpers';
import {
  OrderItemStatus,
  QuoteStatus,
  SupplierStatus,
  CustomerPayStatus,
} from '@/types';

describe('StatusTag', () => {
  describe('getStatusTagColor', () => {
    describe('orderItem type', () => {
      it('returns correct colors for all order item statuses', () => {
        expect(getStatusTagColor('orderItem', OrderItemStatus.INQUIRY)).toBe('default');
        expect(getStatusTagColor('orderItem', OrderItemStatus.PENDING)).toBe('warning');
        expect(getStatusTagColor('orderItem', OrderItemStatus.ORDERED)).toBe('processing');
        expect(getStatusTagColor('orderItem', OrderItemStatus.PRODUCTION)).toBe('processing');
        expect(getStatusTagColor('orderItem', OrderItemStatus.QC)).toBe('processing');
        expect(getStatusTagColor('orderItem', OrderItemStatus.SHIPPED)).toBe('cyan');
        expect(getStatusTagColor('orderItem', OrderItemStatus.RECEIVED)).toBe('blue');
        expect(getStatusTagColor('orderItem', OrderItemStatus.COMPLETED)).toBe('success');
        expect(getStatusTagColor('orderItem', OrderItemStatus.CANCELLED)).toBe('error');
      });
    });

    describe('quote type', () => {
      it('returns correct colors for all quote statuses', () => {
        expect(getStatusTagColor('quote', QuoteStatus.ACTIVE)).toBe('success');
        expect(getStatusTagColor('quote', QuoteStatus.EXPIRED)).toBe('error');
        expect(getStatusTagColor('quote', QuoteStatus.CONVERTED)).toBe('processing');
      });
    });

    describe('supplier type', () => {
      it('returns correct colors for all supplier statuses', () => {
        expect(getStatusTagColor('supplier', SupplierStatus.ACTIVE)).toBe('success');
        expect(getStatusTagColor('supplier', SupplierStatus.SUSPENDED)).toBe('warning');
        expect(getStatusTagColor('supplier', SupplierStatus.ELIMINATED)).toBe('error');
      });
    });

    describe('customerPay type', () => {
      it('returns correct colors for all customer payment statuses', () => {
        expect(getStatusTagColor('customerPay', CustomerPayStatus.UNPAID)).toBe('error');
        expect(getStatusTagColor('customerPay', CustomerPayStatus.PARTIAL)).toBe('warning');
        expect(getStatusTagColor('customerPay', CustomerPayStatus.PAID)).toBe('success');
      });
    });

    it('returns default for unknown status values', () => {
      expect(getStatusTagColor('orderItem', 'UNKNOWN')).toBe('default');
      expect(getStatusTagColor('quote', 'UNKNOWN')).toBe('default');
    });
  });

  describe('getStatusTagLabel', () => {
    describe('orderItem type', () => {
      it('returns correct labels for order item statuses', () => {
        expect(getStatusTagLabel('orderItem', OrderItemStatus.INQUIRY)).toBe('询价中');
        expect(getStatusTagLabel('orderItem', OrderItemStatus.COMPLETED)).toBe('已完成');
        expect(getStatusTagLabel('orderItem', OrderItemStatus.CANCELLED)).toBe('已取消');
      });
    });

    describe('quote type', () => {
      it('returns correct labels for quote statuses', () => {
        expect(getStatusTagLabel('quote', QuoteStatus.ACTIVE)).toBe('有效');
        expect(getStatusTagLabel('quote', QuoteStatus.EXPIRED)).toBe('已过期');
      });
    });

    describe('supplier type', () => {
      it('returns correct labels for supplier statuses', () => {
        expect(getStatusTagLabel('supplier', SupplierStatus.ACTIVE)).toBe('正常');
        expect(getStatusTagLabel('supplier', SupplierStatus.SUSPENDED)).toBe('暂停');
      });
    });

    describe('customerPay type', () => {
      it('returns correct labels for customer payment statuses', () => {
        expect(getStatusTagLabel('customerPay', CustomerPayStatus.UNPAID)).toBe('未付款');
        expect(getStatusTagLabel('customerPay', CustomerPayStatus.PAID)).toBe('已付清');
      });
    });

    it('returns the raw value for unknown statuses', () => {
      expect(getStatusTagLabel('orderItem', 'UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('StatusTag component', () => {
    it('renders order item status tag correctly', () => {
      render(<StatusTag type="orderItem" value={OrderItemStatus.COMPLETED} />);
      expect(screen.getByText('已完成')).toBeInTheDocument();
    });

    it('renders quote status tag correctly', () => {
      render(<StatusTag type="quote" value={QuoteStatus.ACTIVE} />);
      expect(screen.getByText('有效')).toBeInTheDocument();
    });

    it('renders supplier status tag correctly', () => {
      render(<StatusTag type="supplier" value={SupplierStatus.SUSPENDED} />);
      expect(screen.getByText('暂停')).toBeInTheDocument();
    });

    it('renders customer payment status tag correctly', () => {
      render(<StatusTag type="customerPay" value={CustomerPayStatus.PARTIAL} />);
      expect(screen.getByText('部分付款')).toBeInTheDocument();
    });

    it('renders with dot style when showDot is true', () => {
      render(
        <StatusTag
          type="orderItem"
          value={OrderItemStatus.PENDING}
          showDot
        />
      );
      expect(screen.getByText('待下单')).toBeInTheDocument();
    });
  });
});
