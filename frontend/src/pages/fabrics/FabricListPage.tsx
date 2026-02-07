/**
 * Fabric list page with search, filter, and pagination.
 * Displays fabric data in a table with CRUD operations.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Space, message, Typography, Tag } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/layout/PageContainer';
import { SearchForm, type SearchField } from '@/components/common/SearchForm';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { usePagination } from '@/hooks/usePagination';
import { useFabrics, useDeleteFabric } from '@/hooks/queries/useFabrics';
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

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fabricToDelete, setFabricToDelete] = useState<Fabric | null>(null);

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

  // Delete mutation
  const deleteMutation = useDeleteFabric();

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
  const goToEdit = useCallback((f: Fabric) => navigate(`/fabrics/${f.id}/edit`), [navigate]);
  const goToCreate = useCallback(() => navigate('/fabrics/new'), [navigate]);

  /** Open delete confirmation modal. */
  const openDeleteModal = useCallback((fabric: Fabric): void => {
    setFabricToDelete(fabric);
    setDeleteModalOpen(true);
  }, []);

  /** Close delete modal and reset state. */
  const closeDeleteModal = useCallback((): void => {
    setDeleteModalOpen(false);
    setFabricToDelete(null);
  }, []);

  /** Handle delete confirmation. */
  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!fabricToDelete) return;

    try {
      await deleteMutation.mutateAsync(fabricToDelete.id);
      message.success(`面料 "${fabricToDelete.name}" 已删除`);
      closeDeleteModal();
    } catch (error) {
      console.error('Delete error:', error);
      message.error('删除失败，请重试');
    }
  }, [fabricToDelete, deleteMutation, closeDeleteModal]);

  /** Handle row click to navigate to detail. */
  const handleRowClick = useCallback(
    (record: Fabric) => ({
      onClick: () => goToDetail(record),
      style: { cursor: 'pointer' },
    }),
    [goToDetail]
  );

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
          weight !== null ? weight.toFixed(2) : <Text type="secondary">-</Text>,
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
        width: 150,
        fixed: 'right',
        render: (_, record) => {
          const stopAndRun = (fn: () => void) => (e: React.MouseEvent) => {
            e.stopPropagation();
            fn();
          };
          return (
            <Space size="small">
              <Button type="text" size="small" icon={<EyeOutlined />} onClick={stopAndRun(() => goToDetail(record))}>
                查看
              </Button>
              <Button type="text" size="small" icon={<EditOutlined />} onClick={stopAndRun(() => goToEdit(record))}>
                编辑
              </Button>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={stopAndRun(() => openDeleteModal(record))}>
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
          onChange={handleTableChange as Parameters<typeof Table<Fabric>>['0']['onChange']}
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
            确定要删除面料 <Text strong>"{fabricToDelete?.name}"</Text> 吗？
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
