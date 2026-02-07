/**
 * Unit tests for OrderStatusFlow component.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OrderStatusFlow } from '../OrderStatusFlow';
import { OrderItemStatus } from '@/types';

describe('OrderStatusFlow', () => {
  describe('Basic Rendering', () => {
    it('renders all 8 forward status steps', () => {
      render(
        <OrderStatusFlow currentStatus={OrderItemStatus.INQUIRY} />
      );

      expect(screen.getByText('询价中')).toBeInTheDocument();
      expect(screen.getByText('待下单')).toBeInTheDocument();
      expect(screen.getByText('已下单')).toBeInTheDocument();
      expect(screen.getByText('生产中')).toBeInTheDocument();
      expect(screen.getByText('质检中')).toBeInTheDocument();
      expect(screen.getByText('已发货')).toBeInTheDocument();
      expect(screen.getByText('已收货')).toBeInTheDocument();
      expect(screen.getByText('已完成')).toBeInTheDocument();
    });

    it('renders with PENDING as current status', () => {
      render(
        <OrderStatusFlow currentStatus={OrderItemStatus.PENDING} />
      );

      expect(screen.getByText('待下单')).toBeInTheDocument();
    });

    it('renders with COMPLETED status', () => {
      render(
        <OrderStatusFlow currentStatus={OrderItemStatus.COMPLETED} />
      );

      expect(screen.getByText('已完成')).toBeInTheDocument();
    });
  });

  describe('Cancelled State', () => {
    it('shows CANCELLED tag when status is CANCELLED', () => {
      render(
        <OrderStatusFlow currentStatus={OrderItemStatus.CANCELLED} />
      );

      expect(screen.getByText('已取消')).toBeInTheDocument();
    });

    it('greys out steps when cancelled', () => {
      const { container } = render(
        <OrderStatusFlow currentStatus={OrderItemStatus.CANCELLED} />
      );

      const stepsWrapper = container.querySelector('.ant-steps');
      expect(stepsWrapper).toHaveStyle({ opacity: '0.4' });
    });
  });

  describe('Size Prop', () => {
    it('renders with small size', () => {
      const { container } = render(
        <OrderStatusFlow
          currentStatus={OrderItemStatus.INQUIRY}
          size="small"
        />
      );

      const steps = container.querySelector('.ant-steps');
      expect(steps).toHaveClass('ant-steps-small');
    });
  });

  describe('Interactive Mode', () => {
    it('calls onStatusClick when valid next status is clicked', () => {
      const onClick = vi.fn();
      render(
        <OrderStatusFlow
          currentStatus={OrderItemStatus.INQUIRY}
          interactive
          onStatusClick={onClick}
        />
      );

      // PENDING is the next valid status from INQUIRY
      const pendingStep = screen.getByText('待下单');
      fireEvent.click(pendingStep);

      expect(onClick).toHaveBeenCalledWith(OrderItemStatus.PENDING);
    });

    it('does not call onStatusClick for non-interactive mode', () => {
      const onClick = vi.fn();
      render(
        <OrderStatusFlow
          currentStatus={OrderItemStatus.INQUIRY}
          onStatusClick={onClick}
        />
      );

      fireEvent.click(screen.getByText('待下单'));

      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
