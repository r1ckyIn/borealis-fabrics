/**
 * Order list page with search, filter, and pagination.
 * Displays order data in a table with view operation.
 * Admin users see a soft-delete toggle for API consistency (orders lack soft delete).
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Empty, Typography, Space } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

import { PageContainer } from '@/components/layout/PageContainer';
import { SearchForm, type SearchField } from '@/components/common/SearchForm';
import { SoftDeleteToggle } from '@/components/common/SoftDeleteToggle';
import { StatusTag } from '@/components/common/StatusTag';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { usePagination } from '@/hooks/usePagination';
import { useOrders } from '@/hooks/queries/useOrders';
import { formatDate } from '@/utils';
import {
  OrderItemStatus,
  ORDER_ITEM_STATUS_LABELS,
  CustomerPayStatus,
  CUSTOMER_PAY_STATUS_LABELS,
} from '@/types';
import type { Order, QueryOrderParams } from '@/types';

const { Text } = Typography;

/** Order status options for search filter. */
const STATUS_OPTIONS = Object.values(OrderItemStatus).map((value) => ({
  label: ORDER_ITEM_STATUS_LABELS[value],
  value,
}));

/** Customer pay status options for search filter. */
const PAY_STATUS_OPTIONS = Object.values(CustomerPayStatus).map((value) => ({
  label: CUSTOMER_PAY_STATUS_LABELS[value],
  value,
}));

/** Search form fields configuration. */
const SEARCH_FIELDS: SearchField[] = [
  {
    name: 'keyword',
    label: '关键字',
    type: 'text',
    placeholder: '订单号/客户名',
  },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    options: STATUS_OPTIONS,
  },
  {
    name: 'customerPayStatus',
    label: '付款状态',
    type: 'select',
    placeholder: '请选择付款状态',
    options: PAY_STATUS_OPTIONS,
  },
  {
    name: 'createdDateRange',
    label: '创建日期',
    type: 'dateRange',
  },
];

/**
 * Order list page component.
 * Route: /orders
 */
export default function OrderListPage(): React.ReactElement {
  const navigate = useNavigate();

  // Pagination state with URL sync
  const {
    paginationProps,
    queryParams,
    handleTableChange,
    setPage,
  } = usePagination({ syncWithUrl: true });

  // Search state
  const [searchParams, setSearchParams] = useState<QueryOrderParams>({});

  // Soft-delete toggle state (for API consistency; orders lack soft delete)
  const [showDeleted, setShowDeleted] = useState(false);

  // Combined query params
  const combinedParams: QueryOrderParams = useMemo(
    () => ({
      ...searchParams,
      ...queryParams,
      ...(showDeleted ? { includeDeleted: true } : {}),
    }),
    [searchParams, queryParams, showDeleted]
  );

  // Fetch orders with pagination
  const { data, isLoading, isFetching } = useOrders(combinedParams);

  /** Handle search form submission with date range conversion. */
  const handleSearch = useCallback(
    (values: Record<string, unknown>): void => {
      const params: QueryOrderParams = {};
      if (values.keyword) params.keyword = values.keyword as string;
      if (values.status) params.status = values.status as OrderItemStatus;
      if (values.customerPayStatus) {
        params.customerPayStatus = values.customerPayStatus as CustomerPayStatus;
      }
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

  /** Navigate to order pages. */
  const goToDetail = useCallback((o: Order) => navigate(`/orders/${o.id}`), [navigate]);
  const goToCreate = useCallback(() => navigate('/orders/new'), [navigate]);

  // Table columns configuration
  const columns: ColumnsType<Order> = useMemo(
    () => [
      {
        title: '订单号',
        dataIndex: 'orderCode',
        key: 'orderCode',
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
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: OrderItemStatus) => (
          <StatusTag type="orderItem" value={status} />
        ),
      },
      {
        title: '合计金额',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 120,
        align: 'right',
        render: (amount: number) => <AmountDisplay value={amount} />,
      },
      {
        title: '付款状态',
        dataIndex: 'customerPayStatus',
        key: 'customerPayStatus',
        width: 100,
        render: (_status: CustomerPayStatus, record: Order) => {
          const paid = Number(record.customerPaid) || 0;
          const total = Number(record.totalAmount) || 0;
          const derived = paid <= 0 ? 'unpaid' : total > 0 && paid >= total ? 'paid' : 'partial';
          return <StatusTag type="customerPay" value={derived} />;
        },
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 120,
        render: (date: string) => formatDate(date),
      },
      {
        title: '操作',
        key: 'actions',
        width: 80,
        fixed: 'right',
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => goToDetail(record)}
          >
            查看
          </Button>
        ),
      },
    ],
    [goToDetail]
  );

  // Breadcrumb configuration
  const breadcrumbs = [
    { label: '首页', path: '/' },
    { label: '订单管理' },
  ];

  return (
    <PageContainer
      title="订单管理"
      breadcrumbs={breadcrumbs}
      extra={
        <Space>
          <SoftDeleteToggle showDeleted={showDeleted} onChange={setShowDeleted} />
          <Button type="primary" icon={<PlusOutlined />} onClick={goToCreate}>
            新建订单
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
        <Table<Order>
          columns={columns}
          dataSource={data?.items ?? []}
          rowKey="id"
          loading={isLoading}
          locale={{
            emptyText: (
              <Empty description="暂无订单数据">
                <Button type="primary" onClick={goToCreate}>新建订单</Button>
              </Empty>
            ),
          }}
          pagination={{
            ...paginationProps,
            total: data?.pagination.total ?? 0,
          }}
          onChange={handleTableChange as Parameters<typeof Table<Order>>['0']['onChange']}

          scroll={{ x: 1100 }}
          size="middle"
        />
      </Card>

    </PageContainer>
  );
}
