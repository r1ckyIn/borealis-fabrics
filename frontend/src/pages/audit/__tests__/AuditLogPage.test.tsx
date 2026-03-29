/**
 * Tests for AuditLogPage component.
 */

import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuditLog, PaginatedResult } from '@/types';

// Mock audit log data
const mockAuditLogs: PaginatedResult<AuditLog> = {
  items: [
    {
      id: 1,
      userId: 1,
      userName: '张三',
      action: 'create',
      entityType: 'Supplier',
      entityId: 10,
      changes: { companyName: '测试公司' },
      ip: '192.168.1.1',
      correlationId: 'corr-001',
      createdAt: '2026-03-01T10:00:00Z',
    },
    {
      id: 2,
      userId: 1,
      userName: '李四',
      action: 'update',
      entityType: 'Customer',
      entityId: 20,
      changes: { contactName: { old: '旧名', new: '新名' } },
      ip: '192.168.1.2',
      correlationId: 'corr-002',
      createdAt: '2026-03-02T14:30:00Z',
    },
    {
      id: 3,
      userId: 2,
      userName: '王五',
      action: 'delete',
      entityType: 'Fabric',
      entityId: 30,
      changes: { name: '面料A' },
      ip: '192.168.1.3',
      correlationId: 'corr-003',
      createdAt: '2026-03-03T09:15:00Z',
    },
  ],
  pagination: { page: 1, pageSize: 20, total: 3, totalPages: 1 },
};

// Mock hooks
vi.mock('@/hooks/queries/useAuditLogs', () => ({
  useAuditLogs: vi.fn(() => ({
    data: mockAuditLogs,
    isLoading: false,
  })),
  auditLogKeys: {
    all: ['audit-logs'],
    lists: () => ['audit-logs', 'list'],
    list: (q: unknown) => ['audit-logs', 'list', q],
    details: () => ['audit-logs', 'detail'],
    detail: (id: number) => ['audit-logs', 'detail', id],
  },
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/audit']}>
        <AuditLogPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Lazy import after mocks
import AuditLogPage from '../AuditLogPage';

describe('AuditLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render filter controls', () => {
    renderPage();

    // Operator input
    expect(screen.getByPlaceholderText('操作人')).toBeInTheDocument();
    // Action type select placeholder (may appear multiple times due to table header)
    expect(screen.getAllByText('操作类型').length).toBeGreaterThanOrEqual(1);
    // Entity type select placeholder
    expect(screen.getAllByText('实体类型').length).toBeGreaterThanOrEqual(1);
    // Keyword search
    expect(screen.getByPlaceholderText('关键字搜索')).toBeInTheDocument();
    // Reset button (2-char Chinese buttons get spaces inserted in jsdom)
    expect(screen.getByText(/重\s*置/)).toBeInTheDocument();
  });

  it('should render table with audit log entries', () => {
    renderPage();

    // Check user names are visible
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
    expect(screen.getByText('王五')).toBeInTheDocument();
  });

  it('should render action type with correct color Tag', () => {
    renderPage();

    // Find the create tag (green)
    const createTag = screen.getByText('创建');
    expect(createTag.closest('.ant-tag')).toHaveClass('ant-tag-green');

    // Find the update tag (blue)
    const updateTag = screen.getByText('更新');
    expect(updateTag.closest('.ant-tag')).toHaveClass('ant-tag-blue');

    // Find the delete tag (red)
    const deleteTag = screen.getByText('删除');
    expect(deleteTag.closest('.ant-tag')).toHaveClass('ant-tag-red');
  });

  it('should render detail links for each row', () => {
    renderPage();

    const detailButtons = screen.getAllByText('详情');
    expect(detailButtons).toHaveLength(3);
  });

  it('should render entity type labels in Chinese', () => {
    renderPage();

    // Check rows contain Chinese entity type labels
    const table = screen.getByRole('table');
    expect(within(table).getByText('供应商')).toBeInTheDocument();
    expect(within(table).getByText('客户')).toBeInTheDocument();
    expect(within(table).getByText('面料')).toBeInTheDocument();
  });
});
