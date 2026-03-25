/**
 * Unit tests for ProductDetailPage component.
 * Mocks hooks and sub-components to test orchestrator behavior.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ProductDetailPage from '../ProductDetailPage';
import type { Product } from '@/types';

// Mock query hooks
const mockUseProduct = vi.fn();
const mockUseDeleteProduct = vi.fn();

vi.mock('@/hooks/queries/useProducts', () => ({
  useProduct: (...args: unknown[]) => mockUseProduct(...args),
  useDeleteProduct: () => mockUseDeleteProduct(),
  productKeys: {
    all: ['products'],
    lists: () => ['products', 'list'],
    list: (params: unknown) => ['products', 'list', params],
    details: () => ['products', 'detail'],
    detail: (id: number) => ['products', 'detail', id],
  },
}));

// Mock sub-components
vi.mock('../components/ProductBasicInfo', () => ({
  ProductBasicInfo: () => <div data-testid="product-basic-info">Basic Info</div>,
}));
vi.mock('../components/ProductSupplierTab', () => ({
  ProductSupplierTab: () => <div data-testid="product-supplier-tab">Suppliers</div>,
}));
vi.mock('../components/ProductPricingTab', () => ({
  ProductPricingTab: () => <div data-testid="product-pricing-tab">Pricing</div>,
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
    },
  };
});

// Mock product data
const mockProduct: Product = {
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
};

// Render helper
function renderWithProviders(
  initialEntries = ['/products/iron-frames/1']
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
          <Route path="/products/:category/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseProduct.mockReturnValue({
      data: mockProduct,
      isLoading: false,
      error: null,
    });

    mockUseDeleteProduct.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  describe('Rendering', () => {
    it('should render product name as page title', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getAllByText('标准三人位铁架').length).toBeGreaterThan(0);
      });
    });

    it('should render edit and delete buttons', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('编辑')).toBeInTheDocument();
      });
      expect(screen.getByText('删除')).toBeInTheDocument();
    });

    it('should render all 3 tabs', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('基本信息')).toBeInTheDocument();
      });
      expect(screen.getByText('供应商')).toBeInTheDocument();
      expect(screen.getByText('定价')).toBeInTheDocument();
    });

    it('should render category tag', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('铁架')).toBeInTheDocument();
      });
    });

    it('should render basic info sub-component by default', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('product-basic-info')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Switching', () => {
    it('should show supplier tab content when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('供应商')).toBeInTheDocument();
      });

      await user.click(screen.getByText('供应商'));

      await waitFor(() => {
        expect(screen.getByTestId('product-supplier-tab')).toBeInTheDocument();
      });
    });

    it('should show pricing tab content when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('定价')).toBeInTheDocument();
      });

      await user.click(screen.getByText('定价'));

      await waitFor(() => {
        expect(screen.getByTestId('product-pricing-tab')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner', async () => {
      mockUseProduct.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('加载中...')).toBeInTheDocument();
      });
    });
  });

  describe('404 State', () => {
    it('should show 404 when product not found', async () => {
      mockUseProduct.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('产品不存在')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message on fetch failure', async () => {
      mockUseProduct.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to edit page when clicking edit', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('编辑')).toBeInTheDocument();
      });

      await user.click(screen.getByText('编辑').closest('button')!);

      expect(mockNavigate).toHaveBeenCalledWith('/products/iron-frames/1/edit');
    });
  });
});
