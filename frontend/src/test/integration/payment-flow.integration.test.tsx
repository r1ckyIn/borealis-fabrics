/**
 * Integration tests for Payment flow (Customer and Supplier).
 *
 * Mocks at the API module level while keeping TanStack Query hooks,
 * Zustand stores, and components running with real code.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  CustomerPaymentTab,
  SupplierPaymentsTab,
} from '@/pages/orders/components/OrderPaymentSection';
import {
  createMockOrder,
  createMockSupplier,
  createMockSupplierPayment,
  resetIdCounter,
} from '@/test/mocks/mockFactories';
import { CustomerPayStatus } from '@/types/enums.types';

import {
  renderIntegration,
  screen,
  waitFor,
  clearAuthState,
  userEvent,
} from './integrationTestUtils';

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

type OrderApiModule = typeof import('@/api/order.api');
const { orderApi } =
  vi.mocked(await vi.importMock<OrderApiModule>('@/api/order.api'));

describe('Payment Flow Integration', () => {
  beforeEach(() => {
    clearAuthState();
    resetIdCounter();
    vi.clearAllMocks();
  });

  describe('CustomerPaymentTab', () => {
    it('displays customer payment status card with amounts', () => {
      const order = createMockOrder({
        id: 1,
        totalAmount: 10000,
        customerPaid: 3000,
        customerPayStatus: CustomerPayStatus.PARTIAL,
      });

      renderIntegration(
        <CustomerPaymentTab orderId={1} order={order} />,
        { withAuth: true },
      );

      // Card title
      expect(screen.getByText('客户付款')).toBeInTheDocument();

      // Status tag
      expect(screen.getByText('部分付款')).toBeInTheDocument();

      // Edit button
      expect(screen.getByRole('button', { name: /编辑/ })).toBeInTheDocument();
    });

    it('edit customer payment: open modal → submit → API call', async () => {
      const order = createMockOrder({
        id: 1,
        totalAmount: 10000,
        customerPaid: 0,
        customerPayStatus: CustomerPayStatus.UNPAID,
      });

      orderApi.updateCustomerPayment.mockResolvedValue(
        createMockOrder({
          ...order,
          customerPaid: 5000,
          customerPayStatus: CustomerPayStatus.PARTIAL,
        }),
      );

      renderIntegration(
        <CustomerPaymentTab orderId={1} order={order} />,
        { withAuth: true },
      );

      const user = userEvent.setup();

      // Click edit button
      await user.click(screen.getByRole('button', { name: /编辑/ }));

      // Modal should appear
      await waitFor(() => {
        expect(screen.getByText('编辑客户付款信息')).toBeInTheDocument();
      });

      // Fill in the paid amount field
      const paidInput = screen.getByRole('spinbutton');
      await user.clear(paidInput);
      await user.type(paidInput, '5000');

      // Submit by clicking the modal OK button
      const modalFooter = document.querySelector('.ant-modal-footer');
      const okButton = modalFooter!.querySelector('.ant-btn-primary') as HTMLButtonElement;
      await user.click(okButton);

      // Verify API was called with correct orderId and data
      await waitFor(() => {
        expect(orderApi.updateCustomerPayment).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            customerPaid: 5000,
          }),
        );
      });
    });
  });

  describe('SupplierPaymentsTab', () => {
    it('displays empty state when no supplier payments', () => {
      renderIntegration(
        <SupplierPaymentsTab
          orderId={1}
          supplierPayments={[]}
          isLoading={false}
        />,
        { withAuth: true },
      );

      expect(screen.getByText('暂无供应商付款信息')).toBeInTheDocument();
    });

    it('displays supplier payment cards with correct info', () => {
      const supplier1 = createMockSupplier({
        id: 1,
        companyName: '供应商A',
      });
      const supplier2 = createMockSupplier({
        id: 2,
        companyName: '供应商B',
      });

      const payments = [
        createMockSupplierPayment({
          id: 1,
          orderId: 1,
          supplierId: 1,
          payable: 4000,
          paid: 4000,
          payStatus: CustomerPayStatus.PAID,
          supplier: supplier1,
        }),
        createMockSupplierPayment({
          id: 2,
          orderId: 1,
          supplierId: 2,
          payable: 6000,
          paid: 0,
          payStatus: CustomerPayStatus.UNPAID,
          supplier: supplier2,
        }),
      ];

      renderIntegration(
        <SupplierPaymentsTab
          orderId={1}
          supplierPayments={payments}
          isLoading={false}
        />,
        { withAuth: true },
      );

      // Both supplier cards should be rendered
      expect(screen.getByText(/供应商A/)).toBeInTheDocument();
      expect(screen.getByText(/供应商B/)).toBeInTheDocument();

      // Status tags
      expect(screen.getByText('已付清')).toBeInTheDocument();
      expect(screen.getByText('未付款')).toBeInTheDocument();
    });

    it('edit supplier payment: open modal → submit → API call with supplierId', async () => {
      const supplier = createMockSupplier({
        id: 5,
        companyName: '测试供应商',
      });
      const payment = createMockSupplierPayment({
        id: 1,
        orderId: 1,
        supplierId: 5,
        payable: 8000,
        paid: 0,
        payStatus: CustomerPayStatus.UNPAID,
        supplier,
      });

      orderApi.updateSupplierPayment.mockResolvedValue({
        ...payment,
        paid: 4000,
        payStatus: CustomerPayStatus.PARTIAL,
      });

      renderIntegration(
        <SupplierPaymentsTab
          orderId={1}
          supplierPayments={[payment]}
          isLoading={false}
        />,
        { withAuth: true },
      );

      const user = userEvent.setup();

      // Click edit button on supplier card
      await user.click(screen.getByRole('button', { name: /编辑/ }));

      // Modal should appear with supplier name
      await waitFor(() => {
        expect(screen.getByText(/编辑供应商付款.*测试供应商/)).toBeInTheDocument();
      });

      // Fill in the paid amount
      const paidInput = screen.getByRole('spinbutton');
      await user.clear(paidInput);
      await user.type(paidInput, '4000');

      // Submit
      const modalFooter = document.querySelector('.ant-modal-footer');
      const okButton = modalFooter!.querySelector('.ant-btn-primary') as HTMLButtonElement;
      await user.click(okButton);

      // Verify API called with orderId and supplierId
      await waitFor(() => {
        expect(orderApi.updateSupplierPayment).toHaveBeenCalledWith(
          1,
          5,
          expect.objectContaining({
            paid: 4000,
          }),
        );
      });
    });

    it('shows loading state', () => {
      renderIntegration(
        <SupplierPaymentsTab
          orderId={1}
          supplierPayments={undefined}
          isLoading={true}
        />,
        { withAuth: true },
      );

      expect(document.querySelector('.ant-spin')).not.toBeNull();
    });
  });
});
