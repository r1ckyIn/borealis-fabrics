import { describe, expect, it } from 'vitest';
import { OrderItemStatus } from '@/types';
import {
  calculateAggregateStatus,
  calculateOrderStatusSummary,
  canCancelItem,
  canDeleteItem,
  canModifyItem,
  canRestoreItem,
  getNextForwardStatus,
  getStatusColor,
  getStatusFlowSteps,
  getStatusInfo,
  getStatusLabel,
  getStatusProgress,
  getValidNextStatuses,
  isValidStatusTransition,
} from '../statusHelpers';

describe('statusHelpers', () => {
  describe('isValidStatusTransition', () => {
    describe('valid forward transitions', () => {
      it('should allow INQUIRY -> PENDING', () => {
        expect(
          isValidStatusTransition(
            OrderItemStatus.INQUIRY,
            OrderItemStatus.PENDING
          )
        ).toBe(true);
      });

      it('should allow PENDING -> ORDERED', () => {
        expect(
          isValidStatusTransition(
            OrderItemStatus.PENDING,
            OrderItemStatus.ORDERED
          )
        ).toBe(true);
      });

      it('should allow ORDERED -> PRODUCTION', () => {
        expect(
          isValidStatusTransition(
            OrderItemStatus.ORDERED,
            OrderItemStatus.PRODUCTION
          )
        ).toBe(true);
      });

      it('should allow PRODUCTION -> QC', () => {
        expect(
          isValidStatusTransition(
            OrderItemStatus.PRODUCTION,
            OrderItemStatus.QC
          )
        ).toBe(true);
      });

      it('should allow QC -> SHIPPED', () => {
        expect(
          isValidStatusTransition(OrderItemStatus.QC, OrderItemStatus.SHIPPED)
        ).toBe(true);
      });

      it('should allow SHIPPED -> RECEIVED', () => {
        expect(
          isValidStatusTransition(
            OrderItemStatus.SHIPPED,
            OrderItemStatus.RECEIVED
          )
        ).toBe(true);
      });

      it('should allow RECEIVED -> COMPLETED', () => {
        expect(
          isValidStatusTransition(
            OrderItemStatus.RECEIVED,
            OrderItemStatus.COMPLETED
          )
        ).toBe(true);
      });
    });

    describe('cancellation transitions', () => {
      it('should allow cancellation from any active status', () => {
        const activeStatuses = [
          OrderItemStatus.INQUIRY,
          OrderItemStatus.PENDING,
          OrderItemStatus.ORDERED,
          OrderItemStatus.PRODUCTION,
          OrderItemStatus.QC,
          OrderItemStatus.SHIPPED,
          OrderItemStatus.RECEIVED,
          OrderItemStatus.COMPLETED,
        ];

        activeStatuses.forEach((status) => {
          expect(
            isValidStatusTransition(status, OrderItemStatus.CANCELLED)
          ).toBe(true);
        });
      });
    });

    describe('invalid transitions', () => {
      it('should not allow skipping statuses (INQUIRY -> ORDERED)', () => {
        expect(
          isValidStatusTransition(
            OrderItemStatus.INQUIRY,
            OrderItemStatus.ORDERED
          )
        ).toBe(false);
      });

      it('should not allow backward transitions (ORDERED -> PENDING)', () => {
        expect(
          isValidStatusTransition(
            OrderItemStatus.ORDERED,
            OrderItemStatus.PENDING
          )
        ).toBe(false);
      });

      it('should not allow transitions from CANCELLED', () => {
        const allStatuses = [
          OrderItemStatus.INQUIRY,
          OrderItemStatus.PENDING,
          OrderItemStatus.ORDERED,
          OrderItemStatus.PRODUCTION,
          OrderItemStatus.QC,
          OrderItemStatus.SHIPPED,
          OrderItemStatus.RECEIVED,
          OrderItemStatus.COMPLETED,
        ];

        allStatuses.forEach((status) => {
          expect(
            isValidStatusTransition(OrderItemStatus.CANCELLED, status)
          ).toBe(false);
        });
      });
    });
  });

  describe('getValidNextStatuses', () => {
    it('should return PENDING and CANCELLED for INQUIRY', () => {
      const nextStatuses = getValidNextStatuses(OrderItemStatus.INQUIRY);
      expect(nextStatuses).toContain(OrderItemStatus.PENDING);
      expect(nextStatuses).toContain(OrderItemStatus.CANCELLED);
      expect(nextStatuses.length).toBe(2);
    });

    it('should return only CANCELLED for COMPLETED', () => {
      const nextStatuses = getValidNextStatuses(OrderItemStatus.COMPLETED);
      expect(nextStatuses).toEqual([OrderItemStatus.CANCELLED]);
    });

    it('should return empty array for CANCELLED', () => {
      const nextStatuses = getValidNextStatuses(OrderItemStatus.CANCELLED);
      expect(nextStatuses).toEqual([]);
    });
  });

  describe('getNextForwardStatus', () => {
    it('should return next status in workflow', () => {
      expect(getNextForwardStatus(OrderItemStatus.INQUIRY)).toBe(
        OrderItemStatus.PENDING
      );
      expect(getNextForwardStatus(OrderItemStatus.PENDING)).toBe(
        OrderItemStatus.ORDERED
      );
      expect(getNextForwardStatus(OrderItemStatus.RECEIVED)).toBe(
        OrderItemStatus.COMPLETED
      );
    });

    it('should return null for COMPLETED', () => {
      expect(getNextForwardStatus(OrderItemStatus.COMPLETED)).toBe(null);
    });

    it('should return null for CANCELLED', () => {
      expect(getNextForwardStatus(OrderItemStatus.CANCELLED)).toBe(null);
    });
  });

  describe('calculateAggregateStatus', () => {
    it('should return lowest progress status', () => {
      expect(
        calculateAggregateStatus([
          OrderItemStatus.ORDERED,
          OrderItemStatus.SHIPPED,
          OrderItemStatus.COMPLETED,
        ])
      ).toBe(OrderItemStatus.ORDERED);
    });

    it('should ignore CANCELLED when calculating', () => {
      expect(
        calculateAggregateStatus([
          OrderItemStatus.CANCELLED,
          OrderItemStatus.COMPLETED,
        ])
      ).toBe(OrderItemStatus.COMPLETED);
    });

    it('should return CANCELLED if all items are cancelled', () => {
      expect(
        calculateAggregateStatus([
          OrderItemStatus.CANCELLED,
          OrderItemStatus.CANCELLED,
        ])
      ).toBe(OrderItemStatus.CANCELLED);
    });

    it('should return CANCELLED for empty array', () => {
      expect(calculateAggregateStatus([])).toBe(OrderItemStatus.CANCELLED);
    });

    it('should handle single item', () => {
      expect(calculateAggregateStatus([OrderItemStatus.PRODUCTION])).toBe(
        OrderItemStatus.PRODUCTION
      );
    });

    it('should find lowest among mixed statuses', () => {
      expect(
        calculateAggregateStatus([
          OrderItemStatus.PENDING,
          OrderItemStatus.ORDERED,
          OrderItemStatus.CANCELLED,
          OrderItemStatus.SHIPPED,
        ])
      ).toBe(OrderItemStatus.PENDING);
    });

    it('should return INQUIRY if any item is in INQUIRY', () => {
      expect(
        calculateAggregateStatus([
          OrderItemStatus.INQUIRY,
          OrderItemStatus.COMPLETED,
          OrderItemStatus.COMPLETED,
        ])
      ).toBe(OrderItemStatus.INQUIRY);
    });
  });

  describe('canModifyItem', () => {
    it('should return true for INQUIRY', () => {
      expect(canModifyItem(OrderItemStatus.INQUIRY)).toBe(true);
    });

    it('should return true for PENDING', () => {
      expect(canModifyItem(OrderItemStatus.PENDING)).toBe(true);
    });

    it('should return false for ORDERED and beyond', () => {
      expect(canModifyItem(OrderItemStatus.ORDERED)).toBe(false);
      expect(canModifyItem(OrderItemStatus.PRODUCTION)).toBe(false);
      expect(canModifyItem(OrderItemStatus.COMPLETED)).toBe(false);
      expect(canModifyItem(OrderItemStatus.CANCELLED)).toBe(false);
    });
  });

  describe('canDeleteItem', () => {
    it('should return true for INQUIRY', () => {
      expect(canDeleteItem(OrderItemStatus.INQUIRY)).toBe(true);
    });

    it('should return true for PENDING', () => {
      expect(canDeleteItem(OrderItemStatus.PENDING)).toBe(true);
    });

    it('should return false for ORDERED and beyond', () => {
      expect(canDeleteItem(OrderItemStatus.ORDERED)).toBe(false);
      expect(canDeleteItem(OrderItemStatus.SHIPPED)).toBe(false);
    });
  });

  describe('canCancelItem', () => {
    it('should return true for all statuses except CANCELLED', () => {
      expect(canCancelItem(OrderItemStatus.INQUIRY)).toBe(true);
      expect(canCancelItem(OrderItemStatus.PENDING)).toBe(true);
      expect(canCancelItem(OrderItemStatus.ORDERED)).toBe(true);
      expect(canCancelItem(OrderItemStatus.PRODUCTION)).toBe(true);
      expect(canCancelItem(OrderItemStatus.QC)).toBe(true);
      expect(canCancelItem(OrderItemStatus.SHIPPED)).toBe(true);
      expect(canCancelItem(OrderItemStatus.RECEIVED)).toBe(true);
      expect(canCancelItem(OrderItemStatus.COMPLETED)).toBe(true);
    });

    it('should return false for CANCELLED', () => {
      expect(canCancelItem(OrderItemStatus.CANCELLED)).toBe(false);
    });
  });

  describe('canRestoreItem', () => {
    it('should return true for CANCELLED with previous status', () => {
      expect(canRestoreItem(OrderItemStatus.CANCELLED, OrderItemStatus.PENDING)).toBe(
        true
      );
      expect(
        canRestoreItem(OrderItemStatus.CANCELLED, OrderItemStatus.PRODUCTION)
      ).toBe(true);
    });

    it('should return false for CANCELLED without previous status', () => {
      expect(canRestoreItem(OrderItemStatus.CANCELLED, null)).toBe(false);
      expect(canRestoreItem(OrderItemStatus.CANCELLED, undefined)).toBe(false);
    });

    it('should return false for non-CANCELLED statuses', () => {
      expect(canRestoreItem(OrderItemStatus.PENDING, OrderItemStatus.INQUIRY)).toBe(
        false
      );
      expect(canRestoreItem(OrderItemStatus.COMPLETED, OrderItemStatus.RECEIVED)).toBe(
        false
      );
    });
  });

  describe('getStatusLabel', () => {
    it('should return Chinese labels', () => {
      expect(getStatusLabel(OrderItemStatus.INQUIRY)).toBe('询价中');
      expect(getStatusLabel(OrderItemStatus.PENDING)).toBe('待下单');
      expect(getStatusLabel(OrderItemStatus.ORDERED)).toBe('已下单');
      expect(getStatusLabel(OrderItemStatus.PRODUCTION)).toBe('生产中');
      expect(getStatusLabel(OrderItemStatus.QC)).toBe('质检中');
      expect(getStatusLabel(OrderItemStatus.SHIPPED)).toBe('已发货');
      expect(getStatusLabel(OrderItemStatus.RECEIVED)).toBe('已收货');
      expect(getStatusLabel(OrderItemStatus.COMPLETED)).toBe('已完成');
      expect(getStatusLabel(OrderItemStatus.CANCELLED)).toBe('已取消');
    });
  });

  describe('getStatusColor', () => {
    it('should return Ant Design colors', () => {
      expect(getStatusColor(OrderItemStatus.INQUIRY)).toBe('default');
      expect(getStatusColor(OrderItemStatus.PENDING)).toBe('warning');
      expect(getStatusColor(OrderItemStatus.ORDERED)).toBe('processing');
      expect(getStatusColor(OrderItemStatus.COMPLETED)).toBe('success');
      expect(getStatusColor(OrderItemStatus.CANCELLED)).toBe('error');
    });
  });

  describe('getStatusProgress', () => {
    it('should return increasing progress values', () => {
      expect(getStatusProgress(OrderItemStatus.INQUIRY)).toBe(0);
      expect(getStatusProgress(OrderItemStatus.PENDING)).toBe(12.5);
      expect(getStatusProgress(OrderItemStatus.ORDERED)).toBe(25);
      expect(getStatusProgress(OrderItemStatus.PRODUCTION)).toBe(37.5);
      expect(getStatusProgress(OrderItemStatus.QC)).toBe(50);
      expect(getStatusProgress(OrderItemStatus.SHIPPED)).toBe(62.5);
      expect(getStatusProgress(OrderItemStatus.RECEIVED)).toBe(75);
      expect(getStatusProgress(OrderItemStatus.COMPLETED)).toBe(100);
    });

    it('should return 0 for CANCELLED', () => {
      expect(getStatusProgress(OrderItemStatus.CANCELLED)).toBe(0);
    });
  });

  describe('getStatusInfo', () => {
    it('should return complete status info', () => {
      const info = getStatusInfo(OrderItemStatus.PENDING);
      expect(info.status).toBe(OrderItemStatus.PENDING);
      expect(info.label).toBe('待下单');
      expect(info.color).toBe('warning');
      expect(info.progress).toBe(12.5);
      expect(info.canModify).toBe(true);
      expect(info.canDelete).toBe(true);
      expect(info.canCancel).toBe(true);
    });

    it('should return correct info for CANCELLED', () => {
      const info = getStatusInfo(OrderItemStatus.CANCELLED);
      expect(info.canModify).toBe(false);
      expect(info.canDelete).toBe(false);
      expect(info.canCancel).toBe(false);
    });
  });

  describe('getStatusFlowSteps', () => {
    it('should mark previous steps as completed', () => {
      const steps = getStatusFlowSteps(OrderItemStatus.PRODUCTION);
      const inquiryStep = steps.find((s) => s.status === OrderItemStatus.INQUIRY);
      const pendingStep = steps.find((s) => s.status === OrderItemStatus.PENDING);
      const orderedStep = steps.find((s) => s.status === OrderItemStatus.ORDERED);

      expect(inquiryStep?.isCompleted).toBe(true);
      expect(pendingStep?.isCompleted).toBe(true);
      expect(orderedStep?.isCompleted).toBe(true);
    });

    it('should mark current step correctly', () => {
      const steps = getStatusFlowSteps(OrderItemStatus.PRODUCTION);
      const productionStep = steps.find(
        (s) => s.status === OrderItemStatus.PRODUCTION
      );

      expect(productionStep?.isCurrent).toBe(true);
      expect(productionStep?.isCompleted).toBe(false);
      expect(productionStep?.isPending).toBe(false);
    });

    it('should mark future steps as pending', () => {
      const steps = getStatusFlowSteps(OrderItemStatus.PRODUCTION);
      const qcStep = steps.find((s) => s.status === OrderItemStatus.QC);
      const completedStep = steps.find((s) => s.status === OrderItemStatus.COMPLETED);

      expect(qcStep?.isPending).toBe(true);
      expect(completedStep?.isPending).toBe(true);
    });

    it('should handle CANCELLED status', () => {
      const steps = getStatusFlowSteps(OrderItemStatus.CANCELLED);

      // All steps should not be current
      steps.forEach((step) => {
        expect(step.isCurrent).toBe(false);
      });
    });
  });

  describe('calculateOrderStatusSummary', () => {
    it('should calculate summary correctly', () => {
      const statuses = [
        OrderItemStatus.COMPLETED,
        OrderItemStatus.COMPLETED,
        OrderItemStatus.SHIPPED,
        OrderItemStatus.CANCELLED,
      ];

      const summary = calculateOrderStatusSummary(statuses);

      expect(summary.totalItems).toBe(4);
      expect(summary.completedItems).toBe(2);
      expect(summary.cancelledItems).toBe(1);
      expect(summary.inProgressItems).toBe(1);
      expect(summary.aggregateStatus).toBe(OrderItemStatus.SHIPPED);
      expect(summary.completionRate).toBeCloseTo(2 / 3);
    });

    it('should handle all completed', () => {
      const statuses = [OrderItemStatus.COMPLETED, OrderItemStatus.COMPLETED];
      const summary = calculateOrderStatusSummary(statuses);

      expect(summary.completionRate).toBe(1);
      expect(summary.aggregateStatus).toBe(OrderItemStatus.COMPLETED);
    });

    it('should handle all cancelled', () => {
      const statuses = [OrderItemStatus.CANCELLED, OrderItemStatus.CANCELLED];
      const summary = calculateOrderStatusSummary(statuses);

      expect(summary.aggregateStatus).toBe(OrderItemStatus.CANCELLED);
      expect(summary.completionRate).toBe(0);
    });

    it('should handle empty array', () => {
      const summary = calculateOrderStatusSummary([]);

      expect(summary.totalItems).toBe(0);
      expect(summary.aggregateStatus).toBe(OrderItemStatus.CANCELLED);
    });
  });
});
