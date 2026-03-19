/**
 * Quote list page with search, filter, and pagination.
 * Displays quote data in a table with CRUD operations and convert-to-order.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Space, message, Typography, Empty } from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

import { PageContainer } from '@/components/layout/PageContainer';
import { SearchForm, type SearchField } from '@/components/common/SearchForm';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { StatusTag } from '@/components/common/StatusTag';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { usePagination } from '@/hooks/usePagination';
import {
  useQuotes,
  useDeleteQuote,
  useConvertQuoteToOrder,
} from '@/hooks/queries/useQuotes';
import { formatDate, formatQuantity } from '@/utils';
import {
  QuoteStatus,
  QUOTE_STATUS_LABELS,
} from '@/types';
import { getDeleteErrorMessage, getErrorMessage } from '@/utils/errorMessages';
import type { Quote, QueryQuoteParams, ApiError } from '@/types';

const { Text } = Typography;

/** Quote status options for search filter. */
const STATUS_OPTIONS = Object.values(QuoteStatus).map((value) => ({
  label: QUOTE_STATUS_LABELS[value],
  value,
}));

/** Search form fields configuration. */
const SEARCH_FIELDS: SearchField[] = [
  {
    name: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    options: STATUS_OPTIONS,
  },
  {
    name: 'createdDateRange',
    label: '创建日期',
    type: 'dateRange',
  },
];

/**
 * Quote list page component.
 * Route: /quotes
 */
