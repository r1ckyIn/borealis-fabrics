/**
 * Unit tests for QuoteListPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import QuoteListPage from '../QuoteListPage';
import { QuoteStatus } from '@/types';
import type { Quote, PaginatedResult } from '@/types';

// Mock hooks
const mockUseQuotes = vi.fn();
const mockUseDeleteQuote = vi.fn();
const mockUseConvertQuoteToOrder = vi.fn();

vi.mock('@/hooks/queries/useQuotes', () => ({
  useQuotes: (...args: unknown[]) => mockUseQuotes(...args),
  useDeleteQuote: () => mockUseDeleteQuote(),
  useConvertQuoteToOrder: () => mockUseConvertQuoteToOrder(),
}));

// Mock usePagination
vi.mock('@/hooks/usePagination', () => ({
  usePagination: () => ({
    paginationProps: {
      current: 1,
      pageSize: 20,
      showSizeChanger: true,
    },
    queryParams: {
      page: 1,
      pageSize: 20,
    },
    handleTableChange: vi.fn(),
    setPage: vi.fn(),
  }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  };
});

// Mock quote data
const mockQuotes: Quote[] = [
  {
    id: 1,
    quoteCode: 'QT-2401-0001',
    customerId: 1,
    fabricId: 1,
    quantity: 100,
    unitPrice: 25.5,
    totalPrice: 2550,
    validUntil: '2026-12-31T00:00:00.000Z',
    status: QuoteStatus.ACTIVE,
    notes: undefined,
    customer: {
      id: 1,
      companyName: 'Test Customer',
      contactName: 'Alice',
      phone: '13800000001',
      email: undefined,
      addresses: undefined,
      creditType: 'prepay' as const,
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    fabric: {
      id: 1,
      fabricCode: 'FB-2401-0001',
      name: 'Test Fabric',
      material: undefined,
      composition: undefined,
      color: undefined,
      weight: undefined,
      width: undefined,
      thickness: undefined,
      handFeel: undefined,
      glossLevel: undefined,
      application: undefined,
      defaultPrice: undefined,
      defaultLeadTime: undefined,
      description: undefined,
      tags: undefined,
      notes: undefined,
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const mockPaginatedResult: PaginatedResult<Quote> = {
  items: mockQuotes,
  pagination: {
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  },
};

// Helper to render with providers
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/quotes']}>
        <Routes>
          <Route path="/quotes" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('QuoteListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseQuotes.mockReturnValue({
      data: mockPaginatedResult,
      isLoading: false,
      isFetching: false,
    });

    mockUseDeleteQuote.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });

    mockUseConvertQuoteToOrder.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 1 }),
      isPending: false,
    });
  });

  describe('Rendering', () => {
    it('should render page title', async () => {
      renderWithProviders(<QuoteListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('报价管理').length).toBeGreaterThan(0);
      });
    });

    it('should render table with quote data', async () => {
      renderWithProviders(<QuoteListPage />);

      await waitFor(() => {
        expect(screen.getByText('QT-2401-0001')).toBeInTheDocument();
      });
    });

    it('should render new quote button', async () => {
      renderWithProviders(<QuoteListPage />);

      await waitFor(() => {
        expect(screen.getByText('新建报价')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state with action button when no data', async () => {
      mockUseQuotes.mockReturnValue({
        data: {
          items: [],
          pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        },
        isLoading: false,
        isFetching: false,
      });

      renderWithProviders(<QuoteListPage />);

      await waitFor(() => {
        expect(document.querySelector('.ant-empty')).toBeInTheDocument();
      });

      // Action button in empty state
      const emptyContainer = document.querySelector('.ant-empty');
      expect(emptyContainer).toBeInTheDocument();
      const actionButton = emptyContainer?.querySelector('button');
      expect(actionButton).toBeInTheDocument();
    });
  });

  describe('Delete Error Handling', () => {
    it('should show Chinese error message on delete failure', async () => {
      const { message: antdMessage } = await import('antd');
      const user = userEvent.setup();

      const mockMutateAsync = vi.fn().mockRejectedValue({
        code: 409,
        message: 'QUOTE_ALREADY_CONVERTED',
        data: null,
      });
      mockUseDeleteQuote.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderWithProviders(<QuoteListPage />);

      // Open delete modal (only visible for ACTIVE quotes)
      await waitFor(() => {
        expect(screen.getAllByText('删除').length).toBeGreaterThan(0);
      });

      const deleteButtons = screen.getAllByText('删除');
      await user.click(deleteButtons[0]);

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
      });

      // Click confirm
      const confirmButton = document.querySelector('.ant-modal-footer .ant-btn-dangerous');
      expect(confirmButton).toBeInTheDocument();
      await user.click(confirmButton!);

      // Verify Chinese error message
      await waitFor(() => {
        expect(antdMessage.error).toHaveBeenCalledWith(
          '该报价单已转为订单'
        );
      });
    });
  });

  describe('Convert to Order', () => {
    it('should show warning message on 501 convert error', async () => {
      const { message: antdMessage } = await import('antd');
      const user = userEvent.setup();

      const mockMutateAsync = vi.fn().mockRejectedValue({
        code: 501,
        message: 'NOT_IMPLEMENTED',
        data: null,
      });
      mockUseConvertQuoteToOrder.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderWithProviders(<QuoteListPage />);

      // Find convert button (only visible for ACTIVE quotes)
      await waitFor(() => {
        expect(screen.getAllByText('转订单').length).toBeGreaterThan(0);
      });

      const convertButtons = screen.getAllByText('转订单');
      await user.click(convertButtons[0]);

      // Wait for convert modal to open
      await waitFor(() => {
        expect(screen.getAllByText('确认转换').length).toBeGreaterThanOrEqual(2);
      });

      // Click confirm button in convert modal footer
      const confirmButton = document.querySelector('.ant-modal-footer .ant-btn-primary');
      expect(confirmButton).toBeInTheDocument();
      await user.click(confirmButton!);

      // Verify warning message was shown (not error)
      await waitFor(() => {
        expect(antdMessage.warning).toHaveBeenCalledWith('该功能暂未实现');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state on table', async () => {
      mockUseQuotes.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      });

      renderWithProviders(<QuoteListPage />);

      await waitFor(() => {
        expect(document.querySelector('.ant-spin')).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    it('should render search form with filters', async () => {
      renderWithProviders(<QuoteListPage />);

      // The search form contains a search button
      await waitFor(() => {
        expect(document.querySelector('.ant-form')).toBeInTheDocument();
      });

      // The select component for status filter should be present
      expect(document.querySelector('.ant-select')).toBeInTheDocument();
    });
  });
});
