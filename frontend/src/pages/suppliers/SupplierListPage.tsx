/**
 * Supplier list page with search, filter, and pagination.
 * Displays supplier data in a table with CRUD operations.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Space, message, Typography, Tag } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/layout/PageContainer';
import { SearchForm, type SearchField } from '@/components/common/SearchForm';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { usePagination } from '@/hooks/usePagination';
import { useSuppliers, useDeleteSupplier } from '@/hooks/queries/useSuppliers';
import {
  SupplierStatus,
  SUPPLIER_STATUS_LABELS,
  SettleType,
  SETTLE_TYPE_LABELS,
} from '@/types';
import type { Supplier, QuerySupplierParams } from '@/types';

const { Text } = Typography;

/** Status tag color mapping. */
const STATUS_TAG_COLORS: Record<SupplierStatus, string> = {
  [SupplierStatus.ACTIVE]: 'green',
  [SupplierStatus.SUSPENDED]: 'orange',
  [SupplierStatus.ELIMINATED]: 'red',
};

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

  // Pagination state with URL sync
  const {
    paginationProps,
    queryParams,
    handleTableChange,
    setPage,
  } = usePagination({ syncWithUrl: true });

  // Search state
  const [searchParams, setSearchParams] = useState<QuerySupplierParams>({});

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Combined query params
  const combinedParams: QuerySupplierParams = useMemo(
    () => ({
      ...searchParams,
      ...queryParams,
    }),
    [searchParams, queryParams]
  );

  // Fetch suppliers with pagination
  const { data, isLoading, isFetching } = useSuppliers(combinedParams);

  // Delete mutation
  const deleteMutation = useDeleteSupplier();

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

  /** Navigate to supplier pages. */
  const goToDetail = useCallback((s: Supplier) => navigate(`/suppliers/${s.id}`), [navigate]);
  const goToEdit = useCallback((s: Supplier) => navigate(`/suppliers/${s.id}/edit`), [navigate]);
  const goToCreate = useCallback(() => navigate('/suppliers/new'), [navigate]);

  /** Open delete confirmation modal. */
  const openDeleteModal = useCallback((supplier: Supplier): void => {
    setSupplierToDelete(supplier);
    setDeleteModalOpen(true);
  }, []);

  /** Close delete modal and reset state. */
  const closeDeleteModal = useCallback((): void => {
    setDeleteModalOpen(false);
    setSupplierToDelete(null);
  }, []);

  /** Handle delete confirmation with 409 error handling. */
  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!supplierToDelete) return;

    try {
      await deleteMutation.mutateAsync(supplierToDelete.id);
      message.success(`供应商 "${supplierToDelete.companyName}" 已删除`);
      closeDeleteModal();
    } catch (error: unknown) {
      console.error('Delete error:', error);
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 409) {
        message.error('该供应商有关联的活跃订单，无法删除');
      } else {
        message.error('删除失败，请重试');
      }
    }
  }, [supplierToDelete, deleteMutation, closeDeleteModal]);

  /** Handle row click to navigate to detail. */
  const handleRowClick = useCallback(
    (record: Supplier) => ({
      onClick: () => goToDetail(record),
      style: { cursor: 'pointer' },
    }),
    [goToDetail]
  );

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
          <Tag color={STATUS_TAG_COLORS[status]}>
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
        width: 180,
        fixed: 'right',
        render: (_, record) => {
          const stopAndRun = (fn: () => void) => (e: React.MouseEvent) => {
            e.stopPropagation();
            fn();
          };
          return (
            <Space size="small">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={stopAndRun(() => goToDetail(record))}
              >
                查看
              </Button>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={stopAndRun(() => goToEdit(record))}
              >
                编辑
              </Button>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={stopAndRun(() => openDeleteModal(record))}
              >
                删除
              </Button>
            </Space>
          );
        },
      },
    ],
    [goToDetail, goToEdit, openDeleteModal]
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
        <Button type="primary" icon={<PlusOutlined />} onClick={goToCreate}>
          新建供应商
        </Button>
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
          onRow={handleRowClick}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        title="确认删除"
        content={
          <>
            确定要删除供应商 <Text strong>"{supplierToDelete?.companyName}"</Text> 吗？
            <br />
            <Text type="secondary">此操作不可恢复</Text>
          </>
        }
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        confirmText="删除"
        danger
        loading={deleteMutation.isPending}
      />
    </PageContainer>
  );
}
