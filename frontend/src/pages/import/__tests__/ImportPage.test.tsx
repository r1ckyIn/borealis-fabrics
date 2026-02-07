/**
 * Unit tests for ImportPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ImportPage from '../ImportPage';

// Mock import API
const mockDownloadFabricTemplate = vi.fn();
const mockDownloadSupplierTemplate = vi.fn();
const mockImportFabrics = vi.fn();
const mockImportSuppliers = vi.fn();

vi.mock('@/api/import.api', () => ({
  importApi: {
    downloadFabricTemplate: (...args: unknown[]) => mockDownloadFabricTemplate(...args),
    downloadSupplierTemplate: (...args: unknown[]) => mockDownloadSupplierTemplate(...args),
    importFabrics: (...args: unknown[]) => mockImportFabrics(...args),
    importSuppliers: (...args: unknown[]) => mockImportSuppliers(...args),
  },
}));

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

function renderPage() {
  return render(
    <MemoryRouter>
      <ImportPage />
    </MemoryRouter>
  );
}

describe('ImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders page title', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: '数据导入' })).toBeInTheDocument();
    });

    it('renders two tabs', () => {
      renderPage();
      expect(screen.getByText('面料导入')).toBeInTheDocument();
      expect(screen.getByText('供应商导入')).toBeInTheDocument();
    });

    it('renders fabric tab as active by default', () => {
      renderPage();
      expect(screen.getByText('下载面料导入模板')).toBeInTheDocument();
    });

    it('renders upload area', () => {
      renderPage();
      expect(screen.getByText('点击或拖拽 Excel 文件到此区域')).toBeInTheDocument();
    });

    it('renders operation instructions', () => {
      renderPage();
      expect(screen.getByText('操作说明')).toBeInTheDocument();
    });
  });

  describe('Tab Switching', () => {
    it('switches to supplier tab', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('供应商导入'));

      expect(screen.getByText('下载供应商导入模板')).toBeInTheDocument();
    });
  });

  describe('Template Download', () => {
    it('calls downloadFabricTemplate on fabric tab', async () => {
      const user = userEvent.setup();
      mockDownloadFabricTemplate.mockResolvedValue(undefined);
      renderPage();

      await user.click(screen.getByText('下载面料导入模板'));

      await waitFor(() => {
        expect(mockDownloadFabricTemplate).toHaveBeenCalledTimes(1);
      });
    });

    it('calls downloadSupplierTemplate on supplier tab', async () => {
      const user = userEvent.setup();
      mockDownloadSupplierTemplate.mockResolvedValue(undefined);
      renderPage();

      await user.click(screen.getByText('供应商导入'));
      await user.click(screen.getByText('下载供应商导入模板'));

      await waitFor(() => {
        expect(mockDownloadSupplierTemplate).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('File Import', () => {
    it('shows result modal after successful import', async () => {
      const user = userEvent.setup();
      mockImportFabrics.mockResolvedValue({
        successCount: 5,
        failureCount: 0,
        failures: [],
      });

      renderPage();

      const file = new File(['test'], 'fabrics.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      await waitFor(() => {
        expect(mockImportFabrics).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByText('面料导入结果')).toBeInTheDocument();
      });
    });
  });
});
