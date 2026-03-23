/**
 * Fabric detail page - orchestrator component.
 * Delegates all state to useFabricDetail hook and rendering
 * to sub-components: FabricBasicInfo, FabricImageGallery,
 * FabricSupplierTab, and FabricPricingTab.
 */

import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tabs,
  Button,
  Space,
  Spin,
  Result,
  Typography,
} from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/layout/PageContainer';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useFabricDetail } from '@/hooks/useFabricDetail';
import { parseEntityId } from '@/utils';

import { FabricBasicInfo } from './components/FabricBasicInfo';
import { FabricImageGallery } from './components/FabricImageGallery';
import { FabricSupplierTab } from './components/FabricSupplierTab';
import { FabricPricingTab } from './components/FabricPricingTab';

const { Text } = Typography;
const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

export default function FabricDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fabricId = parseEntityId(id);

  const {
    data: { fabric, isLoading, fetchError },
    tabs: { activeTab, setActiveTab },
    deleteFabric,
    supplier,
    pricing,
    images,
    breadcrumbs,
  } = useFabricDetail(fabricId, navigate);

  const goToList = useCallback(() => navigate('/fabrics'), [navigate]);

  if (isLoading) {
    return (
      <PageContainer title="加载中..." breadcrumbs={breadcrumbs}>
        <Card>
          <div style={LOADING_STYLE}><Spin size="large" /></div>
        </Card>
      </PageContainer>
    );
  }

  if (fetchError) {
    return (
      <PageContainer title="错误" breadcrumbs={breadcrumbs}>
        <Card>
          <Result
            status="error"
            title="加载失败"
            subTitle="无法加载面料信息，请稍后重试"
            extra={<Button type="primary" onClick={goToList}>返回列表</Button>}
          />
        </Card>
      </PageContainer>
    );
  }

  if (!fabric) {
    return (
      <PageContainer title="未找到" breadcrumbs={breadcrumbs}>
        <Card>
          <Result
            status="404"
            title="面料不存在"
            subTitle="您访问的面料不存在或已被删除"
            extra={<Button type="primary" onClick={goToList}>返回列表</Button>}
          />
        </Card>
      </PageContainer>
    );
  }

  const tabItems = [
    { key: 'info', label: '基本信息', children: <FabricBasicInfo fabric={fabric} /> },
    {
      key: 'images',
      label: '图片管理',
      children: (
        <FabricImageGallery
          images={images.items}
          onUpload={images.onUpload}
          onDelete={images.onDelete}
          isUploading={images.isUploading}
          uploadProgress={images.uploadProgress}
        />
      ),
    },
    {
      key: 'suppliers',
      label: '供应商关联',
      children: (
        <FabricSupplierTab
          suppliers={supplier.data}
          isLoading={supplier.isLoading}
          modal={supplier.modal}
          onRemove={supplier.onRemove}
        />
      ),
    },
    {
      key: 'pricing',
      label: '客户定价',
      children: (
        <FabricPricingTab
          pricing={pricing.data}
          isLoading={pricing.isLoading}
          modal={pricing.modal}
          onDelete={pricing.onDelete}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title={fabric.name}
      breadcrumbs={breadcrumbs}
      extra={
        <Space>
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/fabrics/${fabricId}/edit`)}>
            编辑
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => deleteFabric.setModalOpen(true)}>
            删除
          </Button>
        </Space>
      }
    >
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      <ConfirmModal
        open={deleteFabric.modalOpen}
        title="确认删除"
        content={
          <>
            确定要删除面料 <Text strong>&quot;{fabric.name}&quot;</Text> 吗？
            <br />
            <Text type="secondary">此操作不可恢复</Text>
          </>
        }
        onConfirm={deleteFabric.handle}
        onCancel={() => deleteFabric.setModalOpen(false)}
        confirmText="删除"
        danger
        loading={deleteFabric.isDeleting}
      />
    </PageContainer>
  );
}
