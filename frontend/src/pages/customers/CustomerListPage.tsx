/**
 * Customer list page with search, filter, and pagination.
 * Displays customer data in a table with CRUD operations.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Space, message, Typography, Empty } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/layout/PageContainer';
import { SearchForm, type SearchField } from '@/components/common/SearchForm';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { usePagination } from '@/hooks/usePagination';
import { useCustomers, useDeleteCustomer } from '@/hooks/queries/useCustomers';
import { CreditType, CREDIT_TYPE_LABELS } from '@/types';
import type { Customer, QueryCustomerParams, ApiError } from '@/types';
import { getDeleteErrorMessage } from '@/utils/errorMessages';

const { Text } = Typography;

/** Search form fields configuration. */
const SEARCH_FIELDS: SearchField[] = [
  {
    name: 'keyword',
    label: '关键字',
    type: 'text',
    placeholder: '公司名称/联系人/电话',
  },
];

/**
 * Customer list page component.
 * Route: /customers
 */
export default function CustomerListPage(): React.ReactElement {
  const navigate = useNavigate();

  // Pagination state with URL sync
  const {
    paginationProps,
    queryParams,
    handleTableChange,
    setPage,
  } = usePagination({ syncWithUrl: true });

  // Search state
  const [searchParams, setSearchParams] = useState<QueryCustomerParams>({});

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Combined query params
  const combinedParams: QueryCustomerParams = useMemo(
    () => ({
      ...searchParams,
      ...queryParams,
    }),
    [searchParams, queryParams]
  );

  // Fetch customers with pagination
  const { data, isLoading, isFetching } = useCustomers(combinedParams);

  // Delete mutation
  const deleteMutation = useDeleteCustomer();

  /** Handle search form submission. */
  const handleSearch = useCallback(
    (values: Record<string, unknown>): void => {
      setSearchParams(values as QueryCustomerParams);
      setPage(1);
    },
    [setPage]
  );

  /** Handle search form reset. */
  const handleSearchReset = useCallback((): void => {
    setSearchParams({});
    setPage(1);
  }, [setPage]);

  /** Navigate to customer pages. */
  const goToDetail = useCallback((c: Customer) => navigate(`/customers/${c.id}`), [navigate]);
  const goToEdit = useCallback((c: Customer) => navigate(`/customers/${c.id}/edit`), [navigate]);
  const goToCreate = useCallback(() => navigate('/customers/new'), [navigate]);

  /** Open delete confirmation modal. */
  const openDeleteModal = useCallback((customer: Customer): void => {
    setCustomerToDelete(customer);
    setDeleteModalOpen(true);
  }, []);

  /** Close delete modal and reset state. */
  const closeDeleteModal = useCallback((): void => {
    setDeleteModalOpen(false);
    setCustomerToDelete(null);
  }, []);

  /** Handle delete confirmation with error handling via getDeleteErrorMessage. */
  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!customerToDelete) return;

    try {
      await deleteMutation.mutateAsync(customerToDelete.id);
      message.success(`客户 "${customerToDelete.companyName}" 已删除`);
      closeDeleteModal();
    } catch (error: unknown) {
      console.error('Delete error:', error);
      message.error(getDeleteErrorMessage(error as ApiError, '客户'));
    }
  }, [customerToDelete, deleteMutation, closeDeleteModal]);

  /** Handle row click to navigate to detail. */
  const handleRowClick = useCallback(
    (record: Customer) => ({
      onClick: () => goToDetail(record),
      style: { cursor: 'pointer' },
    }),
    [goToDetail]
  );

  // Table columns configuration
  const columns: ColumnsType<Customer> = useMemo(
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
        title: '微信',
        dataIndex: 'wechat',
        key: 'wechat',
        width: 120,
        render: (wechat: string | null) => wechat ?? <Text type="secondary">-</Text>,
      },
      {
        title: '结算方式',
        dataIndex: 'creditType',
        key: 'creditType',
        width: 100,
        render: (creditType: CreditType) => CREDIT_TYPE_LABELS[creditType],
      },
      {
        title: '账期(天)',
        dataIndex: 'creditDays',
        key: 'creditDays',
        width: 100,
        align: 'right',
        render: (days: number | null, record: Customer) =>
          record.creditType === CreditType.CREDIT && days !== null
            ? days
            : <Text type="secondary">-</Text>,
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
    { label: '客户管理' },
  ];

  return (
    <PageContainer
      title="客户管理"
      breadcrumbs={breadcrumbs}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={goToCreate}>
          新建客户
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
        <Table<Customer>
          columns={columns}
          dataSource={data?.items ?? []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            ...paginationProps,
            total: data?.pagination.total ?? 0,
          }}
          onChange={handleTableChange as Parameters<typeof Table<Customer>>['0']['onChange']}
          onRow={handleRowClick}
          scroll={{ x: 1000 }}
          size="middle"
          locale={{
            emptyText: (
              <Empty
                description="暂无客户数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={goToCreate}
                >
                  新建客户
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        title="确认删除"
        content={
          <>
            确定要删除客户 <Text strong>"{customerToDelete?.companyName}"</Text> 吗？
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
