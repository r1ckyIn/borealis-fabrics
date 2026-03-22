/**
 * Fabric list page with search, filter, and pagination.
 * Displays fabric data in a table with view operation.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Space, Typography, Tag, Empty } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/layout/PageContainer';
import { SearchForm, type SearchField } from '@/components/common/SearchForm';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { usePagination } from '@/hooks/usePagination';
import { useFabrics } from '@/hooks/queries/useFabrics';
import type { Fabric, QueryFabricParams } from '@/types';

const { Text } = Typography;

/** Search form fields configuration. */
const SEARCH_FIELDS: SearchField[] = [
  {
    name: 'keyword',
    label: '关键字',
    type: 'text',
    placeholder: '面料编码/名称/颜色',
  },
];

/**
 * Fabric list page component.
 * Route: /fabrics
 */
export default function FabricListPage(): React.ReactElement {
  const navigate = useNavigate();

  // Pagination state with URL sync
  const {
    paginationProps,
    queryParams,
    handleTableChange,
    setPage,
  } = usePagination({ syncWithUrl: true });

  // Search state
  const [searchParams, setSearchParams] = useState<QueryFabricParams>({});

  // Combined query params
  const combinedParams: QueryFabricParams = useMemo(
    () => ({
      ...searchParams,
      ...queryParams,
    }),
    [searchParams, queryParams]
  );

  // Fetch fabrics with pagination
  const { data, isLoading, isFetching } = useFabrics(combinedParams);

  /** Handle search form submission. */
  const handleSearch = useCallback(
    (values: Record<string, unknown>): void => {
      setSearchParams(values as QueryFabricParams);
      setPage(1);
    },
    [setPage]
  );

  /** Handle search form reset. */
  const handleSearchReset = useCallback((): void => {
    setSearchParams({});
    setPage(1);
  }, [setPage]);

  /** Navigate to fabric pages. */
  const goToDetail = useCallback((f: Fabric) => navigate(`/fabrics/${f.id}`), [navigate]);
  const goToCreate = useCallback(() => navigate('/fabrics/new'), [navigate]);

  // Table columns configuration
  const columns: ColumnsType<Fabric> = useMemo(
    () => [
      {
        title: '面料编码',
        dataIndex: 'fabricCode',
        key: 'fabricCode',
        width: 140,
        fixed: 'left',
        render: (code: string) => <Text strong>{code}</Text>,
      },
      {
        title: '面料名称',
        dataIndex: 'name',
        key: 'name',
        width: 180,
        ellipsis: true,
      },
      {
        title: '颜色',
        dataIndex: 'color',
        key: 'color',
        width: 100,
        render: (color: string | null) =>
          color ? <Tag>{color}</Tag> : <Text type="secondary">-</Text>,
      },
      {
        title: '克重 (g/m²)',
        dataIndex: 'weight',
        key: 'weight',
        width: 110,
        align: 'right',
        render: (weight: number | null) =>
          weight != null ? Number(weight).toFixed(2) : <Text type="secondary">-</Text>,
      },
      {
        title: '幅宽 (cm)',
        dataIndex: 'width',
        key: 'width',
        width: 100,
        align: 'right',
        render: (width: number | null) =>
          width !== null ? width : <Text type="secondary">-</Text>,
      },
      {
        title: '默认单价',
        dataIndex: 'defaultPrice',
        key: 'defaultPrice',
        width: 120,
        align: 'right',
        render: (price: number | null) => (
          <AmountDisplay value={price} suffix="/米" />
        ),
      },
      {
        title: '应用领域',
        dataIndex: 'application',
        key: 'application',
        width: 180,
        render: (apps: string[] | null) =>
          apps?.length ? (
            <Space size={[0, 4]} wrap>
              {apps.slice(0, 2).map((app) => (
                <Tag key={app} color="blue">
                  {app}
                </Tag>
              ))}
              {apps.length > 2 && <Tag>+{apps.length - 2}</Tag>}
            </Space>
          ) : (
            <Text type="secondary">-</Text>
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
    { label: '面料管理' },
  ];

  return (
    <PageContainer
      title="面料管理"
      breadcrumbs={breadcrumbs}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={goToCreate}>
          新建面料
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
        <Table<Fabric>
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
              <Empty description="暂无面料数据" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Button type="primary" icon={<PlusOutlined />} onClick={goToCreate}>
                  新建面料
                </Button>
              </Empty>
            ),
          }}
          onChange={handleTableChange as Parameters<typeof Table<Fabric>>['0']['onChange']}

          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>

    </PageContainer>
  );
}
