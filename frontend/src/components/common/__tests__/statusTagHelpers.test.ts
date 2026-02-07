/**
 * Unit tests for statusTagHelpers functions.
 */

import { describe, it, expect } from 'vitest';
import { getStatusTagColor, getStatusTagLabel } from '../statusTagHelpers';
import {
  OrderItemStatus,
  QuoteStatus,
  SupplierStatus,
  CustomerPayStatus,
} from '@/types/enums.types';

describe('statusTagHelpers', () => {
  describe('getStatusTagColor', () => {
    describe('orderItem status', () => {
      it('returns "default" for INQUIRY', () => {
        expect(getStatusTagColor('orderItem', OrderItemStatus.INQUIRY)).toBe('default');
      });

      it('returns "warning" for PENDING', () => {
        expect(getStatusTagColor('orderItem', OrderItemStatus.PENDING)).toBe('warning');
      });

      it('returns "processing" for ORDERED', () => {
        expect(getStatusTagColor('orderItem', OrderItemStatus.ORDERED)).toBe('processing');
      });

      it('returns "processing" for PRODUCTION', () => {
        expect(getStatusTagColor('orderItem', OrderItemStatus.PRODUCTION)).toBe('processing');
      });

      it('returns "processing" for QC', () => {
        expect(getStatusTagColor('orderItem', OrderItemStatus.QC)).toBe('processing');
      });

      it('returns "cyan" for SHIPPED', () => {
        expect(getStatusTagColor('orderItem', OrderItemStatus.SHIPPED)).toBe('cyan');
      });

      it('returns "blue" for RECEIVED', () => {
        expect(getStatusTagColor('orderItem', OrderItemStatus.RECEIVED)).toBe('blue');
      });

      it('returns "success" for COMPLETED', () => {
        expect(getStatusTagColor('orderItem', OrderItemStatus.COMPLETED)).toBe('success');
      });

      it('returns "error" for CANCELLED', () => {
        expect(getStatusTagColor('orderItem', OrderItemStatus.CANCELLED)).toBe('error');
      });

      it('returns "default" for unknown value', () => {
        expect(getStatusTagColor('orderItem', 'UNKNOWN')).toBe('default');
      });
    });

    describe('quote status', () => {
      it('returns "success" for ACTIVE', () => {
        expect(getStatusTagColor('quote', QuoteStatus.ACTIVE)).toBe('success');
      });

      it('returns "error" for EXPIRED', () => {
        expect(getStatusTagColor('quote', QuoteStatus.EXPIRED)).toBe('error');
      });

      it('returns "processing" for CONVERTED', () => {
        expect(getStatusTagColor('quote', QuoteStatus.CONVERTED)).toBe('processing');
      });

      it('returns "default" for unknown value', () => {
        expect(getStatusTagColor('quote', 'UNKNOWN')).toBe('default');
      });
    });

    describe('supplier status', () => {
      it('returns "success" for ACTIVE', () => {
        expect(getStatusTagColor('supplier', SupplierStatus.ACTIVE)).toBe('success');
      });

      it('returns "warning" for SUSPENDED', () => {
        expect(getStatusTagColor('supplier', SupplierStatus.SUSPENDED)).toBe('warning');
      });

      it('returns "error" for ELIMINATED', () => {
        expect(getStatusTagColor('supplier', SupplierStatus.ELIMINATED)).toBe('error');
      });

      it('returns "default" for unknown value', () => {
        expect(getStatusTagColor('supplier', 'UNKNOWN')).toBe('default');
      });
    });

    describe('customerPay status', () => {
      it('returns "error" for UNPAID', () => {
        expect(getStatusTagColor('customerPay', CustomerPayStatus.UNPAID)).toBe('error');
      });

      it('returns "warning" for PARTIAL', () => {
        expect(getStatusTagColor('customerPay', CustomerPayStatus.PARTIAL)).toBe('warning');
      });

      it('returns "success" for PAID', () => {
        expect(getStatusTagColor('customerPay', CustomerPayStatus.PAID)).toBe('success');
      });

      it('returns "default" for unknown value', () => {
        expect(getStatusTagColor('customerPay', 'UNKNOWN')).toBe('default');
      });
    });

    describe('unknown type', () => {
      it('returns "default" for unknown status type', () => {
        // @ts-expect-error Testing invalid type
        expect(getStatusTagColor('unknownType', 'VALUE')).toBe('default');
      });
    });
  });

  describe('getStatusTagLabel', () => {
    describe('orderItem status', () => {
      it('returns "询价中" for INQUIRY', () => {
        expect(getStatusTagLabel('orderItem', OrderItemStatus.INQUIRY)).toBe('询价中');
      });

      it('returns "待下单" for PENDING', () => {
        expect(getStatusTagLabel('orderItem', OrderItemStatus.PENDING)).toBe('待下单');
      });

      it('returns "已下单" for ORDERED', () => {
        expect(getStatusTagLabel('orderItem', OrderItemStatus.ORDERED)).toBe('已下单');
      });

      it('returns "生产中" for PRODUCTION', () => {
        expect(getStatusTagLabel('orderItem', OrderItemStatus.PRODUCTION)).toBe('生产中');
      });

      it('returns "质检中" for QC', () => {
        expect(getStatusTagLabel('orderItem', OrderItemStatus.QC)).toBe('质检中');
      });

      it('returns "已发货" for SHIPPED', () => {
        expect(getStatusTagLabel('orderItem', OrderItemStatus.SHIPPED)).toBe('已发货');
      });

      it('returns "已收货" for RECEIVED', () => {
        expect(getStatusTagLabel('orderItem', OrderItemStatus.RECEIVED)).toBe('已收货');
      });

      it('returns "已完成" for COMPLETED', () => {
        expect(getStatusTagLabel('orderItem', OrderItemStatus.COMPLETED)).toBe('已完成');
      });

      it('returns "已取消" for CANCELLED', () => {
        expect(getStatusTagLabel('orderItem', OrderItemStatus.CANCELLED)).toBe('已取消');
      });

      it('returns value itself for unknown value', () => {
        expect(getStatusTagLabel('orderItem', 'UNKNOWN')).toBe('UNKNOWN');
      });
    });

    describe('quote status', () => {
      it('returns "有效" for ACTIVE', () => {
        expect(getStatusTagLabel('quote', QuoteStatus.ACTIVE)).toBe('有效');
      });

      it('returns "已过期" for EXPIRED', () => {
        expect(getStatusTagLabel('quote', QuoteStatus.EXPIRED)).toBe('已过期');
      });

      it('returns "已转换" for CONVERTED', () => {
        expect(getStatusTagLabel('quote', QuoteStatus.CONVERTED)).toBe('已转换');
      });

      it('returns value itself for unknown value', () => {
        expect(getStatusTagLabel('quote', 'UNKNOWN')).toBe('UNKNOWN');
      });
    });

    describe('supplier status', () => {
      it('returns "正常" for ACTIVE', () => {
        expect(getStatusTagLabel('supplier', SupplierStatus.ACTIVE)).toBe('正常');
      });

      it('returns "暂停" for SUSPENDED', () => {
        expect(getStatusTagLabel('supplier', SupplierStatus.SUSPENDED)).toBe('暂停');
      });

      it('returns "淘汰" for ELIMINATED', () => {
        expect(getStatusTagLabel('supplier', SupplierStatus.ELIMINATED)).toBe('淘汰');
      });

      it('returns value itself for unknown value', () => {
        expect(getStatusTagLabel('supplier', 'UNKNOWN')).toBe('UNKNOWN');
      });
    });

    describe('customerPay status', () => {
      it('returns "未付款" for UNPAID', () => {
        expect(getStatusTagLabel('customerPay', CustomerPayStatus.UNPAID)).toBe('未付款');
      });

      it('returns "部分付款" for PARTIAL', () => {
        expect(getStatusTagLabel('customerPay', CustomerPayStatus.PARTIAL)).toBe('部分付款');
      });

      it('returns "已付清" for PAID', () => {
        expect(getStatusTagLabel('customerPay', CustomerPayStatus.PAID)).toBe('已付清');
      });

      it('returns value itself for unknown value', () => {
        expect(getStatusTagLabel('customerPay', 'UNKNOWN')).toBe('UNKNOWN');
      });
    });

    describe('unknown type', () => {
      it('returns value itself for unknown status type', () => {
        // @ts-expect-error Testing invalid type
        expect(getStatusTagLabel('unknownType', 'someValue')).toBe('someValue');
      });
    });
  });
});
