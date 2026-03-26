/**
 * Quote list page with search, filter, and pagination.
 * Displays quote data with expandable rows showing QuoteItem details.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Typography, Tag, Empty } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

import { PageContainer } from '@/components/layout/PageContainer';
import { SearchForm, type SearchField } from '@/components/common/SearchForm';
import { StatusTag } from '@/components/common/StatusTag';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { usePagination } from '@/hooks/usePagination';
import { useQuotes } from '@/hooks/queries/useQuotes';
import { formatDate } from '@/utils';
import {
  QuoteStatus,
  QUOTE_STATUS_LABELS,
  PRODUCT_SUB_CATEGORY_LABELS,
} from '@/types';
import type { Quote, QuoteItem, QueryQuoteParams } from '@/types';
import type { ProductSubCategory } from '@/types';
import {
  CATEGORY_TAG_COLORS,
  CATEGORY_TAG_LABELS,
} from '@/utils/product-constants';

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

/** Columns for the expanded QuoteItem sub-table. */
const ITEM_COLUMNS: ColumnsType<QuoteItem> = [
  {
    title: '产品',
    key: 'product',
    render: (_, item) => {
      if (item.fabric) return `${item.fabric.fabricCode} - ${item.fabric.name}`;
      if (item.product)
        return `${item.product.productCode} - ${item.product.name}`;
      return '-';
    },
  },
  {
    title: '分类',
    key: 'category',
    width: 80,
    render: (_, item) => {
      if (item.fabric) {
        return (
          <Tag color={CATEGORY_TAG_COLORS['fabric']}>
            {CATEGORY_TAG_LABELS['fabric']}
          </Tag>
        );
      }
      if (item.product) {
        const subCat = item.product.subCategory;
        const label =
          PRODUCT_SUB_CATEGORY_LABELS[subCat as ProductSubCategory] || subCat;
        const color = CATEGORY_TAG_COLORS[subCat] || 'default';
        return <Tag color={color}>{label}</Tag>;
      }
      return '-';
    },
  },
  {
    title: '数量',
    key: 'quantity',
    width: 100,
    render: (_, item) => `${Number(item.quantity)} ${item.unit}`,
  },
  {
    title: '单价',
    dataIndex: 'unitPrice',
    key: 'unitPrice',
    width: 100,
    render: (v: number) => `¥${Number(v).toFixed(2)}`,
  },
  {
    title: '小计',
    dataIndex: 'subtotal',
    key: 'subtotal',
    width: 100,
    render: (v: number) => `¥${Number(v).toFixed(2)}`,
  },
  {
    title: '状态',
    key: 'convertStatus',
    width: 80,
    render: (_, item) =>
      item.isConverted ? (
        <Tag color="blue">已转换</Tag>
      ) : (
        <Tag color="green">待转换</Tag>
      ),
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
  const goToDetail = useCallback(
    (q: Quote) => navigate(`/quotes/${q.id}`),
    [navigate]
  );
  const goToCreate = useCallback(() => navigate('/quotes/new'), [navigate]);

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
        title: '明细数',
        key: 'itemCount',
        width: 80,
        align: 'center',
        render: (_, record) => record.items?.length ?? 0,
      },
      {
        title: '总金额',
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
              <Empty
                description="暂无报价单数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={goToCreate}
                >
                  新建报价单
                </Button>
              </Empty>
            ),
          }}
          onChange={
            handleTableChange as Parameters<
              typeof Table<Quote>
            >['0']['onChange']
          }
          expandable={{
            expandedRowRender: (record) => {
              if (!record.items || record.items.length === 0) {
                return <Empty description="暂无明细" />;
              }
              return (
                <Table<QuoteItem>
                  size="small"
                  dataSource={record.items}
                  rowKey="id"
                  pagination={false}
                  columns={ITEM_COLUMNS}
                />
              );
            },
            rowExpandable: (record) => (record.items?.length ?? 0) > 0,
          }}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>
    </PageContainer>
  );
}
