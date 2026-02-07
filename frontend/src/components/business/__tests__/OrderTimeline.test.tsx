/**
 * Unit tests for OrderTimeline component.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { OrderTimeline } from '../OrderTimeline';
import type { OrderTimelineEntry } from '@/types';

const mockEntries: OrderTimelineEntry[] = [
  {
    id: 1,
    orderItemId: 10,
    fromStatus: null,
    toStatus: 'INQUIRY',
    operatorId: 1,
    remark: null,
    createdAt: '2025-06-01T10:00:00.000Z',
    orderItem: {
      id: 10,
      fabric: { id: 1, fabricCode: 'BF-2501-0001', name: '纯棉' },
    },
    operator: { id: 1, name: '张三', avatar: null },
  },
  {
    id: 2,
    orderItemId: 10,
    fromStatus: 'INQUIRY',
    toStatus: 'PENDING',
    operatorId: 1,
    remark: '客户确认下单',
    createdAt: '2025-06-02T14:30:00.000Z',
    orderItem: {
      id: 10,
      fabric: { id: 1, fabricCode: 'BF-2501-0001', name: '纯棉' },
    },
    operator: { id: 1, name: '张三', avatar: null },
  },
  {
    id: 3,
    orderItemId: 10,
    fromStatus: 'PENDING',
    toStatus: 'ORDERED',
    operatorId: null,
    remark: null,
    createdAt: '2025-06-03T09:00:00.000Z',
  },
];

describe('OrderTimeline', () => {
  describe('Basic Rendering', () => {
    it('renders timeline entries', () => {
      render(<OrderTimeline entries={mockEntries} />);

      // Multiple entries may show the same status label
      const inquiryTags = screen.getAllByText('询价中');
      expect(inquiryTags.length).toBeGreaterThanOrEqual(1);
      const pendingTags = screen.getAllByText('待下单');
      expect(pendingTags.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('已下单')).toBeInTheDocument();
    });

    it('renders remarks', () => {
      render(<OrderTimeline entries={mockEntries} />);

      expect(screen.getByText('客户确认下单')).toBeInTheDocument();
    });

    it('renders operator names', () => {
      render(<OrderTimeline entries={mockEntries} />);

      const operatorElements = screen.getAllByText('张三');
      expect(operatorElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no entries', () => {
      render(<OrderTimeline entries={[]} />);

      expect(screen.getByText('暂无状态记录')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows spinner when loading', () => {
      const { container } = render(
        <OrderTimeline entries={[]} loading />
      );

      expect(container.querySelector('.ant-spin')).toBeInTheDocument();
    });
  });

  describe('Item Info', () => {
    it('shows fabric code when showItemInfo is true', () => {
      render(
        <OrderTimeline entries={mockEntries} showItemInfo />
      );

      const fabricCodes = screen.getAllByText('[BF-2501-0001]');
      expect(fabricCodes.length).toBeGreaterThanOrEqual(1);
    });

    it('hides fabric code when showItemInfo is false', () => {
      render(
        <OrderTimeline entries={mockEntries} showItemInfo={false} />
      );

      expect(
        screen.queryByText('[BF-2501-0001]')
      ).not.toBeInTheDocument();
    });
  });

  describe('Status Transitions', () => {
    it('shows arrow for transitions with fromStatus', () => {
      render(<OrderTimeline entries={mockEntries} />);

      // The transition entries show "→"
      const arrows = screen.getAllByText('→');
      expect(arrows.length).toBeGreaterThanOrEqual(1);
    });

    it('shows only toStatus tag for initial entry (null fromStatus)', () => {
      const initialOnly: OrderTimelineEntry[] = [
        {
          id: 1,
          orderItemId: 10,
          fromStatus: null,
          toStatus: 'INQUIRY',
          operatorId: null,
          remark: null,
          createdAt: '2025-06-01T10:00:00.000Z',
        },
      ];

      render(<OrderTimeline entries={initialOnly} />);

      expect(screen.getByText('询价中')).toBeInTheDocument();
      expect(screen.queryByText('→')).not.toBeInTheDocument();
    });
  });
});
