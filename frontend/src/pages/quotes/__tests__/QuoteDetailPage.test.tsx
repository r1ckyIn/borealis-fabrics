/**
 * Unit tests for QuoteDetailPage component (multi-item quote model).
 * Tests: header info, QuoteItem table, checkbox selection, partial conversion.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import QuoteDetailPage from '../QuoteDetailPage';
import { QuoteStatus } from '@/types';
import type { Quote, QuoteItem } from '@/types';

// Mock hooks
const mockUseQuote = vi.fn();
const mockUseDeleteQuote = vi.fn();
const mockUseConvertQuoteItems = vi.fn();

vi.mock('@/hooks/queries/useQuotes', () => ({
  useQuote: (...args: unknown[]) => mockUseQuote(...args),
  useDeleteQuote: () => mockUseDeleteQuote(),
  useConvertQuoteItems: () => mockUseConvertQuoteItems(),
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

/** Quote items for multi-item model. */
const mockItems: QuoteItem[] = [
  {
    id: 101,
    quoteId: 1,
    fabricId: 1,
    productId: null,
    quantity: 100,
    unitPrice: 25.5,
    subtotal: 2550,
    unit: '米',
    isConverted: false,
    notes: null,
    fabric: {
      id: 1,
      fabricCode: 'FB-2401-0001',
      name: 'Test Fabric',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 102,
    quoteId: 1,
    fabricId: null,
    productId: 5,
    quantity: 10,
    unitPrice: 300,
    subtotal: 3000,
    unit: '套',
    isConverted: true,
    notes: 'Already converted item',
    product: {
      id: 5,
      productCode: 'PRD-2401-0001',
      name: 'Test Iron Frame',
      category: 'IRON_FRAME_MOTOR',
      subCategory: 'IRON_FRAME',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

/** Multi-item mock quote with PARTIALLY_CONVERTED status. */
const mockQuote: Quote = {
  id: 1,
  quoteCode: 'QT-2401-0001',
  customerId: 1,
  totalPrice: 5550,
  validUntil: '2026-12-31T00:00:00.000Z',
  status: QuoteStatus.PARTIALLY_CONVERTED,
  notes: 'Test notes',
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
  items: mockItems,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Helper to render with providers
function renderWithProviders(
  ui: React.ReactElement,
  { initialEntries = ['/quotes/1'] } = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/quotes/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('QuoteDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseQuote.mockReturnValue({
      data: mockQuote,
      isLoading: false,
      error: null,
    });

    mockUseDeleteQuote.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });

    mockUseConvertQuoteItems.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 1 }),
      isPending: false,
    });
  });

  describe('Quote Header', () => {
    it('should render quote header info (quoteCode, customer, totalPrice)', async () => {
      renderWithProviders(<QuoteDetailPage />);

      await waitFor(() => {
        expect(screen.getAllByText('QT-2401-0001').length).toBeGreaterThan(0);
      });
      expect(screen.getByText('Test Customer')).toBeInTheDocument();
    });

    it('should render PARTIALLY_CONVERTED status tag', async () => {
      renderWithProviders(<QuoteDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('部分转换')).toBeInTheDocument();
      });
    });
  });

  describe('QuoteItem Table', () => {
    it('should render QuoteItem table with rows', async () => {
      renderWithProviders(<QuoteDetailPage />);

      await waitFor(() => {
        // Fabric item row
        expect(
          screen.getByText('FB-2401-0001 - Test Fabric')
        ).toBeInTheDocument();
        // Product item row
        expect(
          screen.getByText('PRD-2401-0001 - Test Iron Frame')
        ).toBeInTheDocument();
      });
    });

    it('should show conversion status tags for items', async () => {
      renderWithProviders(<QuoteDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('已转换')).toBeInTheDocument();
        expect(screen.getByText('待转换')).toBeInTheDocument();
      });
    });

    it('should show item count in card title', async () => {
      renderWithProviders(<QuoteDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/报价明细.*2.*项/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Checkbox Selection', () => {
    it('should have checkboxes enabled for non-converted items', async () => {
      renderWithProviders(<QuoteDetailPage />);

      await waitFor(() => {
        const checkboxes = document.querySelectorAll(
          '.ant-table-tbody .ant-checkbox-input'
        );
        // There should be 2 checkboxes (one per row)
        expect(checkboxes.length).toBe(2);
      });
    });

    it('should have disabled checkbox for isConverted=true items', async () => {
      renderWithProviders(<QuoteDetailPage />);

      await waitFor(() => {
        const disabledCheckboxes = document.querySelectorAll(
          '.ant-table-tbody .ant-checkbox-input[disabled]'
        );
        // The second item (isConverted=true) should be disabled
        expect(disabledCheckboxes.length).toBe(1);
      });
    });
  });

  describe('Conversion Action', () => {
    it('should show 转化为订单 button disabled when no items selected', async () => {
      renderWithProviders(<QuoteDetailPage />);

      await waitFor(() => {
        const convertButton = screen
          .getByText(/转化为订单/)
          .closest('button');
        expect(convertButton).toBeInTheDocument();
        expect(convertButton).toBeDisabled();
      });
    });

    it('should enable 转化为订单 button after selecting a non-converted item', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuoteDetailPage />);

      await waitFor(() => {
        const checkboxes = document.querySelectorAll(
          '.ant-table-tbody .ant-checkbox-input:not([disabled])'
        );
        expect(checkboxes.length).toBe(1);
      });

      // Click the non-disabled checkbox (first non-converted item)
      const enabledCheckbox = document.querySelector(
        '.ant-table-tbody .ant-checkbox-input:not([disabled])'
      ) as HTMLElement;
      await user.click(enabledCheckbox);

      // Button should now show count and be enabled
      await waitFor(() => {
        const convertButton = screen
          .getByText(/转化为订单.*1.*项/)
          .closest('button');
        expect(convertButton).not.toBeDisabled();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while data loads', async () => {
      mockUseQuote.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderWithProviders(<QuoteDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('加载中...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error result on fetch failure', async () => {
      mockUseQuote.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      renderWithProviders(<QuoteDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
      });
    });
  });

  describe('404 Handling', () => {
    it('should show 404 when quote not found', async () => {
      mockUseQuote.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<QuoteDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('报价不存在')).toBeInTheDocument();
      });
    });
  });

  describe('Converted Quote', () => {
    it('should hide conversion UI for fully converted quotes', async () => {
      mockUseQuote.mockReturnValue({
        data: {
          ...mockQuote,
          status: QuoteStatus.CONVERTED,
          items: mockItems.map((item) => ({ ...item, isConverted: true })),
        },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<QuoteDetailPage />);

      await waitFor(() => {
        // Should NOT show convert button for fully converted quotes
        expect(screen.queryByText(/转化为订单/)).not.toBeInTheDocument();
      });
    });
  });
});