export default function QuoteListPage(): React.ReactElement {
  const navigate = useNavigate();

  // Pagination state with URL sync
  const {
    paginationProps,
    queryParams,
    handleTableChange,
    setPage,
  } = usePagination({ syncWithUrl: true });

  // Search state
  const [searchParams, setSearchParams] = useState<QueryQuoteParams>({});

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);

  // Convert confirmation modal state
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [quoteToConvert, setQuoteToConvert] = useState<Quote | null>(null);

  // Combined query params
  const combinedParams: QueryQuoteParams = useMemo(
    () => ({
      ...searchParams,
      ...queryParams,
    }),
    [searchParams, queryParams]
  );

  // Fetch quotes with pagination
  const { data, isLoading, isFetching } = useQuotes(combinedParams);

  // Mutations
  const deleteMutation = useDeleteQuote();
  const convertMutation = useConvertQuoteToOrder();

  /** Handle search form submission with date range conversion. */
  const handleSearch = useCallback(
    (values: Record<string, unknown>): void => {
      const params: QueryQuoteParams = {};
      if (values.status) params.status = values.status as QuoteStatus;
      if (values.createdDateRange) {
        const [start, end] = values.createdDateRange as [Dayjs, Dayjs];
        params.createdFrom = start.format('YYYY-MM-DD');
        params.createdTo = end.format('YYYY-MM-DD');
      }
      setSearchParams(params);
      setPage(1);
    },
    [setPage]
  );

  /** Handle search form reset. */
  const handleSearchReset = useCallback((): void => {
    setSearchParams({});
    setPage(1);
  }, [setPage]);

  /** Navigate to quote pages. */
  const goToDetail = useCallback((q: Quote) => navigate(`/quotes/${q.id}`), [navigate]);
  const goToEdit = useCallback((q: Quote) => navigate(`/quotes/${q.id}/edit`), [navigate]);
  const goToCreate = useCallback(() => navigate('/quotes/new'), [navigate]);

  /** Open delete confirmation modal. */
  const openDeleteModal = useCallback((quote: Quote): void => {
    setQuoteToDelete(quote);
    setDeleteModalOpen(true);
  }, []);

  /** Close delete modal and reset state. */
  const closeDeleteModal = useCallback((): void => {
    setDeleteModalOpen(false);
    setQuoteToDelete(null);
  }, []);

  /** Handle delete confirmation. */
  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!quoteToDelete) return;

    try {
      await deleteMutation.mutateAsync(quoteToDelete.id);
      message.success(`报价 "${quoteToDelete.quoteCode}" 已删除`);
      closeDeleteModal();
    } catch (error: unknown) {
      console.error('Delete error:', error);
      message.error(getDeleteErrorMessage(error as ApiError, '报价单'));
    }
  }, [quoteToDelete, deleteMutation, closeDeleteModal]);

  /** Open convert confirmation modal. */
  const openConvertModal = useCallback((quote: Quote): void => {
    setQuoteToConvert(quote);
    setConvertModalOpen(true);
  }, []);

  /** Close convert modal and reset state. */
  const closeConvertModal = useCallback((): void => {
    setConvertModalOpen(false);
    setQuoteToConvert(null);
  }, []);

  /** Handle convert confirmation. */
  const handleConvertConfirm = useCallback(async (): Promise<void> => {
    if (!quoteToConvert) return;

    try {
      const order = await convertMutation.mutateAsync(quoteToConvert.id);
      message.success(`报价 "${quoteToConvert.quoteCode}" 已成功转换为订单`);
      closeConvertModal();
      navigate(`/orders/${order.id}`);
    } catch (error: unknown) {
      console.error('Convert error:', error);
      const apiError = error as ApiError;
      if (apiError.code === 501) {
        message.warning(getErrorMessage(apiError));
      } else {
        message.error(getErrorMessage(apiError));
      }
      closeConvertModal();
    }
  }, [quoteToConvert, convertMutation, closeConvertModal, navigate]);

  /** Handle row click to navigate to detail. */
  const handleRowClick = useCallback(
    (record: Quote) => ({
      onClick: () => goToDetail(record),
      style: { cursor: 'pointer' },
    }),
    [goToDetail]
  );

  // Table columns configuration
  const columns: ColumnsType<Quote> = useMemo(
    () => [
      {
        title: '报价单号',
        dataIndex: 'quoteCode',
        key: 'quoteCode',
        width: 150,
        fixed: 'left',
        render: (code: string) => <Text strong>{code}</Text>,
      },
      {
        title: '客户名称',
        key: 'customer',
        width: 160,
        render: (_, record) => record.customer?.companyName ?? '-',
      },
      {
        title: '面料',
        key: 'fabric',
        width: 200,
        ellipsis: true,
        render: (_, record) =>
          record.fabric
            ? `${record.fabric.fabricCode} - ${record.fabric.name}`
            : '-',
      },
      {
        title: '数量',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 100,
        align: 'right',
        render: (qty: number) => formatQuantity(qty),
      },
      {
        title: '单价',
        dataIndex: 'unitPrice',
        key: 'unitPrice',
        width: 120,
        align: 'right',
        render: (price: number) => <AmountDisplay value={price} suffix="/米" />,
      },
      {
        title: '合计',
        dataIndex: 'totalPrice',
        key: 'totalPrice',
        width: 120,
        align: 'right',
        render: (total: number) => <AmountDisplay value={total} />,
      },
      {
        title: '有效期至',
        dataIndex: 'validUntil',
        key: 'validUntil',
        width: 120,
        render: (date: string) => formatDate(date),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: QuoteStatus) => (
          <StatusTag type="quote" value={status} />
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 220,
        fixed: 'right',
        render: (_, record) => {
          const stopAndRun = (fn: () => void) => (e: React.MouseEvent) => {
            e.stopPropagation();
            fn();
          };
          const isActive = record.status === QuoteStatus.ACTIVE;

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
              {isActive && (
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={stopAndRun(() => goToEdit(record))}
                >
                  编辑
                </Button>
              )}
              {isActive && (
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={stopAndRun(() => openDeleteModal(record))}
                >
                  删除
                </Button>
              )}
              {isActive && (
                <Button
                  type="text"
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={stopAndRun(() => openConvertModal(record))}
                >
                  转订单
                </Button>
              )}
            </Space>
          );
        },
      },
    ],
    [goToDetail, goToEdit, openDeleteModal, openConvertModal]
  );

  // Breadcrumb configuration
  const breadcrumbs = [
    { label: '首页', path: '/' },
    { label: '报价管理' },
  ];

  return (
    <PageContainer
      title="报价管理"
      breadcrumbs={breadcrumbs}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={goToCreate}>
          新建报价
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
        <Table<Quote>
          columns={columns}
          dataSource={data?.items ?? []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            ...paginationProps,
            total: data?.pagination.total ?? 0,
          }}
          locale={{
            emptyText: (
              <Empty description="暂无报价单数据" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Button type="primary" icon={<PlusOutlined />} onClick={goToCreate}>
                  新建报价单
                </Button>
              </Empty>
            ),
          }}
          onChange={handleTableChange as Parameters<typeof Table<Quote>>['0']['onChange']}
          onRow={handleRowClick}
          scroll={{ x: 1400 }}
          size="middle"
        />
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        title="确认删除"
        content={
          <>
            确定要删除报价 <Text strong>"{quoteToDelete?.quoteCode}"</Text> 吗？
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

      {/* Convert Confirmation Modal */}
      <ConfirmModal
        open={convertModalOpen}
        title="确认转换"
        content={
          <>
            确定要将报价 <Text strong>"{quoteToConvert?.quoteCode}"</Text> 转换为订单吗？
            <br />
            <Text type="secondary">转换后报价状态将变为「已转换」，无法再编辑或删除</Text>
          </>
        }
        onConfirm={handleConvertConfirm}
        onCancel={closeConvertModal}
        confirmText="确认转换"
        loading={convertMutation.isPending}
      />
    </PageContainer>
  );
}
