/**
 * Integration tests for Fabric CRUD operations.
 *
 * Mocks at the API module level (@/api/fabric.api) while keeping
 * TanStack Query hooks, components, and routing all running with real code.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import FabricListPage from '@/pages/fabrics/FabricListPage';
import FabricFormPage from '@/pages/fabrics/FabricFormPage';
import {
  createMockFabric,
  createMockFabrics,
  resetIdCounter,
} from '@/test/mocks/mockFactories';
import type { PaginatedResult } from '@/types/api.types';
import type { Fabric } from '@/types/entities.types';

import {
  renderIntegration,
  screen,
  waitFor,
  clearAuthState,
  userEvent,
} from './integrationTestUtils';

const { mockModule } = vi.hoisted(() => {
  function mockModule(fns: string[], nsKey: string): Record<string, unknown> {
    const mocks: Record<string, unknown> = {};
    for (const fn of fns) mocks[fn] = vi.fn();
    mocks[nsKey] = { ...mocks };
    return mocks;
  }
  return { mockModule };
});

vi.mock('@/api/fabric.api', () => mockModule(
  ['getFabrics', 'getFabric', 'createFabric', 'updateFabric', 'deleteFabric',
   'uploadFabricImage', 'deleteFabricImage',
   'getFabricSuppliers', 'addFabricSupplier', 'updateFabricSupplier', 'removeFabricSupplier',
   'getFabricPricing', 'createFabricPricing', 'updateFabricPricing', 'deleteFabricPricing'],
  'fabricApi',
));

type FabricApiModule = typeof import('@/api/fabric.api');
const { fabricApi } =
  vi.mocked(await vi.importMock<FabricApiModule>('@/api/fabric.api'));

function createPaginatedResponse(
  items: Fabric[],
  total?: number,
): PaginatedResult<Fabric> {
  return {
    items,
    pagination: {
      page: 1,
      pageSize: 20,
      total: total ?? items.length,
      totalPages: Math.ceil((total ?? items.length) / 20),
    },
  };
}

function renderFabricRoutes(initialEntries: string[] = ['/fabrics']) {
  return renderIntegration(
    <Routes>
      <Route path="/fabrics" element={<FabricListPage />} />
      <Route path="/fabrics/new" element={<FabricFormPage />} />
      <Route path="/fabrics/:id" element={<div>Detail Page</div>} />
      <Route path="/fabrics/:id/edit" element={<FabricFormPage />} />
    </Routes>,
    { initialEntries, withAuth: true },
  );
}

describe('Fabric CRUD Integration', () => {
  beforeEach(() => {
    clearAuthState();
    resetIdCounter();
    vi.clearAllMocks();
  });

  describe('FabricListPage', () => {
    it('loads and displays fabric data from API', async () => {
      const mockFabrics = createMockFabrics(3);
      fabricApi.getFabrics.mockResolvedValue(
        createPaginatedResponse(mockFabrics),
      );

      renderFabricRoutes();

      await waitFor(() => {
        expect(screen.getByText(mockFabrics[0].fabricCode)).toBeInTheDocument();
        expect(screen.getByText(mockFabrics[1].name)).toBeInTheDocument();
        expect(screen.getByText(mockFabrics[2].fabricCode)).toBeInTheDocument();
      });

      expect(fabricApi.getFabrics).toHaveBeenCalled();
    });

    it('search triggers API call with keyword parameter', async () => {
      fabricApi.getFabrics.mockResolvedValue(createPaginatedResponse([]));

      renderFabricRoutes();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(fabricApi.getFabrics).toHaveBeenCalledTimes(1);
      });

      // Type search keyword
      const searchInput = screen.getByPlaceholderText('面料编码/名称/颜色');
      await user.type(searchInput, '棉');

      // Submit search form via the submit button
      const searchButton = screen.getByRole('button', { name: /搜索/ });
      await user.click(searchButton);

      await waitFor(() => {
        const calls = fabricApi.getFabrics.mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall[0]).toEqual(
          expect.objectContaining({ keyword: '棉' }),
        );
      });
    });

    it('navigates to detail page via view button', async () => {
      const mockFabric = createMockFabric({ id: 5 });
      fabricApi.getFabrics.mockResolvedValue(
        createPaginatedResponse([mockFabric]),
      );

      renderFabricRoutes();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText(mockFabric.fabricCode)).toBeInTheDocument();
      });

      // Click the view button in the actions column
      const viewButtons = screen.getAllByText('查看');
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Detail Page')).toBeInTheDocument();
      });
    });

    it('navigates to create page when clicking new button', async () => {
      fabricApi.getFabrics.mockResolvedValue(createPaginatedResponse([]));

      renderFabricRoutes();
      const user = userEvent.setup();

      // Wait for the page to render; "新建面料" appears in header and empty state
      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /新建面料/ }).length).toBeGreaterThan(0);
      });

      // Click the first "新建面料" button (header button)
      await user.click(screen.getAllByRole('button', { name: /新建面料/ })[0]);

      // FabricFormPage in create mode shows "面料编码" form field
      await waitFor(() => {
        expect(screen.getByLabelText('面料编码')).toBeInTheDocument();
      });
    });
  });

  describe('FabricFormPage - Edit Mode', () => {
    it('loads existing fabric data in edit form', async () => {
      const existingFabric = createMockFabric({
        id: 7,
        name: '高级棉布',
        fabricCode: 'FAB-0007',
      });
      fabricApi.getFabric.mockResolvedValue(existingFabric);

      renderFabricRoutes(['/fabrics/7/edit']);

      await waitFor(() => {
        expect(fabricApi.getFabric).toHaveBeenCalledWith(7);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/编辑面料.*高级棉布/),
        ).toBeInTheDocument();
      });
    });

    it('shows 404 when fabric does not exist', async () => {
      fabricApi.getFabric.mockResolvedValue(null as unknown as Fabric);

      renderFabricRoutes(['/fabrics/999/edit']);

      await waitFor(() => {
        expect(screen.getByText('面料不存在')).toBeInTheDocument();
      });
    });
  });
});
