/**
 * Integration tests for Quote detail and conversion flow.
 *
 * Mocks at the API module level (@/api/quote.api) while keeping
 * TanStack Query hooks, components, and routing running with real code.
 *
 * Updated for Phase 7/8 multi-item quote model (QuoteItem).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import QuoteDetailPage from '@/pages/quotes/QuoteDetailPage';
import {
  createMockQuote,
  createMockQuoteItem,
  createMockCustomer,
  createMockFabric,
  createMockOrder,
  resetIdCounter,
} from '@/test/mocks/mockFactories';
import { QuoteStatus } from '@/types/enums.types';

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

vi.mock('@/api/quote.api', () => mockModule(
  ['getQuotes', 'getQuote', 'createQuote', 'updateQuote', 'deleteQuote',
   'addQuoteItem', 'updateQuoteItem', 'deleteQuoteItem', 'convertQuoteItems'],
  'quoteApi',
));
vi.mock('@/api/order.api', () => mockModule(
  ['getOrders', 'getOrder', 'createOrder', 'updateOrder', 'deleteOrder',
   'getOrderItems', 'addOrderItem', 'updateOrderItem', 'deleteOrderItem',
   'updateOrderItemStatus', 'cancelOrderItem', 'restoreOrderItem',
   'getOrderTimeline', 'getOrderItemTimeline',
   'updateCustomerPayment', 'getSupplierPayments', 'updateSupplierPayment'],
  'orderApi',
));

type QuoteApiModule = typeof import('@/api/quote.api');
const { quoteApi } =
  vi.mocked(await vi.importMock<QuoteApiModule>('@/api/quote.api'));

function renderQuoteRoutes(initialEntries: string[] = ['/quotes/1']) {
  return renderIntegration(
    <Routes>
      <Route path="/quotes/:id" element={<QuoteDetailPage />} />
      <Route path="/quotes/:id/edit" element={<div>Quote Edit Page</div>} />
      <Route path="/quotes" element={<div>Quote List Page</div>} />
      <Route path="/orders/:id" element={<div>Order Detail Page</div>} />
    </Routes>,
    { initialEntries, withAuth: true },
  );
}

describe('Quote Conversion Integration', () => {
  const mockCustomer = createMockCustomer({ id: 1, companyName: '测试客户' });
  const mockFabric = createMockFabric({ id: 1, fabricCode: 'FAB-0001', name: '棉布' });

  beforeEach(() => {
    clearAuthState();
    resetIdCounter();
    vi.clearAllMocks();
  });

  describe('Active Quote', () => {
    it('displays convert button (disabled until items selected) for active quotes', async () => {
      const quoteItem = createMockQuoteItem({
        id: 10,
        fabricId: mockFabric.id,
        fabric: mockFabric,
        isConverted: false,
      });
      const quote = createMockQuote({
        id: 1,
        status: QuoteStatus.ACTIVE,
        customer: mockCustomer,
        items: [quoteItem],
      });
      quoteApi.getQuote.mockResolvedValue(quote);

      renderQuoteRoutes();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /转化为订单/ })).toBeInTheDocument();
      });

      // Convert button is disabled until items are selected
      expect(screen.getByRole('button', { name: /转化为订单/ })).toBeDisabled();

      // Edit button should be enabled
      const editButton = screen.getByRole('button', { name: /编辑/ });
      expect(editButton).not.toBeDisabled();

      // Delete button should be enabled
      const deleteButton = screen.getByRole('button', { name: /删除/ });
      expect(deleteButton).not.toBeDisabled();
    });

    it('convert flow: select items → click → confirm → API call → navigate to order', async () => {
      const quoteItem1 = createMockQuoteItem({
        id: 10,
        fabricId: mockFabric.id,
        fabric: mockFabric,
        isConverted: false,
      });
      const quoteItem2 = createMockQuoteItem({
        id: 11,
        fabricId: mockFabric.id,
        fabric: mockFabric,
        isConverted: false,
      });
      const quote = createMockQuote({
        id: 1,
        status: QuoteStatus.ACTIVE,
        customer: mockCustomer,
        items: [quoteItem1, quoteItem2],
      });
      const newOrder = createMockOrder({ id: 42 });

      quoteApi.getQuote.mockResolvedValue(quote);
      quoteApi.convertQuoteItems.mockResolvedValue(newOrder);

      renderQuoteRoutes();
      const user = userEvent.setup();

      // Wait for page and items table to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /转化为订单/ })).toBeInTheDocument();
      });

      // Select the first item checkbox
      const checkboxes = document.querySelectorAll('.ant-table-row .ant-checkbox-input');
      expect(checkboxes.length).toBe(2);
      await user.click(checkboxes[0] as HTMLElement);

      // Convert button should now be enabled
      const convertBtn = screen.getByRole('button', { name: /转化为订单/ });
      expect(convertBtn).not.toBeDisabled();
      await user.click(convertBtn);

      // Confirm modal appears
      await waitFor(() => {
        expect(document.querySelector('.ant-modal-footer')).not.toBeNull();
      });

      const modalFooter = document.querySelector('.ant-modal-footer');
      const okButton = modalFooter!.querySelector('.ant-btn-primary') as HTMLButtonElement;
      await user.click(okButton);

      // Verify API call with selected item IDs
      await waitFor(() => {
        expect(quoteApi.convertQuoteItems).toHaveBeenCalledWith({ quoteItemIds: [10] });
      });

      // Should navigate to the new order page
      await waitFor(() => {
        expect(screen.getByText('Order Detail Page')).toBeInTheDocument();
      });
    });

    it('convert failure: stays on page with error message', async () => {
      const quoteItem = createMockQuoteItem({
        id: 10,
        fabricId: mockFabric.id,
        fabric: mockFabric,
        isConverted: false,
      });
      const quote = createMockQuote({
        id: 1,
        status: QuoteStatus.ACTIVE,
        customer: mockCustomer,
        items: [quoteItem],
      });

      quoteApi.getQuote.mockResolvedValue(quote);
      quoteApi.convertQuoteItems.mockRejectedValue({
        code: 500,
        message: 'Internal Server Error',
        data: null,
      });

      renderQuoteRoutes();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /转化为订单/ })).toBeInTheDocument();
      });

      // Select item first
      const checkbox = document.querySelector('.ant-table-row .ant-checkbox-input') as HTMLElement;
      await user.click(checkbox);

      await user.click(screen.getByRole('button', { name: /转化为订单/ }));

      await waitFor(() => {
        expect(document.querySelector('.ant-modal-footer')).not.toBeNull();
      });

      const modalFooter = document.querySelector('.ant-modal-footer');
      const okButton = modalFooter!.querySelector('.ant-btn-primary') as HTMLButtonElement;
      await user.click(okButton);

      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText('服务器错误，请稍后重试')).toBeInTheDocument();
      });

      // Should stay on quote page (quoteCode still visible in title)
      expect(screen.getAllByText(quote.quoteCode).length).toBeGreaterThan(0);
    });

    it('delete flow: click → confirm → API call → navigate to list', async () => {
      const quote = createMockQuote({
        id: 1,
        status: QuoteStatus.ACTIVE,
        customer: mockCustomer,
        items: [],
      });

      quoteApi.getQuote.mockResolvedValue(quote);
      quoteApi.deleteQuote.mockResolvedValue(undefined);

      renderQuoteRoutes();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /删除/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /删除/ }));

      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
      });

      // Click the danger confirm button in the modal
      const modalFooter = document.querySelector('.ant-modal-footer');
      const okButton = modalFooter!.querySelector('.ant-btn-dangerous') as HTMLButtonElement;
      await user.click(okButton);

      await waitFor(() => {
        expect(quoteApi.deleteQuote).toHaveBeenCalledWith(1);
      });

      await waitFor(() => {
        expect(screen.getByText('Quote List Page')).toBeInTheDocument();
      });
    });

    it('delete 409 error: shows associated order error message', async () => {
      const quote = createMockQuote({
        id: 1,
        status: QuoteStatus.ACTIVE,
        customer: mockCustomer,
        items: [],
      });

      quoteApi.getQuote.mockResolvedValue(quote);
      quoteApi.deleteQuote.mockRejectedValue({
        code: 409,
        message: 'QUOTE_ALREADY_CONVERTED',
        data: null,
      });

      renderQuoteRoutes();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /删除/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /删除/ }));

      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
      });

      const modalFooter = document.querySelector('.ant-modal-footer');
      const okButton = modalFooter!.querySelector('.ant-btn-dangerous') as HTMLButtonElement;
      await user.click(okButton);

      await waitFor(() => {
        expect(screen.getByText('该报价单已转为订单')).toBeInTheDocument();
      });
    });
  });

  describe('Expired Quote', () => {
    it('does not show convert button; edit is enabled (backend allows editing expired)', async () => {
      const quote = createMockQuote({
        id: 2,
        status: QuoteStatus.EXPIRED,
        customer: mockCustomer,
        items: [],
      });
      quoteApi.getQuote.mockResolvedValue(quote);

      renderQuoteRoutes(['/quotes/2']);

      // Wait for quote data to render
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /编辑/ })).toBeInTheDocument();
      });

      // Convert button should not be rendered for expired quotes
      expect(screen.queryByRole('button', { name: /转化为订单/ })).not.toBeInTheDocument();

      // Edit button should be enabled for expired quotes (can extend validUntil)
      expect(screen.getByRole('button', { name: /编辑/ })).not.toBeDisabled();
    });
  });

  describe('Converted Quote', () => {
    it('does not show convert button; edit and delete are disabled', async () => {
      const quote = createMockQuote({
        id: 3,
        status: QuoteStatus.CONVERTED,
        customer: mockCustomer,
        items: [],
      });
      quoteApi.getQuote.mockResolvedValue(quote);

      renderQuoteRoutes(['/quotes/3']);

      // Wait for quote data to render
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /编辑/ })).toBeInTheDocument();
      });

      // Convert button should not be rendered
      expect(screen.queryByRole('button', { name: /转化为订单/ })).not.toBeInTheDocument();

      // Edit button should be disabled
      expect(screen.getByRole('button', { name: /编辑/ })).toBeDisabled();

      // Delete button should be disabled
      expect(screen.getByRole('button', { name: /删除/ })).toBeDisabled();
    });
  });
});
