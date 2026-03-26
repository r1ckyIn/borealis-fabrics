/**
 * Product list page with dynamic columns based on URL :category parameter.
 * Follows FabricListPage pattern with search, filter, and pagination.
 */

import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Empty, Result } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/layout/PageContainer';
import { SearchForm, type SearchField } from '@/components/common/SearchForm';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { usePagination } from '@/hooks/usePagination';
import { useProducts } from '@/hooks/queries/useProducts';
import { CATEGORY_ROUTE_MAP } from '@/utils/product-constants';
import { PRODUCT_SUB_CATEGORY_LABELS } from '@/types';
import type { Product, QueryProductParams } from '@/types';

/** Search form fields configuration. */
const SEARCH_FIELDS: SearchField[] = [
  {
    name: 'keyword',
    label: '关键字',
    type: 'text',
    placeholder: '产品编码/名称/型号',
  },
];

/** Base columns shared across all categories. */
const BASE_COLUMNS: ColumnsType<Product> = [
  {
    title: '产品编码',
    dataIndex: 'productCode',
    key: 'productCode',
    width: 140,
    fixed: 'left',
  },
  {
    title: '产品名称',
    dataIndex: 'name',
    key: 'name',
    width: 180,
    ellipsis: true,
  },
];

/** Category-specific columns by subCategory key. */
const CATEGORY_COLUMNS: Record<string, ColumnsType<Product>> = {
  IRON_FRAME: [
    { title: '型号', dataIndex: 'modelNumber', key: 'modelNumber', width: 120 },
    { title: '规格', dataIndex: 'specification', key: 'specification', ellipsis: true },
  ],
  MOTOR: [
    { title: '型号', dataIndex: 'modelNumber', key: 'modelNumber', width: 120 },
    { title: '规格', dataIndex: 'specification', key: 'specification', ellipsis: true },
  ],
  MATTRESS: [
    { title: '规格尺寸', dataIndex: 'specification', key: 'specification', ellipsis: true },
  ],
  ACCESSORY: [
    { title: '型号', dataIndex: 'modelNumber', key: 'modelNumber', width: 120 },
    { title: '规格', dataIndex: 'specification', key: 'specification', ellipsis: true },
  ],
};

/**
 * Product list page component.
 * Route: /products/:category
 */
export default function ProductListPage(): React.ReactElement {
  const { category: categoryParam } = useParams<{ category: string }>();
  const navigate = useNavigate();

  // Resolve subCategory from URL param
  const subCategory = categoryParam ? CATEGORY_ROUTE_MAP[categoryParam] : undefined;
  const categoryLabel = subCategory
    ? PRODUCT_SUB_CATEGORY_LABELS[subCategory as keyof typeof PRODUCT_SUB_CATEGORY_LABELS]
    : undefined;

  // Pagination state with URL sync
  const {
    paginationProps,
    queryParams,
    handleTableChange,
    setPage,
  } = usePagination({ syncWithUrl: true });

  // Search state
  const [searchParams, setSearchParams] = useState<QueryProductParams>({});

  // Combined query params
  const combinedParams: QueryProductParams = useMemo(
    () => ({
      ...searchParams,
      ...queryParams,
      subCategory,
    }),
    [searchParams, queryParams, subCategory]
  );

  // Fetch products with pagination
  const { data, isLoading, isFetching } = useProducts(combinedParams, !!subCategory);

  /** Handle search form submission. */
  const handleSearch = useCallback(
    (values: Record<string, unknown>): void => {
      setSearchParams(values as QueryProductParams);
      setPage(1);
    },
    [setPage]
  );

  /** Handle search form reset. */
  const handleSearchReset = useCallback((): void => {
    setSearchParams({});
    setPage(1);
  }, [setPage]);

  /** Navigate to product pages. */
  const goToDetail = useCallback(
    (record: Product) => navigate(`/products/${categoryParam}/${record.id}`),
    [navigate, categoryParam]
  );
  const goToCreate = useCallback(
    () => navigate(`/products/${categoryParam}/new`),
    [navigate, categoryParam]
  );

  // Tail columns (price + actions)
  const tailColumns: ColumnsType<Product> = useMemo(
    () => [
      {
        title: '默认单价',
        dataIndex: 'defaultPrice',
        key: 'defaultPrice',
        width: 120,
        align: 'right',
        render: (price: number | null) => (
          <AmountDisplay value={price} />
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

  // Compose final columns dynamically
  const columns: ColumnsType<Product> = useMemo(
    () => [
      ...BASE_COLUMNS,
      ...(subCategory && CATEGORY_COLUMNS[subCategory] ? CATEGORY_COLUMNS[subCategory] : []),
      ...tailColumns,
    ],
    [subCategory, tailColumns]
  );

  // Handle unknown category
  if (!subCategory) {
    return (
      <PageContainer title="未知分类">
        <Result
          status="404"
          title="未知分类"
          subTitle={`路径 "${categoryParam}" 不是有效的产品分类`}
          extra={
            <Button type="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          }
        />
      </PageContainer>
    );
  }

  // Breadcrumb configuration
  const breadcrumbs = [
    { label: '首页', path: '/' },
    { label: `${categoryLabel}管理` },
  ];

  return (
    <PageContainer
      title={`${categoryLabel}管理`}
      breadcrumbs={breadcrumbs}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={goToCreate}>
          新增{categoryLabel}
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
        <Table<Product>
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
              <Empty description={`暂无${categoryLabel}数据`} image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Button type="primary" icon={<PlusOutlined />} onClick={goToCreate}>
                  新增{categoryLabel}
                </Button>
              </Empty>
            ),
          }}
          onChange={handleTableChange as Parameters<typeof Table<Product>>['0']['onChange']}
          scroll={{ x: 900 }}
          size="middle"
        />
      </Card>
    </PageContainer>
  );
}
