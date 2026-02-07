/**
 * Unit tests for PaymentStatusCard component.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PaymentStatusCard } from '../PaymentStatusCard';

describe('PaymentStatusCard', () => {
  const defaultProps = {
    type: 'customer' as const,
    totalAmount: 10000,
    paidAmount: 5000,
    payStatus: 'partial',
  };

  describe('Customer Payment', () => {
    it('renders customer payment title', () => {
      render(<PaymentStatusCard {...defaultProps} />);

      expect(screen.getByText('客户付款')).toBeInTheDocument();
    });

    it('displays payment amounts', () => {
      render(<PaymentStatusCard {...defaultProps} />);

      expect(screen.getByText('应付')).toBeInTheDocument();
      expect(screen.getByText('已付')).toBeInTheDocument();
      expect(screen.getByText('未付')).toBeInTheDocument();
    });

    it('displays payment status tag', () => {
      render(<PaymentStatusCard {...defaultProps} />);

      expect(screen.getByText('部分付款')).toBeInTheDocument();
    });

    it('displays paid status correctly', () => {
      render(
        <PaymentStatusCard
          {...defaultProps}
          paidAmount={10000}
          payStatus="paid"
        />
      );

      expect(screen.getByText('已付清')).toBeInTheDocument();
    });

    it('displays unpaid status correctly', () => {
      render(
        <PaymentStatusCard
          {...defaultProps}
          paidAmount={0}
          payStatus="unpaid"
        />
      );

      expect(screen.getByText('未付款')).toBeInTheDocument();
    });
  });

  describe('Supplier Payment', () => {
    it('renders supplier payment title with name', () => {
      render(
        <PaymentStatusCard
          {...defaultProps}
          type="supplier"
          supplierName="测试供应商"
        />
      );

      expect(
        screen.getByText('供应商付款 - 测试供应商')
      ).toBeInTheDocument();
    });

    it('renders supplier payment title without name', () => {
      render(
        <PaymentStatusCard {...defaultProps} type="supplier" />
      );

      expect(screen.getByText('供应商付款')).toBeInTheDocument();
    });
  });

  describe('Payment Method', () => {
    it('displays payment method tag', () => {
      render(
        <PaymentStatusCard {...defaultProps} payMethod="wechat" />
      );

      expect(screen.getByText('微信')).toBeInTheDocument();
    });

    it('does not show method tag when no method', () => {
      render(<PaymentStatusCard {...defaultProps} />);

      expect(screen.queryByText('微信')).not.toBeInTheDocument();
      expect(screen.queryByText('支付宝')).not.toBeInTheDocument();
    });
  });

  describe('Edit Button', () => {
    it('shows edit button when onEdit is provided', () => {
      const onEdit = vi.fn();
      render(<PaymentStatusCard {...defaultProps} onEdit={onEdit} />);

      const editBtn = screen.getByText('编辑');
      expect(editBtn).toBeInTheDocument();

      fireEvent.click(editBtn);
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('hides edit button when onEdit is not provided', () => {
      render(<PaymentStatusCard {...defaultProps} />);

      expect(screen.queryByText('编辑')).not.toBeInTheDocument();
    });
  });

  describe('Progress', () => {
    it('shows 50% progress for half paid', () => {
      render(<PaymentStatusCard {...defaultProps} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows 100% progress for fully paid', () => {
      render(
        <PaymentStatusCard
          {...defaultProps}
          paidAmount={10000}
          payStatus="paid"
        />
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('shows 0% progress for unpaid', () => {
      render(
        <PaymentStatusCard
          {...defaultProps}
          paidAmount={0}
          payStatus="unpaid"
        />
      );

      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });
});
