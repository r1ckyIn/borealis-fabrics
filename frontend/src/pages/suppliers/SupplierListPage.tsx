/**
 * Supplier list page with search, filter, and pagination.
 * Displays supplier data in a table with view operation.
 * Admin users can toggle visibility of soft-deleted records and restore them.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Typography, Tag, Empty, Space, message } from 'antd';
import { PlusOutlined, EyeOutlined, UndoOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQueryClient } from '@tanstack/react-query';

import { PageContainer } from '@/components/layout/PageContainer';
import { SearchForm, type SearchField } from '@/components/common/SearchForm';
import { SoftDeleteToggle } from '@/components/common/SoftDeleteToggle';
import { usePagination } from '@/hooks/usePagination';
import { useSuppliers, supplierKeys } from '@/hooks/queries/useSuppliers';
import { patch } from '@/api/client';
import { SUPPLIER_STATUS_TAG_COLORS } from '@/utils';
import {
  SupplierStatus,
  SUPPLIER_STATUS_LABELS,
  SettleType,
  SETTLE_TYPE_LABELS,
} from '@/types';
import type { Supplier, QuerySupplierParams } from '@/types';
import '@/styles/deleted-row.css';

const { Text } = Typography;

/** Supplier status options for search filter. */
const STATUS_OPTIONS = Object.values(SupplierStatus).map((value) => ({
  label: SUPPLIER_STATUS_LABELS[value],
  value,
}));

/** Search form fields configuration. */
const SEARCH_FIELDS: SearchField[] = [
  {
    name: 'keyword',
    label: '关键字',
    type: 'text',
    placeholder: '公司名称/联系人/电话',
  },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    options: STATUS_OPTIONS,
  },
];

/**
 * Supplier list page component.
 * Route: /suppliers
 */
export default function SupplierListPage(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Pagination state with URL sync
  const {
    paginationProps,
    queryParams,
    handleTableChange,
    setPage,
  } = usePagination({ syncWithUrl: true });

  // Search state
  const [searchParams, setSearchParams] = useState<QuerySupplierParams>({});

  // Soft-delete toggle state
  const [showDeleted, setShowDeleted] = useState(false);

  // Combined query params
  const combinedParams: QuerySupplierParams = useMemo(
    () => ({
      ...searchParams,
      ...queryParams,
      ...(showDeleted ? { includeDeleted: true } : {}),
    }),
    [searchParams, queryParams, showDeleted]
  );

  // Fetch suppliers with pagination
  const { data, isLoading, isFetching } = useSuppliers(combinedParams);

  /** Handle search form submission. */
  const handleSearch = useCallback(
    (values: Record<string, unknown>): void => {
      setSearchParams(values as QuerySupplierParams);
      setPage(1);
    },
    [setPage]
  );

  /** Handle search form reset. */
  const handleSearchReset = useCallback((): void => {
    setSearchParams({});
    setPage(1);
  }, [setPage]);

  /** Restore a soft-deleted supplier. */
  const handleRestore = useCallback(
    async (id: number) => {
      try {
        await patch(`/suppliers/${id}/restore`);
        void message.success('供应商已恢复');
        void queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      } catch {
        void message.error('恢复失败，请重试');
      }
    },
    [queryClient]
  );

  /** Navigate to supplier pages. */
  const goToDetail = useCallback((s: Supplier) => navigate(`/suppliers/${s.id}`), [navigate]);
  const goToCreate = useCallback(() => navigate('/suppliers/new'), [navigate]);

  // Table columns configuration
  const columns: ColumnsType<Supplier> = useMemo(
    () => [
      {
        title: '公司名称',
        dataIndex: 'companyName',
        key: 'companyName',
        width: 200,
        fixed: 'left',
        render: (name: string) => <Text strong>{name}</Text>,
      },
      {
        title: '联系人',
        dataIndex: 'contactName',
        key: 'contactName',
        width: 100,
        render: (name: string | null) => name ?? <Text type="secondary">-</Text>,
      },
      {
        title: '电话',
        dataIndex: 'phone',
        key: 'phone',
        width: 140,
        render: (phone: string | null) => phone ?? <Text type="secondary">-</Text>,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: SupplierStatus) => (
          <Tag color={SUPPLIER_STATUS_TAG_COLORS[status]}>
            {SUPPLIER_STATUS_LABELS[status]}
          </Tag>
        ),
      },
      {
        title: '结算方式',
        dataIndex: 'settleType',
        key: 'settleType',
        width: 100,
        render: (settleType: SettleType) => SETTLE_TYPE_LABELS[settleType],
      },
      {
        title: '账期(天)',
        dataIndex: 'creditDays',
        key: 'creditDays',
        width: 100,
        align: 'right',
        render: (days: number | null, record: Supplier) =>
          record.settleType === SettleType.CREDIT && days !== null
            ? days
            : <Text type="secondary">-</Text>,
      },
      {
        title: '微信',
        dataIndex: 'wechat',
        key: 'wechat',
        width: 120,
        render: (wechat: string | null) => wechat ?? <Text type="secondary">-</Text>,
      },
      {
        title: '操作',
        key: 'actions',
        width: showDeleted ? 140 : 80,
        fixed: 'right',
        render: (_, record) => (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => goToDetail(record)}
            >
              查看
            </Button>
            {record.deletedAt && (
              <Button
                type="link"
                size="small"
                icon={<UndoOutlined />}
                onClick={() => void handleRestore(record.id)}
              >
                恢复
              </Button>
            )}
          </Space>
        ),
      },
    ],
    [goToDetail, handleRestore, showDeleted]
  );

  // Breadcrumb configuration
  const breadcrumbs = [
    { label: '首页', path: '/' },
    { label: '供应商管理' },
  ];

  return (
    <PageContainer
      title="供应商管理"
      breadcrumbs={breadcrumbs}
      extra={
        <Space>
          <SoftDeleteToggle showDeleted={showDeleted} onChange={setShowDeleted} />
          <Button type="primary" icon={<PlusOutlined />} onClick={goToCreate}>
            新建供应商
          </Button>
        </Space>
      }
    >
      {/* Search Form */}
      <Card style={{ marginBottom: 16 }}>
        <SearchForm
          fields={SEARCH_FIELDS}
          onSearch={handleSearch}
          onReset={handleSearchReset}
          loading={isFetching}
        />
      </Card>

      {/* Data Table */}
      <Card>
        <Table<Supplier>
          columns={columns}
          dataSource={data?.items ?? []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            ...paginationProps,
            total: data?.pagination.total ?? 0,
          }}
          onChange={handleTableChange as Parameters<typeof Table<Supplier>>['0']['onChange']}
          rowClassName={(record) => (record.deletedAt ? 'deleted-row' : '')}
          scroll={{ x: 1200 }}
          size="middle"
          locale={{
            emptyText: (
              <Empty
                description="暂无供应商数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={goToCreate}
                >
                  新建供应商
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

    </PageContainer>
  );
}
