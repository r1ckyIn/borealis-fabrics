/**
 * Unit tests for QuoteListPage component (multi-item quote model).
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

vi.mock('@/hooks/queries/useQuotes', () => ({
  useQuotes: (...args: unknown[]) => mockUseQuotes(...args),
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

/** Multi-item mock quotes with items[]. */
const mockQuotes: Quote[] = [
  {
    id: 1,
    quoteCode: 'QT-2401-0001',
    customerId: 1,
    totalPrice: 5550,
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
    items: [
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
        notes: null,
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
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    quoteCode: 'QT-2401-0002',
    customerId: 2,
    totalPrice: 1200,
    validUntil: '2026-06-30T00:00:00.000Z',
    status: QuoteStatus.PARTIALLY_CONVERTED,
    notes: null,
    customer: {
      id: 2,
      companyName: 'Another Customer',
      contactName: null,
      phone: null,
      email: null,
      addresses: null,
      creditType: 'credit' as const,
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    items: [
      {
        id: 201,
        quoteId: 2,
        fabricId: 2,
        productId: null,
        quantity: 50,
        unitPrice: 24,
        subtotal: 1200,
        unit: '米',
        isConverted: false,
        notes: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const mockPaginatedResult: PaginatedResult<Quote> = {
  items: mockQuotes,
  pagination: {
    total: 2,
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
  });

  describe('Rendering', () => {
    it('should render page title and quote codes', async () => {
      renderWithProviders(<QuoteListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('报价管理').length).toBeGreaterThan(0);
      });
      expect(screen.getByText('QT-2401-0001')).toBeInTheDocument();
      expect(screen.getByText('QT-2401-0002')).toBeInTheDocument();
    });

    it('should render customer names and totalPrice columns', async () => {
      renderWithProviders(<QuoteListPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });
      expect(screen.getByText('Another Customer')).toBeInTheDocument();
    });

    it('should render item count column with correct header', async () => {
      renderWithProviders(<QuoteListPage />);

      await waitFor(() => {
        // The "Item Count" column header should be present (may appear multiple times in Ant Table)
        expect(screen.getAllByText('明细数').length).toBeGreaterThan(0);
      });

      // Find all table rows (data rows only, not header)
      const dataRows = document.querySelectorAll(
        '.ant-table-tbody .ant-table-row'
      );
      expect(dataRows.length).toBe(2);
    });

    it('should show PARTIALLY_CONVERTED status tag', async () => {
      renderWithProviders(<QuoteListPage />);

      await waitFor(() => {
        // PARTIALLY_CONVERTED maps to its Chinese label via StatusTag
        expect(screen.getByText('部分转换')).toBeInTheDocument();
      });
    });

    it('should render new quote button', async () => {
      renderWithProviders(<QuoteListPage />);

      await waitFor(() => {
        expect(screen.getByText('新建报价')).toBeInTheDocument();
      });
    });
  });

  describe('Expandable Rows', () => {
    it('should show expand icons for quotes with items', async () => {
      renderWithProviders(<QuoteListPage />);

      await waitFor(() => {
        // Ant Design expandable rows create expand icon cells
        const expandButtons = document.querySelectorAll(
          '.ant-table-row-expand-icon'
        );
        expect(expandButtons.length).toBeGreaterThan(0);
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

      const emptyContainer = document.querySelector('.ant-empty');
      expect(emptyContainer).toBeInTheDocument();
      const actionButton = emptyContainer?.querySelector('button');
      expect(actionButton).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to create page when clicking new button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuoteListPage />);

      await waitFor(() => {
        expect(screen.getByText('新建报价')).toBeInTheDocument();
      });

      const newButton = screen.getByText('新建报价').closest('button');
      await user.click(newButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/quotes/new');
    });

    it('should navigate to detail page when clicking view button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuoteListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('查看').length).toBeGreaterThan(0);
      });

      const viewButtons = screen.getAllByText('查看');
      await user.click(viewButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/quotes/1');
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

      await waitFor(() => {
        expect(document.querySelector('.ant-form')).toBeInTheDocument();
      });

      expect(document.querySelector('.ant-select')).toBeInTheDocument();
    });
  });
});
