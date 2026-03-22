/**
 * Unit tests for QuoteDetailPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import QuoteDetailPage from '../QuoteDetailPage';
import { QuoteStatus } from '@/types';
import type { Quote } from '@/types';

// Mock hooks
const mockUseQuote = vi.fn();
const mockUseDeleteQuote = vi.fn();
const mockUseConvertQuoteToOrder = vi.fn();

vi.mock('@/hooks/queries/useQuotes', () => ({
  useQuote: (...args: unknown[]) => mockUseQuote(...args),
  useDeleteQuote: () => mockUseDeleteQuote(),
  useConvertQuoteToOrder: () => mockUseConvertQuoteToOrder(),
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
const mockQuote: Quote = {
  id: 1,
  quoteCode: 'QT-2401-0001',
  customerId: 1,
  fabricId: 1,
  quantity: 100,
  unitPrice: 25.5,
  totalPrice: 2550,
  validUntil: '2026-12-31T00:00:00.000Z',
  status: QuoteStatus.ACTIVE,
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

    mockUseConvertQuoteToOrder.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 1 }),
      isPending: false,
    });
  });

  describe('Rendering', () => {
    it('should render quote details', async () => {
      renderWithProviders(<QuoteDetailPage />);

      // Quote code appears in multiple places (title, breadcrumb, descriptions)
      await waitFor(() => {
        expect(screen.getAllByText('QT-2401-0001').length).toBeGreaterThan(0);
      });
      expect(screen.getByText('Test Customer')).toBeInTheDocument();
      expect(screen.getByText('FB-2401-0001')).toBeInTheDocument();
    });

    it('should render action buttons for active quote', async () => {
      renderWithProviders(<QuoteDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('转换为订单')).toBeInTheDocument();
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

  describe('Convert to Order 501 Handling', () => {
    it('should show warning on 501 Not Implemented', async () => {
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

      renderWithProviders(<QuoteDetailPage />);

      // Click convert button
      await waitFor(() => {
        expect(screen.getByText('转换为订单')).toBeInTheDocument();
      });
      const convertBtn = screen.getByText('转换为订单').closest('button');
      await user.click(convertBtn!);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getAllByText('确认转换').length).toBeGreaterThanOrEqual(2);
      });

      // Click confirm button in modal footer
      const confirmButton = document.querySelector('.ant-modal-footer .ant-btn-primary');
      expect(confirmButton).toBeInTheDocument();
      await user.click(confirmButton!);

      // Verify warning (not error) message
      await waitFor(() => {
        expect(antdMessage.warning).toHaveBeenCalledWith('该功能暂未实现');
      });
    });
  });
});
