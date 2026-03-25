/**
 * Unit tests for ProductListPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ProductListPage from '../ProductListPage';
import type { Product, PaginatedResult } from '@/types';

// Mock hooks
const mockUseProducts = vi.fn();

vi.mock('@/hooks/queries/useProducts', () => ({
  useProducts: (...args: unknown[]) => mockUseProducts(...args),
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

// Mock product data for iron frame category
const mockIronFrameProducts: Product[] = [
  {
    id: 1,
    productCode: 'PD-2601-0001',
    name: '标准三人位铁架',
    category: 'IRON_FRAME_MOTOR',
    subCategory: 'IRON_FRAME',
    modelNumber: 'IF-300',
    specification: '3人位 L型',
    defaultPrice: 450.00,
    specs: null,
    notes: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    productCode: 'PD-2601-0002',
    name: '双人位铁架',
    category: 'IRON_FRAME_MOTOR',
    subCategory: 'IRON_FRAME',
    modelNumber: 'IF-200',
    specification: '2人位',
    defaultPrice: 320.00,
    specs: null,
    notes: null,
    isActive: true,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

const mockPaginatedResult: PaginatedResult<Product> = {
  items: mockIronFrameProducts,
  pagination: {
    total: 2,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  },
};

/** Helper to render with providers and router at the given category route. */
function renderWithProviders(category: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/products/${category}`]}>
        <Routes>
          <Route path="/products/:category" element={<ProductListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProductListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseProducts.mockReturnValue({
      data: mockPaginatedResult,
      isLoading: false,
      isFetching: false,
    });
  });

  describe('Rendering for IRON_FRAME category', () => {
    it('should render category-specific title', async () => {
      renderWithProviders('iron-frames');

      await waitFor(() => {
        expect(screen.getAllByText('铁架管理').length).toBeGreaterThan(0);
      }, { timeout: 10000 });
    }, 15000);

    it('should render table with product data', async () => {
      renderWithProviders('iron-frames');

      await waitFor(() => {
        expect(screen.getByText('PD-2601-0001')).toBeInTheDocument();
      });
      expect(screen.getByText('标准三人位铁架')).toBeInTheDocument();
      expect(screen.getByText('IF-300')).toBeInTheDocument();
    });

    it('should render category-specific column headers', async () => {
      renderWithProviders('iron-frames');

      await waitFor(() => {
        expect(screen.getAllByText('型号').length).toBeGreaterThan(0);
      });
      expect(screen.getAllByText('规格').length).toBeGreaterThan(0);
    });

    it('should render search input', async () => {
      renderWithProviders('iron-frames');

      await waitFor(() => {
        expect(screen.getByPlaceholderText('产品编码/名称/型号')).toBeInTheDocument();
      });
    });

    it('should render create button with category label', async () => {
      renderWithProviders('iron-frames');

      await waitFor(() => {
        expect(screen.getByText('新增铁架')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to create page when clicking new button', async () => {
      const user = userEvent.setup();
      renderWithProviders('iron-frames');

      await waitFor(() => {
        expect(screen.getByText('新增铁架')).toBeInTheDocument();
      });

      const newButton = screen.getByText('新增铁架').closest('button');
      await user.click(newButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/products/iron-frames/new');
    });

    it('should navigate to detail page when clicking view button', async () => {
      const user = userEvent.setup();
      renderWithProviders('iron-frames');

      await waitFor(() => {
        expect(screen.getAllByText('查看').length).toBeGreaterThan(0);
      });

      const viewButtons = screen.getAllByText('查看');
      await user.click(viewButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/products/iron-frames/1');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no data', async () => {
      mockUseProducts.mockReturnValue({
        data: {
          items: [],
          pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        },
        isLoading: false,
        isFetching: false,
      });

      renderWithProviders('iron-frames');

      await waitFor(() => {
        expect(document.querySelector('.ant-empty')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner', async () => {
      mockUseProducts.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      });

      renderWithProviders('iron-frames');

      await waitFor(() => {
        expect(document.querySelector('.ant-spin')).toBeInTheDocument();
      });
    });
  });

  describe('Unknown category', () => {
    it('should show 404 for invalid category', async () => {
      renderWithProviders('unknown-stuff');

      await waitFor(() => {
        expect(screen.getAllByText('未知分类').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Motor category columns', () => {
    it('should render motor title for motors route', async () => {
      renderWithProviders('motors');

      await waitFor(() => {
        expect(screen.getAllByText('电机管理').length).toBeGreaterThan(0);
      });
    });
  });
});
