/**
 * Unit tests for QuoteFormPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import QuoteFormPage from '../QuoteFormPage';
import { QuoteStatus } from '@/types';
import type { Quote } from '@/types';

// Mock hooks
const mockUseQuote = vi.fn();
const mockUseCreateQuote = vi.fn();
const mockUseUpdateQuote = vi.fn();

vi.mock('@/hooks/queries/useQuotes', () => ({
  useQuote: (...args: unknown[]) => mockUseQuote(...args),
  useCreateQuote: () => mockUseCreateQuote(),
  useUpdateQuote: () => mockUseUpdateQuote(),
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

// Mock customer and fabric APIs for selectors
vi.mock('@/api/customer.api', () => ({
  getCustomers: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock('@/api/fabric.api', () => ({
  getFabrics: vi.fn().mockResolvedValue({ items: [] }),
}));

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
  notes: undefined,
  customer: undefined,
  fabric: undefined,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Helper to render with providers
function renderWithProviders(
  ui: React.ReactElement,
  { initialEntries = ['/quotes/new'] } = {}
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
          <Route path="/quotes/new" element={ui} />
          <Route path="/quotes/:id/edit" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('QuoteFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseQuote.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    mockUseCreateQuote.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockQuote),
      isPending: false,
    });

    mockUseUpdateQuote.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockQuote),
      isPending: false,
    });
  });

  describe('Create Mode', () => {
    it('should render create mode page', async () => {
      renderWithProviders(<QuoteFormPage />);

      await waitFor(() => {
        expect(screen.getAllByText('新建报价').length).toBeGreaterThan(0);
      });
    });

    it('should navigate to list on cancel', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuoteFormPage />);

      // Ant Design button inserts space between two Chinese characters
      await waitFor(() => {
        expect(screen.getByText(/取.*消/)).toBeInTheDocument();
      }, { timeout: 5000 });

      const cancelButton = screen.getByText(/取.*消/).closest('button');
      expect(cancelButton).toBeTruthy();
      await user.click(cancelButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/quotes');
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      mockUseQuote.mockReturnValue({
        data: mockQuote,
        isLoading: false,
        error: null,
      });
    });

    it('should render edit mode page', async () => {
      renderWithProviders(<QuoteFormPage />, {
        initialEntries: ['/quotes/1/edit'],
      });

      await waitFor(() => {
        expect(screen.getAllByText(/编辑报价/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching quote', async () => {
      mockUseQuote.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderWithProviders(<QuoteFormPage />, {
        initialEntries: ['/quotes/1/edit'],
      });

      await waitFor(() => {
        expect(screen.getByText('加载中...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error result when fetch fails', async () => {
      mockUseQuote.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      renderWithProviders(<QuoteFormPage />, {
        initialEntries: ['/quotes/1/edit'],
      });

      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
      });
    });
  });

  describe('404 Handling', () => {
    it('should show 404 result when quote not found', async () => {
      mockUseQuote.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<QuoteFormPage />, {
        initialEntries: ['/quotes/999/edit'],
      });

      await waitFor(() => {
        expect(screen.getByText('报价不存在')).toBeInTheDocument();
      });
    });
  });

  describe('Converted Quote Guard', () => {
    it('should show warning for converted quotes', async () => {
      mockUseQuote.mockReturnValue({
        data: { ...mockQuote, status: QuoteStatus.CONVERTED },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<QuoteFormPage />, {
        initialEntries: ['/quotes/1/edit'],
      });

      await waitFor(() => {
        expect(screen.getByText('已转换的报价无法编辑')).toBeInTheDocument();
      });
    });
  });

  describe('Submit Loading', () => {
    it('should show loading state during create submission', async () => {
      mockUseCreateQuote.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      renderWithProviders(<QuoteFormPage />);

      await waitFor(() => {
        const submitButton = screen.getByText('创建报价').closest('button');
        expect(submitButton).toHaveClass('ant-btn-loading');
      });
    });
  });
});
