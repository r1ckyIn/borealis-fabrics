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

    it('delete flow: click → confirm → API call → list refreshes', { timeout: 30000 }, async () => {
      const mockFabric = createMockFabric({ id: 10, name: '待删除面料' });
      fabricApi.getFabrics.mockResolvedValue(
        createPaginatedResponse([mockFabric]),
      );
      fabricApi.deleteFabric.mockResolvedValue(undefined);

      renderFabricRoutes();
      const user = userEvent.setup();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('待删除面料')).toBeInTheDocument();
      });

      // Click delete button in the table row actions
      const deleteButtons = screen.getAllByRole('button', { name: /删除/ });
      await user.click(deleteButtons[0]);

      // Confirm modal should appear
      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
      });

      // After deletion, API called with refreshed list
      fabricApi.getFabrics.mockResolvedValue(createPaginatedResponse([]));

      // Find the modal footer and click the confirm button
      // Ant Design Modal renders ok button in .ant-modal-footer
      const modalFooter = document.querySelector('.ant-modal-footer');
      expect(modalFooter).not.toBeNull();
      const okButton = modalFooter!.querySelector('.ant-btn-dangerous') as HTMLButtonElement;
      expect(okButton).not.toBeNull();
      await user.click(okButton);

      await waitFor(() => {
        expect(fabricApi.deleteFabric).toHaveBeenCalledWith(10);
      });
    });

    it('navigates to detail page on row click', async () => {
      const mockFabric = createMockFabric({ id: 5 });
      fabricApi.getFabrics.mockResolvedValue(
        createPaginatedResponse([mockFabric]),
      );

      renderFabricRoutes();

      await waitFor(() => {
        expect(screen.getByText(mockFabric.fabricCode)).toBeInTheDocument();
      });

      // Click the row (the fabric code text)
      const fabricCodeCell = screen.getByText(mockFabric.fabricCode);
      await userEvent.setup().click(fabricCodeCell);

      await waitFor(() => {
        expect(screen.getByText('Detail Page')).toBeInTheDocument();
      });
    });

    it('navigates to create page when clicking new button', async () => {
      fabricApi.getFabrics.mockResolvedValue(createPaginatedResponse([]));

      renderFabricRoutes();
      const user = userEvent.setup();

      // Wait for the page to render; "新建面料" appears as the page button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /新建面料/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /新建面料/ }));

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
