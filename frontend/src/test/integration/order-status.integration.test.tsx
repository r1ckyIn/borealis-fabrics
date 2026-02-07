/**
 * Integration tests for Order item status state machine.
 *
 * Mocks at the API module level while keeping TanStack Query hooks,
 * statusHelpers, and components running with real code.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { OrderItemsSection } from '@/pages/orders/components/OrderItemsSection';
import {
  createMockOrderItem,
  createMockFabric,
  createMockSupplier,
  resetIdCounter,
} from '@/test/mocks/mockFactories';
import { OrderItemStatus, ORDER_ITEM_STATUS_LABELS } from '@/types/enums.types';
import type { OrderItem } from '@/types/entities.types';

import {
  renderIntegration,
  screen,
  waitFor,
  clearAuthState,
  userEvent,
  EMPTY_PAGINATED,
} from './integrationTestUtils';

// Mock API modules -- order, fabric, supplier
const { mockModule } = vi.hoisted(() => {
  function mockModule(fns: string[], nsKey: string): Record<string, unknown> {
    const mocks: Record<string, unknown> = {};
    for (const fn of fns) mocks[fn] = vi.fn();
    mocks[nsKey] = { ...mocks };
    return mocks;
  }
  return { mockModule };
});

vi.mock('@/api/order.api', () => mockModule(
  ['getOrders', 'getOrder', 'createOrder', 'updateOrder', 'deleteOrder',
   'getOrderItems', 'addOrderItem', 'updateOrderItem', 'deleteOrderItem',
   'updateOrderItemStatus', 'cancelOrderItem', 'restoreOrderItem',
   'getOrderTimeline', 'getOrderItemTimeline',
   'updateCustomerPayment', 'getSupplierPayments', 'updateSupplierPayment'],
  'orderApi',
));
vi.mock('@/api/fabric.api', () => mockModule(
  ['getFabrics', 'getFabric', 'createFabric', 'updateFabric', 'deleteFabric',
   'uploadFabricImage', 'deleteFabricImage',
   'getFabricSuppliers', 'addFabricSupplier', 'updateFabricSupplier', 'removeFabricSupplier',
   'getFabricPricing', 'createFabricPricing', 'updateFabricPricing', 'deleteFabricPricing'],
  'fabricApi',
));
vi.mock('@/api/supplier.api', () => mockModule(
  ['getSuppliers', 'getSupplier', 'createSupplier', 'updateSupplier', 'deleteSupplier',
   'getSupplierFabrics'],
  'supplierApi',
));

type OrderApiModule = typeof import('@/api/order.api');
type FabricApiModule = typeof import('@/api/fabric.api');
type SupplierApiModule = typeof import('@/api/supplier.api');

const { orderApi } =
  vi.mocked(await vi.importMock<OrderApiModule>('@/api/order.api'));
const { getFabrics } =
  vi.mocked(await vi.importMock<FabricApiModule>('@/api/fabric.api'));
const { getSuppliers } =
  vi.mocked(await vi.importMock<SupplierApiModule>('@/api/supplier.api'));

const mockFabric = createMockFabric({ id: 1, fabricCode: 'FAB-0001', name: '棉布' });
const mockSupplier = createMockSupplier({ id: 1, companyName: '供应商A' });
const mockNavigate = vi.fn();

function createItemWithStatus(
  status: OrderItemStatus,
  overrides?: Partial<OrderItem>,
): OrderItem {
  return createMockOrderItem({
    orderId: 1,
    fabric: mockFabric,
    supplier: mockSupplier,
    status,
    ...overrides,
  });
}

function renderOrderItems(orderItems: OrderItem[]) {
  return renderIntegration(
    <OrderItemsSection
      orderId={1}
      orderItems={orderItems}
      isLoading={false}
      navigate={mockNavigate}
    />,
    { withAuth: true },
  );
}

describe('Order Status State Machine Integration', () => {
  beforeEach(() => {
    clearAuthState();
    resetIdCounter();
    vi.clearAllMocks();
    getFabrics.mockResolvedValue(EMPTY_PAGINATED);
    getSuppliers.mockResolvedValue(EMPTY_PAGINATED);
  });

  describe('Status display', () => {
    it('displays order items with status tags', () => {
      const items = [
        createItemWithStatus(OrderItemStatus.PENDING, { id: 1 }),
        createItemWithStatus(OrderItemStatus.ORDERED, { id: 2 }),
      ];

      renderOrderItems(items);

      expect(screen.getByText('待下单')).toBeInTheDocument();
      expect(screen.getByText('已下单')).toBeInTheDocument();
    });
  });

  describe('Status forward transitions', () => {
    const FORWARD_TRANSITIONS: [OrderItemStatus, OrderItemStatus, string][] = [
      [OrderItemStatus.INQUIRY, OrderItemStatus.PENDING, '待下单'],
      [OrderItemStatus.PENDING, OrderItemStatus.ORDERED, '已下单'],
      [OrderItemStatus.ORDERED, OrderItemStatus.PRODUCTION, '生产中'],
      [OrderItemStatus.PRODUCTION, OrderItemStatus.QC, '质检中'],
      [OrderItemStatus.QC, OrderItemStatus.SHIPPED, '已发货'],
      [OrderItemStatus.SHIPPED, OrderItemStatus.RECEIVED, '已收货'],
      [OrderItemStatus.RECEIVED, OrderItemStatus.COMPLETED, '已完成'],
    ];

    it.each(FORWARD_TRANSITIONS)(
      'advances %s → %s via status dropdown',
      async (fromStatus, toStatus, targetLabel) => {
        const item = createItemWithStatus(fromStatus, { id: 10 });
        orderApi.updateOrderItemStatus.mockResolvedValue(
          createItemWithStatus(toStatus, { id: 10 }),
        );

        renderOrderItems([item]);
        const user = userEvent.setup();

        // Click "推进状态" dropdown
        const statusButton = screen.getByText(/推进状态/);
        await user.click(statusButton);

        // Select the target status from dropdown menu
        await waitFor(() => {
          expect(screen.getByText(`推进到「${targetLabel}」`)).toBeInTheDocument();
        });
        await user.click(screen.getByText(`推进到「${targetLabel}」`));

        // Status change confirmation modal appears
        await waitFor(() => {
          expect(screen.getByText('确认状态变更')).toBeInTheDocument();
        });

        // Click OK in the modal
        const modalFooter = document.querySelector('.ant-modal-footer');
        const okButton = modalFooter!.querySelector('.ant-btn-primary') as HTMLButtonElement;
        await user.click(okButton);

        // Verify API was called
        await waitFor(() => {
          expect(orderApi.updateOrderItemStatus).toHaveBeenCalledWith(
            1,
            10,
            { status: toStatus },
          );
        });
      },
    );

    it('COMPLETED status has no forward transition (only cancel)', () => {
      const item = createItemWithStatus(OrderItemStatus.COMPLETED, { id: 1 });
      renderOrderItems([item]);

      // No "推进状态" dropdown should be rendered since
      // getValidNextStatuses(COMPLETED) = [CANCELLED] and we filter out CANCELLED
      expect(screen.queryByText(/推进状态/)).not.toBeInTheDocument();
    });

    it('CANCELLED status has no forward transition and no cancel button', () => {
      const item = createItemWithStatus(OrderItemStatus.CANCELLED, {
        id: 1,
        prevStatus: null,
      });
      renderOrderItems([item]);

      // No status dropdown, no cancel, no edit, no delete
      expect(screen.queryByText(/推进状态/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /取消/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /编辑/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /删除/ })).not.toBeInTheDocument();
      // No restore button either (prevStatus is null)
      expect(screen.queryByRole('button', { name: /恢复/ })).not.toBeInTheDocument();
    });
  });

  describe('Cancel flow', () => {
    it('cancel button calls cancelOrderItem API', async () => {
      const item = createItemWithStatus(OrderItemStatus.ORDERED, { id: 20 });
      orderApi.cancelOrderItem.mockResolvedValue(
        createItemWithStatus(OrderItemStatus.CANCELLED, {
          id: 20,
          prevStatus: OrderItemStatus.ORDERED,
        }),
      );

      renderOrderItems([item]);
      const user = userEvent.setup();

      // Click cancel button
      await user.click(screen.getByRole('button', { name: /取消/ }));

      // Cancel confirmation modal appears (title + okText both say "确认取消")
      await waitFor(() => {
        expect(screen.getAllByText('确认取消').length).toBeGreaterThanOrEqual(1);
      });

      // Click the danger confirm button
      const modalFooter = document.querySelector('.ant-modal-footer');
      const okButton = modalFooter!.querySelector('.ant-btn-dangerous') as HTMLButtonElement;
      await user.click(okButton);

      await waitFor(() => {
        expect(orderApi.cancelOrderItem).toHaveBeenCalledWith(1, 20, undefined);
      });
    });
  });

  describe('Restore flow', () => {
    it('restore button shown for CANCELLED items with prevStatus', () => {
      const item = createItemWithStatus(OrderItemStatus.CANCELLED, {
        id: 30,
        prevStatus: OrderItemStatus.PRODUCTION,
      });
      renderOrderItems([item]);

      expect(screen.getByRole('button', { name: /恢复/ })).toBeInTheDocument();
    });

    it('restore button calls restoreOrderItem API', async () => {
      const item = createItemWithStatus(OrderItemStatus.CANCELLED, {
        id: 30,
        prevStatus: OrderItemStatus.PRODUCTION,
      });
      orderApi.restoreOrderItem.mockResolvedValue(
        createItemWithStatus(OrderItemStatus.PRODUCTION, { id: 30 }),
      );

      renderOrderItems([item]);
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /恢复/ }));

      // Restore confirmation modal (title + confirmText both say "确认恢复")
      await waitFor(() => {
        expect(screen.getAllByText('确认恢复').length).toBeGreaterThanOrEqual(1);
      });

      // Click confirm
      const modalFooter = document.querySelector('.ant-modal-footer');
      const okButton = modalFooter!.querySelector('.ant-btn-primary') as HTMLButtonElement;
      await user.click(okButton);

      await waitFor(() => {
        expect(orderApi.restoreOrderItem).toHaveBeenCalledWith(1, 30, undefined);
      });
    });
  });

  describe('Modifiable status restrictions', () => {
    it('INQUIRY items show edit and delete buttons', () => {
      const item = createItemWithStatus(OrderItemStatus.INQUIRY, { id: 1 });
      renderOrderItems([item]);

      expect(screen.getByRole('button', { name: /编辑/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /删除/ })).toBeInTheDocument();
    });

    it('PENDING items show edit and delete buttons', () => {
      const item = createItemWithStatus(OrderItemStatus.PENDING, { id: 1 });
      renderOrderItems([item]);

      expect(screen.getByRole('button', { name: /编辑/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /删除/ })).toBeInTheDocument();
    });

    it('ORDERED items do not show edit or delete buttons', () => {
      const item = createItemWithStatus(OrderItemStatus.ORDERED, { id: 1 });
      renderOrderItems([item]);

      expect(screen.queryByRole('button', { name: /编辑/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /删除/ })).not.toBeInTheDocument();
    });

    it.each([
      OrderItemStatus.PRODUCTION,
      OrderItemStatus.QC,
      OrderItemStatus.SHIPPED,
      OrderItemStatus.RECEIVED,
      OrderItemStatus.COMPLETED,
    ])('%s items do not show edit or delete buttons', (status) => {
      const item = createItemWithStatus(status, { id: 1 });
      renderOrderItems([item]);

      expect(screen.queryByRole('button', { name: /编辑/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /删除/ })).not.toBeInTheDocument();
    });
  });

  describe('Aggregate status', () => {
    it('shows status labels correctly for items at different stages', () => {
      const items = [
        createItemWithStatus(OrderItemStatus.INQUIRY, { id: 1 }),
        createItemWithStatus(OrderItemStatus.COMPLETED, { id: 2 }),
        createItemWithStatus(OrderItemStatus.CANCELLED, { id: 3, prevStatus: OrderItemStatus.PENDING }),
      ];

      renderOrderItems(items);

      // All three status labels should render
      expect(screen.getByText(ORDER_ITEM_STATUS_LABELS[OrderItemStatus.INQUIRY])).toBeInTheDocument();
      expect(screen.getByText(ORDER_ITEM_STATUS_LABELS[OrderItemStatus.COMPLETED])).toBeInTheDocument();
      expect(screen.getByText(ORDER_ITEM_STATUS_LABELS[OrderItemStatus.CANCELLED])).toBeInTheDocument();
    });
  });
});
