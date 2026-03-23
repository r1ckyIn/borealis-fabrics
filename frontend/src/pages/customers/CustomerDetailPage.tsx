/**
 * Customer detail page - orchestrator component.
 * Delegates rendering to sub-components: CustomerBasicInfo, CustomerAddressTab,
 * CustomerPricingTab, and CustomerOrdersTab.
 * All state lives in useCustomerDetail hook.
 */

import { useParams } from 'react-router-dom';
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
import { useCustomerDetail } from '@/hooks/useCustomerDetail';
import { parseEntityId } from '@/utils';

import { CustomerBasicInfo } from './components/CustomerBasicInfo';
import { CustomerAddressTab } from './components/CustomerAddressTab';
import { CustomerPricingTab } from './components/CustomerPricingTab';
import { CustomerOrdersTab } from './components/CustomerOrdersTab';

const { Text } = Typography;

/** Centered loading spinner style. */
const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

/**
 * Customer detail page component.
 * Route: /customers/:id
 */
export default function CustomerDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const customerId = parseEntityId(id);

  const {
    data: { customer, isLoading, fetchError },
    tabs: { activeTab, setActiveTab },
    deleteCustomer,
    pricing,
    orders,
    navigation,
    breadcrumbs,
  } = useCustomerDetail(customerId);

  // Loading state
  if (isLoading) {
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
            subTitle="无法加载客户信息，请稍后重试"
            extra={
              <Button type="primary" onClick={navigation.goToList}>
                返回列表
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  // Not found state
  if (!customer) {
    return (
      <PageContainer title="未找到" breadcrumbs={breadcrumbs}>
        <Card>
          <Result
            status="404"
            title="客户不存在"
            subTitle="您访问的客户不存在或已被删除"
            extra={
              <Button type="primary" onClick={navigation.goToList}>
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
      children: <CustomerBasicInfo customer={customer} />,
    },
    {
      key: 'addresses',
      label: '收货地址',
      children: <CustomerAddressTab addresses={customer.addresses} />,
    },
    {
      key: 'pricing',
      label: '特殊定价',
      children: (
        <CustomerPricingTab
          pricing={pricing.data}
          isLoading={pricing.isLoading}
          modal={pricing.modal}
          deletePricing={pricing.deletePricing}
          onNavigateToFabric={navigation.goToFabricDetail}
        />
      ),
    },
    {
      key: 'orders',
      label: '订单历史',
      children: (
        <CustomerOrdersTab
          orders={orders.data}
          isLoading={orders.isLoading}
          onViewOrder={navigation.goToOrderDetail}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title={customer.companyName}
      breadcrumbs={breadcrumbs}
      extra={
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={navigation.goToEdit}
          >
            编辑
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteCustomer.setModalOpen(true)}
          >
            删除
          </Button>
        </Space>
      }
    >
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* Delete Customer Confirmation Modal */}
      <ConfirmModal
        open={deleteCustomer.modalOpen}
        title="确认删除"
        content={
          <>
            确定要删除客户 <Text strong>"{customer.companyName}"</Text> 吗？
            <br />
            <Text type="secondary">此操作不可恢复</Text>
          </>
        }
        onConfirm={deleteCustomer.handle}
        onCancel={() => deleteCustomer.setModalOpen(false)}
        confirmText="删除"
        danger
        loading={deleteCustomer.isDeleting}
      />
    </PageContainer>
  );
}
