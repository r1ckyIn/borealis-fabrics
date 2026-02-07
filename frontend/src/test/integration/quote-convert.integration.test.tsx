/**
 * Integration tests for Quote detail and conversion flow.
 *
 * Mocks at the API module level (@/api/quote.api) while keeping
 * TanStack Query hooks, components, and routing running with real code.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import QuoteDetailPage from '@/pages/quotes/QuoteDetailPage';
import {
  createMockQuote,
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

// Mock quote API module
vi.mock('@/api/quote.api', () => ({
  getQuotes: vi.fn(),
  getQuote: vi.fn(),
  createQuote: vi.fn(),
  updateQuote: vi.fn(),
  deleteQuote: vi.fn(),
  convertQuoteToOrder: vi.fn(),
  quoteApi: {
    getQuotes: vi.fn(),
    getQuote: vi.fn(),
    createQuote: vi.fn(),
    updateQuote: vi.fn(),
    deleteQuote: vi.fn(),
    convertQuoteToOrder: vi.fn(),
  },
}));

// Mock order API (needed for orderKeys import in useQuotes)
vi.mock('@/api/order.api', () => ({
  getOrders: vi.fn(),
  getOrder: vi.fn(),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
  getOrderItems: vi.fn(),
  addOrderItem: vi.fn(),
  updateOrderItem: vi.fn(),
  deleteOrderItem: vi.fn(),
  updateOrderItemStatus: vi.fn(),
  cancelOrderItem: vi.fn(),
  restoreOrderItem: vi.fn(),
  getOrderTimeline: vi.fn(),
  getOrderItemTimeline: vi.fn(),
  updateCustomerPayment: vi.fn(),
  getSupplierPayments: vi.fn(),
  updateSupplierPayment: vi.fn(),
  orderApi: {
    getOrders: vi.fn(),
    getOrder: vi.fn(),
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
    deleteOrder: vi.fn(),
    getOrderItems: vi.fn(),
    addOrderItem: vi.fn(),
    updateOrderItem: vi.fn(),
    deleteOrderItem: vi.fn(),
    updateOrderItemStatus: vi.fn(),
    cancelOrderItem: vi.fn(),
    restoreOrderItem: vi.fn(),
    getOrderTimeline: vi.fn(),
    getOrderItemTimeline: vi.fn(),
    updateCustomerPayment: vi.fn(),
    getSupplierPayments: vi.fn(),
    updateSupplierPayment: vi.fn(),
  },
}));

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
    it('displays convert-to-order button for active quotes', async () => {
      const quote = createMockQuote({
        id: 1,
        status: QuoteStatus.ACTIVE,
        customer: mockCustomer,
        fabric: mockFabric,
      });
      quoteApi.getQuote.mockResolvedValue(quote);

      renderQuoteRoutes();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /转换为订单/ })).toBeInTheDocument();
      });

      // Edit button should be enabled
      const editButton = screen.getByRole('button', { name: /编辑/ });
      expect(editButton).not.toBeDisabled();

      // Delete button should be enabled
      const deleteButton = screen.getByRole('button', { name: /删除/ });
      expect(deleteButton).not.toBeDisabled();
    });

    it('convert flow: click → confirm → API call → navigate to order', async () => {
      const quote = createMockQuote({
        id: 1,
        status: QuoteStatus.ACTIVE,
        customer: mockCustomer,
        fabric: mockFabric,
      });
      const newOrder = createMockOrder({ id: 42 });

      quoteApi.getQuote.mockResolvedValue(quote);
      quoteApi.convertQuoteToOrder.mockResolvedValue(newOrder);

      renderQuoteRoutes();
      const user = userEvent.setup();

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /转换为订单/ })).toBeInTheDocument();
      });

      // Click convert button
      await user.click(screen.getByRole('button', { name: /转换为订单/ }));

      // Confirm modal appears - find the ok button in modal footer
      await waitFor(() => {
        expect(document.querySelector('.ant-modal-footer')).not.toBeNull();
      });

      const modalFooter = document.querySelector('.ant-modal-footer');
      const okButton = modalFooter!.querySelector('.ant-btn-primary') as HTMLButtonElement;
      await user.click(okButton);

      // Verify API call
      await waitFor(() => {
        expect(quoteApi.convertQuoteToOrder).toHaveBeenCalledWith(1);
      });

      // Should navigate to the new order page
      await waitFor(() => {
        expect(screen.getByText('Order Detail Page')).toBeInTheDocument();
      });
    });

    it('convert failure: stays on page with error message', async () => {
      const quote = createMockQuote({
        id: 1,
        status: QuoteStatus.ACTIVE,
        customer: mockCustomer,
        fabric: mockFabric,
      });

      quoteApi.getQuote.mockResolvedValue(quote);
      quoteApi.convertQuoteToOrder.mockRejectedValue(new Error('Server error'));

      renderQuoteRoutes();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /转换为订单/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /转换为订单/ }));

      await waitFor(() => {
        expect(document.querySelector('.ant-modal-footer')).not.toBeNull();
      });

      const modalFooter = document.querySelector('.ant-modal-footer');
      const okButton = modalFooter!.querySelector('.ant-btn-primary') as HTMLButtonElement;
      await user.click(okButton);

      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText('转换失败，请重试')).toBeInTheDocument();
      });

      // Should stay on quote page (quoteCode still visible in title)
      expect(screen.getAllByText(quote.quoteCode).length).toBeGreaterThan(0);
    });

    it('delete flow: click → confirm → API call → navigate to list', async () => {
      const quote = createMockQuote({
        id: 1,
        status: QuoteStatus.ACTIVE,
        customer: mockCustomer,
        fabric: mockFabric,
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
        fabric: mockFabric,
      });

      quoteApi.getQuote.mockResolvedValue(quote);
      quoteApi.deleteQuote.mockRejectedValue({
        response: { status: 409 },
        message: 'Conflict',
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
        expect(screen.getByText('该报价已关联订单，无法删除')).toBeInTheDocument();
      });
    });
  });

  describe('Expired Quote', () => {
    it('does not show convert button; edit is disabled', async () => {
      const quote = createMockQuote({
        id: 2,
        status: QuoteStatus.EXPIRED,
        customer: mockCustomer,
        fabric: mockFabric,
      });
      quoteApi.getQuote.mockResolvedValue(quote);

      renderQuoteRoutes(['/quotes/2']);

      // Wait for quote data to render
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /编辑/ })).toBeInTheDocument();
      });

      // Convert button should not be rendered
      expect(screen.queryByRole('button', { name: /转换为订单/ })).not.toBeInTheDocument();

      // Edit button should be disabled
      expect(screen.getByRole('button', { name: /编辑/ })).toBeDisabled();
    });
  });

  describe('Converted Quote', () => {
    it('does not show convert button; edit and delete are disabled', async () => {
      const quote = createMockQuote({
        id: 3,
        status: QuoteStatus.CONVERTED,
        customer: mockCustomer,
        fabric: mockFabric,
      });
      quoteApi.getQuote.mockResolvedValue(quote);

      renderQuoteRoutes(['/quotes/3']);

      // Wait for quote data to render
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /编辑/ })).toBeInTheDocument();
      });

      // Convert button should not be rendered
      expect(screen.queryByRole('button', { name: /转换为订单/ })).not.toBeInTheDocument();

      // Edit button should be disabled
      expect(screen.getByRole('button', { name: /编辑/ })).toBeDisabled();

      // Delete button should be disabled
      expect(screen.getByRole('button', { name: /删除/ })).toBeDisabled();
    });
  });
});
