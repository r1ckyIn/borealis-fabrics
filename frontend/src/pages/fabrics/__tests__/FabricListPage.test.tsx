/**
 * Unit tests for FabricListPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import FabricListPage from '../FabricListPage';
import type { Fabric, PaginatedResult } from '@/types';

// Mock hooks
const mockUseFabrics = vi.fn();

vi.mock('@/hooks/queries/useFabrics', () => ({
  useFabrics: (...args: unknown[]) => mockUseFabrics(...args),
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

// Mock fabric data
const mockFabrics: Fabric[] = [
  {
    id: 1,
    fabricCode: 'FB-2401-0001',
    name: '高档涤纶面料',
    material: { primary: '涤纶', secondary: undefined },
    composition: '100%涤纶',
    color: '黑色',
    weight: 180.5,
    width: 150,
    thickness: '中',
    handFeel: 'soft',
    glossLevel: 'matte',
    application: ['clothing', 'sports'],
    defaultPrice: 25.5,
    defaultLeadTime: 7,
    description: undefined,
    tags: undefined,
    notes: undefined,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    fabricCode: 'FB-2401-0002',
    name: '纯棉面料',
    material: { primary: '棉', secondary: undefined },
    composition: '100%棉',
    color: '白色',
    weight: 200,
    width: 140,
    thickness: '厚',
    handFeel: 'soft',
    glossLevel: 'matte',
    application: ['home_textile'],
    defaultPrice: 30,
    defaultLeadTime: 10,
    description: undefined,
    tags: undefined,
    notes: undefined,
    isActive: true,
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

const mockPaginatedResult: PaginatedResult<Fabric> = {
  items: mockFabrics,
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
      <MemoryRouter initialEntries={['/fabrics']}>
        <Routes>
          <Route path="/fabrics" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('FabricListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseFabrics.mockReturnValue({
      data: mockPaginatedResult,
      isLoading: false,
      isFetching: false,
    });
  });

  describe('Rendering', () => {
    it('should render page title in header', async () => {
      renderWithProviders(<FabricListPage />);

      // Title appears multiple times (breadcrumb + header)
      await waitFor(() => {
        expect(screen.getAllByText('面料管理').length).toBeGreaterThan(0);
      }, { timeout: 10000 });
    }, 15000);

    it('should render new fabric button', async () => {
      renderWithProviders(<FabricListPage />);

      await waitFor(() => {
        expect(screen.getByText('新建面料')).toBeInTheDocument();
      });
    });

    it('should render search form', async () => {
      renderWithProviders(<FabricListPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('面料编码/名称/颜色')).toBeInTheDocument();
      });
    });

    it('should render table with column headers', async () => {
      renderWithProviders(<FabricListPage />);

      await waitFor(() => {
        // Table column headers (may appear multiple times in table header)
        expect(screen.getAllByText('面料编码').length).toBeGreaterThan(0);
      });
      expect(screen.getAllByText('面料名称').length).toBeGreaterThan(0);
      expect(screen.getAllByText('操作').length).toBeGreaterThan(0);
    });

    it('should render fabric data in table', async () => {
      renderWithProviders(<FabricListPage />);

      await waitFor(() => {
        expect(screen.getByText('FB-2401-0001')).toBeInTheDocument();
      });
      expect(screen.getByText('高档涤纶面料')).toBeInTheDocument();
      expect(screen.getByText('FB-2401-0002')).toBeInTheDocument();
      expect(screen.getByText('纯棉面料')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state', async () => {
      mockUseFabrics.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      });

      renderWithProviders(<FabricListPage />);

      // Ant Design Table shows loading spinner
      await waitFor(() => {
        expect(document.querySelector('.ant-spin')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to create page when clicking new button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<FabricListPage />);

      await waitFor(() => {
        expect(screen.getByText('新建面料')).toBeInTheDocument();
      });

      const newButton = screen.getByText('新建面料').closest('button');
      await user.click(newButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/products/fabrics/new');
    });

    it('should navigate to detail page when clicking view button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<FabricListPage />);

      await waitFor(() => {
        expect(screen.getAllByText('查看').length).toBeGreaterThan(0);
      });

      const viewButtons = screen.getAllByText('查看');
      await user.click(viewButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/products/fabrics/1');
    });
  });

  describe('Empty State', () => {
    it('should show empty table with action button when no data', async () => {
      mockUseFabrics.mockReturnValue({
        data: {
          items: [],
          pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        },
        isLoading: false,
        isFetching: false,
      });

      renderWithProviders(<FabricListPage />);

      // Custom empty state with description and action button
      await waitFor(() => {
        expect(document.querySelector('.ant-empty')).toBeInTheDocument();
      });

      // Action button in empty state should navigate to create page
      await waitFor(() => {
        const emptyContainer = document.querySelector('.ant-empty');
        expect(emptyContainer).toBeInTheDocument();
        const actionButton = emptyContainer?.querySelector('button');
        expect(actionButton).toBeInTheDocument();
      });
    });
  });
});
