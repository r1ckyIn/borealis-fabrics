/**
 * Unit tests for UnifiedProductSelector component.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnifiedProductSelector } from '../UnifiedProductSelector';
import { parseCompositeValue } from '@/utils/product-constants';
import type { Fabric, Product, FabricSupplier, ProductSupplier } from '@/types/entities.types';
import type { PaginatedResult } from '@/types/api.types';

// Mock API modules
vi.mock('@/api/fabric.api', () => ({
  getFabrics: vi.fn(),
  getFabricSuppliers: vi.fn(),
}));

vi.mock('@/api/product.api', () => ({
  getProducts: vi.fn(),
  getProductSuppliers: vi.fn(),
}));

// Import mocked functions
import { getFabrics, getFabricSuppliers } from '@/api/fabric.api';
import { getProducts, getProductSuppliers } from '@/api/product.api';

const mockedGetFabrics = vi.mocked(getFabrics);
const mockedGetProducts = vi.mocked(getProducts);
const mockedGetFabricSuppliers = vi.mocked(getFabricSuppliers);
const mockedGetProductSuppliers = vi.mocked(getProductSuppliers);

// Test data
const mockFabrics: Fabric[] = [
  {
    id: 1,
    fabricCode: 'BF-2501-0001',
    name: '纯棉平纹',
    defaultPrice: 25.0,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

const mockProducts: Product[] = [
  {
    id: 5,
    productCode: 'PR-2501-0001',
    name: '标准铁架',
    category: 'NON_FABRIC',
    subCategory: 'IRON_FRAME',
    defaultPrice: 350.0,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

const mockFabricSupplier: FabricSupplier = {
  id: 10,
  fabricId: 1,
  supplierId: 100,
  purchasePrice: 20.0,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const mockProductSupplier: ProductSupplier = {
  id: 20,
  productId: 5,
  supplierId: 200,
  purchasePrice: 280.0,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

function createPaginatedResult<T>(items: T[]): PaginatedResult<T> {
  return {
    items,
    pagination: {
      total: items.length,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    },
  };
}

function setupMocks() {
  mockedGetFabrics.mockResolvedValue(createPaginatedResult(mockFabrics));
  mockedGetProducts.mockResolvedValue(createPaginatedResult(mockProducts));
  mockedGetFabricSuppliers.mockResolvedValue(
    createPaginatedResult([mockFabricSupplier])
  );
  mockedGetProductSuppliers.mockResolvedValue(
    createPaginatedResult([mockProductSupplier])
  );
}

describe('UnifiedProductSelector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('parseCompositeValue', () => {
    it('parses valid fabric composite value', () => {
      const result = parseCompositeValue('fabric:1');
      expect(result).toEqual({ type: 'fabric', id: 1 });
    });

    it('parses valid product composite value', () => {
      const result = parseCompositeValue('product:5');
      expect(result).toEqual({ type: 'product', id: 5 });
    });

    it('returns null for invalid type', () => {
      expect(parseCompositeValue('unknown:1')).toBeNull();
    });

    it('returns null for non-numeric id', () => {
      expect(parseCompositeValue('fabric:abc')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseCompositeValue('')).toBeNull();
    });
  });

  describe('Rendering', () => {
    it('renders without crashing', async () => {
      render(<UnifiedProductSelector />);
      await vi.runAllTimersAsync();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders with custom placeholder', async () => {
      render(<UnifiedProductSelector placeholder="搜索产品" />);
      await vi.runAllTimersAsync();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders disabled state', async () => {
      render(<UnifiedProductSelector disabled />);
      await vi.runAllTimersAsync();
      const selectWrapper = document.querySelector('.ant-select');
      expect(selectWrapper).toHaveClass('ant-select-disabled');
    });
  });

  describe('Search', () => {
    it('calls both fabric and product APIs on initial mount', async () => {
      render(<UnifiedProductSelector />);
      await vi.runAllTimersAsync();

      expect(mockedGetFabrics).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: '', pageSize: 10 })
      );
      expect(mockedGetProducts).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: '', pageSize: 10 })
      );
    });

    it('calls both APIs with search keyword after debounce', async () => {
      render(<UnifiedProductSelector />);
      await vi.runAllTimersAsync();

      mockedGetFabrics.mockClear();
      mockedGetProducts.mockClear();

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '铁架' } });

      // Before debounce — should not have been called
      expect(mockedGetFabrics).not.toHaveBeenCalled();

      // After debounce (300ms)
      await vi.advanceTimersByTimeAsync(300);

      expect(mockedGetFabrics).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: '铁架' })
      );
      expect(mockedGetProducts).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: '铁架' })
      );
    });

    it('resolves supplier info for each search result', async () => {
      render(<UnifiedProductSelector />);
      await vi.runAllTimersAsync();

      expect(mockedGetFabricSuppliers).toHaveBeenCalledWith(1, {
        pageSize: 1,
        sortBy: 'purchasePrice',
        sortOrder: 'asc',
      });
      expect(mockedGetProductSuppliers).toHaveBeenCalledWith(5, {
        pageSize: 1,
        sortBy: 'purchasePrice',
        sortOrder: 'asc',
      });
    });
  });

  describe('Category tags in options', () => {
    it('shows category tags when dropdown is open', async () => {
      vi.useRealTimers();
      render(<UnifiedProductSelector />);

      await waitFor(() => {
        expect(mockedGetFabrics).toHaveBeenCalled();
      });

      // Open dropdown
      const input = screen.getByRole('combobox');
      fireEvent.mouseDown(input);

      await waitFor(() => {
        expect(screen.getByText('面料')).toBeInTheDocument();
        expect(screen.getByText('铁架')).toBeInTheDocument();
      });
    });
  });

  describe('Selection', () => {
    it('onChange returns composite value format "fabric:1"', async () => {
      vi.useRealTimers();
      const mockOnChange = vi.fn();

      render(<UnifiedProductSelector onChange={mockOnChange} />);

      await waitFor(() => {
        expect(mockedGetFabrics).toHaveBeenCalled();
      });

      // Open dropdown
      const input = screen.getByRole('combobox');
      fireEvent.mouseDown(input);

      await waitFor(() => {
        expect(screen.getByText('BF-2501-0001')).toBeInTheDocument();
      });

      // Select fabric option
      fireEvent.click(screen.getByText('BF-2501-0001'));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          'fabric:1',
          expect.objectContaining({
            type: 'fabric',
            id: 1,
            compositeValue: 'fabric:1',
            lowestSupplierId: 100,
            lowestSupplierPrice: 20.0,
          })
        );
      });
    });

    it('result includes lowestSupplierId and lowestSupplierPrice', async () => {
      vi.useRealTimers();
      const mockOnChange = vi.fn();

      render(<UnifiedProductSelector onChange={mockOnChange} />);

      await waitFor(() => {
        expect(mockedGetProducts).toHaveBeenCalled();
      });

      // Open dropdown
      const input = screen.getByRole('combobox');
      fireEvent.mouseDown(input);

      await waitFor(() => {
        expect(screen.getByText('PR-2501-0001')).toBeInTheDocument();
      });

      // Select product option
      fireEvent.click(screen.getByText('PR-2501-0001'));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          'product:5',
          expect.objectContaining({
            type: 'product',
            id: 5,
            lowestSupplierId: 200,
            lowestSupplierPrice: 280.0,
            unit: '套',
          })
        );
      });
    });
  });

  describe('Error handling', () => {
    it('handles fabric API failure gracefully — products still show', async () => {
      vi.useRealTimers();
      mockedGetFabrics.mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(<UnifiedProductSelector />);

      await waitFor(() => {
        expect(mockedGetProducts).toHaveBeenCalled();
      });

      // Open dropdown
      const input = screen.getByRole('combobox');
      fireEvent.mouseDown(input);

      // Product results should still be visible
      await waitFor(() => {
        expect(screen.getByText('PR-2501-0001')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('handles product API failure gracefully — fabrics still show', async () => {
      vi.useRealTimers();
      mockedGetProducts.mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(<UnifiedProductSelector />);

      await waitFor(() => {
        expect(mockedGetFabrics).toHaveBeenCalled();
      });

      // Open dropdown
      const input = screen.getByRole('combobox');
      fireEvent.mouseDown(input);

      // Fabric results should still be visible
      await waitFor(() => {
        expect(screen.getByText('BF-2501-0001')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('handles supplier resolution failure gracefully', async () => {
      vi.useRealTimers();
      mockedGetFabricSuppliers.mockRejectedValue(new Error('Supplier API down'));
      const mockOnChange = vi.fn();

      render(<UnifiedProductSelector onChange={mockOnChange} />);

      await waitFor(() => {
        expect(mockedGetFabrics).toHaveBeenCalled();
      });

      // Open dropdown and select fabric
      const input = screen.getByRole('combobox');
      fireEvent.mouseDown(input);

      await waitFor(() => {
        expect(screen.getByText('BF-2501-0001')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('BF-2501-0001'));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          'fabric:1',
          expect.objectContaining({
            type: 'fabric',
            id: 1,
            lowestSupplierId: null,
            lowestSupplierPrice: null,
          })
        );
      });
    });
  });
});
