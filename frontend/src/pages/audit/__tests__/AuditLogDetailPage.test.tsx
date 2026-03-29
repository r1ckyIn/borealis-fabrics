/**
 * Tests for AuditLogDetailPage component.
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuditLog } from '@/types';

// Mock audit log entries for different action types
const mockUpdateLog: AuditLog = {
  id: 1,
  userId: 1,
  userName: '张三',
  action: 'update',
  entityType: 'Supplier',
  entityId: 10,
  changes: {
    companyName: { old: '旧公司名', new: '新公司名' },
    phone: { old: '13800000001', new: '13800000002' },
  },
  ip: '192.168.1.1',
  correlationId: 'corr-update-001',
  createdAt: '2026-03-01T10:00:00Z',
};

const mockCreateLog: AuditLog = {
  id: 2,
  userId: 1,
  userName: '李四',
  action: 'create',
  entityType: 'Customer',
  entityId: 20,
  changes: {
    companyName: '新客户公司',
    contactName: '联系人A',
  },
  ip: '192.168.1.2',
  correlationId: 'corr-create-001',
  createdAt: '2026-03-02T14:30:00Z',
};

// Track which log to return
let currentMockLog: AuditLog = mockUpdateLog;

// Mock hooks
vi.mock('@/hooks/queries/useAuditLogs', () => ({
  useAuditLogDetail: vi.fn(() => ({
    data: currentMockLog,
    isLoading: false,
    error: null,
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

function renderPage(id: string = '1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/audit/${id}`]}>
        <Routes>
          <Route path="/audit/:id" element={<AuditLogDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Lazy import after mocks
import AuditLogDetailPage from '../AuditLogDetailPage';

describe('AuditLogDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMockLog = mockUpdateLog;
  });

  it('should render audit detail Descriptions section', () => {
    renderPage();

    // Check header fields
    expect(screen.getByText('操作人')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('操作类型')).toBeInTheDocument();
    expect(screen.getByText('实体类型')).toBeInTheDocument();
    expect(screen.getByText('供应商')).toBeInTheDocument();
    expect(screen.getByText('IP地址')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    expect(screen.getByText('关联ID')).toBeInTheDocument();
  });

  it('should render update action with old/new value table', () => {
    currentMockLog = mockUpdateLog;
    renderPage();

    // Should show "变更对比" section
    expect(screen.getByText('变更对比')).toBeInTheDocument();

    // Should show field names
    expect(screen.getByText('companyName')).toBeInTheDocument();
    expect(screen.getByText('phone')).toBeInTheDocument();

    // Should show old and new values
    expect(screen.getByText('旧公司名')).toBeInTheDocument();
    expect(screen.getByText('新公司名')).toBeInTheDocument();
  });

  it('should render create action with flat value table', () => {
    currentMockLog = mockCreateLog;
    renderPage('2');

    // Should show "创建数据" section
    expect(screen.getByText('创建数据')).toBeInTheDocument();

    // Should show field names and values
    expect(screen.getByText('companyName')).toBeInTheDocument();
    expect(screen.getByText('新客户公司')).toBeInTheDocument();
    expect(screen.getByText('contactName')).toBeInTheDocument();
    expect(screen.getByText('联系人A')).toBeInTheDocument();
  });

  it('should render back button', () => {
    renderPage();

    expect(screen.getByText('返回列表')).toBeInTheDocument();
  });

  it('should render action tag with correct color', () => {
    currentMockLog = mockUpdateLog;
    renderPage();

    const updateTag = screen.getByText('更新');
    expect(updateTag.closest('.ant-tag')).toHaveClass('ant-tag-blue');
  });
});
