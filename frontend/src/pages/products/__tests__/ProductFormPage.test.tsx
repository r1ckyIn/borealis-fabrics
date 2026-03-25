/**
 * Unit tests for ProductFormPage component.
 * Tests dynamic spec fields per subCategory, create/edit modes.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ProductFormPage from '../ProductFormPage';
import type { Product } from '@/types';

// Mock query hooks
const mockUseProduct = vi.fn();
const mockUseCreateProduct = vi.fn();
const mockUseUpdateProduct = vi.fn();

vi.mock('@/hooks/queries/useProducts', () => ({
  useProduct: (...args: unknown[]) => mockUseProduct(...args),
  useCreateProduct: () => mockUseCreateProduct(),
  useUpdateProduct: () => mockUseUpdateProduct(),
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

// Mock product for edit mode
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
  notes: '备注内容',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

/** Helper to render at a specific route. */
function renderAtRoute(path: string, route: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={<ProductFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProductFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no existing product (create mode)
    mockUseProduct.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    mockUseCreateProduct.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseUpdateProduct.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  describe('Create Mode - IRON_FRAME', () => {
    it('should render create form with correct title', async () => {
      renderAtRoute('/products/iron-frames/new', '/products/:category/new');

      await waitFor(() => {
        expect(screen.getAllByText('新增铁架').length).toBeGreaterThan(0);
      }, { timeout: 10000 });
    }, 15000);

    it('should show modelNumber field for IRON_FRAME', async () => {
      renderAtRoute('/products/iron-frames/new', '/products/:category/new');

      await waitFor(() => {
        expect(screen.getByText('型号')).toBeInTheDocument();
      });
    });

    it('should show specification field for IRON_FRAME', async () => {
      renderAtRoute('/products/iron-frames/new', '/products/:category/new');

      await waitFor(() => {
        expect(screen.getByText('规格')).toBeInTheDocument();
      });
    });

    it('should show common fields (name, price, notes)', async () => {
      renderAtRoute('/products/iron-frames/new', '/products/:category/new');

      await waitFor(() => {
        expect(screen.getByText('产品名称')).toBeInTheDocument();
      });
      expect(screen.getByText('默认单价')).toBeInTheDocument();
      expect(screen.getByText('备注')).toBeInTheDocument();
    });

    it('should show create button with category label', async () => {
      renderAtRoute('/products/iron-frames/new', '/products/:category/new');

      await waitFor(() => {
        expect(screen.getByText('创建铁架')).toBeInTheDocument();
      });
    });
  });

  describe('Create Mode - MATTRESS', () => {
    it('should show specification field for MATTRESS', async () => {
      renderAtRoute('/products/mattresses/new', '/products/:category/new');

      await waitFor(() => {
        expect(screen.getByText('规格尺寸')).toBeInTheDocument();
      });
    });

    it('should NOT show modelNumber field for MATTRESS', async () => {
      renderAtRoute('/products/mattresses/new', '/products/:category/new');

      // Wait for the form to render
      await waitFor(() => {
        expect(screen.getByText('产品名称')).toBeInTheDocument();
      });

      // modelNumber field should not be present for MATTRESS
      expect(screen.queryByText('型号')).not.toBeInTheDocument();
    });
  });

  describe('Create Mode - MOTOR', () => {
    it('should render motor-specific title and fields', async () => {
      renderAtRoute('/products/motors/new', '/products/:category/new');

      await waitFor(() => {
        expect(screen.getAllByText('新增电机').length).toBeGreaterThan(0);
      });
      expect(screen.getByText('型号')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should render edit title when editing', async () => {
      mockUseProduct.mockReturnValue({
        data: mockProduct,
        isLoading: false,
        error: null,
      });

      renderAtRoute('/products/iron-frames/1/edit', '/products/:category/:id/edit');

      await waitFor(() => {
        expect(screen.getAllByText('编辑铁架').length).toBeGreaterThan(0);
      });
    });

    it('should show save button in edit mode', async () => {
      mockUseProduct.mockReturnValue({
        data: mockProduct,
        isLoading: false,
        error: null,
      });

      renderAtRoute('/products/iron-frames/1/edit', '/products/:category/:id/edit');

      await waitFor(() => {
        expect(screen.getByText('保存修改')).toBeInTheDocument();
      });
    });

    it('should show loading spinner in edit mode', async () => {
      mockUseProduct.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderAtRoute('/products/iron-frames/1/edit', '/products/:category/:id/edit');

      await waitFor(() => {
        expect(screen.getByText('加载中...')).toBeInTheDocument();
      });
    });
  });
});
