/**
 * Tests for ExportPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExportFieldConfig } from '@/types';

// Mock field config
const mockFieldConfig: ExportFieldConfig[] = [
  { field: 'companyName', label: '公司名称', type: 'string' },
  { field: 'contactName', label: '联系人', type: 'string' },
  { field: 'phone', label: '电话', type: 'string' },
  { field: 'email', label: '邮箱', type: 'string' },
];

// Mock mutation
const mockMutate = vi.fn();

// Mock hooks
vi.mock('@/hooks/queries/useExport', () => ({
  useExportFields: vi.fn((entityType: string) => ({
    data: entityType ? mockFieldConfig : undefined,
    isLoading: false,
  })),
  useDownloadExport: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
  exportKeys: {
    all: ['export'],
    fields: (et: string) => ['export', 'fields', et],
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/export']}>
        <ExportPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Lazy import after mocks
import ExportPage from '../ExportPage';

describe('ExportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render entity type radio buttons', () => {
    renderPage();

    expect(screen.getByText('供应商')).toBeInTheDocument();
    expect(screen.getByText('客户')).toBeInTheDocument();
    expect(screen.getByText('面料')).toBeInTheDocument();
    expect(screen.getByText('产品')).toBeInTheDocument();
    expect(screen.getByText('订单')).toBeInTheDocument();
    expect(screen.getByText('报价')).toBeInTheDocument();
  });

  it('should show field checkboxes after selecting entity type', async () => {
    const user = userEvent.setup();
    renderPage();

    // Select "Supplier" entity type
    await user.click(screen.getByText('供应商'));

    // Should show field checkboxes with Chinese labels
    await waitFor(() => {
      expect(screen.getByText('公司名称')).toBeInTheDocument();
      expect(screen.getByText('联系人')).toBeInTheDocument();
      expect(screen.getByText('电话')).toBeInTheDocument();
      expect(screen.getByText('邮箱')).toBeInTheDocument();
    });
  });

  it('should check all fields by default when field config loads', async () => {
    const user = userEvent.setup();
    renderPage();

    // Select entity type
    await user.click(screen.getByText('供应商'));

    // All checkboxes should be checked
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      // Filter out the "Select all" checkbox (first one)
      const fieldCheckboxes = checkboxes.slice(1);
      fieldCheckboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });
  });

  it('should call mutation with selected fields when export button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    // Select entity type
    await user.click(screen.getByText('供应商'));

    // Wait for checkboxes to appear and be checked
    await waitFor(() => {
      expect(screen.getByText('公司名称')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByText('导出 Excel');
    await user.click(exportButton);

    // Should call mutate with entity type and all selected fields
    expect(mockMutate).toHaveBeenCalledWith(
      {
        entityType: 'supplier',
        fields: ['companyName', 'contactName', 'phone', 'email'],
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });

  it('should show select all toggle', async () => {
    const user = userEvent.setup();
    renderPage();

    // Select entity type
    await user.click(screen.getByText('供应商'));

    await waitFor(() => {
      expect(screen.getByText('全选 / 取消全选')).toBeInTheDocument();
    });
  });
});
