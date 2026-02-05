/**
 * Supplier detail page showing all supplier information.
 * Contains 2 tabs: Basic Info and Associated Fabrics.
 */

import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tabs,
  Descriptions,
  Button,
  Spin,
  Result,
  Table,
  Typography,
  Tag,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/layout/PageContainer';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { useSupplier, useSupplierFabrics } from '@/hooks/queries/useSuppliers';
import { formatDate } from '@/utils/format';
import {
  SupplierStatus,
  SUPPLIER_STATUS_LABELS,
  SettleType,
  SETTLE_TYPE_LABELS,
} from '@/types';
import type { FabricSupplier } from '@/types';

const { Text } = Typography;

/** Status tag color mapping. */
const STATUS_TAG_COLORS: Record<SupplierStatus, string> = {
  [SupplierStatus.ACTIVE]: 'green',
  [SupplierStatus.SUSPENDED]: 'orange',
  [SupplierStatus.ELIMINATED]: 'red',
};

/** Centered loading spinner style. */
const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

/**
 * Supplier detail page component.
 * Route: /suppliers/:id
 */
export default function SupplierDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const supplierId = id ? parseInt(id, 10) : undefined;

  // Tab state
  const [activeTab, setActiveTab] = useState('info');

  // Fetch supplier data
  const {
    data: supplier,
    isLoading: isLoadingSupplier,
    error: fetchError,
  } = useSupplier(supplierId);

  // Fetch associated fabrics when tab is active
  const { data: fabricsData, isLoading: isLoadingFabrics } = useSupplierFabrics(
    supplierId,
    undefined,
    activeTab === 'fabrics'
  );

  // Breadcrumbs
  const breadcrumbs = useMemo(
    () => [
      { label: '首页', path: '/' },
      { label: '供应商管理', path: '/suppliers' },
      { label: supplier?.companyName ?? '供应商详情' },
    ],
    [supplier?.companyName]
  );

  /** Navigate to fabric detail page. */
  const goToFabricDetail = useCallback(
    (fabricId: number) => navigate(`/fabrics/${fabricId}`),
    [navigate]
  );

  /** Navigate back to supplier list. */
  const goToList = useCallback(() => navigate('/suppliers'), [navigate]);

  // Fabrics table columns
  const fabricColumns: ColumnsType<FabricSupplier> = useMemo(
    () => [
      {
        title: '面料编码',
        key: 'fabricCode',
        width: 140,
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            onClick={() => goToFabricDetail(record.fabricId)}
            style={{ padding: 0 }}
          >
            {record.fabric?.fabricCode ?? '-'}
          </Button>
        ),
      },
      {
        title: '面料名称',
        key: 'fabricName',
        width: 180,
        ellipsis: true,
        render: (_, record) => record.fabric?.name ?? '-',
      },
      {
        title: '采购价',
        dataIndex: 'purchasePrice',
        key: 'purchasePrice',
        width: 120,
        align: 'right',
        render: (price: number) => <AmountDisplay value={price} suffix="/米" />,
      },
      {
        title: '最小起订量',
        dataIndex: 'minOrderQty',
        key: 'minOrderQty',
        width: 120,
        align: 'right',
        render: (qty: number | null) =>
          qty !== null ? `${qty} 米` : <Text type="secondary">-</Text>,
      },
      {
        title: '交货周期',
        dataIndex: 'leadTimeDays',
        key: 'leadTimeDays',
        width: 100,
        align: 'right',
        render: (days: number | null) =>
          days !== null ? `${days} 天` : <Text type="secondary">-</Text>,
      },
      {
        title: '颜色',
        key: 'color',
        width: 100,
        render: (_, record) =>
          record.fabric?.color ? (
            <Tag>{record.fabric.color}</Tag>
          ) : (
            <Text type="secondary">-</Text>
          ),
      },
    ],
    [goToFabricDetail]
  );

  // Loading state
  if (isLoadingSupplier) {
    return (
      <PageContainer title="加载中..." breadcrumbs={breadcrumbs}>
        <Card>
          <div style={LOADING_STYLE}>
            <Spin size="large" />
          </div>
        </Card>
      </PageContainer>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <PageContainer title="错误" breadcrumbs={breadcrumbs}>
        <Card>
          <Result
            status="error"
            title="加载失败"
            subTitle="无法加载供应商信息，请稍后重试"
            extra={
              <Button type="primary" onClick={goToList}>
                返回列表
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  // Not found state
  if (!supplier) {
    return (
      <PageContainer title="未找到" breadcrumbs={breadcrumbs}>
        <Card>
          <Result
            status="404"
            title="供应商不存在"
            subTitle="您访问的供应商不存在或已被删除"
            extra={
              <Button type="primary" onClick={goToList}>
                返回列表
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  // Tab content
  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      children: (
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="公司名称">
            <Text strong>{supplier.companyName}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="联系人">
            {supplier.contactName ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="电话">
            {supplier.phone ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="微信">
            {supplier.wechat ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            {supplier.email ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={STATUS_TAG_COLORS[supplier.status]}>
              {SUPPLIER_STATUS_LABELS[supplier.status]}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="地址" span={3}>
            {supplier.address ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="发票类型">
            {supplier.billReceiveType ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="结算方式">
            {SETTLE_TYPE_LABELS[supplier.settleType]}
          </Descriptions.Item>
          <Descriptions.Item label="账期天数">
            {supplier.settleType === SettleType.CREDIT && supplier.creditDays !== null
              ? `${supplier.creditDays} 天`
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={3}>
            {supplier.notes ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatDate(supplier.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {formatDate(supplier.updatedAt)}
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'fabrics',
      label: '关联面料',
      children: (
        <Table<FabricSupplier>
          columns={fabricColumns}
          dataSource={fabricsData?.items ?? []}
          rowKey="fabricId"
          loading={isLoadingFabrics}
          pagination={false}
          size="middle"
          locale={{ emptyText: '暂无关联面料' }}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title={supplier.companyName}
      breadcrumbs={breadcrumbs}
      extra={
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => navigate(`/suppliers/${supplierId}/edit`)}
        >
          编辑供应商
        </Button>
      }
    >
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </PageContainer>
  );
}
